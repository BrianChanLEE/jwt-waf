/**
 * JWT WAF 핵심 타입 정의
 * 
 * 이 파일은 전체 시스템에서 사용하는 기본 타입들을 정의합니다.
 * 프레임워크에 독립적이며, 순수 TypeScript 타입만 포함합니다.
 */

/**
 * 요청에 대한 최종 결정
 */
export enum Decision {
    /** 요청 허용 */
    ALLOW = 'ALLOW',
    /** 로그만 남기고 허용 (기본 모드) */
    OBSERVE = 'OBSERVE',
    /** 요청 차단 */
    BLOCK = 'BLOCK'
}

/**
 * WAF 동작 모드
 */
export enum WafMode {
    /** 관찰 모드: 모든 요청을 허용하되, 위험 이벤트를 로그로 기록 */
    OBSERVE = 'OBSERVE',
    /** 차단 모드: 위험 점수가 임계값을 초과하면 요청을 차단 */
    BLOCK = 'BLOCK'
}

/**
 * 로그 레벨
 */
export enum LogLevel {
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR'
}

/**
 * JWT 페이로드 (디코딩된 값)
 */
export interface JwtPayload {
    /** 주체 (일반적으로 사용자 ID) */
    sub?: string;
    /** 발급자 */
    iss?: string;
    /** 대상 */
    aud?: string | string[];
    /** 만료 시간 (Unix timestamp) */
    exp?: number;
    /** 발급 시간 (Unix timestamp) */
    iat?: number;
    /** 유효 시작 시간 (Unix timestamp) */
    nbf?: number;
    /** JWT ID */
    jti?: string;
    /** 기타 커스텀 클레임 */
    [key: string]: any;
}

/**
 * 위험 이벤트 정보
 * 
 * 각 요청마다 생성되며, JWT 정보와 요청 메타데이터를 포함합니다.
 */
export interface RiskEvent {
    /** 원본 JWT 토큰 문자열 */
    token: string;
    /** 디코딩된 JWT 페이로드 (검증 실패 시 null) */
    payload: JwtPayload | null;
    /** JWT 디코딩/검증 성공 여부 */
    isValid: boolean;
    /** 검증 실패 이유 (성공 시 undefined) */
    invalidReason?: string;
    /** 요청 IP 주소 */
    ip: string;
    /** 요청 경로 */
    path: string;
    /** HTTP 메서드 */
    method: string;
    /** 요청 User-Agent */
    userAgent?: string;
    /** 이벤트 발생 시간 (Unix timestamp ms) */
    timestamp: number;
    /** 기타 메타데이터 */
    metadata?: Record<string, any>;
}

/**
 * 규칙 분석 결과
 */
export interface RuleResult {
    /** 규칙 이름 */
    ruleName: string;
    /** 계산된 위험 점수 (0~100) */
    score: number;
    /** 규칙이 트리거된 이유 */
    reason: string;
    /** 추가 세부 정보 */
    details?: Record<string, any>;
}

/**
 * 최종 분석 결과
 */
export interface AnalysisResult {
    /** 최종 결정 */
    decision: Decision;
    /** 총 위험 점수 */
    totalScore: number;
    /** 각 규칙별 결과 */
    ruleResults: RuleResult[];
    /** 분석이 완료된 시간 */
    timestamp: number;
}

/**
 * 보안 규칙 인터페이스
 * 
 * 모든 WAF 규칙은 이 인터페이스를 구현해야 합니다.
 */
export interface Rule {
    /** 규칙 이름 (고유 식별자) */
    readonly name: string;
    /** 규칙 설명 */
    readonly description: string;
    /** 규칙 가중치 (1~10, 점수 계산 시 곱해짐) */
    readonly weight: number;
    /** 규칙 활성화 여부 */
    readonly enabled: boolean;

    /**
     * 위험 이벤트를 분석하여 점수를 반환
     * 
     * @param event - 분석할 위험 이벤트
     * @param store - 상태 저장소
     * @returns 규칙 분석 결과 (비동기)
     */
    analyze(event: RiskEvent, store: Store): Promise<RuleResult>;
}

/**
 * 저장소 인터페이스
 * 
 * WAF 상태를 저장하고 조회하기 위한 추상화 인터페이스입니다.
 * InMemoryStore, RedisStore 등 다양한 구현체를 사용할 수 있습니다.
 */
export interface Store {
    /**
     * 키에 해당하는 값을 가져옵니다
     * 
     * @param key - 조회할 키
     * @returns 값 (없으면 null)
     */
    get(key: string): Promise<string | null>;

    /**
     * 키-값 쌍을 저장합니다
     * 
     * @param key - 저장할 키
     * @param value - 저장할 값
     * @param ttlSeconds - TTL (초 단위, 선택사항)
     */
    set(key: string, value: string, ttlSeconds?: number): Promise<void>;

    /**
     * 숫자 값을 증가시킵니다 (카운터)
     * 
     * @param key - 증가시킬 키
     * @param delta - 증가량 (기본값: 1)
     * @returns 증가 후 값
     */
    increment(key: string, delta?: number): Promise<number>;

    /**
     * 키를 삭제합니다
     * 
     * @param key - 삭제할 키
     */
    delete(key: string): Promise<void>;

    /**
     * 키의 TTL을 설정합니다
     * 
     * @param key - 대상 키
     * @param ttlSeconds - TTL (초 단위)
     */
    expire(key: string, ttlSeconds: number): Promise<void>;

    /**
     * 패턴에 맞는 모든 키를 조회합니다
     * 
     * @param pattern - 검색 패턴 (예: "waf:*")
     * @returns 매칭되는 키 배열
     */
    keys(pattern: string): Promise<string[]>;
}

/**
 * WAF 엔진 설정
 */
export interface WafConfig {
    /** 동작 모드 (기본: OBSERVE) */
    mode: WafMode;
    /** 차단 임계값 점수 (0~100, 기본: 80) */
    blockThreshold: number;
    /** 사용할 규칙 목록 */
    rules: Rule[];
    /** 저장소 구현체 */
    store: Store;
    /** JWT 서명 검증 여부 (기본: false) */
    verifySignature: boolean;
    /** JWT 서명 검증용 비밀키 (verifySignature가 true일 때 필수) */
    jwtSecret?: string;
    /** 로거 (선택사항) */
    logger?: Logger;
    /** 알림 채널 목록 (선택사항) */
    notifiers?: any[]; // Notifier[] - 순환 참조 방지를 위해 any 사용
    /** 알림 규칙 (선택사항) */
    notificationRules?: {
        /** 차단 시 알림 */
        onBlock?: boolean;
        /** 특정 점수 이상 시 알림 */
        onHighRisk?: number;
        /** 공격 패턴 감지 시 알림 */
        onAttackPattern?: boolean;
    };
}

/**
 * 로거 인터페이스
 * 
 * 구조화된 로그를 출력하기 위한 인터페이스입니다.
 * 외부 로거(winston, pino 등)를 주입할 수 있습니다.
 */
export interface Logger {
    /**
     * 정보 로그
     * 
     * @param message - 로그 메시지
     * @param context - 추가 컨텍스트
     */
    info(message: string, context?: Record<string, any>): void;

    /**
     * 경고 로그
     * 
     * @param message - 로그 메시지
     * @param context - 추가 컨텍스트
     */
    warn(message: string, context?: Record<string, any>): void;

    /**
     * 에러 로그
     * 
     * @param message - 로그 메시지
     * @param error - 에러 객체
     * @param context - 추가 컨텍스트
     */
    error(message: string, error?: Error, context?: Record<string, any>): void;
}

/**
 * 커스텀 에러 클래스
 */
export class WafError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly statusCode: number = 500
    ) {
        super(message);
        this.name = 'WafError';
        Object.setPrototypeOf(this, WafError.prototype);
    }
}
