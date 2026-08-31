# 6Homes

Prefab luxury modular homes — public website and custom CRM.

- **Head office:** 4/830 Whitehorse Road, Box Hill VIC 3128
- **Display showroom:** 878 Whitehorse Road, Box Hill VIC 3128
- **Phone:** 1800 6HOMES (646 637)
- **Tagline:** Homes for everyone, everywhere

Replaces the WordPress + Elementor site at `6homes.com`, and puts every enquiry
into a pipeline with automatic acknowledgements, follow-up and build updates.

## Layout

| Path | What | Deploys to |
| --- | --- | --- |
| `site/` | Next.js 16 marketing website | `6homes.com` |
| `admin/` | Vite + React CRM and `/api` serverless functions | `admin.6homes.com` |
| `sql/` | One-shot Supabase setup | — |
| `scripts/` | WordPress migration and the launch preflight | — |

## Deploying

**Two Vercel projects, from this one repository.** They are separate
applications and cannot share a deployment — one is a Next.js site, the other a
Vite SPA plus serverless functions.

The setting that matters is **Root Directory**. Vercel installs dependencies
from there, so a project pointed at the repo root installs only the root tooling
and the build dies on `next: command not found`. `npm run build` at the root
detects Vercel and explains this rather than failing cryptically.

| | Website | Admin |
| --- | --- | --- |
| Root Directory | `site` | `admin` |
| Framework preset | Next.js | Vite |
| Domain | `6homes.com` | `admin.6homes.com` |
| Build / output | auto-detected | auto-detected (`dist`) |

Everything else is auto-detected — no build command or install command to
override. `admin/vercel.json` registers the SPA rewrite and the three daily
crons, and `admin/api/*.js` become serverless functions automatically.

### Environment variables

Set these in each project's Settings → Environment Variables. They mirror the
`.env.example` files.

**Website**

```
NEXT_PUBLIC_SUPABASE_URL         https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY    anon key
CRM_SUPABASE_SERVICE_KEY         service role key — enquiry fallback only
SIXHOMES_ADMIN_ENDPOINT          https://admin.6homes.com/api/form-submit
NEXT_PUBLIC_SITE_URL             https://6homes.com
```

**Admin**

```
SUPABASE_URL                     https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY        service role key
VITE_SUPABASE_URL                https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY           anon key
RESEND_API_KEY                   Resend key
CRON_SECRET                      any long random string
PUBLIC_SITE_URL                  https://6homes.com
ADMIN_URL                        https://admin.6homes.com
```

`PUBLIC_SITE_URL` is where the brochure, price-list and commercial emails fetch
their attachments, so it must point at a deployed site. While the website is
still on a preview URL, set it to that preview rather than the production domain.

`CRON_SECRET` is what makes the three cron endpoints refuse anonymous callers.
Without it they still run, but anyone who finds the URL can trigger them.

## Getting started

```bash
npm install                # root
npm run install:all        # site + admin deps
```

1. Create a Supabase project and run `sql/6homes-setup.sql` in its SQL editor.
   It is idempotent — safe to re-run.
2. Copy `admin/.env.example` → `admin/.env.local` and `site/.env.example` →
   `site/.env.local`, then fill in the Supabase and Resend credentials.
3. Create your Supabase auth users. The setup SQL seeds `eric@6homes.com` and
   `melissa@6homes.com` into the `admins` allow-list; an account only gets in if
   its email is in that table.

```bash
npm run dev                # site on :3000, admin on :5174
```

## Email safety

Every outbound email routes through `admin/api/_email.js`.

**Safe mode is ON until `settings.emails.safeMode` is explicitly `false`.** While
it is on, every recipient is rewritten to one inbox and the subject is prefixed
`[TEST → …]` — team notifications included. The admin shows a standing banner,
and turning it off requires typing a confirmation phrase in Settings. Leave it
on until launch day.

Addresses in `settings.emails.suppressed` are never emailed on any flow.

## Email setup (Resend)

Run the readiness check at any point. It verifies the things that silently break
email, and every failure says what to do about it:

```bash
npm run preflight
```

### 1. Domain

Add `6homes.com` at [resend.com/domains](https://resend.com/domains) and create
the DNS records it lists — DKIM plus a return-path CNAME.

### 2. SPF — read this before touching DNS

`6homes.com` already sends through Microsoft 365, and its SPF record ends in a
**hard fail**:

```
v=spf1 include:spf.protection.outlook.com -all
```

`-all` instructs receiving servers to **reject** mail from any sender not listed.
Add Resend without amending this and every automated email is rejected outright —
not spam-foldered, rejected. Amend the existing record; do not add a second one,
because two SPF records is itself a failure:

```
v=spf1 include:spf.protection.outlook.com include:amazonses.com -all
```

Resend delivers via Amazon SES, which is what `amazonses.com` authorises.

### 3. DMARC

Already present and relaxed (`p=none; aspf=r; adkim=r`), which is fine to launch
on. Tighten to `p=quarantine` after a fortnight of clean reports.

### 4. Keys and addresses

Set `RESEND_API_KEY` in `admin/.env.local` and in the Vercel project env.
Everything else lives in the admin under Settings → Emails:

| Setting | Value |
| --- | --- |
| From | `noreply@6homes.com` — must be on the verified domain |
| Reply-to | `melissa@6homes.com` |
| New-lead notifications | `melissa@6homes.com` |
| Safe-mode redirect | `melissa@6homes.com` |

`noreply@6homes.com` needs no mailbox — replies are steered by reply-to.

### 5. Attachments

The brochure, price-list and commercial emails fetch their PDFs from
`PUBLIC_SITE_URL/downloads/`, so the site must be deployed before those send
correctly. While staging, point `PUBLIC_SITE_URL` at the Vercel preview URL.

Anything over **8 MB** is refused before it reaches Resend and the email sends
without it — corporate gateways reject large attachments silently, so this fails
loudly in the log instead. Link to the bigger documents; they are all hosted in
`site/public/downloads/`.

The brochure is the one to watch: at 7.1 MB it sits at 88% of that ceiling, so a
few more designs will push it over and it will silently stop attaching. Drop the
default tier in `prepareImages` below 1500px, or switch the brochure to a hosted
link, before that happens.

## What runs automatically

Vercel crons, configured in `admin/vercel.json` (times are UTC):

| Cron | When | Does |
| --- | --- | --- |
| `/api/lead-nurture` | daily 23:00 | Follow-ups on day 2, 5 and 9; marks a lead lost at day 14. Stops the moment anyone moves the lead out of a New stage. |
| `/api/consult-reminders` | daily 22:00 | Reminds customers about tomorrow's consultation or showroom visit. |
| `/api/project-updates` | daily 23:30 | Emails a customer once when their build reaches a new stage. |

All three respect safe mode and all three are idempotent — re-running sends
nothing twice.

## Migrating from WordPress

```bash
npm run migrate           # download assets, write seed JSON
npm run migrate -- --push # …and upsert into Supabase
```

Images are mapped by scraping each page's own HTML rather than guessing from
filenames — the media library is full of `Untitled-design-26.png`. An image
appearing on a third or more of the pages is treated as page furniture and
dropped (their project pages all open with bed and bath icons). Floorplans are
detected by name and routed to their own field, and the hero prefers a photo
unique to that page. The whole media library is pulled down, not just what the
pages display, so nothing is lost when WordPress is switched off.

Already-downloaded files are skipped, rows are upserted by id, nothing is deleted.
`--push` needs `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the environment.

## Verifying

```bash
npm run test --prefix admin     # 25 logic tests: GST, expiry, nurture cadence, safe mode
npm run build                   # both apps
npm run preflight               # email + DNS + attachment readiness
```

Before going live, with safe mode still **on**:

1. Submit each of the six forms. Each should create a lead in the right stage and
   produce a `[TEST → …]` email — the customer acknowledgement and the team
   notification to Melissa.
2. Stop the admin dev server and submit a form. The lead should still land in
   Supabase via the fallback and the visitor should still see success.
3. Seed leads dated 2, 5, 9 and 14 days ago and hit `/api/lead-nurture` with the
   cron bearer token. Re-run it the same day and confirm nothing sends twice.
4. Build a quote, send it, accept it from the tokenised link, then sign and
   countersign the contract.
5. Walk the old WordPress URLs and confirm each redirects to a live page.

Only then turn safe mode off in Settings.

## Brand assets

The official lockup lives in `site/public/brand/` and `admin/public/brand/`,
copied from the brand pack at
`Documents/Hexa Marketing/6 Homes Marketing Materials/MARKETING MATERIAL/EASY YOKE/Logo/`.

The pack ships only a vertical lockup and a mark-only PNG, neither of which
works in a 64px header. `npm run logo` splits the official vector into its two
groups so a horizontal lockup can be set from the real artwork:

| Asset | Use |
| --- | --- |
| `mark.svg` / `mark-white.svg` | The interlocking mark alone |
| `wordmark.svg` / `wordmark-white.svg` | 6HOMES type alone |
| `FullLogo.svg` / `FullLogo_White.svg` | The original vertical lockup |
| `email-logo.png` | Horizontal lockup for the branded emails |

Bounding boxes are measured in a real browser, so each asset crops exactly to
its own ink. The wordmark carries its fill inside the SVG and cannot inherit
`currentColor`, which is why there are real white variants rather than a filter.

Colours are taken from the vector, not sampled from a PNG:

| Token | Value |
| --- | --- |
| Navy (wordmark) | `#025376` |
| Teal (mark highlight) | `#00BDCA` |
| Deep teal (mark base) | `#00515A` |


The favicon and app icons are generated from the same mark:

```bash
npm run logo        # split the lockup into mark + wordmark
npm run logo:email  # compose the horizontal lockup as a PNG for emails
npm run favicon     # build the icons from the mark
```

Email clients strip SVG, so the branded emails cannot use the vectors. `npm run
logo:email` composes the same two split assets into `site/public/brand/email-logo.png`
at 2x, declared at half size in the markup so it stays sharp on a retina screen.
It lands in the *site's* public folder deliberately: an email has no origin to
resolve a relative path against, so the logo needs an absolute URL on a host that
serves it publicly, and the admin is behind a login. `npm run preflight` checks
that URL actually resolves, because a broken logo shows on every send rather than
on one flow.

The mark on a transparent ground vanishes against a dark browser tab — half its
gradient is nearly black — so it is set in white on a brand-gradient tile, which
reads at 16px on light and dark chrome alike. Safari ignores SVG favicons, so
PNG fallbacks and a 180px touch icon are generated too, plus a maskable variant
for Android launchers that crop to their own shape.

## Brochures

All five documents are generated from the CRM, in the same design language as
the website:

```bash
npm run brochures                 # all five
npm run brochures -- price-guide  # just one
npm run brochures -- --html       # keep the HTML, to debug a page
```

| Document | Pages | Size | Attached to |
| --- | --- | --- | --- |
| Brochure | 18 | 7.1 MB | Brochure and domestic replies |
| Information and Price Guide | 18 | 6.0 MB | Price-list replies |
| Look Book | 20 | 5.0 MB | Hosted |
| Product Guide | 20 | 6.0 MB | Hosted |
| Factory Introduction | 12 | 0.7 MB | Commercial replies — was 14 MB, now emailable |

Content comes from Supabase when credentials are present, otherwise from the
migration output — the same order the website uses, so a brochure never
disagrees with what is published. Change a price or add a model once and every
document and the website agree.

Source images are re-encoded to one of three tiers before embedding. Without
that step the brochure came out at 108 MB and crashed the renderer on the longer
documents. Each document renders in its own browser instance for the same reason.

The tier that matters is not an image's pixel width but how many pixels survive
per millimetre of paper. A cover plate spans the full 210mm page, so 1920px
across it is 232 dpi. The same file cropped into a portrait full-bleed kept only
764px of its width — 92 dpi, and 72 dpi once the old flat 1500px cap had been
applied, which is why the covers looked soft. Covers and full-bleed plates are
now never downscaled and never cropped against their own aspect ratio;
floorplans keep full chroma because dimension text is the point of the drawing;
everything else stays at 1500px.

A page whose content no longer fits its sheet is reported at build time. `.page`
is `overflow: hidden` by design, so without that check a layout change is
clipped silently and only discovered in print.

Prices in the guide are the installed prices, held in the CRM. `publishPrice` is
false on every design, so they appear in the brochures and in quotes but never on
the public site — the download form stays the gate, as it was before.

## Collateral

Originals migrated from OneDrive (`Documents/Hexa Marketing/6 Homes Marketing Materials/`
and `Documents/6HOMEs/`) into `site/public/downloads/`:

| File | Used for |
| --- | --- |
| `6homes-brochure.pdf` | Brochure and domestic replies (7.1 MB) |
| `6homes-price-list.pdf` | Price-list replies — the Information and Price Guide (6.0 MB) |
| `6homes-factory-introduction.pdf` | Commercial replies (0.7 MB after rebuild) |
| `6homes-product-guide.pdf` | Hosted only (6.0 MB) |
| `6homes-look-book.pdf` | Hosted only (5.0 MB) |
| `6homes-inclusions.pdf` | Hosted only (0.3 MB) |
| `6homes-terms-of-sale.pdf` | Reference for the contract template (0.4 MB) |

**`6Homes Modular Price List (Wholesale).pdf` is deliberately excluded.** It
lists 17 internal model codes and container module bases, and must never reach a
retail enquiry.

## Outstanding before launch

- **SPF** — amend the record as above, or every automated email is rejected.
- **`/about`** — the WordPress page was never written (it still carries theme
  placeholder text and two stock founder profiles). The rebuilt page says only
  what is demonstrably true; the founding story and team are yours to supply.
- **Prices are not published.** The price guide quotes installed prices, but the
  site gates them behind the download form, as the old one did. Two conflicts to
  resolve first: Norfolk has no price in the guide despite being on the website,
  and the guide's areas differ from the site's (Alton reads 20.4 m² vs 30 m²).
- **Social profile URLs** in `site/src/data/content.ts` are assumed — check them.
