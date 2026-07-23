import { useState } from "react";
import { useUser } from "@clerk/react";
import { setOnboardingStep } from "../utils/onboarding";

export default function ProfileSetupPage() {
  const { user } = useUser();
  const [username, setUsername] = useState(user?.username || "");
  const [fullName, setFullName] = useState(
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "",
  );
  const [profileFile, setProfileFile] = useState(null);
  const [preview, setPreview] = useState(user?.imageUrl || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function handlePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) {
      setProfileFile(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Profile picture must be an image.");
      return;
    }
    if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setProfileFile(file);
    setPreview(URL.createObjectURL(file));
    setError("");
  }

  async function saveAndContinue(event) {
    event.preventDefault();
    if (!user) return;
    setBusy(true);
    setError("");

    try {
      const cleaned = username.trim().toLowerCase();
      const updates = {};

      if (cleaned && cleaned !== user.username) {
        updates.username = cleaned;
      }

      if (fullName.trim()) {
        const parts = fullName.trim().split(/\s+/);
        updates.firstName = parts[0];
        updates.lastName = parts.slice(1).join(" ") || undefined;
      }

      if (Object.keys(updates).length) {
        await user.update(updates);
      }

      if (profileFile) {
        await user.setProfileImage({ file: profileFile });
      }

      await setOnboardingStep(user, "done");
    } catch (err) {
      setError(err?.message || err?.errors?.[0]?.long_message || "Could not save profile.");
    } finally {
      setBusy(false);
    }
  }

  async function skipForNow() {
    if (!user) return;
    setBusy(true);
    setError("");
    try {
      await setOnboardingStep(user, "done");
    } catch (err) {
      setError(err?.message || "Could not continue.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen onboarding-screen">
      <div className="auth-atmosphere" aria-hidden="true" />
      <div className="onboarding-shell">
        <header className="onboarding-header">
          <p className="eyebrow">Almost there</p>
          <h1>Set up your profile</h1>
          <p className="onboarding-copy">
            Add a username and photo if you want — you can skip and do this later.
          </p>
        </header>

        <form className="onboarding-card auth-form" onSubmit={saveAndContinue}>
          <label className="profile-photo-field">
            <span>Profile picture (optional)</span>
            <div className="profile-photo-row">
              <div
                className="profile-photo-preview"
                style={preview ? { backgroundImage: `url(${preview})` } : undefined}
              >
                {!preview ? "Add photo" : null}
              </div>
              <input type="file" accept="image/*" onChange={handlePhoto} />
            </div>
          </label>

          <label className="field">
            <span>Username (optional)</span>
            <input
              name="username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="yourname"
            />
          </label>

          <label className="field">
            <span>Display name (optional)</span>
            <input
              name="fullName"
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Alex Rivera"
            />
          </label>

          {error ? <p className="auth-error">{error}</p> : null}

          <button type="submit" className="primary-button auth-submit" disabled={busy}>
            {busy ? "Saving…" : "Continue to planner"}
          </button>
          <button
            type="button"
            className="ghost-button auth-secondary"
            disabled={busy}
            onClick={skipForNow}
          >
            Skip for now
          </button>
        </form>
      </div>
    </div>
  );
}
