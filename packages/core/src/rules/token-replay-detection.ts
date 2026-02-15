/**
 * Token Replay Detection Rule
 * 
 * 같은 토큰이 짧은 시간 내 과도하게 재사용되는 경우를 탐지합니다.
 * Replay 공격 및 토큰 도용을 감지합니다.
 */

import { BaseRule } from './base';
import { RiskEvent, Store, RuleResult } from '../types';

/**
 * Token Replay Detection Rule 클래스
 * 
 * 공격 시나리오:
 * - Replay 공격 (네트워크 스니핑으로 토큰 탈취 후 재전송)
 * - 정상 사용자 토큰 도용
 * 
 * 탐지 로직:
 * - 같은 JTI가 1분 내 30회 이상 사용 시 25점 부여
 */
export class TokenReplayDetectionRule extends BaseRule {
    private readonly timeWindow: number = 60; // 60초
    private readonly threshold: number = 30; // 30회 이상
    private readonly score: number = 25; // 위험 점수

    constructor() {
        super(
            'TokenReplayDetection',
            '토큰 재사용 공격 탐지',
            1,
            true
        );
    }

    /**
     * 이벤트 분석
     * 
     * @param event - 위험 이벤트
     * @param store - 저장소
     * @returns 규칙 분석 결과
     */
    async analyze(event: RiskEvent, store: Store): Promise<RuleResult> {
        // JTI가 없으면 통과 (추적 불가)
        const jti = event.payload?.jti;
        if (!jti) {
            return this.createResult(0, 'JTI가 없어 추적 불가');
        }

        // 저장소 키 생성
        const key = `waf:replay:${jti}`;

        try {
            // 현재 카운트 증가
            const count = await store.increment(key);

            // 첫 시도면 TTL 설정
            if (count === 1) {
                await store.expire(key, this.timeWindow);
            }

            // 임계값 체크
            if (count >= this.threshold) {
                return this.createResult(
                    this.score,
                    `${this.timeWindow}초 내 같은 토큰 ${count}회 사용 (임계값: ${this.threshold})`,
                    {
                        jti,
                        ip: event.ip,
                        userId: event.payload?.sub,
                        attemptCount: count,
                        timeWindow: this.timeWindow,
                        threshold: this.threshold
                    }
                );
            }

            // 임계값 미만
            return this.createResult(0, `토큰 사용 ${count}회 (임계값 미만)`);
        } catch (error) {
            // 저장소 에러 시 안전하게 통과
            return this.createResult(0, '저장소 에러로 인한 규칙 건너뜀');
        }
    }
}
