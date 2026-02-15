/**
 * 텔레그램 알림
 * 
 * Telegram Bot API를 통해 WAF 이벤트를 전송합니다.
 */

import axios from 'axios';
import { Notifier, NotificationEvent, Severity } from './index';

/**
 * 텔레그램 알림 구현
 */
export class TelegramNotifier implements Notifier {
    constructor(
        private readonly botToken: string,
        private readonly chatId: string
    ) { }

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

        const message = `
${emoji} *WAF Alert*

*Type:* ${event.type}
*Severity:* ${event.severity}
*Message:* ${event.message}

*Details:*
${event.details.ip ? `• IP: \`${event.details.ip}\`` : ''}
${event.details.path ? `• Path: \`${event.details.path}\`` : ''}
${event.details.method ? `• Method: \`${event.details.method}\`` : ''}
${event.details.userId ? `• User ID: \`${event.details.userId}\`` : ''}
${event.details.totalScore !== undefined ? `• Score: ${event.details.totalScore}` : ''}
${event.details.rules && event.details.rules.length > 0 ? `• Rules: ${event.details.rules.join(', ')}` : ''}
    `.trim();

        try {
            await axios.post(
                `https://api.telegram.org/bot${this.botToken}/sendMessage`,
                {
                    chat_id: this.chatId,
                    text: message,
                    parse_mode: 'Markdown'
                }
            );
        } catch (error) {
            console.error('텔레그램 알림 전송 실패:', error);
            throw error;
        }
    }
}
