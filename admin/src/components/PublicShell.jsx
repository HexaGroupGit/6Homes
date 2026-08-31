// Chrome for the two customer-facing pages (quote accept, contract signing).
//
// These are the only screens in this app a customer ever sees, so they carry
// the 6Homes brand rather than the admin's workbench styling — and no nav, no
// sign-in, nothing that hints at an internal tool behind them.

export function PublicShell({ children, footerNote }) {
  return (
    <div className="min-h-screen bg-brand-50 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <div className="text-2xl tracking-wide text-navy">
            <span className="font-bold">6</span>
            <span className="font-normal tracking-[0.18em]">HOMES</span>
          </div>
          <div className="mt-1.5 text-[10px] tracking-[0.22em] text-mute uppercase">
            Homes for everyone, everywhere
          </div>
        </div>

        {children}

        <p className="mt-8 text-center text-xs leading-relaxed text-mute">
          {footerNote ?? (
            <>
              Questions? Call <a href="tel:1800646637" className="text-brand-600 hover:underline">1800 6HOMES (646 637)</a>
              {' '}or reply to the email that brought you here.
            </>
          )}
        </p>
      </div>
    </div>
  )
}

export function PublicCard({ children, className = '' }) {
  return (
    <div className={`overflow-hidden rounded-xl border border-hair bg-white ${className}`}>
      <div className="h-1 bg-brand-400" />
      <div className="p-7 sm:p-9">{children}</div>
    </div>
  )
}

export function PublicMessage({ title, children }) {
  return (
    <PublicShell>
      <PublicCard>
        <h1 className="text-lg font-semibold text-navy">{title}</h1>
        <div className="mt-2 text-sm leading-relaxed text-mute">{children}</div>
      </PublicCard>
    </PublicShell>
  )
}
