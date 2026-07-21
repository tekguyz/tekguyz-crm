import type { ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/auth/actions";
import { AcceptInviteButton } from "@/components/invites/AcceptInviteButton";

type InvitePreview = {
  organization_name: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
};

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: invite, error } = (await supabase
    .rpc("get_invite_preview", { p_token: token })
    .maybeSingle()) as { data: InvitePreview | null; error: { message: string } | null };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const nextPath = `/invite/${token}`;

  let body: ReactNode;

  if (error || !invite) {
    body = <p className="text-sm text-ink-muted">This invite link is invalid.</p>;
  } else if (invite.status === "ACCEPTED") {
    body = <p className="text-sm text-ink-muted">This invite has already been accepted.</p>;
  } else if (invite.status === "REVOKED") {
    body = <p className="text-sm text-ink-muted">This invite has been revoked.</p>;
  } else if (new Date(invite.expires_at) < new Date()) {
    body = <p className="text-sm text-ink-muted">This invite has expired.</p>;
  } else if (!user) {
    body = (
      <div className="space-y-3">
        <p className="text-sm text-ink-muted">
          Sign in or create an account with{" "}
          <strong className="text-ink-main">{invite.email}</strong> to join{" "}
          <strong className="text-ink-main">{invite.organization_name}</strong>.
        </p>
        <Link
          href={`/login?next=${encodeURIComponent(nextPath)}`}
          className="block w-full rounded-md bg-accent px-3.5 py-1 text-center text-sm font-medium text-canvas-pure shadow-elevation-1 transition-shadow hover:shadow-elevation-2"
        >
          Sign in
        </Link>
        <Link
          href={`/signup?next=${encodeURIComponent(nextPath)}`}
          className="block w-full rounded-md border border-hairline px-3.5 py-1 text-center text-sm font-medium text-ink-main shadow-elevation-1 transition-shadow hover:shadow-elevation-2"
        >
          Sign up
        </Link>
      </div>
    );
  } else if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
    body = (
      <div className="space-y-3">
        <p className="text-sm text-ink-muted">
          This invite was sent to <strong className="text-ink-main">{invite.email}</strong>,
          but you&apos;re signed in as{" "}
          <strong className="text-ink-main">{user.email}</strong>.
        </p>
        <form action={signOut}>
          <button
            type="submit"
            className="w-full rounded-md border border-hairline px-3.5 py-1 text-sm font-medium text-ink-main shadow-elevation-1 transition-shadow hover:shadow-elevation-2"
          >
            Sign out
          </button>
        </form>
      </div>
    );
  } else {
    body = (
      <div className="space-y-3">
        <p className="text-sm text-ink-muted">
          Join <strong className="text-ink-main">{invite.organization_name}</strong> as{" "}
          <strong className="text-ink-main">{invite.role}</strong>.
        </p>
        <AcceptInviteButton token={token} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas-soft p-6">
      <div className="w-full max-w-sm rounded-lg border border-hairline bg-canvas-pure p-6 shadow-elevation-2">
        <p className="mb-6 text-sm font-semibold tracking-tight">TekGuyz CRM</p>
        <h1 className="mb-4 text-lg font-semibold">You&apos;re invited</h1>
        {body}
      </div>
    </div>
  );
}
