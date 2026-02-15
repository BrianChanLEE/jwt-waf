/**
 * JWT WAF Express 예제 앱
 * 
 * WAF 미들웨어를 사용하는 실제 Express 애플리케이션입니다.
 */

import express, { Request, Response, NextFunction } from 'express';
import { createWafMiddleware } from '@jwt-waf/express-adapter';
import {
    WafMode,
    InMemoryStore,
    ExpiredTokenFloodRule,
    InvalidSignatureSpikeRule,
    RefreshEndpointAbuseRule,
    PrivilegeEndpointWeightingRule,
    MultiIpTokenUseRule,
    TokenReplayDetectionRule,
    ConsoleLogger
} from '@jwt-waf/core';

import authRoutes from './routes/auth.routes';
import protectedRoutes from './routes/protected.routes';

const app = express();
const port = 3000;

// 미들웨어
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 로거 생성
const logger = new ConsoleLogger();

// WAF 미들웨어 설정
const wafMiddleware = createWafMiddleware({
    wafConfig: {
        mode: WafMode.OBSERVE, // 기본 관찰 모드
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
        verifySignature: false, // 예제에서는 서명 검증 비활성화
        logger
    },
    allowWithoutToken: false, // 토큰 없으면 401
    onObserve: (req, result) => {
        // OBSERVE 모드 콜백
        if (result.totalScore > 50) {
            logger.warn('높은 위험 점수 감지 (관찰 모드)', {
                path: req.path,
                totalScore: result.totalScore
            });
        }
    }
});

// 라우트 설정
// 인증 라우트는 WAF 제외 (로그인 시 토큰 없음)
app.use('/api/auth', authRoutes);

// 보호된 라우트에 WAF 적용
app.use('/api', wafMiddleware, protectedRoutes);

// 루트 경로
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'JWT WAF Express 예제 API',
        endpoints: {
            auth: {
                login: 'POST /api/auth/login',
                refresh: 'POST /api/auth/refresh'
            },
            users: {
                getAll: 'GET /api/users',
                getById: 'GET /api/users/:id'
            },
            admin: {
                deleteUser: 'DELETE /api/admin/users/:id'
            }
        }
    });
});

// 전역 에러 핸들러
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error('에러 발생', err, {
        path: req.path,
        method: req.method
    });

    const statusCode = (err as any).statusCode || 500;
    const code = (err as any).code || 'INTERNAL_ERROR';

    res.status(statusCode).json({
        success: false,
        error: {
            code,
            message: err.message
        }
    });
});

// 서버 시작
app.listen(port, () => {
    console.log(`\n===== JWT WAF Express 예제 =====`);
    console.log(`서버가 http://localhost:${port} 에서 실행 중입니다`);
    console.log(`\n사용 가능한 엔드포인트:`);
    console.log(`  POST   http://localhost:${port}/api/auth/login`);
    console.log(`  POST   http://localhost:${port}/api/auth/refresh`);
    console.log(`  GET    http://localhost:${port}/api/users`);
    console.log(`  GET    http://localhost:${port}/api/users/:id`);
    console.log(`  DELETE http://localhost:${port}/api/admin/users/:id`);
    console.log(`\nWAF 모드: OBSERVE (관찰 모드)`);
    console.log(`===============================\n`);
});

export default app;
