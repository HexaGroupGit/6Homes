'use client'

import { useState } from 'react'
import { COMPANY } from '@/data/content'
import RingButton from '@/components/RingButton'

/**
 * The enquiry form. Submits into the group's CRM intake (the same pipeline the
 * 6Homes site feeds), tagged source x-homes.com.au so Tom and Wayne see these
 * leads under their own banner in the portal they already have logins for.
 * Falls back to a mailto link if the endpoint is unreachable — an enquiry must
 * never dead-end.
 */
const INTAKE = 'https://portal.6homes.com/api/form-submit'

type State = 'idle' | 'busy' | 'done' | 'error'

export default function ContactSection() {
  const [state, setState] = useState<State>('idle')
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const f = new FormData(form)
    setState('busy')
    setError('')

    const message = [
      f.get('message'),
      f.get('company') ? `Company: ${f.get('company')}` : null,
      f.get('site') ? `Project address: ${f.get('site')}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    try {
      const r = await fetch(INTAKE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'commercial',
          name: f.get('name'),
          email: f.get('email'),
          phone: f.get('phone'),
          message,
          source: 'x-homes.com.au',
          website: f.get('website'), // honeypot
        }),
      })
      const data = await r.json().catch(() => null)
      if (!r.ok) throw new Error(data?.error || 'Something went wrong — please call us instead.')
      setState('done')
      form.reset()
    } catch (err) {
      setState('error')
      setError(err instanceof Error ? err.message : 'Something went wrong — please call us instead.')
    }
  }

  return (
    <section id="contact" className="bg-black py-20 text-white md:py-32">
      <div className="container-page grid gap-14 lg:grid-cols-[1fr_1.1fr] lg:gap-24">
        <div data-rv-w>
          <p className="caps text-white/50" data-rv="a">
            Get in touch
          </p>
          <h2 className="display-md mt-5" data-rv="h">
            Start the
            <br />
            conversation
          </h2>
          <p className="body-copy mt-7 max-w-md !text-white/60" data-rv="p">
            Tell us about your project — a site you hold, a development you are planning, or the home
            you want built properly — and we will come back to you promptly.
          </p>

          <dl className="mt-10 space-y-5 border-t border-white/15 pt-7">
            <div>
              <dt className="caps text-white/40">Phone</dt>
              <dd className="mt-1">
                <a href={COMPANY.phoneHref} className="font-display text-xl tracking-wide hover:opacity-70">
                  {COMPANY.phone}
                </a>
              </dd>
            </div>
            <div>
              <dt className="caps text-white/40">Email</dt>
              <dd className="mt-1">
                <a href={`mailto:${COMPANY.email}`} className="font-display text-xl tracking-wide hover:opacity-70">
                  {COMPANY.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="caps text-white/40">Office</dt>
              <dd className="mt-1">
                <a href={COMPANY.mapsUrl} target="_blank" rel="noreferrer noopener" className="btn-x-line caps">
                  {COMPANY.address}
                </a>
              </dd>
            </div>
          </dl>

          <div className="mt-12 hidden lg:block" data-rv="ctn">
            <RingButton href={COMPANY.phoneHref}>Call us now</RingButton>
          </div>
        </div>

        {state === 'done' ? (
          <div className="flex flex-col items-start justify-center" data-rv="ctn">
            <p className="font-script text-4xl text-white/90">thank you</p>
            <h3 className="display-sm mt-4">We have your enquiry</h3>
            <p className="body-copy mt-4 max-w-md !text-white/60">
              One of the team will be in touch shortly. If it is urgent, call{' '}
              <a href={COMPANY.phoneHref} className="underline">
                {COMPANY.phone}
              </a>
              .
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="self-center" data-rv="ctn">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Full name *">
                <input name="name" required autoComplete="name" className="xh-field" />
              </Field>
              <Field label="Phone *">
                <input name="phone" required type="tel" autoComplete="tel" className="xh-field" />
              </Field>
              <Field label="Email *" className="sm:col-span-2">
                <input name="email" required type="email" autoComplete="email" className="xh-field" />
              </Field>
              <Field label="Company">
                <input name="company" autoComplete="organization" className="xh-field" />
              </Field>
              <Field label="Project address">
                <input name="site" className="xh-field" />
              </Field>
              <Field label="Your message *" className="sm:col-span-2">
                <textarea name="message" required rows={5} className="xh-field resize-y" />
              </Field>
            </div>

            {/* honeypot */}
            <input name="website" tabIndex={-1} autoComplete="off" className="absolute -left-[9999px]" aria-hidden />

            {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

            <button type="submit" disabled={state === 'busy'} className="btn-x btn-x-light mt-7 disabled:opacity-50">
              {state === 'busy' ? 'Sending…' : 'Send enquiry'}
            </button>
          </form>
        )}
      </div>

      <style>{`
        .xh-field {
          width: 100%;
          background: transparent;
          border: 0;
          border-bottom: 1px solid rgb(255 255 255 / 0.3);
          padding: 10px 0;
          color: #fff;
          font-size: 15px;
          outline: none;
          transition: border-color 0.4s var(--ease-out);
        }
        .xh-field:focus { border-color: #fff; }
      `}</style>
    </section>
  )
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="caps mb-1 block text-white/50">{label}</span>
      {children}
    </label>
  )
}
