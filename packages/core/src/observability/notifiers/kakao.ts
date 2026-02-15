/**
 * 카카오톡 알림 (카카오워크 Webhook)
 * 
 * 카카오워크 Webhook API를 통해 WAF 이벤트를 전송합니다.
 */

import axios from 'axios';
import { Notifier, NotificationEvent, Severity } from './index';

/**
 * 카카오톡 알림 구현 (카카오워크)
 */
export class KakaoNotifier implements Notifier {
    constructor(private readonly webhookUrl: string) { }

    /**
     * 심각도에 따른 스타일 반환
     */
    private getStyle(severity: Severity): string {
        switch (severity) {
            case 'CRITICAL': return 'red';
            case 'HIGH': return 'orange';
            case 'MEDIUM': return 'yellow';
            case 'LOW': return 'blue';
            default: return 'gray';
        }
    }

    /**
     * 심각도에 따른 이모지 반환
     */
    private getEmoji(severity: Severity): string {
        switch (severity) {
            case 'CRITICAL': return '🚨';
            case 'HIGH': return '⚠️';
            case 'MEDIUM': return '⚡';
            case 'LOW': return 'ℹ️';
            default: return '📢';
        }
    }

    /**
     * 알림 전송
     */
    async notify(event: NotificationEvent): Promise<void> {
        const emoji = this.getEmoji(event.severity);

        // 카카오워크 Webhook API 형식
        const payload = {
            text: `${emoji} [WAF 알림] ${event.message}`,
            blocks: [
                {
                    type: 'header',
                    text: `${emoji} ${event.type}`,
                    style: this.getStyle(event.severity)
                },
                {
                    type: 'section',
                    content: [
                        `**심각도:** ${event.severity}`,
                        event.details.ip ? `**IP:** ${event.details.ip}` : null,
                        event.details.path ? `**경로:** ${event.details.path}` : null,
                        event.details.method ? `**메서드:** ${event.details.method}` : null,
                        event.details.userId ? `**사용자 ID:** ${event.details.userId}` : null,
                        event.details.totalScore !== undefined ? `**점수:** ${event.details.totalScore}` : null,
                        event.details.rules && event.details.rules.length > 0 ? `**트리거된 규칙:** ${event.details.rules.join(', ')}` : null
                    ].filter(Boolean).join('\n')
                },
                {
                    type: 'divider'
                },
                {
                    type: 'context',
                    content: `발생 시각: ${new Date(event.details.timestamp).toLocaleString('ko-KR')}`
                }
            ]
        };

        try {
            await axios.post(this.webhookUrl, payload);
        } catch (error) {
            console.error('카카오톡 알림 전송 실패:', error);
            throw error;
        }
    }
}
