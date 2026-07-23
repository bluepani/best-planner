/** Onboarding steps for newly signed-up users: pay → setup → done */

export function getOnboardingStep(user) {
  if (!user) return "done";

  const publicMeta = user.publicMetadata || {};
  if (publicMeta.role === "admin" || publicMeta.plan === "free" || publicMeta.skipPay) {
    return "done";
  }

  const step = user.unsafeMetadata?.onboardingStep;
  if (step === "pay" || step === "setup" || step === "done") {
    return step;
  }

  // Existing accounts (signed up before onboarding) skip the funnel.
  return "done";
}

export async function setOnboardingStep(user, step) {
  if (!user) return;
  await user.update({
    unsafeMetadata: {
      ...(user.unsafeMetadata || {}),
      onboardingStep: step,
    },
  });
}

export function markPendingSignupOnboarding() {
  try {
    sessionStorage.setItem("bp_pending_onboarding", "1");
  } catch {
    // ignore
  }
}

export function peekPendingSignupOnboarding() {
  try {
    return sessionStorage.getItem("bp_pending_onboarding") === "1";
  } catch {
    return false;
  }
}

export function consumePendingSignupOnboarding() {
  try {
    const pending = sessionStorage.getItem("bp_pending_onboarding") === "1";
    sessionStorage.removeItem("bp_pending_onboarding");
    return pending;
  } catch {
    return false;
  }
}
