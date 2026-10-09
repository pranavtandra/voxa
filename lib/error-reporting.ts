"use client";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
let sentryPromise: Promise<typeof import("@sentry/react")> | undefined;

function getSentry() {
  if (!dsn) return;
  sentryPromise ??= import("@sentry/react").then((Sentry) => {
    Sentry.init({
      dsn,
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
    return Sentry;
  });
  return sentryPromise;
}

export function reportError(area: string) {
  void getSentry()?.then((Sentry) => {
    Sentry.captureException(new Error("Voxa operation failed"), { tags: { area } });
  });
}

if (typeof window !== "undefined") {
  window.addEventListener("error", () => reportError("unhandled-error"));
  window.addEventListener("unhandledrejection", () => reportError("unhandled-rejection"));
}
