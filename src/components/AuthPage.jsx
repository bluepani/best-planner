import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useAuth, useClerk, useSignIn, useSignUp } from "@clerk/react";

const BRAND_LINES = [
  "Own your day with BestPlanner.",
  "Lock. In.",
  "It's time.",
  "Build the day you meant to have.",
  "One block at a time.",
  "Make today count.",
];

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
      />
    </svg>
  );
}

function fieldError(errors, key) {
  return errors?.fields?.[key]?.message || errors?.fields?.[key]?.longMessage || "";
}

function globalError(errors) {
  if (!errors) return "";
  if (typeof errors === "string") return errors;
  if (errors.message) return errors.message;
  if (Array.isArray(errors) && errors[0]?.message) return errors[0].message;
  return "";
}

export default function AuthPage() {
  const { isSignedIn } = useAuth();
  const clerk = useClerk();
  const {
    signIn,
    errors: signInErrors,
    fetchStatus: signInStatus,
  } = useSignIn();
  const {
    signUp,
    errors: signUpErrors,
    fetchStatus: signUpStatus,
  } = useSignUp();

  const [mode, setMode] = useState("sign-in");
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [profileFile, setProfileFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState("");
  const [code, setCode] = useState("");
  const [pendingVerify, setPendingVerify] = useState(false);
  const [pendingTrust, setPendingTrust] = useState(false);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [lineIndex, setLineIndex] = useState(0);
  const [turn, setTurn] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [faceLines, setFaceLines] = useState(() => [
    BRAND_LINES[0],
    BRAND_LINES[1 % BRAND_LINES.length],
    BRAND_LINES[2 % BRAND_LINES.length],
    BRAND_LINES[3 % BRAND_LINES.length],
  ]);
  const [cubeSize, setCubeSize] = useState({ width: 0, height: 0 });
  const sizerRef = useRef(null);

  const activeFace = ((turn % 4) + 4) % 4;
  const visibleLine = faceLines[activeFace];
  const incomingLine = faceLines[(activeFace + 1) % 4];

  useLayoutEffect(() => {
    const root = sizerRef.current;
    if (!root) return undefined;

    const measure = () => {
      const [currentNode, nextNode] = root.querySelectorAll("h1");
      if (!currentNode) return;
      const currentRect = currentNode.getBoundingClientRect();
      const nextRect = nextNode?.getBoundingClientRect();
      const width = Math.ceil(
        Math.max(currentRect.width, nextRect?.width || 0, 1),
      );
      const height = Math.ceil(currentRect.height || 1);
      setCubeSize((current) =>
        current.width === width && current.height === height ? current : { width, height },
      );
    };

    measure();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (observer) {
      [...root.querySelectorAll("h1")].forEach((node) => observer.observe(node));
    }
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [visibleLine, incomingLine]);

  useEffect(() => {
    if (isFlipping) return undefined;

    const hold = window.setTimeout(() => {
      const nextLineIndex = (lineIndex + 1) % BRAND_LINES.length;
      const activeFace = ((turn % 4) + 4) % 4;
      const incomingFace = (activeFace + 1) % 4;

      setFaceLines((current) => {
        const next = [...current];
        next[incomingFace] = BRAND_LINES[nextLineIndex];
        return next;
      });
      setIsFlipping(true);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          setTurn((current) => current + 1);
        });
      });
    }, 3400);

    return () => window.clearTimeout(hold);
  }, [lineIndex, turn, isFlipping]);

  useEffect(() => {
    return () => {
      if (profilePreview) URL.revokeObjectURL(profilePreview);
    };
  }, [profilePreview]);

  const loading = busy || signInStatus === "fetching" || signUpStatus === "fetching";
  const isSignUp = mode === "sign-up";

  function handleCubeTransitionEnd(event) {
    if (event.target !== event.currentTarget) return;
    if (event.propertyName !== "transform" || !isFlipping) return;
    setLineIndex((current) => (current + 1) % BRAND_LINES.length);
    setIsFlipping(false);
  }

  const headline = useMemo(() => {
    if (pendingVerify) return "Check your email";
    if (pendingTrust) return "Confirm it's you";
    return isSignUp ? "Create your account" : "Welcome back";
  }, [pendingVerify, pendingTrust, isSignUp]);

  const subcopy = useMemo(() => {
    if (pendingVerify) return `Enter the verification code we sent to ${email}.`;
    if (pendingTrust) return "Enter the code we emailed you to finish signing in.";
    return isSignUp
      ? "Pick a username, add a photo, and start planning."
      : "Sign in with your email or username.";
  }, [pendingVerify, pendingTrust, isSignUp, email]);

  if (isSignedIn) return null;

  async function applyProfileImage() {
    if (!profileFile || !clerk.user) return;
    try {
      await clerk.user.setProfileImage({ file: profileFile });
    } catch {
      // Profile image is optional — don't block sign-in if upload fails.
    }
  }

  async function finalizeNavigate({ session, decorateUrl }) {
    if (session?.currentTask) return;
    await applyProfileImage();
    const url = decorateUrl("/");
    if (url.startsWith("http")) {
      window.location.href = url;
    } else {
      window.location.assign(url);
    }
  }

  function handleProfileChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      setProfileFile(null);
      setProfilePreview("");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setFormError("Profile picture must be an image.");
      return;
    }
    if (profilePreview) URL.revokeObjectURL(profilePreview);
    setProfileFile(file);
    setProfilePreview(URL.createObjectURL(file));
    setFormError("");
  }

  async function handleGoogle() {
    setFormError("");
    setBusy(true);
    try {
      const { error } = await signIn.sso({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectCallbackUrl: "/sso-callback",
      });
      if (error) {
        setFormError(error.message || "Google sign-in failed.");
      }
    } catch (error) {
      setFormError(error?.message || "Google sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setFormError("");
    setBusy(true);

    try {
      if (isSignUp) {
        const cleanedUsername = username.trim().toLowerCase();
        if (!cleanedUsername) {
          setFormError("Choose a username.");
          return;
        }
        if (!profileFile) {
          setFormError("Add a profile picture to continue.");
          return;
        }

        const { error } = await signUp.password({
          emailAddress: email.trim(),
          username: cleanedUsername,
          password,
          ...(fullName.trim()
            ? {
                firstName: fullName.trim().split(/\s+/)[0],
                lastName: fullName.trim().split(/\s+/).slice(1).join(" ") || undefined,
              }
            : {}),
        });
        if (error) {
          setFormError(error.message || "Could not create account.");
          return;
        }
        await signUp.verifications.sendEmailCode();
        setPendingVerify(true);
        return;
      }

      const rawIdentifier = identifier.trim();
      if (!rawIdentifier) {
        setFormError("Enter your email or username.");
        return;
      }

      const looksLikeEmail = rawIdentifier.includes("@");
      const { error } = await signIn.password(
        looksLikeEmail
          ? {
              emailAddress: rawIdentifier.toLowerCase(),
              password,
            }
          : {
              identifier: rawIdentifier.toLowerCase(),
              password,
            },
      );
      if (error) {
        setFormError(error.message || "Could not sign in with that email/username and password.");
        return;
      }

      if (signIn.status === "complete") {
        await signIn.finalize({ navigate: finalizeNavigate });
      } else if (signIn.status === "needs_client_trust") {
        const emailCodeFactor = signIn.supportedSecondFactors?.find(
          (factor) => factor.strategy === "email_code",
        );
        if (emailCodeFactor) {
          await signIn.mfa.sendEmailCode();
          setPendingTrust(true);
        } else {
          setFormError("Additional verification is required, but no email code option is available.");
        }
      } else if (signIn.status === "needs_second_factor") {
        setFormError("Multi-factor authentication is required for this account.");
      } else {
        setFormError("Sign-in is not complete yet. Please try again.");
      }
    } catch (error) {
      setFormError(error?.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(event) {
    event.preventDefault();
    setFormError("");
    setBusy(true);
    try {
      if (pendingVerify) {
        await signUp.verifications.verifyEmailCode({ code: code.trim() });
        if (signUp.status === "complete") {
          await signUp.finalize({ navigate: finalizeNavigate });
        } else {
          setFormError("Verification incomplete. Check the code and try again.");
        }
        return;
      }

      await signIn.mfa.verifyEmailCode({ code: code.trim() });
      if (signIn.status === "complete") {
        await signIn.finalize({ navigate: finalizeNavigate });
      } else {
        setFormError("Verification incomplete. Check the code and try again.");
      }
    } catch (error) {
      setFormError(error?.message || "Invalid verification code.");
    } finally {
      setBusy(false);
    }
  }

  async function resendCode() {
    setFormError("");
    setBusy(true);
    try {
      if (pendingVerify) {
        await signUp.verifications.sendEmailCode();
      } else {
        await signIn.mfa.sendEmailCode();
      }
    } catch (error) {
      setFormError(error?.message || "Could not resend code.");
    } finally {
      setBusy(false);
    }
  }

  function switchMode(next) {
    setMode(next);
    setFormError("");
    setPendingVerify(false);
    setPendingTrust(false);
    setCode("");
  }

  const errors = isSignUp ? signUpErrors : signInErrors;
  const shownError =
    formError ||
    fieldError(errors, "emailAddress") ||
    fieldError(errors, "username") ||
    fieldError(errors, "identifier") ||
    fieldError(errors, "password") ||
    fieldError(errors, "code") ||
    globalError(errors);

  return (
    <div className="auth-screen">
      <div className="auth-atmosphere" aria-hidden="true" />
      <div className="auth-shell">
        <section className="auth-brand-panel">
          <p className="eyebrow">BestPlanner</p>
          <div
            className="auth-cube-stage"
            aria-live="polite"
            style={{
              width: cubeSize.width ? `${cubeSize.width}px` : undefined,
              height: cubeSize.height ? `${cubeSize.height}px` : "1em",
              ["--cube-depth"]: `${Math.max((cubeSize.height || 32) / 2, 12)}px`,
            }}
          >
            <div className="auth-cube-sizer" ref={sizerRef} aria-hidden="true">
              <h1>{visibleLine}</h1>
              <h1>{incomingLine}</h1>
            </div>
            <div
              className={`auth-cube ${isFlipping ? "is-flipping" : ""}`}
              style={{ transform: `translateZ(calc(var(--cube-depth) * -1)) rotateX(${turn * -90}deg)` }}
              onTransitionEnd={handleCubeTransitionEnd}
            >
              <div className="auth-cube-face auth-cube-face-front" data-face="0">
                <h1>{faceLines[0]}</h1>
              </div>
              <div className="auth-cube-face auth-cube-face-bottom" data-face="1" aria-hidden="true">
                <h1>{faceLines[1]}</h1>
              </div>
              <div className="auth-cube-face auth-cube-face-back" data-face="2" aria-hidden="true">
                <h1>{faceLines[2]}</h1>
              </div>
              <div className="auth-cube-face auth-cube-face-top" data-face="3" aria-hidden="true">
                <h1>{faceLines[3]}</h1>
              </div>
            </div>
          </div>
          <p className="auth-brand-copy">
            Build a clear schedule from movable time blocks. Sign in to keep your plans tied to your
            account across sessions.
          </p>
          <ul className="auth-points">
            <li>Wake-to-sleep day planning</li>
            <li>Drag-and-drop time blocks</li>
            <li>Types, notes, and locked routines</li>
          </ul>
        </section>

        <section className="auth-card" aria-label="Account access">
          <div className="auth-card-header">
            <p className="eyebrow">{isSignUp ? "Sign up" : "Sign in"}</p>
            <h2>{headline}</h2>
            <p className="auth-subcopy">{subcopy}</p>
          </div>

          {!pendingVerify && !pendingTrust ? (
            <>
              <button
                type="button"
                className="google-auth-button"
                onClick={handleGoogle}
                disabled={loading}
              >
                <GoogleIcon />
                Continue with Google
              </button>

              <div className="auth-divider" role="separator">
                <span>or email / username</span>
              </div>

              <form className="auth-form" onSubmit={handlePasswordSubmit}>
                {isSignUp ? (
                  <>
                    <label className="profile-photo-field">
                      <span>Profile picture</span>
                      <div className="profile-photo-row">
                        <div
                          className="profile-photo-preview"
                          style={
                            profilePreview
                              ? { backgroundImage: `url(${profilePreview})` }
                              : undefined
                          }
                        >
                          {!profilePreview ? "Add photo" : null}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleProfileChange}
                          required
                        />
                      </div>
                    </label>

                    <label className="field">
                      <span>Username</span>
                      <input
                        type="text"
                        name="username"
                        autoComplete="username"
                        required
                        minLength={3}
                        maxLength={32}
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        placeholder="yourname"
                      />
                    </label>

                    <label className="field">
                      <span>Full name</span>
                      <input
                        type="text"
                        name="fullName"
                        autoComplete="name"
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        placeholder="Alex Rivera"
                      />
                    </label>

                    <label className="field">
                      <span>Email</span>
                      <input
                        type="email"
                        name="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@example.com"
                      />
                    </label>
                  </>
                ) : (
                  <label className="field">
                    <span>Email or username</span>
                    <input
                      type="text"
                      name="identifier"
                      autoComplete="username"
                      required
                      value={identifier}
                      onChange={(event) => setIdentifier(event.target.value)}
                      placeholder="admin or you@example.com"
                    />
                  </label>
                )}

                <label className="field">
                  <span>Password</span>
                  <input
                    type="password"
                    name="password"
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                    required
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={isSignUp ? "At least 8 characters" : "Your password"}
                  />
                </label>

                {shownError ? <p className="auth-error">{shownError}</p> : null}

                <button type="submit" className="primary-button auth-submit" disabled={loading}>
                  {loading ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
                </button>
              </form>
            </>
          ) : (
            <form className="auth-form" onSubmit={handleVerify}>
              <label className="field">
                <span>Verification code</span>
                <input
                  type="text"
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="123456"
                />
              </label>

              {shownError ? <p className="auth-error">{shownError}</p> : null}

              <button type="submit" className="primary-button auth-submit" disabled={loading}>
                {loading ? "Verifying…" : "Verify and continue"}
              </button>
              <button
                type="button"
                className="ghost-button auth-secondary"
                onClick={resendCode}
                disabled={loading}
              >
                Resend code
              </button>
            </form>
          )}

          {!pendingVerify && !pendingTrust ? (
            <p className="auth-switch">
              {isSignUp ? "Already have an account?" : "New here?"}{" "}
              <button
                type="button"
                className="text-link-button"
                onClick={() => switchMode(isSignUp ? "sign-in" : "sign-up")}
              >
                {isSignUp ? "Sign in" : "Create an account"}
              </button>
            </p>
          ) : (
            <p className="auth-switch">
              <button
                type="button"
                className="text-link-button"
                onClick={() => {
                  setPendingVerify(false);
                  setPendingTrust(false);
                  setCode("");
                  setFormError("");
                }}
              >
                Back
              </button>
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
