import Link from "next/link";

export default function NotFound() {
  return (
    <div className="brand-page-gradient min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-2xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.92)] p-6 text-center shadow-lg shadow-[rgba(0,53,84,0.12)] backdrop-blur-sm">
        <h1 className="text-2xl font-black tracking-tight text-[var(--brand-ink)]">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-[var(--brand-body)]">
          The page you requested doesn&apos;t exist.
        </p>
        <div className="mt-5 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--brand-primary)] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--brand-primary-deep)]"
          >
            Go to Search
          </Link>
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--brand-border)] bg-transparent px-4 text-sm font-semibold text-[var(--brand-body)] transition-colors hover:border-[var(--brand-primary-deep)] hover:bg-[rgba(0,53,84,0.06)]"
          >
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}

