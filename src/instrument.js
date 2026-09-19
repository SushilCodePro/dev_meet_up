import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN || "",
  environment: process.env.NODE_ENV || "development",
  // Performance Monitoring: Capture 100% of transactions for dev/testing
  tracesSampleRate: 1.0,
});
