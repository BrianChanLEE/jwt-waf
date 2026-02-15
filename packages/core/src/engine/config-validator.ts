/**
 * WAF 설정 검증기
 * 
 * WafConfig의 유효성을 검증합니다.
 */

import { WafConfig, WafError } from '../types';

/**
 * WAF 설정 검증
 * 
 * WafConfig가 유효한지 검증하고, 유효하지 않으면 WafError를 throw합니다.
 * 
 * @param config - 검증할 WAF 설정
 * @throws {WafError} 설정이 유효하지 않을 경우
 * 
 * @example
 * ```typescript
 * try {
 *   validateConfig(config);
 *   // 설정이 유효함
 * } catch (error) {
 *   if (error instanceof WafError) {
 *     console.error('설정 에러:', error.message);
 *   }
 * }
 * ```
 */
export function validateConfig(config: WafConfig): void {
    // 필수 필드 체크
    if (!config) {
        throw new WafError(
            'WAF 설정이 제공되지 않았습니다.',
            'CONFIG_MISSING',
            400
        );
    }

    if (!config.mode) {
        throw new WafError(
            'mode 필드가 필요합니다.',
            'CONFIG_MODE_MISSING',
            400
        );
    }

    if (config.blockThreshold === undefined || config.blockThreshold === null) {
        throw new WafError(
            'blockThreshold 필드가 필요합니다.',
            'CONFIG_THRESHOLD_MISSING',
            400
        );
    }

    if (!config.rules) {
        throw new WafError(
            'rules 필드가 필요합니다.',
            'CONFIG_RULES_MISSING',
            400
        );
    }

    if (!config.store) {
        throw new WafError(
            'store 필드가 필요합니다.',
            'CONFIG_STORE_MISSING',
            400
        );
    }

    // 값 범위 검증
    if (config.blockThreshold < 0 || config.blockThreshold > 100) {
        throw new WafError(
            'blockThreshold는 0~100 사이의 값이어야 합니다.',
            'CONFIG_THRESHOLD_OUT_OF_RANGE',
            400
        );
    }

    // 규칙 배열 검증
    if (!Array.isArray(config.rules)) {
        throw new WafError(
            'rules는 배열이어야 합니다.',
            'CONFIG_RULES_NOT_ARRAY',
            400
        );
    }

    // 규칙 이름 중복 체크
    const ruleNames = new Set<string>();
    for (const rule of config.rules) {
        if (!rule.name) {
            throw new WafError(
                '모든 규칙은 name 필드를 가져야 합니다.',
                'CONFIG_RULE_NAME_MISSING',
                400
            );
        }

        if (ruleNames.has(rule.name)) {
            throw new WafError(
                `중복된 규칙 이름이 발견되었습니다: ${rule.name}`,
                'CONFIG_RULE_NAME_DUPLICATE',
                400
            );
        }

        ruleNames.add(rule.name);
    }

    // 서명 검증 조건 체크
    if (config.verifySignature && !config.jwtSecret) {
        throw new WafError(
            'verifySignature가 true인 경우 jwtSecret이 필요합니다.',
            'CONFIG_JWT_SECRET_MISSING',
            400
        );
    }
}
