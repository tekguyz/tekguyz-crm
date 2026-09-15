"use client";

import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";

// Holds the /login email ABOVE the page, in src/app/(login)/layout.tsx.
//
// WHY NOT PLAIN STATE IN THE FORM. A wrong password makes signIn redirect to
// /login?error=…, and on Next 15.5 that REMOUNTS the whole page subtree —
// measured 2026-09-15 in real Chrome: after the Server Action's redirect, the
// same document was kept but <main>, <form> and the email <input> were all new
// nodes, and the controlled email came back empty. <body>, owned by the root
// layout, survived. A layout is not re-keyed by search params, so state held
// here outlives the redirect and the address is still in the box.
//
// The form falls back to its own state when no provider is present (the unit
// tests), so it never throws for want of one.
type EmailState = readonly [string, Dispatch<SetStateAction<string>>];

const LoginEmailContext = createContext<EmailState | null>(null);

export function LoginEmailProvider({ children }: { children: ReactNode }) {
  const state = useState("");
  return <LoginEmailContext.Provider value={state}>{children}</LoginEmailContext.Provider>;
}

export function useLoginEmail(): EmailState {
  const shared = useContext(LoginEmailContext);
  const local = useState("");
  return shared ?? local;
}
