/**
 * Feature Flags Configuration
 * 
 * Controls feature availability based on environment and configuration
 */

export const featureFlags = {
  /**
   * Enable in-app role confirmation (pilot mode)
   * When enabled, allows direct role confirmation without email flow
   * Default: true (pilot mode)
   */
  ENABLE_IN_APP_ROLE_CONFIRMATION: process.env.NEXT_PUBLIC_ENABLE_IN_APP_ROLE_CONFIRMATION !== 'false',
};
