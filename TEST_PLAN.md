# Test Plan

JWT WAF 테스트 계획 문서입니다.

## Test Coverage

### Unit Tests

#### 규칙 테스트 (9개)

**기본 규칙 (6개)**:
- [x] ExpiredTokenFlood
- [x] InvalidSignatureSpike
- [x] MultiIpTokenUse
- [x] TokenReplayDetection
- [x] RefreshEndpointAbuse
- [x] PrivilegeEndpointWeighting

**추가 규칙 (3개)**:
- [ ] AlgorithmConfusionRule
- [ ] HeaderForgeryRule
- [ ] BlacklistTokenRule

#### Store 테스트

- [x] InMemoryStore
  - [x] get/set
  - [x] increment
  - [x] TTL 동작
  - [x] delete
  - [x] keys pattern search

- [ ] RedisStore (향후)
  - [ ] get/set
  - [ ] increment with TTL
  - [ ] expire
  - [ ] pipeline operations

#### Engine 테스트

- [x] 점수 계산 로직
- [x] Decision 로직 (OBSERVE vs BLOCK)
- [ ] 알림 트리거 조건
- [ ] 복합 규칙 점수 합산

### Integration Tests

#### Express Adapter

**시나리오**:
1. ✅ 정상 토큰 → 통과
2. ✅ 토큰 없음 → 401
3. ✅ 만료 토큰 5회 → 30점 (OBSERVE)
4. ✅ Multi-IP 사용 → 45점 (OBSERVE)
5. ✅ 복합 공격 → 90점 (BLOCK)

**테스트 코드 위치**:
- `packages/core/src/rules/__tests__/rules.test.ts`
- `packages/core/src/engine/__tests__/engine.test.ts`

### E2E Tests

#### 공격 시뮬레이션

**1. Expired Token Flood**:
```bash
# 5회 연속 만료 토큰 시도
for i in {1..5}; do
  curl -H "Authorization: Bearer EXPIRED_TOKEN" http://localhost:3000/api/users
done
```

**예상 결과**: 5회째에 30점 트리거

**2. Algorithm Confusion (alg=none)**:
```typescript
// JWT with alg=none
const token = base64url({ alg: 'none', typ: 'JWT' }) + '.' +
              base64url({ sub: 'attacker' }) + '.';
```

**예상 결과**: 3회 시도 후 40점 트리거

**3. Multi-IP Token Use**:
- 동일 JTI를 3개 다른 IP에서 사용
- **예상 결과**: 3번째 IP에서 45점 트리거

**4. Blacklist Token**:
```typescript
await blacklistManager.addToBlacklist(jti);
// Try using the token
```

**예상 결과**: 즉시 50점 트리거

**5. 복합 공격**:
- Multi-IP (45점) + Privilege (20점) + Replay (25점) = 90점
- **예상 결과**: BLOCK (>= 80)

#### 알림 테스트

**Slack**:
```bash
export SLACK_WEBHOOK_URL="https://hooks.slack.com/..."
node examples/express-basic/dist/observability-example.js
```

**Telegram**:
```bash
export TELEGRAM_BOT_TOKEN="..."
export TELEGRAM_CHAT_ID="..."
```

**MultiNotifier**:
- 3개 채널 동시 알림
- 1개 채널 실패 시 나머지는 성공

## Performance Tests

### 목표

| 메트릭 | 목표 | 측정 방법 |
|--------|------|-----------|
| 분석 시간 | < 10ms | 단일 요청 분석 |
| 메모리 사용 | < 50MB | InMemoryStore 기준 |
| 처리량 | >= 1000 req/s | 동시 요청 처리 |
| Store 응답 | < 1ms | InMemory get/set |

### 측정 도구

```typescript
// 분석 시간 측정
const start = Date.now();
const result = await wafEngine.analyzeRequest(requestInfo);
const duration = Date.now() - start;
console.log(`분석 시간: ${duration}ms`);
```

### 부하 테스트

**도구**: `artillery` 또는 `k6`

```yaml
# artillery.yml
config:
  target: http://localhost:3000
  phases:
    - duration: 60
      arrivalRate: 50  # 초당 50 요청

scenarios:
  - name: "JWT 검증"
    flow:
      - get:
          url: "/api/users"
          headers:
            Authorization: "Bearer {{ token }}"
```

## Security Tests

### Secret 스캔

```bash
npm run security:scan
# 또는
bash scripts/security-scan.sh
```

**검사 항목**:
- OpenAI API 키 패턴
- AWS 액세스 키 패턴
- GitHub 토큰 패턴
- 하드코딩된 비밀번호

### Dependency Audit

```bash
npm audit --audit-level=moderate
```

**통과 기준**: 
- Critical: 0
- High: 0
- Moderate: < 5 (false positive 허용)

### npm publish 테스트

```bash
cd packages/core
npm publish --dry-run

# 확인 사항:
# - package.json 필드 완성도
# - files whitelist 정확성
# - 불필요한 파일 제외
```

## Test Automation

### CI/CD 통합

**GitHub Actions**:
- Node.js 18/20 테스트
- 보안 audit
- Secret 스캔
- 빌드 검증

**Workflow 파일**:
- `.github/workflows/ci.yml`
- `.github/workflows/publish.yml`

### Pre-commit Hooks (향후)

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run security:scan && npm run build"
    }
  }
}
```

## Test Execution

### 모든 테스트 실행

```bash
# 1. 빌드
npm run build

# 2. 단위 테스트
npm test

# 3. 보안 스캔
npm run security:scan

# 4. Audit
npm audit

# 5. Dry run
cd packages/core && npm publish --dry-run
cd ../express-adapter && npm publish --dry-run
```

### 선택적 실행

```bash
# 규칙 테스트만
node packages/core/dist/rules/__tests__/rules.test.js

# 엔진 테스트만
node packages/core/dist/engine/__tests__/engine.test.js

# E2E 테스트 (예제 앱 실행 필요)
bash examples/express-basic/test-attacks.sh
```

## Test Metrics

### Coverage 목표

| 모듈 | 목표 Coverage |
|------|--------------|
| Rules | >= 80% |
| Engine | >= 90% |
| Store | >= 95% |
| Adapter | >= 70% |

### 품질 게이트

**통과 조건**:
- ✅ 모든 단위 테스트 통과
- ✅ Secret 스캔 0건
- ✅ npm audit Critical/High 0건
- ✅ 빌드 성공
- ✅ E2E 주요 시나리오 5개 통과

## Future Tests

### 향후 추가 예정

- [ ] RedisStore 테스트
- [ ] Fastify 어댑터 테스트
- [ ] Nest.js 어댑터 테스트
- [ ] 커스텀 규칙 예제 테스트
- [ ] Prometheus 메트릭 테스트
- [ ] 분산 환경 테스트
- [ ] Chaos engineering (Resilience test)

## Test Documentation

- [규칙 테스트 작성 가이드](./docs/CONTRIBUTING.md#새로운-규칙-테스트-작성)
- [E2E 테스트 시나리오](./examples/express-basic/README.md)
- [성능 벤치마크](./docs/PERFORMANCE.md) (향후)
