/**
 * WAF 코어 엔진
 * 
 * JWT 기반 요청을 분석하고 위험 점수를 계산하여 Decision을 반환합니다.
 * 프레임워크에 독립적이며, 순수한 비즈니스 로직만 포함합니다.
 */

import {
    WafConfig,
    WafMode,
    RiskEvent,
    AnalysisResult,
    Decision,
    Logger,
    WafError
} from '../types';
import { defaultLogger } from '../logger';
import { decodeJwt } from './jwt-decoder';
import { buildRiskEvent, RequestInfo } from './risk-event-builder';
import { validateConfig } from './config-validator';

/**
 * WAF 엔진 클래스
 */
export class WafEngine {
    private readonly mode: WafMode;
    private readonly blockThreshold: number;
    private readonly logger: Logger;
    private readonly verifySignature: boolean;
    private readonly jwtSecret?: string;

    /**
     * 생성자
     * 
     * @param config - WAF 설정
     * @throws {WafError} 설정이 유효하지 않을 경우
     */
    constructor(private readonly config: WafConfig) {
        // 설정 검증
        validateConfig(config);

        this.mode = config.mode;
        this.blockThreshold = config.blockThreshold;
        this.logger = config.logger || defaultLogger;
        this.verifySignature = config.verifySignature || false;
        this.jwtSecret = config.jwtSecret;

        this.logger.info('WAF 엔진 초기화 완료', {
            mode: this.mode,
            blockThreshold: this.blockThreshold,
            rulesCount: config.rules.length,
            storeType: config.store.constructor.name,
            verifySignature: this.verifySignature
        });
    }

    /**
     * 요청 정보를 분석하여 Decision 반환
     * 
     * 이 메서드는 전체 WAF 파이프라인을 실행합니다:
     * 1. JWT 디코드
     * 2. RiskEvent 생성
     * 3. 모든 규칙 실행
     * 4. 점수 합산
     * 5. Decision 결정
     * 
     * @param requestInfo - 요청 정보 (JWT 포함)
     * @returns 분석 결과
     */
    async analyzeRequest(requestInfo: RequestInfo): Promise<AnalysisResult> {
        try {
            this.logger.info('요청 분석 시작', {
                ip: requestInfo.ip,
                path: requestInfo.path,
                method: requestInfo.method
            });

            // 1. JWT 디코드
            const decodeResult = decodeJwt(requestInfo.token, {
                verify: this.verifySignature,
                secret: this.jwtSecret
            });

            if (!decodeResult.isValid) {
                this.logger.warn('JWT 검증 실패', {
                    reason: decodeResult.invalidReason,
                    ip: requestInfo.ip
                });
            }

            // 2. RiskEvent 생성
            const event = buildRiskEvent(requestInfo, decodeResult);

            // 3. 기존 analyze 메서드 호출 (규칙 실행)
            return await this.analyze(event);
        } catch (error) {
            this.logger.error('요청 분석 중 치명적 에러', error as Error);
            throw new WafError(
                '요청 분석 중 에러가 발생했습니다',
                'ENGINE_ANALYSIS_ERROR',
                500
            );
        }
    }

    /**
     * 위험 이벤트 분석
     * 
     * 모든 활성화된 규칙을 실행하고 점수를 합산하여 최종 Decision을 반환합니다.
     * 
     * @param event - 분석할 위험 이벤트
     * @returns 분석 결과
     */
    async analyze(event: RiskEvent): Promise<AnalysisResult> {
        try {
            this.logger.info('이벤트 분석 시작', {
                ip: event.ip,
                path: event.path,
                method: event.method,
                isValid: event.isValid,
                userId: event.payload?.sub
            });

            // 모든 활성화된 규칙 실행
            const ruleResults = [];
            let totalScore = 0;

            for (const rule of this.config.rules) {
                if (!rule.enabled) {
                    this.logger.info('규칙 비활성화 상태로 건너뜀', {
                        ruleName: rule.name
                    });
                    continue;
                }

                try {
                    const result = await rule.analyze(event, this.config.store);
                    ruleResults.push(result);
                    totalScore += result.score;

                    if (result.score > 0) {
                        this.logger.warn('규칙 트리거', {
                            ruleName: result.ruleName,
                            score: result.score,
                            reason: result.reason,
                            details: result.details
                        });
                    } else {
                        this.logger.info('규칙 통과', {
                            ruleName: result.ruleName
                        });
                    }
                } catch (error) {
                    this.logger.error('규칙 실행 중 에러 발생', error as Error, {
                        ruleName: rule.name
                    });
                    // 규칙 에러는 무시하고 계속 진행 (가용성 우선)
                    // 단, 에러 발생 사실을 결과에 포함
                    ruleResults.push({
                        ruleName: rule.name,
                        score: 0,
                        reason: '규칙 실행 중 에러 발생',
                        details: {
                            error: (error as Error).message
                        }
                    });
                }
            }

            // Decision 결정
            const decision = this.determineDecision(totalScore);

            const result: AnalysisResult = {
                decision,
                totalScore,
                ruleResults,
                timestamp: Date.now()
            };

            this.logger.info('이벤트 분석 완료', {
                decision,
                totalScore,
                triggeredRulesCount: ruleResults.filter(r => r.score > 0).length,
                executedRulesCount: ruleResults.length
            });

            return result;
        } catch (error) {
            this.logger.error('엔진 분석 중 치명적 에러', error as Error);
            throw new WafError(
                '요청 분석 중 에러가 발생했습니다',
                'ENGINE_ANALYSIS_ERROR',
                500
            );
        }
    }

    /**
     * Decision 결정 로직
     * 
     * @param totalScore - 총 위험 점수
     * @returns 최종 결정
     * @private
     */
    private determineDecision(totalScore: number): Decision {
        // OBSERVE 모드: 점수와 관계없이 항상 OBSERVE
        if (this.mode === WafMode.OBSERVE) {
            if (totalScore >= this.blockThreshold) {
                this.logger.warn('OBSERVE 모드: 차단 임계값 초과했으나 허용', {
                    totalScore,
                    threshold: this.blockThreshold
                });
            }
            return Decision.OBSERVE;
        }

        // BLOCK 모드: 임계값 초과 시 BLOCK
        if (totalScore >= this.blockThreshold) {
            this.logger.warn('차단 결정', {
                totalScore,
                threshold: this.blockThreshold
            });
            return Decision.BLOCK;
        }

        return Decision.ALLOW;
    }
}
