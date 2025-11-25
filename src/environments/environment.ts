import { sharedEnvironment } from './environment.base';

export const environment = {
  ...sharedEnvironment,
  production: false,
  // Force emulator-friendly settings locally to avoid App Check 403s
  useEmulators: true,
  recaptcha: {
    ...sharedEnvironment.recaptcha,
    enabled: false,
    siteKey: ''
  },
  appCheck: {
    ...sharedEnvironment.appCheck,
    siteKey: '',
    provider: 'recaptcha'
  }
};
