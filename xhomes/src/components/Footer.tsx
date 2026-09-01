import { COMPANY } from '@/data/content'

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black py-14 text-white">
      <div className="container-page flex flex-col items-start justify-between gap-10 md:flex-row md:items-end">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-white.png" alt="XHomes" className="h-5 w-auto md:h-6" />
          <p className="body-copy mt-5 max-w-xs !text-white/50">{COMPANY.blurb}</p>
        </div>

        <div className="flex flex-col gap-2 md:text-right">
          <a href={COMPANY.phoneHref} className="caps text-white/70 hover:text-white">
            {COMPANY.phone}
          </a>
          <a href={`mailto:${COMPANY.email}`} className="caps text-white/70 hover:text-white">
            {COMPANY.email}
          </a>
          <a href={COMPANY.mapsUrl} target="_blank" rel="noreferrer noopener" className="caps text-white/70 hover:text-white">
            {COMPANY.address}
          </a>
        </div>
      </div>

      <div className="container-page mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
        <p className="caps text-white/35">© {new Date().getFullYear()} XHomes. All rights reserved.</p>
        <p className="caps text-white/35">Melbourne, Victoria</p>
      </div>
    </footer>
  )
}
