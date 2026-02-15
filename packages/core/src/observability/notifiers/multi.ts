/**
 * 복수 채널 알림
 * 
 * 여러 알림 채널에 동시에 이벤트를 전송합니다.
 */

import { Notifier, NotificationEvent } from './index';

/**
 * 복수 채널 알림 구현
 */
export class MultiNotifier implements Notifier {
    constructor(private readonly notifiers: Notifier[]) { }

    /**
     * 모든 채널에 알림 전송
     * 
     * 각 채널의 실패는 독립적으로 처리되며,
     * 하나의 채널 실패가 다른 채널 전송을 막지 않습니다.
     */
    async notify(event: NotificationEvent): Promise<void> {
        const results = await Promise.allSettled(
            this.notifiers.map(notifier => notifier.notify(event))
        );

        // 실패한 채널 로깅
        results.forEach((result, index) => {
            if (result.status === 'rejected') {
                console.error(
                    `알림 채널 ${index + 1} 전송 실패:`,
                    result.reason
                );
            }
        });

        // 모두 실패한 경우에만 에러 발생
        const allFailed = results.every(r => r.status === 'rejected');
        if (allFailed && results.length > 0) {
            throw new Error('모든 알림 채널 전송 실패');
        }
    }
}
