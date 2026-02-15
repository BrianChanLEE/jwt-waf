/**
 * 기본 콘솔 로거 구현
 * 
 * 구조화된 로그를 콘솔에 출력합니다.
 * 운영 환경에서는 winston, pino 등 외부 로거로 교체할 수 있습니다.
 */

import { Logger } from '../types';

/**
 * 콘솔 로거 클래스
 */
export class ConsoleLogger implements Logger {
    /**
     * 정보 로그 출력
     * 
     * @param message - 로그 메시지
     * @param context - 추가 컨텍스트
     */
    info(message: string, context?: Record<string, any>): void {
        const log = {
            level: 'INFO',
            timestamp: new Date().toISOString(),
            message,
            ...context
        };
        console.log(JSON.stringify(log));
    }

    /**
     * 경고 로그 출력
     * 
     * @param message - 로그 메시지
     * @param context - 추가 컨텍스트
     */
    warn(message: string, context?: Record<string, any>): void {
        const log = {
            level: 'WARN',
            timestamp: new Date().toISOString(),
            message,
            ...context
        };
        console.warn(JSON.stringify(log));
    }

    /**
     * 에러 로그 출력
     * 
     * @param message - 로그 메시지
     * @param error - 에러 객체
     * @param context - 추가 컨텍스트
     */
    error(message: string, error?: Error, context?: Record<string, any>): void {
        const log = {
            level: 'ERROR',
            timestamp: new Date().toISOString(),
            message,
            error: error ? {
                name: error.name,
                message: error.message,
                stack: error.stack
            } : undefined,
            ...context
        };
        console.error(JSON.stringify(log));
    }
}

/**
 * 기본 로거 인스턴스
 */
export const defaultLogger = new ConsoleLogger();
