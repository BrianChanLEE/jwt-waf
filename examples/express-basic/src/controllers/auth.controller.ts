/**
 * 인증 컨트롤러
 * 
 * HTTP 요청/응답을 처리하고 서비스 계층을 호출합니다.
 */

import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';

/**
 * 로그인 컨트롤러
 * 
 * POST /api/auth/login
 * Body: { username, password }
 */
export async function login(req: Request, res: Response, next: NextFunction) {
    try {
        const { username, password } = req.body;

        // 서비스 호출
        const token = await authService.login(username, password);

        // 성공 응답
        res.json({
            success: true,
            data: {
                token,
                expiresIn: 3600
            }
        });
    } catch (error) {
        // 에러를 next()로 전달하여 전역 에러 핸들러에서 처리
        next(error);
    }
}

/**
 * 토큰 리프레시 컨트롤러
 * 
 * POST /api/auth/refresh
 * Headers: Authorization: Bearer <token>
 */
export async function refresh(req: Request, res: Response, next: NextFunction) {
    try {
        const authHeader = req.headers.authorization;
        const oldToken = authHeader?.substring(7); // "Bearer " 제거

        if (!oldToken) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: '토큰이 필요합니다'
                }
            });
        }

        // 서비스 호출
        const newToken = await authService.refreshToken(oldToken);

        // 성공 응답
        res.json({
            success: true,
            data: {
                token: newToken,
                expiresIn: 3600
            }
        });
    } catch (error) {
        next(error);
    }
}
