import { sharedEnvironment } from './environment.base';

export const environment = {
  ...sharedEnvironment,
  production: false,
  // Use real Firebase for development, disable App Check
  useEmulators: false,
  recaptcha: {
    ...sharedEnvironment.recaptcha,
    enabled: false
  },
  appCheck: {
    ...sharedEnvironment.appCheck,
    enabled: false
  }
};
