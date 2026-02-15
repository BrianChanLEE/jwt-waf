/**
 * Refresh Endpoint Abuse Rule
 * 
 * 리프레시 토큰 엔드포인트의 과도한 호출을 탐지합니다.
 * 토큰 탈취 후 무한 갱신 시도 공격을 감지합니다.
 */

import { BaseRule } from './base';
import { RiskEvent, Store, RuleResult } from '../types';
import { extractUserId } from '../engine/risk-event-builder';

/**
 * Refresh Endpoint Abuse Rule 클래스
 * 
 * 공격 시나리오:
 * - 공격자가 리프레시 엔드포인트를 과도하게 호출
 * - 토큰 탈취 후 무한 갱신 시도
 * 
 * 탐지 로직:
 * - 같은 사용자가 10분 내 리프레시 엔드포인트 20회 이상 호출 시 35점 부여
 */
export class RefreshEndpointAbuseRule extends BaseRule {
    private readonly timeWindow: number = 600; // 600초 (10분)
    private readonly threshold: number = 20; // 20회 이상
    private readonly score: number = 35; // 위험 점수

    // 리프레시 엔드포인트 패턴
    private readonly refreshPatterns: RegExp[] = [
        /\/refresh$/i,
        /\/token\/refresh$/i,
        /\/auth\/refresh$/i,
        /\/api\/refresh$/i,
        /\/api\/token\/refresh$/i,
        /\/api\/auth\/refresh$/i
    ];

    constructor() {
        super(
            'RefreshEndpointAbuse',
            '리프레시 엔드포인트 남용 탐지',
            1,
            true
        );
    }

    /**
     * 경로가 리프레시 엔드포인트인지 확인
     * 
     * @param path - 요청 경로
     * @returns 리프레시 엔드포인트 여부
     * @private
     */
    private isRefreshEndpoint(path: string): boolean {
        return this.refreshPatterns.some(pattern => pattern.test(path));
    }

    /**
     * 이벤트 분석
     * 
     * @param event - 위험 이벤트
     * @param store - 저장소
     * @returns 규칙 분석 결과
     */
    async analyze(event: RiskEvent, store: Store): Promise<RuleResult> {
        // 리프레시 엔드포인트가 아니면 통과
        if (!this.isRefreshEndpoint(event.path)) {
            return this.createResult(0, '리프레시 엔드포인트가 아님');
        }

        // 사용자 ID 추출
        const userId = extractUserId(event.payload);

        // 사용자 ID가 없으면 IP 사용 (fallback)
        const identifier = userId || event.ip;

        // 저장소 키 생성
        const key = `waf:refresh:${identifier}`;

        try {
            // 현재 카운트 증가
            const count = await store.increment(key);

            // 첫 시도면 TTL 설정
            if (count === 1) {
                await store.expire(key, this.timeWindow);
            }

            // 임계값 체크
            if (count >= this.threshold) {
                return this.createResult(
                    this.score,
                    `${this.timeWindow}초 내 리프레시 엔드포인트 ${count}회 호출 (임계값: ${this.threshold})`,
                    {
                        identifier,
                        userId,
                        ip: event.ip,
                        path: event.path,
                        attemptCount: count,
                        timeWindow: this.timeWindow,
                        threshold: this.threshold
                    }
                );
            }

            // 임계값 미만
            return this.createResult(0, `리프레시 호출 ${count}회 (임계값 미만)`);
        } catch (error) {
            // 저장소 에러 시 안전하게 통과
            return this.createResult(0, '저장소 에러로 인한 규칙 건너뜀');
        }
    }
}
