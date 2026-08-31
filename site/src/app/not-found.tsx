import Link from 'next/link'
import { COMPANY } from '@/data/content'
import { Dim } from '@/components/ui'

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[70svh] flex-col justify-center py-24">
      <div className="max-w-2xl">
        <div className="max-w-[180px]">
          <Dim>404</Dim>
        </div>
        <h1 className="display mt-8">Nothing at this address</h1>
        <p className="prose-body mt-7 max-w-md">
          We rebuilt this site recently, so a few old links no longer point anywhere. Everything is still here — it has
          just moved.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/models" className="btn">
            The range
          </Link>
          <Link href="/projects" className="btn">
            Projects
          </Link>
        </div>
        <p className="prose-body mt-10 !text-[13px]">
          Or call{' '}
          <a href={COMPANY.phoneHref} className="font-mono text-ink hover:text-teal-deep">
            {COMPANY.phone}
          </a>{' '}
          and we will point you at what you were after.
        </p>
      </div>
    </div>
  )
}
