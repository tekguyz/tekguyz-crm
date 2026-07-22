"use client";

import { useActionState, useEffect, useState } from "react";
import {
  getCredentialStatus,
  saveOrganizationCredentials,
  type CredentialsFormState,
  type CredentialStatus,
} from "@/lib/actions/credentials-actions";

const initialState: CredentialsFormState = null;

export function ApiKeysPanel({ canEdit }: { canEdit: boolean }) {
  const [status, setStatus] = useState<CredentialStatus | null>(null);
  const [state, formAction, isPending] = useActionState(saveOrganizationCredentials, initialState);

  // Refetches after every save attempt so a masked "configured" label stays
  // accurate without a full page reload.
  useEffect(() => {
    getCredentialStatus().then(setStatus);
  }, [state]);

  return (
    <section className="rounded-lg border border-hairline bg-canvas-pure p-6 shadow-elevation-1">
      <h2 className="mb-1 text-base font-semibold">API Keys</h2>
      <p className="mb-4 text-xs text-ink-muted">
        Bring your own Gemini and Anthropic keys for AI features. Leaving a field blank keeps
        the existing key unchanged.
      </p>

      {!canEdit ? (
        <p className="text-sm text-ink-muted">Only owners and admins can manage API keys.</p>
      ) : (
        <form action={formAction} className="space-y-3">
          {state?.error && (
            <p className="rounded-xs border border-hairline bg-pill-orange-bg px-3 py-2 text-sm text-pill-orange-fg">
              {state.error}
            </p>
          )}
          {state?.success && (
            <p className="rounded-xs border border-hairline bg-pill-green-bg px-3 py-2 text-sm text-pill-green-fg">
              Saved.
            </p>
          )}

          <div>
            <label className="mb-1 block text-xs text-ink-muted">
              Gemini API key{status?.hasGeminiKey ? " · •••• configured" : ""}
            </label>
            <input
              name="api_key_gemini"
              type="password"
              autoComplete="off"
              placeholder={status?.hasGeminiKey ? "Leave blank to keep current key" : "Not configured"}
              className="w-full rounded-xs border border-hairline bg-canvas-pure p-1.5 text-sm text-ink-main outline-none placeholder:text-ink-muted"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-ink-muted">
              Anthropic API key{status?.hasAnthropicKey ? " · •••• configured" : ""}
            </label>
            <input
              name="api_key_anthropic"
              type="password"
              autoComplete="off"
              placeholder={status?.hasAnthropicKey ? "Leave blank to keep current key" : "Not configured"}
              className="w-full rounded-xs border border-hairline bg-canvas-pure p-1.5 text-sm text-ink-main outline-none placeholder:text-ink-muted"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-accent px-3.5 py-1 text-sm font-medium text-canvas-pure shadow-elevation-1 transition-shadow hover:shadow-elevation-2 disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Save keys"}
          </button>
        </form>
      )}
    </section>
  );
}
