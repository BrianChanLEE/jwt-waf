/**
 * Invalid Signature Spike Rule
 * 
 * 잘못된 서명의 토큰을 반복적으로 보내는 공격을 탐지합니다.
 * JWT 서명 조작 시도나 권한 상승 공격을 감지합니다.
 */

import { BaseRule } from './base';
import { RiskEvent, Store, RuleResult } from '../types';

/**
 * Invalid Signature Spike Rule 클래스
 * 
 * 공격 시나리오:
 * - 공격자가 JWT 구조를 이해하고 서명 조작 시도
 * - payload 변조를 통한 권한 상승 공격
 * 
 * 탐지 로직:
 * - 같은 IP에서 5분 내 서명 검증 실패 10회 이상 시 40점 부여
 */
export class InvalidSignatureSpikeRule extends BaseRule {
    private readonly timeWindow: number = 300; // 300초 (5분)
    private readonly threshold: number = 10; // 10회 이상
    private readonly score: number = 40; // 위험 점수

    constructor() {
        super(
            'InvalidSignatureSpike',
            '잘못된 서명 반복 탐지',
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

        // 서명 검증 실패가 아닌 경우 통과
        if (!event.invalidReason?.includes('서명')) {
            return this.createResult(0, '토큰 무효 이유가 서명 검증 실패가 아님');
        }

        // 저장소 키 생성
        const key = `waf:invalid_sig:${event.ip}`;

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
                    `${this.timeWindow}초 내 서명 검증 실패 ${count}회 (임계값: ${this.threshold})`,
                    {
                        ip: event.ip,
                        attemptCount: count,
                        timeWindow: this.timeWindow,
                        threshold: this.threshold
                    }
                );
            }

            // 임계값 미만
            return this.createResult(0, `서명 검증 실패 ${count}회 (임계값 미만)`);
        } catch (error) {
            // 저장소 에러 시 안전하게 통과
            return this.createResult(0, '저장소 에러로 인한 규칙 건너뜀');
        }
    }
}
