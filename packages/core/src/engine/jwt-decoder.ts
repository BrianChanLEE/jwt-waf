/**
 * JWT 안전 디코더
 * 
 * JWT 토큰을 안전하게 디코드합니다.
 * 서명 검증 실패 시에도 페이로드 정보를 추출할 수 있습니다 (관찰 모드).
 */

import { JwtPayload } from '../types';

/**
 * JWT 디코딩 결과
 */
export interface DecodeResult {
    /** 디코딩된 페이로드 (실패 시 null) */
    payload: JwtPayload | null;
    /** 디코딩/검증 성공 여부 */
    isValid: boolean;
    /** 실패 이유 (성공 시 undefined) */
    invalidReason?: string;
}

/**
 * JWT 디코더 옵션
 */
export interface DecodeOptions {
    /** 서명 검증 여부 (기본: false) */
    verify?: boolean;
    /** JWT 비밀키 (verify가 true일 때 필수) */
    secret?: string;
}

/**
 * Base64 URL 디코딩
 * 
 * JWT는 Base64 URL-safe 인코딩을 사용합니다.
 * 
 * @param base64Url - Base64 URL 인코딩된 문자열
 * @returns 디코딩된 문자열
 * @private
 */
function base64UrlDecode(base64Url: string): string {
    // Base64 URL을 표준 Base64로 변환
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');

    // 패딩 추가
    while (base64.length % 4 !== 0) {
        base64 += '=';
    }

    // Buffer를 사용하여 디코딩
    return Buffer.from(base64, 'base64').toString('utf-8');
}

/**
 * JWT 토큰을 안전하게 디코드
 * 
 * 이 함수는 JWT 토큰을 디코드하여 페이로드를 반환합니다.
 * 서명 검증은 선택사항이며, 검증 실패 시에도 페이로드를 반환합니다 (관찰 모드).
 * 
 * @param token - JWT 토큰 문자열
 * @param options - 디코드 옵션
 * @returns 디코드 결과
 * 
 * @example
 * ```typescript
 * // 서명 검증 없이 디코딩만 수행
 * const result = decodeJwt(token);
 * 
 * // 서명 검증 포함
 * const result = decodeJwt(token, { verify: true, secret: 'my-secret' });
 * ```
 */
export function decodeJwt(
    token: string,
    options: DecodeOptions = {}
): DecodeResult {
    try {
        // JWT 형식 검증: 3개 부분으로 구성되어야 함
        const parts = token.split('.');
        if (parts.length !== 3) {
            return {
                payload: null,
                isValid: false,
                invalidReason: 'JWT 형식이 올바르지 않습니다. 3개 부분(header.payload.signature)으로 구성되어야 합니다.'
            };
        }

        const [headerB64, payloadB64, signatureB64] = parts;

        // 페이로드 디코딩
        let payload: JwtPayload;
        try {
            const payloadJson = base64UrlDecode(payloadB64);
            payload = JSON.parse(payloadJson);
        } catch (error) {
            return {
                payload: null,
                isValid: false,
                invalidReason: '페이로드 디코딩에 실패했습니다.'
            };
        }

        // 서명 검증이 요청되지 않았으면 디코딩만 수행
        if (!options.verify) {
            // 만료 시간 체크 (서명 검증 없어도 만료는 확인)
            if (payload.exp && payload.exp * 1000 < Date.now()) {
                return {
                    payload,
                    isValid: false,
                    invalidReason: '토큰이 만료되었습니다.'
                };
            }

            return {
                payload,
                isValid: true
            };
        }

        // 서명 검증 수행
        if (!options.secret) {
            return {
                payload,
                isValid: false,
                invalidReason: '서명 검증을 위해서는 secret이 필요합니다.'
            };
        }

        // 간단한 HMAC SHA256 서명 검증
        // 실제 운영 환경에서는 jsonwebtoken 라이브러리 사용 권장
        const crypto = require('crypto');

        try {
            const header = JSON.parse(base64UrlDecode(headerB64));

            // HS256만 지원 (MVP)
            if (header.alg !== 'HS256') {
                return {
                    payload,
                    isValid: false,
                    invalidReason: `지원하지 않는 알고리즘입니다: ${header.alg}. 현재는 HS256만 지원합니다.`
                };
            }

            // 서명 생성
            const data = `${headerB64}.${payloadB64}`;
            const signature = crypto
                .createHmac('sha256', options.secret)
                .update(data)
                .digest('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');

            // 서명 검증
            if (signature !== signatureB64) {
                return {
                    payload,
                    isValid: false,
                    invalidReason: '서명 검증에 실패했습니다.'
                };
            }

            // 만료 시간 체크
            if (payload.exp && payload.exp * 1000 < Date.now()) {
                return {
                    payload,
                    isValid: false,
                    invalidReason: '토큰이 만료되었습니다.'
                };
            }

            // nbf (not before) 체크
            if (payload.nbf && payload.nbf * 1000 > Date.now()) {
                return {
                    payload,
                    isValid: false,
                    invalidReason: '토큰이 아직 유효하지 않습니다.'
                };
            }

            return {
                payload,
                isValid: true
            };
        } catch (error) {
            return {
                payload,
                isValid: false,
                invalidReason: '서명 검증 중 에러가 발생했습니다.'
            };
        }
    } catch (error) {
        // 예상치 못한 에러
        return {
            payload: null,
            isValid: false,
            invalidReason: `JWT 디코딩 중 에러가 발생했습니다: ${(error as Error).message}`
        };
    }
}
