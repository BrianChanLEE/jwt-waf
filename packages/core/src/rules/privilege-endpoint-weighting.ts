/**
 * Privilege Endpoint Weighting Rule
 * 
 * 민감한 관리자 엔드포인트 접근 시 추가 점수를 부여합니다.
 * 다른 규칙과 조합되어 위험도를 증폭시킵니다.
 */

import { BaseRule } from './base';
import { RiskEvent, Store, RuleResult } from '../types';

/**
 * Privilege Endpoint Weighting Rule 클래스
 * 
 * 공격 시나리오:
 * - 공격자가 관리자 엔드포인트 무단 접근 시도
 * - 권한 상승 공격
 * 
 * 탐지 로직:
 * - 관리자 엔드포인트 접근 시 기본 20점 추가
 * - 단독으로는 차단하지 않고, 다른 규칙과 조합 시 위험도 증폭
 */
export class PrivilegeEndpointWeightingRule extends BaseRule {
    private readonly score: number = 20; // 위험 점수

    // 민감한 엔드포인트 패턴
    private readonly privilegePatterns: RegExp[] = [
        /\/admin\//i,
        /\/api\/admin\//i,
        /\/api\/users\/delete/i,
        /\/api\/user\/delete/i,
        /\/api\/config\//i,
        /\/api\/settings\//i,
        /\/api\/system\//i,
        /\/management\//i,
        /\/api\/management\//i
    ];

    constructor() {
        super(
            'PrivilegeEndpointWeighting',
            '민감한 엔드포인트 접근 가중치',
            1,
            true
        );
    }

    /**
     * 경로가 민감한 엔드포인트인지 확인
     * 
     * @param path - 요청 경로
     * @returns 민감한 엔드포인트 여부
     * @private
     */
    private isPrivilegedEndpoint(path: string): boolean {
        return this.privilegePatterns.some(pattern => pattern.test(path));
    }

    /**
     * 이벤트 분석
     * 
     * @param event - 위험 이벤트
     * @param store - 저장소
     * @returns 규칙 분석 결과
     */
    async analyze(event: RiskEvent, store: Store): Promise<RuleResult> {
        // 민감한 엔드포인트가 아니면 통과
        if (!this.isPrivilegedEndpoint(event.path)) {
            return this.createResult(0, '일반 엔드포인트 접근');
        }

        // 민감한 엔드포인트 접근 시 점수 부여
        return this.createResult(
            this.score,
            '민감한 관리자 엔드포인트 접근',
            {
                path: event.path,
                ip: event.ip,
                userId: event.payload?.sub,
                method: event.method
            }
        );
    }
}
