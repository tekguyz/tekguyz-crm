"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resetPasswordSchema } from "@/lib/validation/reset-password-schema";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect(next);
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const confirmUrl = new URL("/auth/confirm", appUrl);
  if (next) confirmUrl.searchParams.set("next", next);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: confirmUrl.toString(),
    },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  if (!data.session) {
    redirect(
      `/login?message=${encodeURIComponent("Check your email to confirm your account, then log in.")}`,
    );
  }

  redirect(next || "/onboarding");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createOrganization(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    redirect(`/onboarding?error=${encodeURIComponent("Organization name is required")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_organization_with_owner", {
    p_name: name,
  });

  if (error) {
    redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/");
}

// No user enumeration: the confirmation message is identical whether the
// email exists, is malformed, or the Supabase call itself fails — errors
// are logged server-side only, never surfaced to the client differently.
export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();

  if (email) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    // Routed through the existing /auth/confirm handler (same one signUp
    // uses) rather than a new dedicated route — it already verifies any
    // EmailOtpType (including "recovery") via token_hash and honors a
    // `next` param, so reset-password gets a real, cookie-backed session
    // the same way signup confirmation already does, with no new
    // verification logic to duplicate or drift out of sync.
    const confirmUrl = new URL("/auth/confirm", appUrl);
    confirmUrl.searchParams.set("next", "/reset-password");

    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: confirmUrl.toString(),
    });

    if (error) {
      console.error("[requestPasswordReset] resetPasswordForEmail failed:", error);
    }
  }

  redirect(
    `/forgot-password?message=${encodeURIComponent("If an account exists for that email, we've sent a password reset link.")}`,
  );
}

// Reached only via a session /auth/confirm already established by verifying
// the recovery link's token_hash — updateUser operates on that session, no
// token handling needed on this page itself.
export async function resetPassword(formData: FormData) {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    redirect(
      `/reset-password?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input.")}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/");
}
