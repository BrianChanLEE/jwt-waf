/**
 * 인증 라우트
 * 
 * 인증 관련 엔드포인트를 정의합니다.
 */

import { Router } from 'express';
import * as authController from '../controllers/auth.controller';

const router = Router();

/**
 * POST /api/auth/login
 * 로그인
 */
router.post('/login', authController.login);

/**
 * POST /api/auth/refresh
 * 토큰 리프레시
 */
router.post('/refresh', authController.refresh);

export default router;
