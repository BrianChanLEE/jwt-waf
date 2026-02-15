/**
 * Multi-IP Token Use Rule
 * 
 * 같은 토큰이 여러 IP 주소에서 사용되는 경우를 탐지합니다.
 * 토큰 탈취 및 공유 계정 남용을 감지합니다.
 */

import { BaseRule } from './base';
import { RiskEvent, Store, RuleResult } from '../types';

/**
 * Multi-IP Token Use Rule 클래스
 * 
 * 공격 시나리오:
 * - 토큰 탈취 후 다른 위치에서 사용
 * - 공유 계정 남용
 * 
 * 탐지 로직:
 * - 같은 JTI가 10분 내 3개 이상 다른 IP에서 사용 시 45점 부여
 */
export class MultiIpTokenUseRule extends BaseRule {
    private readonly timeWindow: number = 600; // 600초 (10분)
    private readonly threshold: number = 3; // 3개 이상 IP
    private readonly score: number = 45; // 위험 점수

    constructor() {
        super(
            'MultiIpTokenUse',
            '다중 IP 토큰 사용 탐지',
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

        // 저장소 키 생성 (JTI별 IP 추적)
        const keyPrefix = `waf:multi_ip:${jti}`;
        const ipKey = `${keyPrefix}:${event.ip}`;

        try {
            // 이 IP를 기록
            await store.set(ipKey, '1', this.timeWindow);

            // 같은 JTI로 사용된 모든 IP 조회
            const allKeys = await store.keys(`${keyPrefix}:*`);
            const uniqueIpCount = allKeys.length;

            // 임계값 체크
            if (uniqueIpCount >= this.threshold) {
                // IP 목록 추출
                const ips = allKeys.map(key => key.split(':').pop()).filter(Boolean);

                return this.createResult(
                    this.score,
                    `${this.timeWindow}초 내 ${uniqueIpCount}개 다른 IP에서 같은 토큰 사용 (임계값: ${this.threshold})`,
                    {
                        jti,
                        uniqueIpCount,
                        ips,
                        currentIp: event.ip,
                        timeWindow: this.timeWindow,
                        threshold: this.threshold
                    }
                );
            }

            // 임계값 미만
            return this.createResult(0, `${uniqueIpCount}개 IP에서 토큰 사용 (임계값 미만)`);
        } catch (error) {
            // 저장소 에러 시 안전하게 통과
            return this.createResult(0, '저장소 에러로 인한 규칙 건너뜀');
        }
    }
}
