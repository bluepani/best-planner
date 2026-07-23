import { AuthenticateWithRedirectCallback } from "@clerk/react";

export default function SSOCallback() {
  return (
    <div className="auth-screen auth-callback">
      <div className="auth-atmosphere" aria-hidden="true" />
      <div className="auth-callback-card">
        <p className="eyebrow">BestPlanner</p>
        <h1>Finishing sign-in…</h1>
        <p>Securely connecting your account.</p>
        <AuthenticateWithRedirectCallback />
      </div>
    </div>
  );
}
