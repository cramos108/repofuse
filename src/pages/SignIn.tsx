import { useEffect, useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button, Field, TextInput, ThemeToggle, Wordmark, errorText, usePageTitle } from "../components/ui"
import { sendMagicLink, supabaseConfigured } from "../lib/supabase"
import { useStore } from "../state/Store"

export default function SignInPage() {
  usePageTitle("Sign in")
  const navigate = useNavigate()
  const { session, authReady, workspace } = useStore()
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (authReady && session) navigate("/app", { replace: true })
  }, [authReady, navigate, session])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSending(true)
    setError(null)
    setMessage(null)
    try {
      await sendMagicLink(email.trim())
      setMessage("Check that inbox for the sign-in link. The lot file is not sent with it.")
    } catch (reason) {
      setError(errorText(reason))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 py-8">
      <div className="flex items-center justify-between">
        <Wordmark />
        <ThemeToggle />
      </div>
      <p className="badge mt-10">Dealer account</p>
      <h1 className="mt-3 font-display text-4xl">Sign in to open the lot.</h1>
      <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        Collections specialists and managers sign in. Free is one collector. Pro lets a manager add collector teammates. A recovery agency uses a field link and does not sign in.
        {workspace?.setupComplete ? " The lot file already on this device stays here." : " Dealership name and role are saved after this link."}
      </p>
      {!supabaseConfigured ? (
        <p className="mt-6 text-sm leading-6">
          This deployment has no Supabase keys, so an account cannot be created. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then run supabase/schema.sql.
        </p>
      ) : (
        <form onSubmit={(event) => void onSubmit(event)} className="panel mt-6 space-y-4 p-5">
          <Field label="Work email">
            <TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
          </Field>
          <Button type="submit" disabled={sending}>{sending ? "Sending…" : "Email me a sign-in link"}</Button>
          {message ? <p className="text-sm leading-6">{message}</p> : null}
          {error ? <p role="alert" className="text-sm font-semibold text-rose">{error}</p> : null}
        </form>
      )}
      <Link to="/" className="mt-6 text-sm font-semibold text-sky-700 underline dark:text-cyan-300">Back</Link>
    </div>
  )
}
