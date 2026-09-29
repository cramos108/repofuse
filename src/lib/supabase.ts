import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { settingsPayload } from "../domain/syncPayload"
import type { Tier } from "../domain/types"

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
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}/app/settings` },
  })
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
} | null> {
  if (!supabase) throw new Error("Supabase is not configured on this deployment.")
  const session = await currentSession()
  if (!session) throw new Error("Sign in before reading workspace settings.")
  const { data, error } = await supabase
    .from("workspace_settings")
    .select("dealership_name, state_code")
    .eq("user_id", session.userId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    dealershipName: String(data.dealership_name ?? ""),
    stateCode: String(data.state_code ?? ""),
  }
}
