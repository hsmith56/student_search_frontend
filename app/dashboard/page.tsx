import { notFound } from "next/navigation";
import { ENABLE_DASHBOARD } from "@/lib/feature-flags";

export default function DashboardRoute() {
  if (!ENABLE_DASHBOARD) {
    notFound();
  }

  // Dashboards are excluded from lint/typecheck/build while disabled.
  return (
    <div className="brand-page-gradient min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-2xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.9)] p-6 text-center shadow-lg shadow-[rgba(0,53,84,0.12)] backdrop-blur-sm">
        <h1 className="text-xl font-black tracking-tight text-[var(--brand-ink)]">
          Dashboard Disabled
        </h1>
        <p className="mt-2 text-sm text-[var(--brand-body)]">
          The dashboard feature is currently excluded from linting and type-checking.
          To re-enable it, remove the dashboard excludes in <code className="font-mono">.eslintignore</code>{" "}
          and <code className="font-mono">tsconfig.json</code>, then restore the real dashboard route.
        </p>
      </div>
    </div>
  );
}
