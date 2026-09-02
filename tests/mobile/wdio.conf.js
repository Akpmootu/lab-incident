export const config = {
  runner: 'local',
  hostname: '127.0.0.1',
  port: 4723,
  path: '/',
  specs: ['./responsive.smoke.js'],
  framework: 'mocha',
  reporters: ['spec'],
  capabilities: [{
    platformName: 'Android',
    'appium:deviceName': process.env.ANDROID_DEVICE || 'emulator-5554',
    'appium:automationName': 'UiAutomator2',
    browserName: 'Chrome',
    'appium:noReset': true,
    'appium:newCommandTimeout': 120,
  }],
  mochaOpts: { timeout: 90000 },
  baseUrl: process.env.BASE_URL || 'https://lab-incident.vercel.app',
};
