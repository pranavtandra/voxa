"use client";

import * as Sentry from "@sentry/react";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  tracesSampleRate: 0,
  maxBreadcrumbs: 0,
  beforeBreadcrumb: () => null,
  beforeSend(event) {
    const area = event.tags?.area;
    delete event.user;
    delete event.request;
    delete event.breadcrumbs;
    delete event.contexts;
    delete event.extra;
    event.tags = typeof area === "string" ? { area } : undefined;
    if (event.message) event.message = "Redacted Voxa client error";
    for (const exception of event.exception?.values || []) {
      exception.value = "Redacted Voxa client error";
    }
    return event;
  },
});

export function reportError(area: string) {
  Sentry.captureException(new Error("Voxa operation failed"), {
    tags: { area },
  });
}
