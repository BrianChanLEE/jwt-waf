/**
 * 코어 엔진 테스트 시뮬레이션
 * 
 * 실제 동작을 확인하기 위한 간단한 테스트 시뮬레이션입니다.
 */

import {
    WafEngine,
    WafMode,
    Decision,
    InMemoryStore,
    BaseRule,
    RiskEvent,
    Store,
    RuleResult,
    decodeJwt,
    buildRiskEvent,
    RequestInfo
} from '../../index';

/**
 * 더미 규칙: 항상 0점 반환 (통과)
 */
class PassRule extends BaseRule {
    constructor() {
        super('PassRule', '항상 통과하는 테스트 규칙', 1, true);
    }

    async analyze(event: RiskEvent, store: Store): Promise<RuleResult> {
        return this.createResult(0, '정상 요청');
    }
}

/**
 * 더미 규칙: 항상 50점 반환
 */
class MediumRiskRule extends BaseRule {
    constructor() {
        super('MediumRiskRule', '중간 위험 점수를 반환하는 테스트 규칙', 1, true);
    }

    async analyze(event: RiskEvent, store: Store): Promise<RuleResult> {
        return this.createResult(50, '중간 위험 감지');
    }
}

/**
 * 더미 규칙: 항상 80점 반환 (높은 위험)
 */
class HighRiskRule extends BaseRule {
    constructor() {
        super('HighRiskRule', '높은 위험 점수를 반환하는 테스트 규칙', 1, true);
    }

    async analyze(event: RiskEvent, store: Store): Promise<RuleResult> {
        return this.createResult(80, '높은 위험 감지');
    }
}

/**
 * 테스트용 간단한 JWT 생성
 * 
 * @param payload - 페이로드
 * @param secret - 비밀키
 * @returns JWT 토큰
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
 * 테스트 실행 함수
 */
async function runTests() {
    console.log('===== JWT WAF 코어 엔진 테스트 시작 =====\n');

    const store = new InMemoryStore();

    // 테스트 1: JWT 디코더 - 정상 토큰
    console.log('테스트 1: JWT 디코더 - 정상 토큰');
    const validPayload = {
        sub: 'user123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600 // 1시간 후 만료
    };
    const validToken = createTestJwt(validPayload);
    const decodeResult1 = decodeJwt(validToken, { verify: true, secret: 'test-secret' });
    console.log('  결과:', decodeResult1.isValid ? '✅ 통과' : '❌ 실패');
    console.log('  페이로드:', decodeResult1.payload);
    console.log('');

    // 테스트 2: JWT 디코더 - 만료된 토큰
    console.log('테스트 2: JWT 디코더 - 만료된 토큰');
    const expiredPayload = {
        sub: 'user123',
        iat: Math.floor(Date.now() / 1000) - 7200,
        exp: Math.floor(Date.now() / 1000) - 3600 // 1시간 전 만료
    };
    const expiredToken = createTestJwt(expiredPayload);
    const decodeResult2 = decodeJwt(expiredToken);
    console.log('  결과:', !decodeResult2.isValid ? '✅ 만료 감지' : '❌ 만료 미감지');
    console.log('  이유:', decodeResult2.invalidReason);
    console.log('  페이로드:', decodeResult2.payload); // 만료되어도 페이로드는 추출됨
    console.log('');

    // 테스트 3: JWT 디코더 - 잘못된 서명
    console.log('테스트 3: JWT 디코더 - 잘못된 서명');
    const decodeResult3 = decodeJwt(validToken, { verify: true, secret: 'wrong-secret' });
    console.log('  결과:', !decodeResult3.isValid ? '✅ 서명 검증 실패 감지' : '❌ 검증 통과 (오류)');
    console.log('  이유:', decodeResult3.invalidReason);
    console.log('  페이로드:', decodeResult3.payload); // 서명 실패해도 페이로드는 추출됨
    console.log('');

    // 테스트 4: OBSERVE 모드 - PassRule
    console.log('테스트 4: OBSERVE 모드 - PassRule (0점)');
    const engine1 = new WafEngine({
        mode: WafMode.OBSERVE,
        blockThreshold: 80,
        rules: [new PassRule()],
        store,
        verifySignature: false
    });
    const requestInfo1: RequestInfo = {
        token: validToken,
        ip: '192.168.1.100',
        path: '/api/users',
        method: 'GET'
    };
    const result1 = await engine1.analyzeRequest(requestInfo1);
    console.log('  Decision:', result1.decision, result1.decision === Decision.OBSERVE ? '✅' : '❌');
    console.log('  총 점수:', result1.totalScore);
    console.log('');

    // 테스트 5: OBSERVE 모드 - HighRiskRule (임계값 초과해도 OBSERVE)
    console.log('테스트 5: OBSERVE 모드 - HighRiskRule (80점, 임계값 80)');
    const engine2 = new WafEngine({
        mode: WafMode.OBSERVE,
        blockThreshold: 80,
        rules: [new HighRiskRule()],
        store,
        verifySignature: false
    });
    const result2 = await engine2.analyzeRequest(requestInfo1);
    console.log('  Decision:', result2.decision, result2.decision === Decision.OBSERVE ? '✅' : '❌');
    console.log('  총 점수:', result2.totalScore);
    console.log('  (OBSERVE 모드이므로 점수와 관계없이 OBSERVE)');
    console.log('');

    // 테스트 6: BLOCK 모드 - MediumRiskRule (임계값 미만)
    console.log('테스트 6: BLOCK 모드 - MediumRiskRule (50점, 임계값 80)');
    const engine3 = new WafEngine({
        mode: WafMode.BLOCK,
        blockThreshold: 80,
        rules: [new MediumRiskRule()],
        store,
        verifySignature: false
    });
    const result3 = await engine3.analyzeRequest(requestInfo1);
    console.log('  Decision:', result3.decision, result3.decision === Decision.ALLOW ? '✅' : '❌');
    console.log('  총 점수:', result3.totalScore);
    console.log('');

    // 테스트 7: BLOCK 모드 - HighRiskRule (임계값 초과)
    console.log('테스트 7: BLOCK 모드 - HighRiskRule (80점, 임계값 80)');
    const engine4 = new WafEngine({
        mode: WafMode.BLOCK,
        blockThreshold: 80,
        rules: [new HighRiskRule()],
        store,
        verifySignature: false
    });
    const result4 = await engine4.analyzeRequest(requestInfo1);
    console.log('  Decision:', result4.decision, result4.decision === Decision.BLOCK ? '✅' : '❌');
    console.log('  총 점수:', result4.totalScore);
    console.log('');

    // 테스트 8: 규칙 체이닝 (여러 규칙 동시 실행)
    console.log('테스트 8: 규칙 체이닝 - PassRule + MediumRiskRule');
    const engine5 = new WafEngine({
        mode: WafMode.BLOCK,
        blockThreshold: 80,
        rules: [new PassRule(), new MediumRiskRule()],
        store,
        verifySignature: false
    });
    const result5 = await engine5.analyzeRequest(requestInfo1);
    console.log('  Decision:', result5.decision, result5.decision === Decision.ALLOW ? '✅' : '❌');
    console.log('  총 점수:', result5.totalScore, '(0 + 50 = 50)');
    console.log('  실행된 규칙 수:', result5.ruleResults.length);
    console.log('');

    // 테스트 9: 서명 검증 활성화
    console.log('테스트 9: 서명 검증 활성화');
    const engine6 = new WafEngine({
        mode: WafMode.OBSERVE,
        blockThreshold: 80,
        rules: [new PassRule()],
        store,
        verifySignature: true,
        jwtSecret: 'test-secret'
    });
    const result6 = await engine6.analyzeRequest(requestInfo1);
    console.log('  Decision:', result6.decision);
    console.log('  (서명 검증 통과)');
    console.log('');

    console.log('===== 모든 테스트 완료 =====');

    // 저장소 정리
    store.destroy();
}

// 테스트 실행
runTests().catch(error => {
    console.error('테스트 실행 중 에러:', error);
    process.exit(1);
});
