# Security Policy

## Supported Versions

현재 지원되는 버전:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

보안 취약점을 발견하셨다면 다음 절차를 따라주세요:

### 🚨 중요

**공개 이슈로 등록하지 마세요!** 보안 취약점은 비공개로 보고해야 합니다.

### 보고 방법

1. **GitHub Security Advisory 사용** (권장)
   - [Security Advisories](https://github.com/BrianChanLEE/jwt-waf/security/advisories) 페이지에서 "Report a vulnerability" 클릭

2. **이메일 보고**
   - 주소: security@jwt-waf.org (향후 설정 예정)

### 보고 시 포함할 정보

다음 정보를 포함해 주세요:

- 취약점 설명
- 영향 범위 (어떤 버전이 영향을 받는지)
- 재현 방법 (가능한 상세하게)
- 개념 증명 코드 (PoC)
- 가능한 해결 방법 또는 패치

### 응답 시간

- **초기 응답**: 48시간 이내
- **취약점 확인**: 7일 이내
- **패치 배포**: 심각도에 따라 1-30일

### 심각도 기준

| 심각도 | 설명 | 패치 시간 |
|--------|------|-----------|
| Critical | 원격 코드 실행, 인증 우회 | 1-3일 |
| High | 권한 상승, 민감 정보 노출 | 3-7일 |
| Medium | 서비스 거부, 정보 누출 | 7-14일 |
| Low | 기타 보안 이슈 | 14-30일 |

## Security Best Practices

### 1. JWT 서명 검증 활성화

프로덕션 환경에서는 반드시 JWT 서명 검증을 활성화하세요:

```typescript
wafConfig: {
  verifySignature: true,
  jwtSecret: process.env.JWT_SECRET  // 환경 변수 사용 필수!
}
```

### 2. 환경 변수 사용

**절대 하드코딩 금지**:

```typescript
// ❌ 나쁜 예
jwtSecret: 'my-secret-key-12345'

// ✅ 좋은 예
jwtSecret: process.env.JWT_SECRET
```

### 3. OBSERVE 모드로 시작

프로덕션 배포 시:

```typescript
// 1단계: OBSERVE 모드 (1-2주)
mode: WafMode.OBSERVE

// 2단계: 오탐률 확인 후 BLOCK 모드
mode: WafMode.BLOCK
```

### 4. Store 보안

#### InMemoryStore (개발/테스트)
- 단일 서버 환경에만 사용
- 재시작 시 상태 소실

#### RedisStore (프로덕션 권장)
```typescript
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined
});
```

### 5. 로그 보안

민감 정보 로깅 방지:

```typescript
// ❌ 토큰 전체 로깅 금지
logger.info('Token:', event.token);

// ✅ 토큰 일부만 로깅
logger.info('Token:', event.token.substring(0, 20) + '...');

// ✅ JTI만 로깅
logger.info('JTI:', event.payload?.jti);
```

### 6. 블랙리스트 관리

```typescript
import { BlacklistManager } from '@jwt-waf/core';

const blacklistManager = new BlacklistManager(store);

// 로그아웃 시 토큰 블랙리스트 추가
await blacklistManager.addToBlacklist(jti, 86400);  // 24시간
```

### 7. Rate Limiting 결합

WAF와 함께 Rate Limiting 사용 권장:

```typescript
import rateLimit from 'express-rate-limit';

// Rate Limiter
app.use(rateLimit({
  windowMs: 60000,  // 1분
  max: 100          // 최대 100 요청
}));

// WAF
app.use(createWafMiddleware({ /* ... */ }));
```

### 8. HTTPS 사용

프로덕션에서는 반드시 HTTPS:

```typescript
// Express HTTPS 설정
import https from 'https';
import fs from 'fs';

const server = https.createServer({
  key: fs.readFileSync('private-key.pem'),
  cert: fs.readFileSync('certificate.pem')
}, app);
```

## Known Security Issues

현재 알려진 보안 이슈 없음.

## Security Updates

보안 업데이트는 [Releases](https://github.com/BrianChanLEE/jwt-waf/releases) 페이지에서 확인하세요.

## Credits

보안 취약점을 책임감 있게 보고해 주신 분들:

- (향후 추가 예정)

## License

이 프로젝트는 [MIT License](./LICENSE) 하에 배포됩니다.
