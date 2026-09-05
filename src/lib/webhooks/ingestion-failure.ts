/**
 * Failure visibility for the inbound triage webhook (2026-09-05).
 *
 * WHY THIS EXISTS: a signature-valid request that failed downstream — a DB
 * insert, a submission write, the notification send — produced no signal
 * anywhere. The only feedback loop was a client eventually asking why a lead
 * never arrived. This module gives every failure path a stable error code and
 * one structured log line, so Vercel's captured stdout/stderr is searchable by
 * code and by tenant. No new vendor.
 *
 * Deliberately NOT `server-only` and deliberately free of any database or
 * email import: it is pure formatting over values handed to it, which is what
 * makes it unit-testable in the hermetic `npm test` suite (same reasoning as
 * signature.ts). The alert email lives in lib/email/alert-ingestion-failure.ts.
 *
 * WHAT MAY NEVER ENTER A LINE THIS MODULE PRINTS: the tenant's
 * `webhook_secret`, any part of the `X-TekGuyz-Signature` header, and the
 * payload's PII (client name, email, phone, message body). This is a public
 * endpoint's error path — every line is something that could leak. The
 * organization id is not a secret (it rides in the URL in plain text) and is
 * the only tenant identifier a triage ever needs. Postgres error `message` is
 * passed through; its `details`/`hint` are NOT, because a unique-violation
 * detail quotes the offending column VALUE — that is where an email address
 * would sneak into a log.
 */

export const WEBHOOK_ERROR_CODES = {
  /** Unknown org id, or a missing/malformed/wrong signature. Expected noise. */
  AUTH_FAILED: "WEBHOOK_AUTH_FAILED",
  RATE_LIMITED: "WEBHOOK_RATE_LIMITED",
  INVALID_JSON: "WEBHOOK_INVALID_JSON",
  INVALID_PAYLOAD: "WEBHOOK_INVALID_PAYLOAD",
  LEAD_LOOKUP_FAILED: "WEBHOOK_LEAD_LOOKUP_FAILED",
  LEAD_UPDATE_FAILED: "WEBHOOK_LEAD_UPDATE_FAILED",
  LEAD_INSERT_FAILED: "WEBHOOK_LEAD_INSERT_FAILED",
  SUBMISSION_WRITE_FAILED: "WEBHOOK_SUBMISSION_WRITE_FAILED",
  ACTIVITY_LOG_WRITE_FAILED: "WEBHOOK_ACTIVITY_LOG_WRITE_FAILED",
  SPAM_ALERT_WRITE_FAILED: "WEBHOOK_SPAM_ALERT_WRITE_FAILED",
  NOTIFICATION_FAILED: "WEBHOOK_NOTIFICATION_FAILED",
  /** Anything thrown out of ingestWebhookLead without its own code. */
  INGEST_UNEXPECTED: "WEBHOOK_INGEST_UNEXPECTED",
} as const;

export type WebhookErrorCode = (typeof WEBHOOK_ERROR_CODES)[keyof typeof WEBHOOK_ERROR_CODES];

/** The log prefix every line shares, so one grep finds all of them. */
export const WEBHOOK_FAILURE_LOG_PREFIX = "[webhook-triage-failure]";

export type WebhookFailure = {
  code: WebhookErrorCode;
  organizationId: string;
  /** Short, stable, human phrase for where in the pipeline this happened. */
  stage: string;
  /** Error text only — never a payload field, never a credential. */
  detail?: string;
};

/**
 * A failure with a code attached, so the route can report it once instead of
 * every write site guessing at its own logging. ingest-lead.ts throws these;
 * the route catches, logs and alerts.
 */
export class WebhookIngestionError extends Error {
  readonly code: WebhookErrorCode;
  readonly stage: string;

  constructor(code: WebhookErrorCode, stage: string, message: string) {
    super(message);
    this.name = "WebhookIngestionError";
    this.code = code;
    this.stage = stage;
  }
}

export function toWebhookFailure(organizationId: string, err: unknown): WebhookFailure {
  if (err instanceof WebhookIngestionError) {
    return { code: err.code, organizationId, stage: err.stage, detail: err.message };
  }
  return {
    code: WEBHOOK_ERROR_CODES.INGEST_UNEXPECTED,
    organizationId,
    stage: "ingest",
    detail: err instanceof Error ? err.message : String(err),
  };
}

/**
 * One line, one JSON object, so Vercel's log search can filter on `code` or
 * `organization_id` without a parser.
 *
 * `severity` exists for one reason: a 401 from a bad or missing signature is
 * constant background noise on a public endpoint (it gets scanned), and
 * printing that as an error would train everyone to ignore the channel. Those
 * go to console.warn and never alert. Everything that happens AFTER a valid
 * signature is a real failure and goes to console.error.
 */
export function logWebhookFailure(
  failure: WebhookFailure,
  severity: "warn" | "error" = "error",
): void {
  const line = `${WEBHOOK_FAILURE_LOG_PREFIX} ${JSON.stringify({
    code: failure.code,
    organization_id: failure.organizationId,
    stage: failure.stage,
    detail: failure.detail ?? null,
  })}`;

  if (severity === "warn") {
    console.warn(line);
    return;
  }
  console.error(line);
}
