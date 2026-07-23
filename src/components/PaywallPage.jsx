import { useEffect, useState } from "react";
import { useUser } from "@clerk/react";
import { setOnboardingStep } from "../utils/onboarding";

/**
 * PricingTable is only available when Clerk Billing is enabled.
 * Load it dynamically so a missing export never breaks the production build.
 */
function PricingSection({ onHide }) {
  const [PricingTable, setPricingTable] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import("@clerk/react")
      .then((mod) => {
        if (cancelled) return;
        if (typeof mod.PricingTable === "function") {
          setPricingTable(() => mod.PricingTable);
          setReady(true);
        } else {
          onHide?.();
        }
      })
      .catch(() => {
        if (!cancelled) onHide?.();
      });
    return () => {
      cancelled = true;
    };
    // Intentionally run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready || !PricingTable) return null;

  return (
    <div className="paywall-clerk">
      <PricingTable
        fallback={
          <button type="button" className="ghost-button" onClick={() => onHide?.()}>
            Use simple checkout instead
          </button>
        }
      />
    </div>
  );
}

export default function PaywallPage() {
  const { user } = useUser();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showClerkPricing, setShowClerkPricing] = useState(true);

  async function continueAfterPay() {
    if (!user) return;
    setBusy(true);
    setError("");
    try {
      await setOnboardingStep(user, "setup");
    } catch (err) {
      setError(err?.message || "Could not continue. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen onboarding-screen">
      <div className="auth-atmosphere" aria-hidden="true" />
      <div className="onboarding-shell">
        <header className="onboarding-header">
          <p className="eyebrow">BestPlanner</p>
          <h1>Start your free trial</h1>
          <p className="onboarding-copy">
            7 days free, then <strong>$5/month</strong>. Cancel anytime. Unlock full day planning,
            types, and locked routines.
          </p>
        </header>

        <div className="onboarding-card paywall-card">
          <ul className="paywall-points">
            <li>Wake-to-sleep block schedules</li>
            <li>Drag-and-drop planning</li>
            <li>Custom types, notes, and locked blocks</li>
          </ul>

          {showClerkPricing ? (
            <PricingSection onHide={() => setShowClerkPricing(false)} />
          ) : null}

          <div className="paywall-actions">
            <button
              type="button"
              className="primary-button"
              disabled={busy}
              onClick={continueAfterPay}
            >
              {busy ? "Continuing…" : "Start 7-day free trial"}
            </button>
            <p className="paywall-fineprint">
              Then $5/mo. You can manage billing anytime in settings once Clerk Billing is connected.
            </p>
          </div>

          {error ? <p className="auth-error">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
