/**
 * Expired Token Flood Rule
 * 
 * 만료된 토큰을 반복적으로 사용하는 공격을 탐지합니다.
 * 같은 IP에서 짧은 시간 내 만료된 토큰을 여러 번 시도하는 패턴을 감지합니다.
 */

import { BaseRule } from './base';
import { RiskEvent, Store, RuleResult } from '../types';

/**
 * Expired Token Flood Rule 클래스
 * 
 * 공격 시나리오:
 * - 공격자가 탈취한 만료된 토큰을 계속 재시도
 * - Brute-force 방식으로 시스템 부하 유발
 * 
 * 탐지 로직:
 * - 같은 IP에서 1분 내 만료된 토큰 5회 이상 사용 시 30점 부여
 */
export class ExpiredTokenFloodRule extends BaseRule {
    private readonly timeWindow: number = 60; // 60초
    private readonly threshold: number = 5; // 5회 이상
    private readonly score: number = 30; // 위험 점수

    constructor() {
        super(
            'ExpiredTokenFlood',
            '만료된 토큰 반복 시도 탐지',
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
        // 토큰이 유효하면 통과
        if (event.isValid) {
            return this.createResult(0, '토큰이 유효함');
        }

        // 만료가 아닌 다른 이유로 무효한 경우 통과
        if (!event.invalidReason?.includes('만료')) {
            return this.createResult(0, '토큰 무효 이유가 만료가 아님');
        }

        // 저장소 키 생성
        const key = `waf:expired:${event.ip}`;

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
                    `${this.timeWindow}초 내 만료된 토큰 ${count}회 시도 (임계값: ${this.threshold})`,
                    {
                        ip: event.ip,
                        attemptCount: count,
                        timeWindow: this.timeWindow,
                        threshold: this.threshold
                    }
                );
            }

            // 임계값 미만
            return this.createResult(0, `만료 토큰 시도 ${count}회 (임계값 미만)`);
        } catch (error) {
            // 저장소 에러 시 안전하게 통과
            return this.createResult(0, '저장소 에러로 인한 규칙 건너뜀');
        }
    }
}
