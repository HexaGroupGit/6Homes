#!/usr/bin/env node
// Guards against deploying this repository root to Vercel.
//
// The repo holds two separate applications. Vercel installs dependencies from
// whichever directory is set as the project's Root Directory — so a project
// pointed at the repo root installs only the three root tooling packages, then
// runs a build that needs `next` and `vite`, and dies with a bare
// "next: command not found". That message says nothing about the actual cause.
//
// This turns it into an instruction. It only fires on Vercel; local builds of
// both apps still work exactly as before.

const onVercel = Boolean(process.env.VERCEL || process.env.NOW_BUILDER)
if (!onVercel) process.exit(0)

const red = (s) => `\x1b[31m${s}\x1b[0m`
const bold = (s) => `\x1b[1m${s}\x1b[0m`

console.error(`
${red(bold('This repository root cannot be deployed as one Vercel project.'))}

It contains two applications that deploy separately:

  ${bold('site/')}   Next.js marketing website  →  6homes.com
  ${bold('admin/')}  Vite CRM + serverless API  →  admin.6homes.com

Vercel installs dependencies from the project's Root Directory. Pointed at the
repo root it installs only the root tooling, so next and vite are absent and the
build fails on "command not found".

${bold('Fix — create two projects from this repository:')}

  1. Website
       Settings → General → Root Directory:  site
       Framework preset:                     Next.js
       Environment:                          NEXT_PUBLIC_SUPABASE_URL,
                                             NEXT_PUBLIC_SUPABASE_ANON_KEY,
                                             CRM_SUPABASE_SERVICE_KEY,
                                             SIXHOMES_ADMIN_ENDPOINT,
                                             NEXT_PUBLIC_SITE_URL

  2. Admin
       Settings → General → Root Directory:  admin
       Framework preset:                     Vite
       Environment:                          SUPABASE_URL,
                                             SUPABASE_SERVICE_ROLE_KEY,
                                             VITE_SUPABASE_URL,
                                             VITE_SUPABASE_ANON_KEY,
                                             RESEND_API_KEY,
                                             CRON_SECRET,
                                             PUBLIC_SITE_URL,
                                             ADMIN_URL

Set the Root Directory and redeploy. Vercel then installs and builds each
application on its own, and admin/vercel.json registers the three daily crons.

See the Deploying section of README.md.
`)

process.exit(1)
