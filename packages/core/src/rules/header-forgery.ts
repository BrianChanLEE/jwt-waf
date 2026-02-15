/**
 * JWT 헤더 위조 탐지 규칙
 * 
 * 비정상적인 JWT 헤더 구조를 탐지합니다.
 */

import { BaseRule } from './base';
import { RiskEvent, Store, RuleResult } from '../types';

/**
 * 헤더 위조 탐지 규칙
 */
export class HeaderForgeryRule extends BaseRule {
    constructor() {
        super(
            'HeaderForgeryRule',
            'JWT 헤더 위조 공격 탐지',
            7,  // weight
            true
        );
    }

    /**
     * JWT 헤더 추출 및 파싱
     */
    private extractHeader(token: string): any | null {
        try {
            const parts = token.split('.');
            if (parts.length < 2) {
                return null;
            }

            const header = JSON.parse(
                Buffer.from(parts[0], 'base64url').toString('utf-8')
            );

            return header;
        } catch (error) {
            return null;
        }
    }

    /**
     * 헤더가 위조되었는지 체크
     */
    private isForgedHeader(header: any): { forged: boolean; reason?: string } {
        if (!header) {
            return { forged: true, reason: '헤더 파싱 실패' };
        }

        // typ 필드 체크
        if (header.typ && header.typ !== 'JWT') {
            return { forged: true, reason: `잘못된 typ: ${header.typ}` };
        }

        // alg 필드 필수
        if (!header.alg) {
            return { forged: true, reason: 'alg 필드 누락' };
        }

        // 비정상적인 필드 존재 체크
        const suspiciousFields = ['password', 'secret', 'admin', 'role', 'permissions'];
        for (const field of suspiciousFields) {
            if (header[field]) {
                return { forged: true, reason: `헤더에 비정상 필드: ${field}` };
            }
        }

        // 과도한 필드 수 (정상: 2-3개)
        const fieldCount = Object.keys(header).length;
        if (fieldCount > 5) {
            return { forged: true, reason: `과도한 헤더 필드 수: ${fieldCount}` };
        }

        return { forged: false };
    }

    /**
     * 위험 이벤트 분석
     */
    async analyze(event: RiskEvent, store: Store): Promise<RuleResult> {
        // 헤더 추출
        const header = this.extractHeader(event.token);

        // 헤더 위조 체크
        const check = this.isForgedHeader(header);

        if (!check.forged) {
            return this.passResult();
        }

        // IP별 카운터 증가
        const key = `rule:header-forgery:${event.ip}`;
        const count = await this.incrementCounter(store, key, 1, 300);  // 5분 TTL

        // 임계값 체크 (5분 내 2회)
        const threshold = 2;
        if (count >= threshold) {
            return {
                ruleName: this.name,
                score: this.weight * 5,  // 35점
                reason: `헤더 위조 ${threshold}회 이상 탐지: ${check.reason}`,
                details: {
                    reason: check.reason,
                    count,
                    threshold,
                    ip: event.ip,
                    header: header ? JSON.stringify(header) : 'null'
                }
            };
        }

        return this.passResult();
    }
}
