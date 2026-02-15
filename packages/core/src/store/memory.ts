/**
 * 인메모리 저장소 구현
 * 
 * 간단한 Map 기반 저장소로, 개발 및 테스트 용도로 사용됩니다.
 * 운영 환경에서는 RedisStore로 교체하는 것을 권장합니다.
 */

import { Store } from '../types';

/**
 * 저장된 값의 메타데이터
 */
interface StoredValue {
    /** 실제 값 */
    value: string;
    /** 만료 시간 (Unix timestamp ms, 없으면 undefined) */
    expiresAt?: number;
}

/**
 * 인메모리 저장소 클래스
 * 
 * TTL을 지원하는 간단한 키-값 저장소입니다.
 * 메모리에만 저장되므로 프로세스 재시작 시 데이터가 사라집니다.
 */
export class InMemoryStore implements Store {
    private store: Map<string, StoredValue> = new Map();
    private cleanupInterval: NodeJS.Timeout;

    /**
     * 생성자
     * 
     * @param cleanupIntervalMs - 만료된 키 정리 주기 (ms, 기본: 60초)
     */
    constructor(cleanupIntervalMs: number = 60000) {
        // 주기적으로 만료된 키 삭제
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, cleanupIntervalMs);
    }

    /**
     * 값 조회
     * 
     * @param key - 조회할 키
     * @returns 값 (없거나 만료되었으면 null)
     */
    async get(key: string): Promise<string | null> {
        const stored = this.store.get(key);

        if (!stored) {
            return null;
        }

        // TTL 체크
        if (stored.expiresAt && Date.now() > stored.expiresAt) {
            this.store.delete(key);
            return null;
        }

        return stored.value;
    }

    /**
     * 값 저장
     * 
     * @param key - 저장할 키
     * @param value - 저장할 값
     * @param ttlSeconds - TTL (초 단위, 선택사항)
     */
    async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
        const expiresAt = ttlSeconds
            ? Date.now() + ttlSeconds * 1000
            : undefined;

        this.store.set(key, { value, expiresAt });
    }

    /**
     * 숫자 값 증가
     * 
     * @param key - 증가시킬 키
     * @param delta - 증가량 (기본값: 1)
     * @returns 증가 후 값
     */
    async increment(key: string, delta: number = 1): Promise<number> {
        const current = await this.get(key);
        const currentValue = current ? parseInt(current, 10) : 0;
        const newValue = currentValue + delta;

        // 기존 TTL 유지
        const stored = this.store.get(key);
        const ttlSeconds = stored?.expiresAt
            ? Math.max(0, Math.floor((stored.expiresAt - Date.now()) / 1000))
            : undefined;

        await this.set(key, newValue.toString(), ttlSeconds);
        return newValue;
    }

    /**
     * 키 삭제
     * 
     * @param key - 삭제할 키
     */
    async delete(key: string): Promise<void> {
        this.store.delete(key);
    }

    /**
     * TTL 설정
     * 
     * @param key - 대상 키
     * @param ttlSeconds - TTL (초 단위)
     */
    async expire(key: string, ttlSeconds: number): Promise<void> {
        const stored = this.store.get(key);
        if (stored) {
            stored.expiresAt = Date.now() + ttlSeconds * 1000;
        }
    }

    /**
     * 패턴 매칭 키 조회
     * 
     * @param pattern - 검색 패턴 (간단한 prefix 매칭, 예: "waf:*")
     * @returns 매칭되는 키 배열
     */
    async keys(pattern: string): Promise<string[]> {
        const prefix = pattern.replace('*', '');
        const matchingKeys: string[] = [];

        for (const key of this.store.keys()) {
            if (key.startsWith(prefix)) {
                // TTL 체크
                const stored = this.store.get(key);
                if (stored && (!stored.expiresAt || Date.now() <= stored.expiresAt)) {
                    matchingKeys.push(key);
                }
            }
        }

        return matchingKeys;
    }

    /**
     * 만료된 키 정리
     * 
     * @private
     */
    private cleanup(): void {
        const now = Date.now();
        const keysToDelete: string[] = [];

        for (const [key, stored] of this.store.entries()) {
            if (stored.expiresAt && now > stored.expiresAt) {
                keysToDelete.push(key);
            }
        }

        for (const key of keysToDelete) {
            this.store.delete(key);
        }
    }

    /**
     * 저장소 종료 (cleanup interval 정리)
     */
    destroy(): void {
        clearInterval(this.cleanupInterval);
        this.store.clear();
    }
}
