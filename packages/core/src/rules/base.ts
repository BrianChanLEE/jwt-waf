/**
 * 규칙 베이스 클래스
 * 
 * 공통 로직을 제공하는 추상 베이스 클래스입니다.
 * 모든 구체적인 규칙은 이 클래스를 상속할 수 있습니다.
 */

import { Rule, RuleResult, RiskEvent, Store } from '../types';

/**
 * 규칙 베이스 추상 클래스
 */
export abstract class BaseRule implements Rule {
    constructor(
        public readonly name: string,
        public readonly description: string,
        public readonly weight: number = 1,
        public readonly enabled: boolean = true
    ) { }

    /**
     * 규칙 분석 메서드 (추상 메서드)
     * 
     * 각 구체적인 규칙에서 구현해야 합니다.
     * 
     * @param event - 위험 이벤트
     * @param store - 저장소
     * @returns 규칙 분석 결과
     */
    abstract analyze(event: RiskEvent, store: Store): Promise<RuleResult>;

    /**
     * 규칙 결과 생성 헬퍼
     * 
     * @param score - 위험 점수 (0~100)
     * @param reason - 트리거 이유
     * @param details - 추가 세부 정보
     * @returns 규칙 분석 결과
     */
    protected createResult(
        score: number,
        reason: string,
        details?: Record<string, any>
    ): RuleResult {
        return {
            ruleName: this.name,
            score: Math.min(100, Math.max(0, score)), // 0~100 범위로 제한
            reason,
            details
        };
    }

    /**
     * 규칙 통과 결과 생성 (점수 0)
     */
    protected passResult(): RuleResult {
        return {
            ruleName: this.name,
            score: 0,
            reason: '정상'
        };
    }

    /**
     * Store에서 카운터 값을 가져오는 헬퍼
     */
    protected async getCounterValue(store: Store, key: string): Promise<number> {
        const value = await store.get(key);
        return value ? parseInt(value, 10) : 0;
    }

    /**
     * Store에서 카운터를 증가시키는 헬퍼
     */
    protected async incrementCounter(
        store: Store,
        key: string,
        delta: number = 1,
        ttl?: number
    ): Promise<number> {
        const count = await store.increment(key, delta);
        if (ttl) {
            await store.expire(key, ttl);
        }
        return count;
    }
}
