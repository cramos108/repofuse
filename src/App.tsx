import { lazy, Suspense } from "react"
import { Navigate, Outlet, Route, Routes } from "react-router-dom"
import { Shell } from "./components/Shell"
import { useStore } from "./state/Store"
import Landing from "./pages/Landing"
import SetupPage from "./pages/Setup"
import Dashboard from "./pages/Dashboard"
import AccountForm from "./pages/AccountForm"
import AccountLayout from "./pages/AccountLayout"
import TimelinePage from "./pages/Timeline"
import GuardrailsPage from "./pages/Guardrails"
import FieldPage from "./pages/Field"
import PostRepoPage from "./pages/PostRepo"
import SettingsPage from "./pages/Settings"
import SignInPage from "./pages/SignIn"
import FieldLinkPage from "./pages/FieldLink"

const PacketPage = lazy(() => import("./pages/Packet"))

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app/signin" element={<SignInPage />} />
      <Route path="/go/:token" element={<FieldLinkPage />} />
      <Route path="/app" element={<RequireAccount />}>
      <Route path="setup" element={<SetupPage />} />
      <Route element={<RequireWorkspace />}>
        <Route element={<Shell />}>
          <Route index element={<Dashboard />} />
          <Route path="accounts/new" element={<AccountForm mode="create" />} />
          <Route path="accounts/:id/edit" element={<AccountForm mode="edit" />} />
          <Route path="accounts/:id" element={<AccountLayout />}>
            <Route index element={<TimelinePage />} />
            <Route path="guardrails" element={<GuardrailsPage />} />
            <Route path="field" element={<FieldPage />} />
            <Route path="post-repo" element={<PostRepoPage />} />
            <Route
              path="packet"
              element={
                <Suspense fallback={<p className="text-sm">Preparing the packet view…</p>}>
                  <PacketPage />
                </Suspense>
              }
            />
          </Route>
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function RequireAccount() {
  const { ready, error, authReady, session } = useStore()
  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <h1 className="font-display text-4xl">This browser blocked the lot file</h1>
        <p className="mt-3 text-sm leading-6">{error}</p>
      </div>
    )
  }
  if (!ready || !authReady) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <h1 className="font-display text-4xl">Opening the lot file on this device</h1>
      </div>
    )
  }
  if (!session) return <Navigate to="/app/signin" replace />
  return <Outlet />
}

function RequireWorkspace() {
  const { workspace } = useStore()
  if (!workspace?.setupComplete) return <Navigate to="/app/setup" replace />
  return <Outlet />
}
