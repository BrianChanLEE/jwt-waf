/**
 * 사용자 컨트롤러
 * 
 * 사용자 관련 HTTP 요청/응답을 처리합니다.
 */

import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service';

/**
 * 모든 사용자 조회
 * 
 * GET /api/users
 */
export async function getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
        const users = await userService.getAllUsers();

        res.json({
            success: true,
            data: users
        });
    } catch (error) {
        next(error);
    }
}

/**
 * 사용자 ID로 조회
 * 
 * GET /api/users/:id
 */
export async function getUserById(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const user = await userService.getUserById(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: '사용자를 찾을 수 없습니다'
                }
            });
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        next(error);
    }
}

/**
 * 사용자 삭제 (관리자 전용)
 * 
 * DELETE /api/admin/users/:id
 */
export async function deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const deleted = await userService.deleteUser(id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: '사용자를 찾을 수 없습니다'
                }
            });
        }

        res.json({
            success: true,
            data: {
                message: '사용자가 삭제되었습니다'
            }
        });
    } catch (error) {
        next(error);
    }
}
