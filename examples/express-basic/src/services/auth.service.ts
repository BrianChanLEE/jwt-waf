/**
 * 인증 서비스
 * 
 * 비즈니스 로직을 처리합니다.
 */

/**
 * 테스트용 간단한 JWT 생성
 */
function createTestJwt(payload: any, secret: string = 'demo-secret'): string {
    const crypto = require('crypto');

    const header = { alg: 'HS256', typ: 'JWT' };
    const headerB64 = Buffer.from(JSON.stringify(header))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

    const payloadB64 = Buffer.from(JSON.stringify(payload))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

    const data = `${headerB64}.${payloadB64}`;
    const signature = crypto
        .createHmac('sha256', secret)
        .update(data)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

    return `${headerB64}.${payloadB64}.${signature}`;
}

/**
 * 로그인 처리
 * 
 * @param username - 사용자 이름
 * @param password - 비밀번호
 * @returns JWT 토큰
 */
export async function login(username: string, password: string): Promise<string> {
    // 실제로는 데이터베이스에서 사용자 확인
    // 예제에서는 간단히 처리
    if (!username || !password) {
        throw new Error('사용자 이름과 비밀번호가 필요합니다');
    }

    // JWT 페이로드 생성
    const payload = {
        sub: username,
        jti: `jwt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600 // 1시간 후 만료
    };

    // JWT 토큰 생성
    const token = createTestJwt(payload);

    return token;
}

/**
 * 리프레시 토큰 처리
 * 
 * @returns 새로운 JWT 토큰
 */
export async function refreshToken(oldToken: string): Promise<string> {
    // 실제로는 리프레시 토큰 검증 필요
    // 예제에서는 새 토큰만 발급

    const payload = {
        sub: 'refreshed-user',
        jti: `jwt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
    };

    return createTestJwt(payload);
}
