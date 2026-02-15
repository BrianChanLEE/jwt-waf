/**
 * 알림 시스템 타입 정의
 * 
 * WAF 이벤트를 외부 알림 채널로 전송하기 위한 인터페이스입니다.
 */

/**
 * 알림 이벤트 타입
 */
export type NotificationType = 'BLOCK' | 'HIGH_RISK' | 'ATTACK_PATTERN';

/**
 * 심각도 레벨
 */
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * 알림 이벤트
 */
export interface NotificationEvent {
    /** 이벤트 타입 */
    type: NotificationType;

    /** 심각도 */
    severity: Severity;

    /** 알림 메시지 */
    message: string;

    /** 상세 정보 */
    details: {
        ip?: string;
        path?: string;
        method?: string;
        userId?: string;
        totalScore?: number;
        rules?: string[];
        timestamp: number;
    };
}

/**
 * Notifier 인터페이스
 * 
 * 외부 알림 채널로 이벤트를 전송하는 인터페이스입니다.
 * Slack, Telegram, Kakao 등 다양한 채널 구현체를 만들 수 있습니다.
 */
export interface Notifier {
    /**
     * 알림 전송
     * 
     * @param event - 알림 이벤트
     */
    notify(event: NotificationEvent): Promise<void>;
}

/**
 * 알림 규칙 설정
 */
export interface NotificationRules {
    /** 차단 시 알림 */
    onBlock?: boolean;

    /** 특정 점수 이상 시 알림 */
    onHighRisk?: number;

    /** 공격 패턴 감지 시 알림 */
    onAttackPattern?: boolean;
}
