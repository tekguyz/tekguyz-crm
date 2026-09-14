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
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

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
  // CONTROLLED, not bare uncontrolled inputs. React 19 resets a
  // <form action={...}> after the action returns — including on failure — by
  // calling form.reset() and re-rendering. Losing a pasted API key is the most
  // expensive instance of this bug in the app: the value is long, opaque, and
  // usually not retypable from memory. Both fields start blank by design — a
  // stored key is never shown back — so they are cleared explicitly on a
  // successful save rather than left holding the secret in client state.
  // See CLAUDE.md § Form/Action Field Parity.
  const [geminiKey, setGeminiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");

  // Refetches after every save attempt AND every successful clear, so a
  // masked "configured" label stays accurate without a full page reload.
  useEffect(() => {
    getCredentialStatus().then(setStatus);
  }, [state, refreshToken]);

  // Only on a confirmed save. A failed one keeps both values so the operator
  // corrects one field instead of re-fetching two keys from their provider.
  useEffect(() => {
    if (state?.success) {
      setGeminiKey("");
      setAnthropicKey("");
    }
  }, [state]);

  async function handleClearConfirm(e: MouseEvent<HTMLButtonElement>) {
    // Same "stay open through the async call" override as EditLeadDrawer's
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
    // No Card, heading, caption or help tooltip of its own — all four moved to
    // the settings page's SettingsSection with the Split wiring (2026-09-13).
    <div>
      {!canEdit ? (
        <p className="text-body-md text-ink-muted">Only owners and admins can manage API keys.</p>
      ) : (
        <>
          <form action={formAction} className="space-y-3">
            {state?.error && (
              <p className="text-body-sm rounded-xs border border-hairline bg-pill-orange-bg px-3 py-2 text-pill-orange-fg">
                {state.error}
              </p>
            )}
            {state?.success && (
              <p className="text-body-sm rounded-xs border border-hairline bg-pill-green-bg px-3 py-2 text-pill-green-fg">
                Saved.
              </p>
            )}

            {/* items-end so Clear lines up with the field itself, not with the
                top of Input's label. */}
            <div className="flex items-end gap-2">
              <Input
                label={`Gemini API key${status?.hasGeminiKey ? " · •••• configured" : ""}`}
                name="api_key_gemini"
                type="password"
                autoComplete="off"
                value={geminiKey}
                onChange={(event) => setGeminiKey(event.target.value)}
                placeholder={status?.hasGeminiKey ? "Leave blank to keep current key" : "Not configured"}
              />
              {status?.hasGeminiKey && (
                <Button
                  type="button"
                  variant="secondary"
                  className="shrink-0"
                  onClick={() => setClearDialogField("api_key_gemini")}
                >
                  Clear
                </Button>
              )}
            </div>

            <div className="flex items-end gap-2">
              <Input
                label={`Anthropic API key${status?.hasAnthropicKey ? " · •••• configured" : ""}`}
                name="api_key_anthropic"
                type="password"
                autoComplete="off"
                value={anthropicKey}
                onChange={(event) => setAnthropicKey(event.target.value)}
                placeholder={status?.hasAnthropicKey ? "Leave blank to keep current key" : "Not configured"}
              />
              {status?.hasAnthropicKey && (
                <Button
                  type="button"
                  variant="secondary"
                  className="shrink-0"
                  onClick={() => setClearDialogField("api_key_anthropic")}
                >
                  Clear
                </Button>
              )}
            </div>

            <Button type="submit" variant="primary" loading={isPending}>
              {isPending ? "Saving…" : "Save keys"}
            </Button>
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
    </div>
  );
}
