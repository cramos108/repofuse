import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { roleOf } from "../domain/roles"
import { settingsPayload } from "../domain/syncPayload"
import type { OperatorRole, Tier } from "../domain/types"

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null

export const supabaseConfigured = supabase !== null

export async function sendMagicLink(email: string): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured on this deployment.")
  const { error } = await supabase.auth.signInWithOtp({ email })
  if (error) throw error
}

export async function signOutPro(): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function currentSession(): Promise<{ userId: string; email: string } | null> {
  if (!supabase) return null
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  const user = data.session?.user
  if (!user) return null
  return { userId: user.id, email: user.email ?? "" }
}

export async function fetchLicenseTier(userId: string): Promise<Tier> {
  if (!supabase) return "free"
  const { data, error } = await supabase
    .from("licenses")
    .select("tier")
    .eq("user_id", userId)
    .maybeSingle()
  if (error) throw error
  return data?.tier === "pro" ? "pro" : "free"
}

export async function pushWorkspaceSettings(input: {
  dealershipName: string
  stateCode: string
  operatorRole?: OperatorRole | null
}): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured on this deployment.")
  const session = await currentSession()
  if (!session) throw new Error("Sign in before syncing workspace settings.")
  const { error } = await supabase.from("workspace_settings").upsert({
    user_id: session.userId,
    ...settingsPayload(input),
  })
  if (error) throw error
}

export async function pullWorkspaceSettings(): Promise<{
  dealershipName: string
  stateCode: string
  operatorRole: OperatorRole
} | null> {
  if (!supabase) throw new Error("Supabase is not configured on this deployment.")
  const session = await currentSession()
  if (!session) throw new Error("Sign in before reading workspace settings.")
  const { data, error } = await supabase
    .from("workspace_settings")
    .select("dealership_name, state_code, operator_role")
    .eq("user_id", session.userId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    dealershipName: String(data.dealership_name ?? ""),
    stateCode: String(data.state_code ?? ""),
    operatorRole: roleOf({ operatorRole: String(data.operator_role ?? "") }),
  }
}

export async function fetchOwnMembership(): Promise<{ role: OperatorRole } | null> {
  if (!supabase) return null
  const session = await currentSession()
  if (!session?.email) return null
  const { data, error } = await supabase
    .from("team_members")
    .select("role")
    .ilike("email", session.email)
    .limit(1)
  if (error) throw error
  const role = data?.[0]?.role
  if (role !== "manager" && role !== "specialist" && role !== "collections" && role !== "field") return null
  return { role: roleOf({ operatorRole: String(role) }) }
}

export async function listTeamMembers(): Promise<{ id: string; email: string; role: OperatorRole }[]> {
  if (!supabase) throw new Error("Supabase is not configured on this deployment.")
  const session = await currentSession()
  if (!session) throw new Error("Sign in before reading the team.")
  const { data, error } = await supabase
    .from("team_members")
    .select("id, email, role")
    .eq("owner_user_id", session.userId)
  if (error) throw error
  return (data ?? []).map((row) => ({
    id: String(row.id),
    email: String(row.email),
    role: roleOf({ operatorRole: String(row.role) }),
  }))
}

export async function addTeamMember(email: string, role: OperatorRole): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured on this deployment.")
  const session = await currentSession()
  if (!session) throw new Error("Sign in before adding a teammate.")
  const { error } = await supabase.from("team_members").insert({
    owner_user_id: session.userId,
    email: email.trim().toLowerCase(),
    role,
  })
  if (error) throw error
}

export async function removeTeamMember(id: string): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured on this deployment.")
  const { error } = await supabase.from("team_members").delete().eq("id", id)
  if (error) throw error
}
