# 5분 빠른 시작 ⚡

JWT WAF를 5분 안에 설치하고 실행하는 가이드입니다.

## 전제 조건

- Node.js 18 이상
- npm 또는 yarn

## 1️⃣ 설치 (30초)

### npm 사용

```bash
npm install @jwt-waf/core @jwt-waf/express-adapter express
```

### yarn 사용

```bash
yarn add @jwt-waf/core @jwt-waf/express-adapter express
```

## 2️⃣ 기본 설정 (2분)

### 단계 1: Express 앱 생성

`app.ts` 파일을 생성합니다:

```typescript
import express from 'express';
import { createWafMiddleware } from '@jwt-waf/express-adapter';
import {
  WafMode,
  InMemoryStore,
  ExpiredTokenFloodRule,
  InvalidSignatureSpikeRule,
  RefreshEndpointAbuseRule,
  PrivilegeEndpointWeightingRule,
  MultiIpTokenUseRule,
  TokenReplayDetectionRule
} from '@jwt-waf/core';

const app = express();
app.use(express.json());

// WAF 미들웨어 적용
app.use('/api', createWafMiddleware({
  wafConfig: {
    mode: WafMode.OBSERVE,  // 처음에는 OBSERVE 모드로 시작
    blockThreshold: 80,
    rules: [
      new ExpiredTokenFloodRule(),
      new InvalidSignatureSpikeRule(),
      new RefreshEndpointAbuseRule(),
      new PrivilegeEndpointWeightingRule(),
      new MultiIpTokenUseRule(),
      new TokenReplayDetectionRule()
    ],
    store: new InMemoryStore(),
    verifySignature: false  // JWT 서명 검증 비활성화 (선택)
  },
  allowWithoutToken: false  // 토큰 없으면 401 응답
}));

// 테스트 엔드포인트
app.get('/api/users', (req, res) => {
  res.json({ message: '사용자 목록' });
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

### 단계 2: TypeScript 설정 (선택)

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true
  }
}
```

## 3️⃣ 실행 (10초)

```bash
# TypeScript인 경우
npx ts-node app.ts

# 또는 빌드 후 실행
npx tsc
node dist/app.js
```

## 4️⃣ 테스트 (2분)

### 정상 요청 테스트

```bash
# JWT 토큰 생성 (테스트용)
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0dXNlciIsImlhdCI6MTUxNjIzOTAyMiwiZXhwIjoxOTE2MjM5MDIyfQ.4Adcj0LKGX-lYa-d6H5Z5L4N8c7d6Z3f3f3f3f3f3f3"

# 정상 요청
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/users
```

### 공격 패턴 테스트

만료된 토큰으로 5회 연속 요청:

```bash
# 만료된 토큰
EXPIRED_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhdHRhY2tlciIsImV4cCI6MTUxNjIzOTAyMn0.abc123"

# 5회 연속 요청 (ExpiredTokenFlood 트리거)
for i in {1..5}; do
  curl -H "Authorization: Bearer $EXPIRED_TOKEN" http://localhost:3000/api/users
done
```

로그에서 WAF 분석 결과를 확인할 수 있습니다:

```json
{
  "level": "WARN",
  "message": "규칙 트리거",
  "ruleName": "ExpiredTokenFlood",
  "score": 30,
  "reason": "만료된 토큰을 60초 내에 5회 이상 시도"
}
```

## 🎉 축하합니다!

JWT WAF가 성공적으로 실행되었습니다!

## 다음 단계

### 1. OBSERVE → BLOCK 모드 전환

오탐률을 확인한 후 BLOCK 모드로 전환:

```typescript
wafConfig: {
  mode: WafMode.BLOCK,  // 차단 모드
  blockThreshold: 80
}
```

### 2. 알림 설정

Slack, Telegram, 카카오톡 알림 추가:

```typescript
import { SlackNotifier, TelegramNotifier } from '@jwt-waf/core';

wafConfig: {
  // ... 기본 설정
  notifiers: [
    new SlackNotifier('https://hooks.slack.com/...'),
    new TelegramNotifier('BOT_TOKEN', 'CHAT_ID')
  ],
  notificationRules: {
    onBlock: true,       // 차단 시 알림
    onHighRisk: 70      // 70점 이상 시 알림
  }
}
```

자세한 내용은 [알림 가이드](./NOTIFICATIONS.md)를 참고하세요.

### 3. 규칙 커스터마이징

필요에 따라 특정 규칙 비활성화 또는 커스텀 규칙 추가:

```typescript
import { BaseRule } from '@jwt-waf/core';

class MyCustomRule extends BaseRule {
  // 커스텀 로직 구현
}
```

자세한 내용은 [규칙 가이드](./RULES.md)를 참고하세요.

### 4. 프로덕션 배포

- Redis Store 사용 (분산 환경)
- 로그 수집 시스템 연동
- Prometheus 메트릭 수집
- 알림 채널 설정

자세한 내용은 [아키텍처 문서](./ARCHITECTURE.md)를 참고하세요.

## 문제 해결

### 401 Unauthorized

토큰이 없거나 형식이 잘못된 경우입니다.

```bash
# Authorization 헤더 확인
curl -v -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/users
```

### CORS 에러

CORS 미들웨어 추가:

```typescript
import cors from 'cors';
app.use(cors());
```

### 타입 에러

TypeScript 타입 정의 설치:

```bash
npm install --save-dev @types/express @types/node
```

## 더 알아보기

- [README](../README.md)
- [아키텍처](./ARCHITECTURE.md)
- [규칙 가이드](./RULES.md)
- [알림 가이드](./NOTIFICATIONS.md)
- [기여 가이드](../CONTRIBUTING.md)
