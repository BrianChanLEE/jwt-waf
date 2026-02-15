/**
 * 보호된 라우트
 * 
 * JWT 인증이 필요한 엔드포인트를 정의합니다.
 */

import { Router } from 'express';
import * as userController from '../controllers/user.controller';

const router = Router();

/**
 * GET /api/users
 * 모든 사용자 조회
 */
router.get('/users', userController.getAllUsers);

/**
 * GET /api/users/:id
 * 사용자 ID로 조회
 */
router.get('/users/:id', userController.getUserById);

/**
 * DELETE /api/admin/users/:id
 * 사용자 삭제 (관리자 전용)
 */
router.delete('/admin/users/:id', userController.deleteUser);

export default router;
