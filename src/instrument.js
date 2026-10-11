import "dotenv/config";
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN || "",
  environment: process.env.NODE_ENV || "development",
  // Performance Monitoring: Capture 100% of transactions for dev/testing
  tracesSampleRate: 1.0,
  integrations: [
    // Capture HTTP requests & Express routes
    Sentry.httpIntegration(),
    Sentry.expressIntegration(),
    // Capture console.log, console.warn, and console.error calls in Sentry
    Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
    // Capture Mongoose MongoDB query performance
    Sentry.mongooseIntegration(),
  ],
});



