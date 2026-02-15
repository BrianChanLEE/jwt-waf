/**
 * 알림 시스템 예제
 * 
 * Slack, 텔레그램, 카카오톡으로 WAF 알림을 전송하는 예제입니다.
 */

import {
    SlackNotifier,
    TelegramNotifier,
    KakaoNotifier,
    MultiNotifier,
    NotificationEvent
} from '@jwt-waf/core';

/**
 * 예제 1: Slack 알림
 */
async function testSlackNotifier() {
    console.log('【예제 1】 Slack 알림 테스트\n');

    // Slack Webhook URL (실제로는 환경 변수에서 가져오기)
    const webhookUrl = process.env.SLACK_WEBHOOK_URL || 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL';

    const slackNotifier = new SlackNotifier(webhookUrl);

    const event: NotificationEvent = {
        type: 'BLOCK',
        severity: 'HIGH',
        message: '의심스러운 활동이 차단되었습니다',
        details: {
            ip: '192.168.1.100',
            path: '/api/admin/users',
            method: 'DELETE',
            userId: 'attacker123',
            totalScore: 90,
            rules: ['PrivilegeEndpointWeighting', 'MultiIpTokenUse'],
            timestamp: Date.now()
        }
    };

    try {
        console.log('Slack 알림 전송 중...');
        // await slackNotifier.notify(event);
        console.log('✅ Slack 알림이 성공적으로 전송되었습니다');
        console.log('(실제 전송은 주석 해제 필요)\n');
    } catch (error) {
        console.error('❌ Slack 알림 전송 실패:', error);
    }
}

/**
 * 예제 2: 텔레그램 알림
 */
async function testTelegramNotifier() {
    console.log('【예제 2】 텔레그램 알림 테스트\n');

    // 텔레그램 Bot Token과 Chat ID (실제로는 환경 변수에서 가져오기)
    const botToken = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN';
    const chatId = process.env.TELEGRAM_CHAT_ID || 'YOUR_CHAT_ID';

    const telegramNotifier = new TelegramNotifier(botToken, chatId);

    const event: NotificationEvent = {
        type: 'HIGH_RISK',
        severity: 'MEDIUM',
        message: '높은 위험 점수가 감지되었습니다',
        details: {
            ip: '203.0.113.50',
            path: '/api/auth/refresh',
            method: 'POST',
            userId: 'suspicious_user',
            totalScore: 65,
            rules: ['RefreshEndpointAbuse'],
            timestamp: Date.now()
        }
    };

    try {
        console.log('텔레그램 알림 전송 중...');
        // await telegramNotifier.notify(event);
        console.log('✅ 텔레그램 알림이 성공적으로 전송되었습니다');
        console.log('(실제 전송은 주석 해제 필요)\n');
    } catch (error) {
        console.error('❌ 텔레그램 알림 전송 실패:', error);
    }
}

/**
 * 예제 3: 카카오톡 알림
 */
async function testKakaoNotifier() {
    console.log('【예제 3】 카카오톡 알림 테스트\n');

    // 카카오워크 Webhook URL (실제로는 환경 변수에서 가져오기)
    const webhookUrl = process.env.KAKAO_WEBHOOK_URL || 'https://kakaowork.webhook.url';

    const kakaoNotifier = new KakaoNotifier(webhookUrl);

    const event: NotificationEvent = {
        type: 'ATTACK_PATTERN',
        severity: 'CRITICAL',
        message: '공격 패턴이 감지되었습니다',
        details: {
            ip: '198.51.100.25',
            path: '/api/users',
            method: 'GET',
            totalScore: 75,
            rules: ['ExpiredTokenFlood', 'InvalidSignatureSpike'],
            timestamp: Date.now()
        }
    };

    try {
        console.log('카카오톡 알림 전송 중...');
        // await kakaoNotifier.notify(event);
        console.log('✅ 카카오톡 알림이 성공적으로 전송되었습니다');
        console.log('(실제 전송은 주석 해제 필요)\n');
    } catch (error) {
        console.error('❌ 카카오톡 알림 전송 실패:', error);
    }
}

/**
 * 예제 4: 복수 채널 알림
 */
async function testMultiNotifier() {
    console.log('【예제 4】 복수 채널 알림 테스트\n');

    // 모든 채널 설정
    const slackNotifier = new SlackNotifier(
        process.env.SLACK_WEBHOOK_URL || 'https://hooks.slack.com/...'
    );
    const telegramNotifier = new TelegramNotifier(
        process.env.TELEGRAM_BOT_TOKEN || 'BOT_TOKEN',
        process.env.TELEGRAM_CHAT_ID || 'CHAT_ID'
    );
    const kakaoNotifier = new KakaoNotifier(
        process.env.KAKAO_WEBHOOK_URL || 'https://kakaowork.webhook.url'
    );

    // 복수 채널 알림 생성
    const multiNotifier = new MultiNotifier([
        slackNotifier,
        telegramNotifier,
        kakaoNotifier
    ]);

    const event: NotificationEvent = {
        type: 'BLOCK',
        severity: 'CRITICAL',
        message: '긴급: 대량의 공격 시도가 차단되었습니다',
        details: {
            ip: '203.0.113.100',
            path: '/api/admin/config',
            method: 'POST',
            userId: 'unknown',
            totalScore: 95,
            rules: [
                'MultiIpTokenUse',
                'PrivilegeEndpointWeighting',
                'TokenReplayDetection'
            ],
            timestamp: Date.now()
        }
    };

    try {
        console.log('모든 채널에 알림 전송 중...');
        // await multiNotifier.notify(event);
        console.log('✅ 모든 채널에 알림이 전송되었습니다');
        console.log('(실제 전송은 주석 해제 필요)\n');
    } catch (error) {
        console.error('❌ 알림 전송 실패:', error);
    }
}

/**
 * 모든 예제 실행
 */
async function runAllExamples() {
    console.log('===== WAF 알림 시스템 예제 =====\n');

    await testSlackNotifier();
    await testTelegramNotifier();
    await testKakaoNotifier();
    await testMultiNotifier();

    console.log('===== 모든 예제 완료 =====\n');

    console.log('💡 실제 사용 방법:\n');
    console.log('1. 환경 변수 설정:');
    console.log('   export SLACK_WEBHOOK_URL="https://hooks.slack.com/..."');
    console.log('   export TELEGRAM_BOT_TOKEN="your_bot_token"');
    console.log('   export TELEGRAM_CHAT_ID="your_chat_id"');
    console.log('   export KAKAO_WEBHOOK_URL="https://kakaowork.webhook.url"\n');
    console.log('2. 코드에서 주석 해제하여 실제 알림 전송 테스트\n');
    console.log('3. WafEngine 설정에 notifiers 추가:');
    console.log(`
const wafEngine = new WafEngine({
  mode: WafMode.BLOCK,
  blockThreshold: 80,
  rules: [...],
  store: new InMemoryStore(),
  notifiers: [
    new SlackNotifier(slackWebhookUrl),
    new TelegramNotifier(botToken, chatId),
    new KakaoNotifier(kakaoWebhookUrl)
  ],
  notificationRules: {
    onBlock: true,
    onHighRisk: 70,
    onAttackPattern: true
  }
});
  `.trim());
}

// 예제 실행
runAllExamples();
