import { NextResponse } from "next/server";

// PUBLIC. A plain redirect to the Landing Page, so old links to /demo — on
// tekguyz.com and in old messages — still land somewhere useful (#29).
//
// It never signs anyone in, never reads a session and never writes. It used
// to sign visitors in to a shared read-only account, and on 2026-09-11 an RSC
// prefetch of it silently replaced a real operator's session with the demo
// one. The rule since #31: no GET signs anyone in. The demo's only door is the
// "start demo" Server Action (src/lib/demo/start-demo.ts), which runs on POST.
export function GET(request: Request) {
  // Same origin the request came in on, like /api/dev-login: a fixed origin
  // would throw a preview deployment's visitor onto production.
  return NextResponse.redirect(new URL("/", request.url));
}
