import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  const supabase = await createClient();

  // Two distinct verification shapes land here, both real: admin-generated
  // links (Prompt 12's testing technique, still used for magiclink-style
  // sign-in) redirect with token_hash+type. A real end-user flow triggered
  // through this app's own SSR client (signUp, resetPasswordForEmail) is
  // PKCE-configured and redirects with a `code` param instead — confirmed
  // live during the password-reset build: a real resetPasswordForEmail
  // link's redirect_to came back as `?code=...&next=...`, which this route
  // previously had no handling for at all (recovery links would always
  // fail here). Try whichever is present; token_hash remains for the
  // admin-generated-link path already relied on elsewhere.
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(
    new URL("/login?error=Invalid or expired confirmation link", request.url),
  );
}
