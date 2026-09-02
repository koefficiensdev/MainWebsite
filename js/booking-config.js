// Public deployment gates, never secrets. Keep live booking closed until
// tenant provisioning, App Check, notifications and end-to-end tests pass.
export const BOOKING_CONFIG = Object.freeze({ liveEnabled: false, appCheckSiteKey: "" });
