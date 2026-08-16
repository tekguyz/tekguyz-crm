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
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
    <Card className="p-6">
      <h2 className="text-h2 mb-1 flex items-center gap-1.5">
        API Keys
        <HelpTooltip
          topicId="api-keys"
          blurb="Bring your own Gemini or Anthropic key. Keys are stored server-side, never shown back to you, and can be removed with Clear."
        />
      </h2>
      <p className="text-caption mb-4 text-ink-muted">
        Bring your own Gemini and Anthropic keys for AI features. Leaving a field blank keeps
        the existing key unchanged.
      </p>

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
    </Card>
  );
}
