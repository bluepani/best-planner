import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ClerkProvider,
  ClerkLoaded,
  ClerkLoading,
  TaskResetPassword,
  TaskSetupMFA,
  useAuth,
  useOrganizationList,
  useSession,
  useUser,
} from "@clerk/react";
import App from "./App.jsx";
import AuthPage from "./components/AuthPage.jsx";
import PaywallPage from "./components/PaywallPage.jsx";
import ProfileSetupPage from "./components/ProfileSetupPage.jsx";
import SSOCallback from "./components/SSOCallback.jsx";
import {
  consumePendingSignupOnboarding,
  getOnboardingStep,
  peekPendingSignupOnboarding,
  setOnboardingStep,
} from "./utils/onboarding";
import "./styles.css";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env.local");
}

/** Shared across StrictMode double-mount so we don't create duplicate orgs. */
let chooseOrganizationResolvePromise = null;

function LoadingCard({ title = "Loading…" }) {
  return (
    <div className="auth-screen">
      <div className="auth-atmosphere" aria-hidden="true" />
      <div className="auth-callback-card">
        <p className="eyebrow">BestPlanner</p>
        <h1>{title}</h1>
      </div>
    </div>
  );
}

function personalWorkspaceName(user) {
  const username = user?.username?.trim();
  if (username) return username;

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
  if (fullName) return fullName;

  const emailLocal = user?.primaryEmailAddress?.emailAddress?.split("@")[0]?.trim();
  if (emailLocal) return emailLocal;

  return "My workspace";
}

async function resolveChooseOrganizationTask({
  setActive,
  createOrganization,
  userMemberships,
  user,
}) {
  const existing = userMemberships?.data?.[0]?.organization;
  if (existing) {
    await setActive({ organization: existing.id });
    return;
  }

  // Works when Dashboard has Membership optional / Personal Accounts on.
  try {
    await setActive({ organization: null });
    return;
  } catch {
    // Membership required — create a username-based workspace and continue.
  }

  if (!createOrganization) {
    throw new Error("Could not continue without an organization.");
  }

  const organization = await createOrganization({
    name: personalWorkspaceName(user),
  });
  await setActive({ organization: organization.id });
}

/**
 * Clerk shows "Setup your organization" when Organizations are enabled with
 * membership required. This app is personal — resolve that session task
 * silently so users reach our ProfileSetupPage ("Set up your profile") instead.
 */
function ResolveChooseOrganizationTask() {
  const { user } = useUser();
  const { isLoaded, createOrganization, setActive, userMemberships } = useOrganizationList({
    userMemberships: true,
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoaded || !setActive) return;

    let cancelled = false;

    if (!chooseOrganizationResolvePromise) {
      chooseOrganizationResolvePromise = resolveChooseOrganizationTask({
        setActive,
        createOrganization,
        userMemberships,
        user,
      }).catch((err) => {
        chooseOrganizationResolvePromise = null;
        throw err;
      });
    }

    chooseOrganizationResolvePromise
      .then(() => {
        // Session task clears; AppRouter re-renders into onboarding / app.
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err?.errors?.[0]?.long_message ||
            err?.errors?.[0]?.message ||
            err?.message ||
            "Could not finish signing in. In Clerk Dashboard, disable Organizations or set Membership to optional.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [isLoaded, setActive, createOrganization, userMemberships, user]);

  if (error) {
    return (
      <div className="auth-screen">
        <div className="auth-atmosphere" aria-hidden="true" />
        <div className="auth-callback-card" style={{ width: "min(480px, 100%)" }}>
          <p className="eyebrow">BestPlanner</p>
          <h1>Almost there</h1>
          <p className="auth-error">{error}</p>
        </div>
      </div>
    );
  }

  return <LoadingCard title="Setting up your profile…" />;
}

function SessionTaskScreen({ taskKey }) {
  if (taskKey === "choose-organization") {
    return <ResolveChooseOrganizationTask />;
  }

  return (
    <div className="auth-screen">
      <div className="auth-atmosphere" aria-hidden="true" />
      <div className="auth-callback-card" style={{ width: "min(480px, 100%)" }}>
        {taskKey === "reset-password" ? <TaskResetPassword /> : null}
        {taskKey === "setup-mfa" ? <TaskSetupMFA /> : null}
      </div>
    </div>
  );
}

function AppRouter() {
  const { isSignedIn } = useAuth();
  const { session } = useSession();
  const { user, isLoaded: userLoaded } = useUser();
  const [bootstrapping, setBootstrapping] = useState(false);

  useEffect(() => {
    if (!isSignedIn || !userLoaded || !user || bootstrapping) return;
    if (!peekPendingSignupOnboarding()) return;

    const existing = user.unsafeMetadata?.onboardingStep;
    if (existing === "pay" || existing === "setup" || existing === "done") {
      consumePendingSignupOnboarding();
      return;
    }

    let cancelled = false;
    setBootstrapping(true);
    (async () => {
      try {
        await setOnboardingStep(user, "pay");
        consumePendingSignupOnboarding();
      } catch {
        // Keep pending flag so a remount/retry can still enter the funnel.
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, userLoaded, user, bootstrapping]);

  if (session?.currentTask?.key) {
    return <SessionTaskScreen taskKey={session.currentTask.key} />;
  }

  if (isSignedIn) {
    if (!userLoaded || bootstrapping) {
      return <LoadingCard />;
    }

    const step = getOnboardingStep(user);
    if (step === "pay") return <PaywallPage />;
    if (step === "setup") return <ProfileSetupPage />;
    return <App />;
  }

  return <AuthPage />;
}

function Root() {
  if (window.location.pathname === "/sso-callback") {
    return <SSOCallback />;
  }

  return (
    <>
      <ClerkLoading>
        <LoadingCard />
      </ClerkLoading>
      <ClerkLoaded>
        <AppRouter />
      </ClerkLoaded>
    </>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      <Root />
    </ClerkProvider>
  </React.StrictMode>,
);
