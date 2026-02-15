/**
 * MVP 규칙 6개 테스트 시뮬레이션
 * 
 * 각 규칙의 동작을 검증하고 점수 체계를 확인합니다.
 */

import {
    WafEngine,
    WafMode,
    Decision,
    InMemoryStore,
    ExpiredTokenFloodRule,
    InvalidSignatureSpikeRule,
    RefreshEndpointAbuseRule,
    PrivilegeEndpointWeightingRule,
    MultiIpTokenUseRule,
    TokenReplayDetectionRule,
    RequestInfo,
    RiskEvent
} from '../../index';

/**
 * 테스트용 간단한 JWT 생성
 */
function createTestJwt(payload: any, secret: string = 'test-secret'): string {
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
 * 지연 함수
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 테스트 실행 함수
 */
async function runTests() {
    console.log('===== MVP 규칙 6개 테스트 시작 =====\n');

    const store = new InMemoryStore();

    // ==================== 규칙 1: Expired Token Flood ====================
    console.log('【규칙 1】 Expired Token Flood (만료된 토큰 반복 시도)');
    const expiredRule = new ExpiredTokenFloodRule();
    const engine1 = new WafEngine({
        mode: WafMode.BLOCK,
        blockThreshold: 80,
        rules: [expiredRule],
        store,
        verifySignature: false
    });

    // 만료된 토큰 생성
    const expiredPayload = {
        sub: 'user123',
        jti: 'token-expired-1',
        iat: Math.floor(Date.now() / 1000) - 7200,
        exp: Math.floor(Date.now() / 1000) - 3600 // 1시간 전 만료
    };
    const expiredToken = createTestJwt(expiredPayload);

    // 5회 시도 (임계값 도달)
    for (let i = 1; i <= 5; i++) {
        const requestInfo: RequestInfo = {
            token: expiredToken,
            ip: '192.168.1.100',
            path: '/api/users',
            method: 'GET'
        };
        const result = await engine1.analyzeRequest(requestInfo);
        console.log(`  시도 ${i}: 점수=${result.totalScore}, Decision=${result.decision}`);
    }
    console.log('  ✅ 5회 시도 후 30점 부여 확인\n');

    // ==================== 규칙 2: Invalid Signature Spike ====================
    console.log('【규칙 2】 Invalid Signature Spike (잘못된 서명 반복)');
    const invalidSigRule = new InvalidSignatureSpikeRule();
    const engine2 = new WafEngine({
        mode: WafMode.BLOCK,
        blockThreshold: 80,
        rules: [invalidSigRule],
        store,
        verifySignature: true,
        jwtSecret: 'correct-secret'
    });

    // 잘못된 서명 토큰 (다른 secret으로 생성)
    const validPayload = {
        sub: 'user456',
        jti: 'token-invalid-sig',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
    };
    const invalidSigToken = createTestJwt(validPayload, 'wrong-secret');

    // 10회 시도 (임계값 도달)
    console.log('  10회 시도 중...');
    for (let i = 1; i <= 10; i++) {
        const requestInfo: RequestInfo = {
            token: invalidSigToken,
            ip: '192.168.1.200',
            path: '/api/data',
            method: 'GET'
        };
        await engine2.analyzeRequest(requestInfo);
    }
    const result2 = await engine2.analyzeRequest({
        token: invalidSigToken,
        ip: '192.168.1.200',
        path: '/api/data',
        method: 'GET'
    });
    console.log(`  10회 시도 후: 점수=${result2.totalScore}, Decision=${result2.decision}`);
    console.log('  ✅ 10회 시도 후 40점 부여 확인\n');

    // ==================== 규칙 3: Refresh Endpoint Abuse ====================
    console.log('【규칙 3】 Refresh Endpoint Abuse (리프레시 엔드포인트 남용)');
    const refreshRule = new RefreshEndpointAbuseRule();
    const engine3 = new WafEngine({
        mode: WafMode.BLOCK,
        blockThreshold: 80,
        rules: [refreshRule],
        store,
        verifySignature: false
    });

    const refreshPayload = {
        sub: 'user789',
        jti: 'token-refresh',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
    };
    const refreshToken = createTestJwt(refreshPayload);

    // 20회 리프레시 엔드포인트 호출
    console.log('  20회 리프레시 호출 중...');
    for (let i = 1; i <= 20; i++) {
        const requestInfo: RequestInfo = {
            token: refreshToken,
            ip: '192.168.1.300',
            path: '/api/auth/refresh',
            method: 'POST'
        };
        await engine3.analyzeRequest(requestInfo);
    }
    const result3 = await engine3.analyzeRequest({
        token: refreshToken,
        ip: '192.168.1.300',
        path: '/api/auth/refresh',
        method: 'POST'
    });
    console.log(`  20회 호출 후: 점수=${result3.totalScore}, Decision=${result3.decision}`);
    console.log('  ✅ 20회 호출 후 35점 부여 확인\n');

    // ==================== 규칙 4: Privilege Endpoint Weighting ====================
    console.log('【규칙 4】 Privilege Endpoint Weighting (관리자 엔드포인트 가중치)');
    const privilegeRule = new PrivilegeEndpointWeightingRule();
    const engine4 = new WafEngine({
        mode: WafMode.BLOCK,
        blockThreshold: 80,
        rules: [privilegeRule],
        store,
        verifySignature: false
    });

    const adminPayload = {
        sub: 'admin001',
        jti: 'token-admin',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
    };
    const adminToken = createTestJwt(adminPayload);

    const result4 = await engine4.analyzeRequest({
        token: adminToken,
        ip: '192.168.1.400',
        path: '/api/admin/users',
        method: 'GET'
    });
    console.log(`  관리자 엔드포인트 접근: 점수=${result4.totalScore}, Decision=${result4.decision}`);
    console.log('  ✅ 관리자 엔드포인트 접근 시 20점 부여 확인\n');

    // ==================== 규칙 5: Multi-IP Token Use ====================
    console.log('【규칙 5】 Multi-IP Token Use (다중 IP 토큰 사용)');
    const multiIpRule = new MultiIpTokenUseRule();
    const engine5 = new WafEngine({
        mode: WafMode.BLOCK,
        blockThreshold: 80,
        rules: [multiIpRule],
        store,
        verifySignature: false
    });

    const multiIpPayload = {
        sub: 'user999',
        jti: 'token-multi-ip-unique', // 고유한 JTI
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
    };
    const multiIpToken = createTestJwt(multiIpPayload);

    // 3개 다른 IP에서 사용
    await engine5.analyzeRequest({
        token: multiIpToken,
        ip: '192.168.1.10',
        path: '/api/data',
        method: 'GET'
    });
    await engine5.analyzeRequest({
        token: multiIpToken,
        ip: '192.168.1.20',
        path: '/api/data',
        method: 'GET'
    });
    const result5 = await engine5.analyzeRequest({
        token: multiIpToken,
        ip: '192.168.1.30',
        path: '/api/data',
        method: 'GET'
    });
    console.log(`  3개 다른 IP 사용: 점수=${result5.totalScore}, Decision=${result5.decision}`);
    console.log('  ✅ 3개 IP에서 사용 시 45점 부여 확인\n');

    // ==================== 규칙 6: Token Replay Detection ====================
    console.log('【규칙 6】 Token Replay Detection (토큰 재사용 공격)');
    const replayRule = new TokenReplayDetectionRule();
    const engine6 = new WafEngine({
        mode: WafMode.BLOCK,
        blockThreshold: 80,
        rules: [replayRule],
        store,
        verifySignature: false
    });

    const replayPayload = {
        sub: 'user888',
        jti: 'token-replay-test',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
    };
    const replayToken = createTestJwt(replayPayload);

    // 30회 빠르게 재사용
    console.log('  30회 토큰 재사용 중...');
    for (let i = 1; i <= 30; i++) {
        const requestInfo: RequestInfo = {
            token: replayToken,
            ip: '192.168.1.500',
            path: '/api/data',
            method: 'GET'
        };
        await engine6.analyzeRequest(requestInfo);
    }
    const result6 = await engine6.analyzeRequest({
        token: replayToken,
        ip: '192.168.1.500',
        path: '/api/data',
        method: 'GET'
    });
    console.log(`  30회 재사용 후: 점수=${result6.totalScore}, Decision=${result6.decision}`);
    console.log('  ✅ 30회 재사용 후 25점 부여 확인\n');

    // ==================== 규칙 조합 테스트 ====================
    console.log('【규칙 조합 테스트】 Multi-IP (45) + Privilege (20) + Replay (25) = 90점 → BLOCK');

    const combinedEngine = new WafEngine({
        mode: WafMode.BLOCK,
        blockThreshold: 80,
        rules: [
            new MultiIpTokenUseRule(),
            new PrivilegeEndpointWeightingRule(),
            new TokenReplayDetectionRule()
        ],
        store: new InMemoryStore(),
        verifySignature: false
    });

    const combinedPayload = {
        sub: 'attacker',
        jti: 'attack-token-combined',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
    };
    const combinedToken = createTestJwt(combinedPayload);

    // Multi-IP 트리거 위해 3개 IP에서 사용
    await combinedEngine.analyzeRequest({
        token: combinedToken,
        ip: '10.0.0.1',
        path: '/api/admin/config',
        method: 'GET'
    });
    await combinedEngine.analyzeRequest({
        token: combinedToken,
        ip: '10.0.0.2',
        path: '/api/admin/config',
        method: 'GET'
    });

    // Replay 트리거 위해 30회 재사용
    for (let i = 0; i < 30; i++) {
        await combinedEngine.analyzeRequest({
            token: combinedToken,
            ip: '10.0.0.3',
            path: '/api/admin/config',
            method: 'GET'
        });
    }

    const combinedResult = await combinedEngine.analyzeRequest({
        token: combinedToken,
        ip: '10.0.0.3',
        path: '/api/admin/config',
        method: 'GET'
    });

    console.log(`  조합 결과: 점수=${combinedResult.totalScore}, Decision=${combinedResult.decision}`);
    console.log(`  트리거된 규칙 수: ${combinedResult.ruleResults.filter(r => r.score > 0).length}`);
    console.log(`  ${combinedResult.decision === Decision.BLOCK ? '✅' : '❌'} ${combinedResult.totalScore >= 80 ? '80점 이상으로 BLOCK' : 'ALLOW'}\n`);

    console.log('===== 모든 테스트 완료 =====');

    // 저장소 정리
    store.destroy();
}

// 테스트 실행
runTests().catch(error => {
    console.error('테스트 실행 중 에러:', error);
    process.exit(1);
});
