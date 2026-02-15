/**
 * Slack 알림
 * 
 * Slack Webhook을 통해 WAF 이벤트를 전송합니다.
 */

import axios from 'axios';
import { Notifier, NotificationEvent, Severity } from './index';

/**
 * Slack 알림 구현
 */
export class SlackNotifier implements Notifier {
    constructor(private readonly webhookUrl: string) { }

    /**
     * 심각도에 따른 색상 반환
     */
    private getColor(severity: Severity): string {
        switch (severity) {
            case 'CRITICAL': return 'danger';
            case 'HIGH': return 'warning';
            case 'MEDIUM': return '#ffa500';
            case 'LOW': return 'good';
            default: return '#808080';
        }
    }

    /**
     * 알림 전송
     */
    async notify(event: NotificationEvent): Promise<void> {
        const payload = {
            text: `🚨 WAF Alert: ${event.message}`,
            attachments: [{
                color: this.getColor(event.severity),
                fields: [
                    { title: 'Type', value: event.type, short: true },
                    { title: 'Severity', value: event.severity, short: true },
                    ...(event.details.ip ? [{ title: 'IP', value: event.details.ip, short: true }] : []),
                    ...(event.details.totalScore !== undefined ? [{ title: 'Score', value: String(event.details.totalScore), short: true }] : []),
                    ...(event.details.path ? [{ title: 'Path', value: event.details.path }] : []),
                    ...(event.details.method ? [{ title: 'Method', value: event.details.method, short: true }] : []),
                    ...(event.details.userId ? [{ title: 'User ID', value: event.details.userId, short: true }] : []),
                    ...(event.details.rules && event.details.rules.length > 0 ? [{ title: 'Triggered Rules', value: event.details.rules.join(', ') }] : [])
                ],
                ts: Math.floor(event.details.timestamp / 1000)
            }]
        };

        try {
            await axios.post(this.webhookUrl, payload);
        } catch (error) {
            console.error('Slack 알림 전송 실패:', error);
            throw error;
        }
    }
}
