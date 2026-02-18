"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Manrope, Merriweather } from "next/font/google";
import { ArrowRight, Eye, EyeOff, KeyRound, Lock, ShieldCheck, User } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import styles from "./login.module.css";

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
  const [signupCode, setSignupCode] = useState("");
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
    setSignupCode("");
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
      const result = await register(firstName, username, password, signupCode);
      if (result.success) {
        setSuccess("Account created successfully! Please sign in.");
        setMode("login");
        setFirstName("");
        setPassword("");
        setVerifyPassword("");
        setShowPassword(false);
        setShowVerifyPassword(false);
        setSignupCode("");
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
    <main className={`${styles.loginOneRoot} ${heroSerif.variable} ${bodySans.variable}`}>
      {error ? (
        <div
          className={`${styles.loginOneErrorToast} ${showErrorToast ? styles.isVisible : styles.isHidden}`}
          role="alert"
          aria-live="assertive"
        >
          {error}
        </div>
      ) : null}

      <section className={styles.loginOneShell}>
        <aside className={styles.loginOneHero}>
          
          <h1 className={styles.loginOneTitle}>
           🐝+ can<br></br>
            <span>but better.</span>
          </h1>

          <p className={styles.loginOneCopy}>
            Utilize the information already available to make better decisions 
            and connections. Search profiles fully and quickly.
          </p>

          <div className={styles.loginOneHighlights}>
            <article className={styles.loginOneHighlightCard}>
              <ShieldCheck size={18} aria-hidden />
              <div>
                <h2>Trusted internal access</h2>
                <p>No access to third party sites, all information is maintained internally.</p>
              </div>
            </article>
	            <article className={styles.loginOneHighlightCard}>
	              <User size={18} aria-hidden />
	              <div>
	                <h2>Full Profile Searching</h2>
	                <p>
	                  Search all aspects of a student&apos;s profile with filters and text
	                  search.
	                </p>
	              </div>
	            </article>
            <article className={styles.loginOneHighlightCard}>
              <ArrowRight size={18} aria-hidden />
              <div>
                <h2>Faster decisions</h2>
                <p>Move from searching to actions faster with all information unlocked.</p>
              </div>
            </article>
          </div>
        </aside>

        <section className={styles.loginOnePanel}>
          <div className={styles.loginOnePanelHead}>
            <h2>{mode === "login" ? "Welcome back" : "Create account"}</h2>
            <p>
              {mode === "login"
                ? "Sign in with your username and password."
                : "Use your invite details to create a new search account."}
            </p>
          </div>

          <div className={styles.loginOneSwitch} role="tablist" aria-label="Authentication mode">
            <span className={`${styles.loginOneSwitchIndicator} ${mode === "register" ? styles.isRegister : ""}`} />
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              className={mode === "login" ? styles.isActive : ""}
              disabled={isLoading}
              onClick={() => switchMode("login")}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              className={mode === "register" ? styles.isActive : ""}
              disabled={isLoading}
              onClick={() => switchMode("register")}
            >
              Create Account
            </button>
          </div>

          <form className={styles.loginOneForm} onSubmit={handleSubmit}>
            <div className={`${styles.loginOneRegisterBlock} ${mode === "register" ? styles.isOpen : ""}`}>
              <label htmlFor="login-one-first-name">First Name</label>
              <div className={styles.loginOneField}>
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
            <div className={styles.loginOneField}>
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
            <div className={styles.loginOneField}>
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
                className={styles.loginOneVisibilityToggle}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((current) => !current)}
                disabled={isLoading}
              >
                {showPassword ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
              </button>
            </div>

            <div className={`${styles.loginOneRegisterBlock} ${mode === "register" ? styles.isOpen : ""}`}>
              <label htmlFor="login-one-verify-password">Verify Password</label>
              <div className={styles.loginOneField}>
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
                  className={styles.loginOneVisibilityToggle}
                  aria-label={showVerifyPassword ? "Hide verify password" : "Show verify password"}
                  aria-pressed={showVerifyPassword}
                  onClick={() => setShowVerifyPassword((current) => !current)}
                  disabled={mode !== "register" || isLoading}
                >
                  {showVerifyPassword ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
                </button>
              </div>

              <label htmlFor="login-one-signup-code">Signup Code</label>
              <div className={styles.loginOneField}>
                <KeyRound size={18} aria-hidden />
                <input
                  id="login-one-signup-code"
                  type="text"
                  value={signupCode}
                  onChange={(event) => setSignupCode(event.target.value)}
                  placeholder="Signup code"
                  disabled={mode !== "register" || isLoading}
                  required={mode === "register"}
                />
              </div>
            </div>

            {success ? (
              <p className={styles.loginOneSuccess} role="status">
                {success}
              </p>
            ) : null}

            <button className={styles.loginOneSubmit} type="submit" disabled={isLoading}>
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
    </main>
  );
}
