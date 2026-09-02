"use strict";

// Non-secret deployment configuration. Secret bindings must be identical during
// function discovery and at runtime; .env flags are runtime switches, not bindings.
module.exports = Object.freeze({ smtpSecretConfigured: true, billingoSecretConfigured: false });
