/**
 * JWT 알고리즘 혼동 공격 탐지 규칙
 * 
 * alg=none 또는 비정상 알고리즘 사용을 탐지합니다.
 */

import { BaseRule } from './base';
import { RiskEvent, Store, RuleResult } from '../types';

/**
 * 허용되는 안전한 알고리즘 목록
 */
const SAFE_ALGORITHMS = ['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512'];

/**
 * 알고리즘 혼동 공격 탐지 규칙
 */
export class AlgorithmConfusionRule extends BaseRule {
    constructor() {
        super(
            'AlgorithmConfusionRule',
            'JWT 알고리즘 혼동 공격 탐지 (alg=none 등)',
            8,  // weight
            true
        );
    }

    /**
     * JWT 헤더에서 알고리즘 추출
     */
    private extractAlgorithm(token: string): string | null {
        try {
            const parts = token.split('.');
            if (parts.length < 2) {
                return null;
            }

            // Base64 URL 디코딩
            const header = JSON.parse(
                Buffer.from(parts[0], 'base64url').toString('utf-8')
            );

            return header.alg || null;
        } catch (error) {
            return null;
        }
    }

    /**
     * 알고리즘이 의심스러운지 체크
     */
    private isSuspiciousAlgorithm(alg: string | null): boolean {
        if (!alg) {
            return true;  // 알고리즘 없음
        }

        const algUpper = alg.toUpperCase();

        // alg=none 공격
        if (algUpper === 'NONE') {
            return true;
        }

        // 안전한 알고리즘 목록에 없음
        if (!SAFE_ALGORITHMS.includes(algUpper)) {
            return true;
        }

        return false;
    }

    /**
     * 위험 이벤트 분석
     */
    async analyze(event: RiskEvent, store: Store): Promise<RuleResult> {
        // 알고리즘 추출
        const algorithm = this.extractAlgorithm(event.token);

        // 의심스러운 알고리즘 체크
        if (!this.isSuspiciousAlgorithm(algorithm)) {
            return this.passResult();
        }

        // IP별 카운터 증가
        const key = `rule:alg-confusion:${event.ip}`;
        const count = await this.incrementCounter(store, key, 1, 300);  // 5분 TTL

        // 임계값 체크 (5분 내 3회)
        const threshold = 3;
        if (count >= threshold) {
            return {
                ruleName: this.name,
                score: this.weight * 5,  // 40점
                reason: `비정상 알고리즘 ${threshold}회 이상 시도: ${algorithm || 'null'}`,
                details: {
                    algorithm: algorithm || 'null',
                    count,
                    threshold,
                    ip: event.ip
                }
            };
        }

        return this.passResult();
    }
}
