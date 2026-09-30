import "server-only";
import { randomBytes, randomUUID } from "node:crypto";

// A Guest's identity (CONTEXT.md: Guest). Made fresh on every press.
//
// The email shape is load-bearing: the create_demo_org and
// delete_expired_demo_orgs database functions both recognise a Guest ONLY by
// 'demo-%@tekguyz-crm.test'
// (supabase/migrations/20260929120000_demo_org_per_guest.sql). `.test` is a
// reserved TLD no real mailbox can hold, so nothing here can ever name a real
// person, and nothing is ever sent to it.
//
// The password is random, used once to sign in on the server, and never
// stored or shown. The trailing "Aa1!" guarantees every character class a
// password policy can ask for, whatever the random part happened to contain.
export const GUEST_ORG_NAME = "Demo Workspace";

export function newGuestCredentials(): { email: string; password: string } {
  return {
    email: `demo-${randomUUID().replaceAll("-", "")}@tekguyz-crm.test`,
    password: `${randomBytes(24).toString("base64url")}Aa1!`,
  };
}
