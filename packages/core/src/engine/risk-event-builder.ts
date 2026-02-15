/**
 * RiskEvent 생성기
 * 
 * HTTP 요청 정보와 JWT 디코드 결과를 조합하여 RiskEvent를 생성합니다.
 */

import { RiskEvent, JwtPayload } from '../types';
import { DecodeResult } from './jwt-decoder';

/**
 * 요청 정보
 * 
 * HTTP 요청에서 추출한 메타데이터입니다.
 */
export interface RequestInfo {
    /** JWT 토큰 문자열 */
    token: string;
    /** 요청 IP 주소 */
    ip: string;
    /** 요청 경로 */
    path: string;
    /** HTTP 메서드 */
    method: string;
    /** User-Agent (선택사항) */
    userAgent?: string;
    /** 추가 메타데이터 (선택사항) */
    metadata?: Record<string, any>;
}

/**
 * RiskEvent 생성
 * 
 * 요청 정보와 JWT 디코드 결과를 조합하여 RiskEvent 객체를 생성합니다.
 * 
 * @param requestInfo - 요청 정보
 * @param decodeResult - JWT 디코드 결과
 * @returns 생성된 RiskEvent
 * 
 * @example
 * ```typescript
 * const requestInfo: RequestInfo = {
 *   token: 'eyJhbGc...',
 *   ip: '192.168.1.100',
 *   path: '/api/users',
 *   method: 'GET',
 *   userAgent: 'Mozilla/5.0...'
 * };
 * 
 * const decodeResult = decodeJwt(requestInfo.token);
 * const event = buildRiskEvent(requestInfo, decodeResult);
 * ```
 */
export function buildRiskEvent(
    requestInfo: RequestInfo,
    decodeResult: DecodeResult
): RiskEvent {
    const event: RiskEvent = {
        token: requestInfo.token,
        payload: decodeResult.payload,
        isValid: decodeResult.isValid,
        invalidReason: decodeResult.invalidReason,
        ip: requestInfo.ip,
        path: requestInfo.path,
        method: requestInfo.method,
        userAgent: requestInfo.userAgent,
        timestamp: Date.now(),
        metadata: requestInfo.metadata
    };

    return event;
}

/**
 * 토큰에서 사용자 ID 추출
 * 
 * JWT 페이로드에서 사용자 ID를 추출하는 헬퍼 함수입니다.
 * 일반적으로 sub, user_id, userId 등의 필드를 확인합니다.
 * 
 * @param payload - JWT 페이로드
 * @returns 사용자 ID (없으면 undefined)
 */
export function extractUserId(payload: JwtPayload | null): string | undefined {
    if (!payload) {
        return undefined;
    }

    // 표준 sub 클레임 확인
    if (payload.sub) {
        return payload.sub;
    }

    // 일반적인 커스텀 클레임 확인
    if (payload.user_id) {
        return String(payload.user_id);
    }

    if (payload.userId) {
        return String(payload.userId);
    }

    return undefined;
}

/**
 * 토큰 만료까지 남은 시간 (초)
 * 
 * @param payload - JWT 페이로드
 * @returns 남은 시간 (초, 만료되었거나 exp 없으면 0)
 */
export function getTimeToExpiry(payload: JwtPayload | null): number {
    if (!payload || !payload.exp) {
        return 0;
    }

    const expiryTime = payload.exp * 1000; // 밀리초로 변환
    const now = Date.now();
    const remainingMs = expiryTime - now;

    return Math.max(0, Math.floor(remainingMs / 1000));
}

/**
 * 토큰이 발급된 지 얼마나 지났는지 (초)
 * 
 * @param payload - JWT 페이로드
 * @returns 발급 이후 경과 시간 (초, iat 없으면 0)
 */
export function getTokenAge(payload: JwtPayload | null): number {
    if (!payload || !payload.iat) {
        return 0;
    }

    const issuedTime = payload.iat * 1000; // 밀리초로 변환
    const now = Date.now();
    const ageMs = now - issuedTime;

    return Math.max(0, Math.floor(ageMs / 1000));
}
