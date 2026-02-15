/**
 * 블랙리스트 토큰 탐지 규칙
 * 
 * Store에 등록된 블랙리스트 토큰 사용을 탐지합니다.
 */

import { BaseRule } from './base';
import { RiskEvent, Store, RuleResult } from '../types';

/**
 * 블랙리스트 토큰 탐지 규칙
 */
export class BlacklistTokenRule extends BaseRule {
    constructor() {
        super(
            'BlacklistTokenRule',
            '블랙리스트 토큰 사용 탐지',
            10,  // weight (최고 가중치)
            true
        );
    }

    /**
     * 위험 이벤트 분석
     */
    async analyze(event: RiskEvent, store: Store): Promise<RuleResult> {
        // JTI가 없으면 체크 불가
        if (!event.payload?.jti) {
            return this.passResult();
        }

        const jti = event.payload.jti;

        // 블랙리스트 체크
        const blacklistKey = `blacklist:${jti}`;
        const isBlacklisted = await store.get(blacklistKey);

        if (isBlacklisted) {
            // 블랙리스트 토큰 사용 시도 카운트
            const attemptKey = `blacklist:attempt:${event.ip}`;
            const attemptCount = await this.incrementCounter(store, attemptKey, 1, 600);  // 10분 TTL

            return {
                ruleName: this.name,
                score: this.weight * 5,  // 50점 (최대)
                reason: '블랙리스트에 등록된 토큰 사용 시도',
                details: {
                    jti,
                    ip: event.ip,
                    userId: event.payload.sub,
                    attemptCount,
                    blacklistedSince: isBlacklisted
                }
            };
        }

        return this.passResult();
    }
}

/**
 * 블랙리스트 관리 유틸리티
 */
export class BlacklistManager {
    constructor(private readonly store: Store) { }

    /**
     * 토큰을 블랙리스트에 추가
     * 
     * @param jti - JWT ID
     * @param ttl - TTL (초), 기본값: 86400 (24시간)
     */
    async addToBlacklist(jti: string, ttl: number = 86400): Promise<void> {
        const key = `blacklist:${jti}`;
        const timestamp = new Date().toISOString();
        await this.store.set(key, timestamp, ttl);
    }

    /**
     * 블랙리스트에서 제거
     */
    async removeFromBlacklist(jti: string): Promise<void> {
        const key = `blacklist:${jti}`;
        await this.store.delete(key);
    }

    /**
     * 블랙리스트 확인
     */
    async isBlacklisted(jti: string): Promise<boolean> {
        const key = `blacklist:${jti}`;
        const result = await this.store.get(key);
        return result !== null;
    }

    /**
     * 모든 블랙리스트 조회
     */
    async getAllBlacklisted(): Promise<string[]> {
        const keys = await this.store.keys('blacklist:*');
        return keys
            .filter(key => !key.includes(':attempt:'))
            .map(key => key.replace('blacklist:', ''));
    }
}
