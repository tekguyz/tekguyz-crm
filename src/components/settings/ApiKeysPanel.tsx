"use client";

import { useActionState, useEffect, useState, type MouseEvent } from "react";
import { toast } from "sonner";
import {
  getCredentialStatus,
  saveOrganizationCredentials,
  clearOrganizationCredential,
  type CredentialsFormState,
  type CredentialStatus,
  type ManagedCredentialField,
} from "@/lib/actions/credentials-actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { HelpTooltip } from "@/components/help/HelpTooltip";

const initialState: CredentialsFormState = null;

const FIELD_LABELS: Record<ManagedCredentialField, string> = {
  api_key_gemini: "Gemini API key",
  api_key_anthropic: "Anthropic API key",
};

export function ApiKeysPanel({ canEdit }: { canEdit: boolean }) {
  const [status, setStatus] = useState<CredentialStatus | null>(null);
  const [state, formAction, isPending] = useActionState(saveOrganizationCredentials, initialState);
  const [clearDialogField, setClearDialogField] = useState<ManagedCredentialField | null>(null);
  const [clearing, setClearing] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  // Refetches after every save attempt AND every successful clear, so a
  // masked "configured" label stays accurate without a full page reload.
  useEffect(() => {
    getCredentialStatus().then(setStatus);
  }, [state, refreshToken]);

  async function handleClearConfirm(e: MouseEvent<HTMLButtonElement>) {
    // Same "stay open through the async call" override as EditLeadModal's
    // archive confirm and OrgDetailsPanel's rotate confirm.
    e.preventDefault();
    if (!clearDialogField) return;
    setClearing(true);
    try {
      const result = await clearOrganizationCredential(clearDialogField);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`${FIELD_LABELS[clearDialogField]} cleared.`);
      setRefreshToken((n) => n + 1);
      setClearDialogField(null);
    } finally {
      setClearing(false);
    }
  }

  return (
    <section className="rounded-lg border border-hairline bg-canvas-pure p-6 shadow-elevation-1">
      <h2 className="mb-1 flex items-center gap-1.5 text-base font-semibold">
        API Keys
        <HelpTooltip
          topicId="api-keys"
          blurb="Bring your own Gemini or Anthropic key. Keys are stored server-side, never shown back to you, and can be removed with Clear."
        />
      </h2>
      <p className="mb-4 text-xs text-ink-muted">
        Bring your own Gemini and Anthropic keys for AI features. Leaving a field blank keeps
        the existing key unchanged.
      </p>

      {!canEdit ? (
        <p className="text-sm text-ink-muted">Only owners and admins can manage API keys.</p>
      ) : (
        <>
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
              <div className="flex items-center gap-2">
                <input
                  name="api_key_gemini"
                  type="password"
                  autoComplete="off"
                  placeholder={status?.hasGeminiKey ? "Leave blank to keep current key" : "Not configured"}
                  className="w-full rounded-xs border border-hairline bg-canvas-pure p-1.5 text-sm text-ink-main outline-none placeholder:text-ink-muted"
                />
                {status?.hasGeminiKey && (
                  <button
                    type="button"
                    onClick={() => setClearDialogField("api_key_gemini")}
                    className="shrink-0 rounded-md border border-hairline bg-canvas-pure px-3.5 py-1 text-sm font-medium text-ink-main transition-colors hover:bg-canvas-soft"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-ink-muted">
                Anthropic API key{status?.hasAnthropicKey ? " · •••• configured" : ""}
              </label>
              <div className="flex items-center gap-2">
                <input
                  name="api_key_anthropic"
                  type="password"
                  autoComplete="off"
                  placeholder={status?.hasAnthropicKey ? "Leave blank to keep current key" : "Not configured"}
                  className="w-full rounded-xs border border-hairline bg-canvas-pure p-1.5 text-sm text-ink-main outline-none placeholder:text-ink-muted"
                />
                {status?.hasAnthropicKey && (
                  <button
                    type="button"
                    onClick={() => setClearDialogField("api_key_anthropic")}
                    className="shrink-0 rounded-md border border-hairline bg-canvas-pure px-3.5 py-1 text-sm font-medium text-ink-main transition-colors hover:bg-canvas-soft"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-accent px-3.5 py-1 text-sm font-medium text-canvas-pure shadow-elevation-1 transition-shadow hover:shadow-elevation-2 disabled:opacity-60"
            >
              {isPending ? "Saving…" : "Save keys"}
            </button>
          </form>

          <AlertDialog
            open={clearDialogField !== null}
            onOpenChange={(open) => {
              if (!open) setClearDialogField(null);
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Clear {clearDialogField ? FIELD_LABELS[clearDialogField] : "this key"}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This removes the configured key. AI features for this org will fall back to
                  the platform-provided key, if any, or stop working until a new key is saved.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction disabled={clearing} onClick={handleClearConfirm}>
                  {clearing ? "Clearing…" : "Clear key"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </section>
  );
}
