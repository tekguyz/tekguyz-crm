import { createClient } from "@/lib/supabase/server";

export type TeamMember = {
  user_id: string;
  email: string;
  role: string;
};

export type PendingInvite = {
  id: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
};

export async function getTeamMembers(orgId: string): Promise<TeamMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_organization_members", {
    p_org_id: orgId,
  });

  if (error) throw error;
  return data;
}

export async function getPendingInvites(orgId: string): Promise<PendingInvite[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_invites")
    .select("id, email, role, token, expires_at")
    .eq("organization_id", orgId)
    .eq("status", "PENDING")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}
