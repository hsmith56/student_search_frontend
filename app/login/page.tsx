"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Manrope, Merriweather } from "next/font/google";
import { ArrowRight, Eye, EyeOff, KeyRound, Lock, ShieldCheck, User } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

const heroSerif = Merriweather({
  subsets: ["latin"],
  weight: ["700", "900"],
  variable: "--font-login-one-serif",
});

const bodySans = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-login-one-sans",
});

export default function LoginOnePage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [firstName, setFirstName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [verifyPassword, setVerifyPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showVerifyPassword, setShowVerifyPassword] = useState(false);
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [success, setSuccess] = useState("");
  const router = useRouter();
  const { isAuthenticated, login, register } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!error) {
      setShowErrorToast(false);
      return;
    }

    setShowErrorToast(true);
    const fadeTimer = setTimeout(() => setShowErrorToast(false), 2000);
    const clearTimer = setTimeout(() => setError(""), 1800);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(clearTimer);
    };
  }, [error]);

  const switchMode = (nextMode: "login" | "register") => {
    if (isLoading || mode === nextMode) return;
    setMode(nextMode);
    setError("");
    setShowErrorToast(false);
    setSuccess("");
    setPassword("");
    setVerifyPassword("");
    setShowPassword(false);
    setShowVerifyPassword(false);
    setCode("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setShowErrorToast(false);
    setSuccess("");

    if (mode === "register") {
      if (password !== verifyPassword) {
        setError("Passwords do not match. Please try again.");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters long.");
        return;
      }
    }

    setIsLoading(true);

    if (mode === "register") {
      const result = await register(firstName, username, password, code);
      if (result.success) {
        setSuccess("Account created successfully! Please sign in.");
        setMode("login");
        setFirstName("");
        setPassword("");
        setVerifyPassword("");
        setShowPassword(false);
        setShowVerifyPassword(false);
        setCode("");
      } else {
        setError(result.error || "Failed to create account. Please try again.");
      }
    } else {
      const result = await login(username, password);
      if (result.success) {
        router.push("/");
      } else {
        setError(result.error || "Unable to sign in. Verify your credentials.");
      }
    }

    setIsLoading(false);
  };

  return (
    <main className={`login-one-root ${heroSerif.variable} ${bodySans.variable}`}>
      {error ? (
        <div
          className={`login-one-error-toast ${showErrorToast ? "is-visible" : "is-hidden"}`}
          role="alert"
          aria-live="assertive"
        >
          {error}
        </div>
      ) : null}

      <section className="login-one-shell">
        <aside className="login-one-hero">
          
          <h1 className="login-one-title">
           🐝+ can<br></br>
            <span>but better.</span>
          </h1>

          <p className="login-one-copy">
            Utilize the information already available to make better decisions 
            and connections. Search profiles fully and quickly.
          </p>

          <div className="login-one-highlights">
            <article className="login-one-highlight-card">
              <ShieldCheck size={18} aria-hidden />
              <div>
                <h2>Trusted internal access</h2>
                <p>No access to third party sites, all information is maintained internally.</p>
              </div>
            </article>
            <article className="login-one-highlight-card">
              <User size={18} aria-hidden />
              <div>
                <h2>Full Profile Searching</h2>
                <p>Search all aspects of a student's profile with filters and text search.</p>
              </div>
            </article>
            <article className="login-one-highlight-card">
              <ArrowRight size={18} aria-hidden />
              <div>
                <h2>Faster decisions</h2>
                <p>Move from searching to actions faster with all information unlocked.</p>
              </div>
            </article>
          </div>
        </aside>

        <section className="login-one-panel">
          <div className="login-one-panel-head">
            <h2>{mode === "login" ? "Welcome back" : "Create account"}</h2>
            <p>
              {mode === "login"
                ? "Sign in with your username and password."
                : "Use your invite details to create a new search account."}
            </p>
          </div>

          <div className="login-one-switch" role="tablist" aria-label="Authentication mode">
            <span className={`login-one-switch-indicator ${mode === "register" ? "is-register" : ""}`} />
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              className={mode === "login" ? "is-active" : ""}
              disabled={isLoading}
              onClick={() => switchMode("login")}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              className={mode === "register" ? "is-active" : ""}
              disabled={isLoading}
              onClick={() => switchMode("register")}
            >
              Create Account
            </button>
          </div>

          <form className={`login-one-form ${mode === "register" ? "is-register" : ""}`} onSubmit={handleSubmit}>
            <div className={`login-one-register-block ${mode === "register" ? "is-open" : ""}`}>
              <label htmlFor="login-one-first-name">First Name</label>
              <div className="login-one-field">
                <User size={18} aria-hidden />
                <input
                  id="login-one-first-name"
                  type="text"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="Enter your first name"
                  autoComplete="given-name"
                  disabled={mode !== "register" || isLoading}
                  required={mode === "register"}
                />
              </div>
            </div>

            <label htmlFor="login-one-username">Username</label>
            <div className="login-one-field">
              <User size={18} aria-hidden />
              <input
                id="login-one-username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Enter your username"
                autoComplete="username"
                disabled={isLoading}
                required
              />
            </div>

            <label htmlFor="login-one-password">Password</label>
            <div className="login-one-field">
              <Lock size={18} aria-hidden />
              <input
                id="login-one-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                disabled={isLoading}
                required
              />
              <button
                type="button"
                className="login-one-visibility-toggle"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((current) => !current)}
                disabled={isLoading}
              >
                {showPassword ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
              </button>
            </div>

            <div className={`login-one-register-block ${mode === "register" ? "is-open" : ""}`}>
              <label htmlFor="login-one-verify-password">Verify Password</label>
              <div className="login-one-field">
                <Lock size={18} aria-hidden />
                <input
                  id="login-one-verify-password"
                  type={showVerifyPassword ? "text" : "password"}
                  value={verifyPassword}
                  onChange={(event) => setVerifyPassword(event.target.value)}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  disabled={mode !== "register" || isLoading}
                  required={mode === "register"}
                />
                <button
                  type="button"
                  className="login-one-visibility-toggle"
                  aria-label={showVerifyPassword ? "Hide verify password" : "Show verify password"}
                  aria-pressed={showVerifyPassword}
                  onClick={() => setShowVerifyPassword((current) => !current)}
                  disabled={mode !== "register" || isLoading}
                >
                  {showVerifyPassword ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
                </button>
              </div>

              <label htmlFor="login-one-code">Sign Up Code</label>
              <div className="login-one-field">
                <KeyRound size={18} aria-hidden />
                <input
                  id="login-one-code"
                  type="text"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="Verification phrase"
                  disabled={mode !== "register" || isLoading}
                  required={mode === "register"}
                />
              </div>
            </div>

            {success ? (
              <p className="login-one-success" role="status">
                {success}
              </p>
            ) : null}

            <button className="login-one-submit" type="submit" disabled={isLoading}>
              {isLoading
                ? mode === "login"
                  ? "Signing in..."
                  : "Creating account..."
                : mode === "login"
                  ? "Sign In"
                  : "Create Account"}
              {!isLoading ? <ArrowRight size={16} aria-hidden /> : null}
            </button>
          </form>

        
        </section>
      </section>

      <style jsx>{`
        .login-one-root {
          --one-primary: #005eb8;
          --one-primary-deep: #003b5c;
          --one-secondary: #3a9dbc;
          --one-action: #ff5f00;
          --one-panel: #f6f7f8;
          --one-ink: #0e2537;
          --one-muted: #5a7081;
          --one-type-scale: 0.9;
          min-height: 100vh;
          min-height: 100svh;
          min-height: 100dvh;
          width: 100%;
          display: grid;
          place-items: center;
          padding: clamp(0.65rem, 1.4vw, 1.25rem);
          box-sizing: border-box;
          overflow-x: hidden;
          overscroll-behavior: none;
          background:
            radial-gradient(circle at 15% 10%, rgba(58, 157, 188, 0.18), transparent 45%),
            radial-gradient(circle at 85% 90%, rgba(255, 95, 0, 0.15), transparent 50%),
            linear-gradient(145deg, #ecf2f6 0%, #f7f8f9 100%);
          font-family: var(--font-login-one-sans), sans-serif;
        }

        .login-one-error-toast {
          position: fixed;
          top: max(0.75rem, env(safe-area-inset-top));
          left: 50%;
          transform: translate(-50%, -10px);
          z-index: 9999;
          width: min(90vw, 34rem);
          border-radius: 0.7rem;
          border: 1px solid rgba(186, 12, 47, 0.42);
          background: rgba(140, 19, 45, 0.96);
          color: #fff2f4;
          box-shadow: 0 10px 22px rgba(73, 8, 24, 0.38);
          padding: 0.55rem 0.72rem;
          font-size: calc(0.82rem * var(--one-type-scale));
          line-height: 1.3;
          font-weight: 700;
          text-align: center;
          opacity: 0;
          pointer-events: none;
          transition:
            opacity 180ms ease,
            transform 180ms ease;
        }

        .login-one-error-toast.is-visible {
          opacity: 1;
          transform: translate(-50%, 0);
        }

        .login-one-error-toast.is-hidden {
          opacity: 0;
          transform: translate(-50%, -10px);
        }

        .login-one-shell {
          width: min(1040px, 100%);
          height: clamp(620px, 86vh, 760px);
          border-radius: 1.2rem;
          overflow: hidden;
          display: grid;
          grid-template-columns: 1.03fr 0.97fr;
          border: 1px solid rgba(0, 59, 92, 0.12);
          box-shadow:
            0 16px 34px rgba(0, 59, 92, 0.14),
            0 3px 10px rgba(0, 59, 92, 0.08);
        }

        .login-one-hero {
          position: relative;
          padding: clamp(1.25rem, 2.2vw, 2rem);
          background:
            radial-gradient(circle at 70% 75%, rgba(58, 157, 188, 0.37), transparent 45%),
            radial-gradient(circle at 18% 90%, rgba(255, 95, 0, 0.16), transparent 43%),
            linear-gradient(154deg, var(--one-primary-deep) 6%, #064d86 50%, var(--one-primary) 100%);
          color: #f2f8ff;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          isolation: isolate;
        }

        .login-one-hero::before {
          content: "";
          position: absolute;
          inset: -36% -20%;
          background: conic-gradient(
            from 40deg,
            transparent 0deg,
            rgba(255, 95, 0, 0.22) 95deg,
            transparent 190deg,
            rgba(58, 157, 188, 0.2) 280deg,
            transparent 360deg
          );
          z-index: -1;
          opacity: 0.36;
        }

        .login-one-brand-mark {
          width: fit-content;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.14);
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 0.35rem 0.72rem;
          font-size: calc(0.86rem * var(--one-type-scale));
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          letter-spacing: 0.01em;
        }

        .login-one-brand-dot {
          width: 0.62rem;
          height: 0.62rem;
          border-radius: 999px;
          background: var(--one-action);
          box-shadow: 0 0 0 4px rgba(255, 95, 0, 0.23);
        }

        .login-one-title {
          margin: 1.2rem 0 0.75rem;
          max-width: 15ch;
          font-family: var(--font-login-one-serif), serif;
          font-size: clamp(
            calc(1.7rem * var(--one-type-scale)),
            calc(3.2vw * var(--one-type-scale)),
            calc(2.5rem * var(--one-type-scale))
          );
          line-height: 1.12;
          letter-spacing: -0.02em;
          text-wrap: balance;
        }

        .login-one-title span {
          color: #ffb347;
        }

        .login-one-copy {
          color: rgba(235, 244, 255, 0.9);
          max-width: 37ch;
          font-size: clamp(
            calc(0.9rem * var(--one-type-scale)),
            calc(1vw * var(--one-type-scale)),
            calc(1.02rem * var(--one-type-scale))
          );
          line-height: 1.52;
          margin-bottom: 1.2rem;
        }

        .login-one-highlights {
          display: grid;
          gap: 0.55rem;
        }

        .login-one-highlight-card {
          display: grid;
          grid-template-columns: 1.2rem 1fr;
          gap: 0.65rem;
          align-items: start;
          background: rgba(8, 33, 53, 0.42);
          border: 1px solid rgba(159, 218, 242, 0.24);
          border-radius: 0.72rem;
          padding: 0.58rem 0.68rem;
          backdrop-filter: blur(4px);
        }

        .login-one-highlight-card h2 {
          margin: 0;
          font-size: calc(0.85rem * var(--one-type-scale));
          font-weight: 750;
          color: #f0f8ff;
        }

        .login-one-highlight-card p {
          margin: 0.2rem 0 0;
          font-size: calc(0.77rem * var(--one-type-scale));
          line-height: 1.32;
          color: rgba(216, 235, 249, 0.85);
        }

        .login-one-panel {
          background: var(--one-panel);
          color: var(--one-ink);
          padding: clamp(0.2rem, 1.2vw, 0.9rem);
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          position: relative;
          overflow-x: hidden;
          overflow-y: auto;
        }

        .login-one-panel::before {
          content: "";
          position: absolute;
          top: -22%;
          right: -14%;
          width: clamp(9rem, 20vw, 13rem);
          aspect-ratio: 1;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(0, 94, 184, 0.18) 0%, rgba(0, 94, 184, 0) 70%);
          pointer-events: none;
        }

        .login-one-panel-head {
          margin-bottom: 0.85rem;
        }

        .login-one-tag {
          margin: 0;
          font-size: calc(0.65rem * var(--one-type-scale));
          letter-spacing: 0.15em;
          text-transform: uppercase;
          font-weight: 800;
          color: #3f647d;
        }

        .login-one-panel-head h2 {
          margin: 0.34rem 0 0.3rem;
          font-family: var(--font-login-one-serif), serif;
          font-size: clamp(
            calc(1.45rem * var(--one-type-scale)),
            calc(2.3vw * var(--one-type-scale)),
            calc(1.95rem * var(--one-type-scale))
          );
          letter-spacing: -0.02em;
          color: #102d43;
        }

        .login-one-panel-head p {
          margin: 0;
          color: var(--one-muted);
          line-height: 1.42;
          max-width: 32ch;
          font-size: calc(0.89rem * var(--one-type-scale));
        }

        .login-one-switch {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.25rem;
          background: rgba(17, 51, 74, 0.1);
          border: 1px solid rgba(17, 51, 74, 0.15);
          border-radius: 0.66rem;
          padding: 0.16rem;
          position: relative;
          margin-bottom: 0.75rem;
          width: min(24rem, 100%);
        }

        .login-one-switch-indicator {
          position: absolute;
          top: 0.16rem;
          left: 0.16rem;
          width: calc(50% - 0.16rem);
          bottom: 0.16rem;
          border-radius: 0.5rem;
          background: linear-gradient(90deg, var(--one-action), #ff892f);
          transition: transform 180ms ease;
          box-shadow: 0 3px 8px rgba(255, 95, 0, 0.22);
        }

        .login-one-switch-indicator.is-register {
          transform: translateX(100%);
        }

        .login-one-switch button {
          border: 0;
          background: transparent;
          border-radius: 0.5rem;
          padding: 0.4rem 0.5rem;
          font-size: calc(0.83rem * var(--one-type-scale));
          position: relative;
          z-index: 1;
          font-weight: 700;
          color: #25465d;
          cursor: pointer;
        }

        .login-one-switch button.is-active {
          color: #ffffff;
        }

        .login-one-switch button:disabled {
          cursor: not-allowed;
          opacity: 0.75;
        }

        .login-one-form {
          display: grid;
          width: 100%;
          gap: 0.5rem;
          max-width: 25rem;
          min-height: clamp(22rem, 46vh, 27rem);
          align-content: start;
        }

        .login-one-register-block {
          display: none;
          gap: 0.5rem;
        }

        .login-one-register-block.is-open {
          display: grid;
        }

        .login-one-form label {
          margin-top: 0.5rem;
          font-size: calc(0.77rem * var(--one-type-scale));
          font-weight: 750;
          color: #123247;
        }

        .login-one-field {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          border-radius: 0.62rem;
          border: 1px solid rgba(0, 59, 92, 0.2);
          padding: 0.55rem 0.62rem;
          background: rgba(255, 255, 255, 0.8);
          transition:
            box-shadow 180ms ease,
            border-color 180ms ease,
            background-color 180ms ease;
        }

        .login-one-field:focus-within {
          border-color: rgba(0, 94, 184, 0.6);
          box-shadow: 0 0 0 3px rgba(0, 94, 184, 0.14);
          background: rgba(255, 255, 255, 0.96);
        }

        .login-one-field :global(svg) {
          color: #37566a;
          flex-shrink: 0;
        }

        .login-one-field input {
          border: 0;
          outline: none;
          background: transparent;
          width: 100%;
          color: #102b3f;
          font-size: calc(0.88rem * var(--one-type-scale));
          line-height: 1.25;
        }

        .login-one-field input::placeholder {
          color: #6f8697;
        }

        .login-one-visibility-toggle {
          border: 0;
          background: transparent;
          color: #37566a;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 0.4rem;
          padding: 0.14rem;
          cursor: pointer;
          flex-shrink: 0;
          transition:
            background-color 180ms ease,
            color 180ms ease,
            opacity 180ms ease;
        }

        .login-one-visibility-toggle:hover:not(:disabled) {
          background: rgba(0, 94, 184, 0.12);
          color: #114364;
        }

        .login-one-visibility-toggle:disabled {
          cursor: not-allowed;
          opacity: 0.65;
        }

        .login-one-visibility-toggle:focus-visible {
          outline: 2px solid rgba(0, 94, 184, 0.45);
          outline-offset: 2px;
        }

        .login-one-success {
          margin-top: 0.3rem;
          border-radius: 0.58rem;
          padding: 0.45rem 0.55rem;
          font-size: calc(0.78rem * var(--one-type-scale));
          font-weight: 600;
        }

        .login-one-success {
          border: 1px solid rgba(34, 122, 79, 0.35);
          background: rgba(34, 122, 79, 0.1);
          color: #1e5c3d;
        }

        .login-one-submit {
          margin-top: 0.75rem;
          border: 0;
          border-radius: 0.68rem;
          background: linear-gradient(90deg, var(--one-action) 0%, #ff7b1a 100%);
          color: #fff;
          padding: 0.68rem 0.8rem;
          font-size: calc(0.88rem * var(--one-type-scale));
          font-weight: 760;
          letter-spacing: 0.01em;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          cursor: pointer;
          box-shadow: 0 7px 14px rgba(255, 95, 0, 0.25);
          transition:
            transform 120ms ease,
            box-shadow 180ms ease,
            opacity 180ms ease;
        }

        .login-one-submit:hover:not(:disabled) {
          transform: translateY(-0.5px);
          box-shadow: 0 9px 16px rgba(255, 95, 0, 0.28);
        }

        .login-one-submit:disabled {
          cursor: not-allowed;
          opacity: 0.75;
          box-shadow: none;
        }

        .login-one-submit:focus-visible,
        .login-one-note button:focus-visible,
        .login-one-switch button:focus-visible {
          outline: 3px solid rgba(0, 94, 184, 0.45);
          outline-offset: 2px;
        }

        .login-one-note {
          margin: 0.8rem 0 0;
          color: #4e6778;
          font-size: calc(0.76rem * var(--one-type-scale));
          line-height: 1.35;
        }

        .login-one-note button {
          border: 0;
          background: transparent;
          color: #005eb8;
          font-weight: 700;
          cursor: pointer;
          padding: 0;
        }

        .login-one-note button:disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }

        @media (max-width: 960px) {
          .login-one-root {
            place-items: start center;
          }

          .login-one-shell {
            grid-template-columns: 1fr;
            height: auto;
            min-height: calc(100vh - 0.7rem);
            overflow: visible;
          }

          .login-one-hero {
            padding-bottom: 1.25rem;
          }

          .login-one-title {
            max-width: 18ch;
            margin-top: 0.9rem;
          }

          .login-one-copy {
            margin-bottom: 0.9rem;
          }

          .login-one-panel {
            overflow: visible;
          }

          .login-one-form {
            min-height: 0;
          }
        }

        @media (max-width: 560px) {
          .login-one-root {
            padding: 0.35rem;
          }

          .login-one-shell {
            border-radius: 0.86rem;
            min-height: calc(100vh - 0.35rem);
          }

          .login-one-hero,
          .login-one-panel {
            padding: 0.95rem 0.82rem 1rem;
          }

          .login-one-title {
            margin-top: 0.78rem;
            font-size: clamp(
              calc(1.45rem * var(--one-type-scale)),
              calc(8vw * var(--one-type-scale)),
              calc(2.05rem * var(--one-type-scale))
            );
          }

          .login-one-copy {
            font-size: calc(0.86rem * var(--one-type-scale));
          }

          .login-one-switch,
          .login-one-form {
            max-width: 100%;
          }
        }

        @media (max-width: 768px) {
          .login-one-root {
            place-items: center;
            min-height: 100dvh;
            padding-top: max(0.5rem, env(safe-area-inset-top));
            padding-right: max(0.5rem, env(safe-area-inset-right));
            padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
            padding-left: max(0.5rem, env(safe-area-inset-left));
            overflow-y: auto;
          }

          .login-one-shell {
            width: min(460px, 100%);
            height: auto;
            min-height: 0;
            display: block;
            border-radius: 0.95rem;
            margin: 0 auto;
            overflow: visible;
          }

          .login-one-hero {
            display: none;
          }

          .login-one-panel {
            overflow: visible;
            min-height: 0;
            padding: clamp(1rem, 4vw, 1.25rem);
          }

          .login-one-panel::before {
            top: -20%;
            right: -20%;
            width: clamp(7rem, 28vw, 10rem);
          }

          .login-one-switch,
          .login-one-form {
            width: 100%;
            max-width: 100%;
          }

          .login-one-form {
            min-height: 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .login-one-switch-indicator,
          .login-one-error-toast {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </main>
  );
}
