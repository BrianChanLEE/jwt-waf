/**
 * Express WAF 미들웨어
 * 
 * Express 요청을 가로채서 WAF 엔진으로 분석하고,
 * Decision에 따라 차단하거나 허용합니다.
 */

import { Request, Response, NextFunction } from 'express';
import {
    WafEngine,
    WafConfig,
    RequestInfo,
    AnalysisResult,
    Decision,
    WafError
} from '@jwt-waf/core';

/**
 * WAF 미들웨어 옵션
 */
export interface WafMiddlewareOptions {
    /** WAF 엔진 설정 */
    wafConfig: WafConfig;

    /** 토큰이 없을 때 허용 여부 (기본: false, 401 응답) */
    allowWithoutToken?: boolean;

    /** 차단 시 콜백 */
    onBlocked?: (req: Request, res: Response, result: AnalysisResult) => void;

    /** OBSERVE 모드 콜백 */
    onObserve?: (req: Request, result: AnalysisResult) => void;
}

/**
 * Authorization 헤더에서 Bearer 토큰 추출
 * 
 * @param req - Express Request
 * @returns JWT 토큰 또는 null
 */
function extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return null;
    }

    if (!authHeader.startsWith('Bearer ')) {
        return null;
    }

    return authHeader.substring(7); // "Bearer " 제거
}

/**
 * 클라이언트 IP 주소 추출
 * 
 * Proxy 뒤에 있을 경우 X-Forwarded-For 헤더 확인
 * 
 * @param req - Express Request
 * @returns IP 주소
 */
function extractIp(req: Request): string {
    // X-Forwarded-For 헤더 확인 (프록시 환경)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
        return ips.split(',')[0].trim();
    }

    // X-Real-IP 헤더 확인
    const realIp = req.headers['x-real-ip'];
    if (realIp) {
        return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    // 직접 연결
    return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * WAF 미들웨어 생성
 * 
 * @param options - 미들웨어 옵션
 * @returns Express 미들웨어 함수
 * 
 * @example
 * ```typescript
 * const wafMiddleware = createWafMiddleware({
 *   wafConfig: {
 *     mode: WafMode.OBSERVE,
 *     blockThreshold: 80,
 *     rules: [...],
 *     store: new InMemoryStore(),
 *     verifySignature: false
 *   }
 * });
 * 
 * app.use(wafMiddleware);
 * ```
 */
export function createWafMiddleware(options: WafMiddlewareOptions) {
    const { wafConfig, allowWithoutToken = false, onBlocked, onObserve } = options;

    // WAF 엔진 초기화
    const engine = new WafEngine(wafConfig);
    const logger = wafConfig.logger;

    /**
     * 미들웨어 함수
     */
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            // JWT 토큰 추출
            const token = extractToken(req);

            // 토큰이 없을 때
            if (!token) {
                if (allowWithoutToken) {
                    // 토큰 없이 허용
                    logger?.info('토큰 없이 요청 허용', {
                        path: req.path,
                        method: req.method,
                        ip: extractIp(req)
                    });
                    return next();
                }

                // 401 Unauthorized 응답
                logger?.warn('토큰 없음 - 인증 실패', {
                    path: req.path,
                    method: req.method,
                    ip: extractIp(req)
                });

                return res.status(401).json({
                    success: false,
                    error: {
                        code: 'UNAUTHORIZED',
                        message: '인증 토큰이 필요합니다'
                    }
                });
            }

            // RequestInfo 생성
            const requestInfo: RequestInfo = {
                token,
                ip: extractIp(req),
                path: req.path,
                method: req.method,
                userAgent: req.headers['user-agent']
            };

            // WAF 엔진 분석
            const result = await engine.analyzeRequest(requestInfo);

            // Decision 처리
            switch (result.decision) {
                case Decision.ALLOW:
                    // 정상 허용
                    logger?.info('WAF 분석 완료 - 허용', {
                        path: req.path,
                        totalScore: result.totalScore
                    });
                    return next();

                case Decision.OBSERVE:
                    // 관찰 모드 - 로그만 남기고 허용
                    logger?.info('WAF 분석 완료 - 관찰 모드', {
                        path: req.path,
                        totalScore: result.totalScore,
                        triggeredRules: result.ruleResults.filter(r => r.score > 0).length
                    });

                    // OBSERVE 콜백 호출
                    if (onObserve) {
                        onObserve(req, result);
                    }

                    return next();

                case Decision.BLOCK:
                    // 차단
                    logger?.warn('WAF 차단', {
                        path: req.path,
                        totalScore: result.totalScore,
                        triggeredRules: result.ruleResults.filter(r => r.score > 0).map(r => ({
                            rule: r.ruleName,
                            score: r.score,
                            reason: r.reason
                        }))
                    });

                    // BLOCK 콜백 호출
                    if (onBlocked) {
                        return onBlocked(req, res, result);
                    }

                    // 기본 403 응답
                    return res.status(403).json({
                        success: false,
                        error: {
                            code: 'WAF_BLOCKED',
                            message: '요청이 차단되었습니다',
                            details: {
                                totalScore: result.totalScore,
                                decision: result.decision
                            }
                        }
                    });

                default:
                    // 예상치 못한 Decision
                    logger?.error('알 수 없는 Decision 값', undefined, {
                        decision: result.decision
                    });
                    return next();
            }
        } catch (error) {
            // WAF 엔진 에러
            logger?.error('WAF 미들웨어 에러', error as Error, {
                path: req.path,
                method: req.method
            });

            // 에러 발생 시에도 요청 허용 (가용성 우선)
            return next();
        }
    };
}
