// The print design system — the same language as the website, restated for A4.
//
// Archivo set expanded and heavy for display, IBM Plex Mono for every piece of
// spec data, the teal reserved for dimension rules and labels. What changes for
// print: real page geometry, page breaks that never split a spread, and colours
// that survive being put on paper.

export const T = {
  paper: '#F2F4F4',
  panel: '#E7EBEC',
  ink: '#0F1A1E',
  mute: '#5B6B71',
  rule: '#C9D4D6',
  teal: '#00BDCA',
  tealDeep: '#00727E',
  navy: '#025376',
  deep: '#0E3A44',
  deep2: '#0A2C34',
}

// A4 at 96dpi. Page geometry is fixed so a page break is always deliberate.
export const PAGE = { w: 210, h: 297, margin: 18 }

export const css = () => `
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@100..900&family=IBM+Plex+Mono:wght@400;500&display=swap');

* { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

@page { size: A4 portrait; margin: 0; }

html, body {
  font-family: 'Archivo', Helvetica, Arial, sans-serif;
  font-variation-settings: 'wdth' 100;
  color: ${T.ink};
  background: ${T.paper};
}

/* Every page is exactly one sheet. overflow:hidden means a page that runs long
   is visibly wrong in review rather than silently reflowing into the next. */
.page {
  position: relative;
  width: ${PAGE.w}mm;
  height: ${PAGE.h}mm;
  overflow: hidden;
  background: ${T.paper};
  page-break-after: always;
  break-after: page;
}
.page:last-child { page-break-after: auto; break-after: auto; }

.pad { padding: ${PAGE.margin}mm; height: 100%; display: flex; flex-direction: column; }

.bleed { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.dark { background: ${T.deep}; color: #fff; }
.dark .mute, .dark .prose { color: rgba(255,255,255,.62); }
.panel { background: ${T.panel}; }

/* ── Type ───────────────────────────────────────────────────────────────── */
.display   { font-variation-settings: 'wdth' 118, 'wght' 700; font-size: 46pt; line-height: .92; letter-spacing: -.025em; text-transform: uppercase; color: ${T.navy}; }
.display-s { font-variation-settings: 'wdth' 116, 'wght' 700; font-size: 26pt; line-height: .98; letter-spacing: -.02em; text-transform: uppercase; color: ${T.navy}; }
.display-x { font-variation-settings: 'wdth' 114, 'wght' 700; font-size: 14pt; line-height: 1.05; letter-spacing: -.015em; text-transform: uppercase; color: ${T.navy}; }
.dark .display, .dark .display-s, .dark .display-x { color: #fff; }

.prose { font-variation-settings: 'wdth' 100, 'wght' 350; font-size: 9.5pt; line-height: 1.75; color: ${T.mute}; }
.lead  { font-variation-settings: 'wdth' 100, 'wght' 350; font-size: 12pt; line-height: 1.55; color: ${T.ink}; }
.dark .lead { color: rgba(255,255,255,.9); }

.spec  { font-family: 'IBM Plex Mono', monospace; font-size: 6.5pt; letter-spacing: .22em; text-transform: uppercase; }
.data  { font-family: 'IBM Plex Mono', monospace; font-size: 9pt; }
.eyebrow { font-family: 'IBM Plex Mono', monospace; font-size: 6.5pt; letter-spacing: .22em; text-transform: uppercase; color: ${T.tealDeep}; }
.dark .eyebrow { color: ${T.teal}; }

/* ── The dimension rule ─────────────────────────────────────────────────── */
.dim { display: flex; align-items: center; gap: 2.5mm; }
.dim i { display: block; width: .35mm; height: 2.6mm; background: ${T.teal}; }
.dim s { display: block; width: 10mm; height: .25mm; background: ${T.teal}; opacity: .7; text-decoration: none; }
.dim span { font-family: 'IBM Plex Mono', monospace; font-size: 6.5pt; letter-spacing: .22em; text-transform: uppercase; color: ${T.tealDeep}; white-space: nowrap; }
.dim.light i, .dim.light s { background: #fff; }
.dim.light span { color: #fff; }

/* ── Rules and tables ───────────────────────────────────────────────────── */
.hr { height: .25mm; background: ${T.rule}; }
.dark .hr { background: rgba(255,255,255,.2); }

table.spec-table { width: 100%; border-collapse: collapse; }
table.spec-table td { padding: 2.6mm 0; border-bottom: .25mm solid ${T.rule}; vertical-align: baseline; }
table.spec-table td:first-child { font-family: 'IBM Plex Mono', monospace; font-size: 6.5pt; letter-spacing: .22em; text-transform: uppercase; color: ${T.mute}; }
table.spec-table td:last-child { font-family: 'IBM Plex Mono', monospace; font-size: 9pt; text-align: right; }
.dark table.spec-table td { border-color: rgba(255,255,255,.2); }
.dark table.spec-table td:first-child { color: rgba(255,255,255,.5); }
.dark table.spec-table td:last-child { color: #fff; }

/* ── Page furniture ─────────────────────────────────────────────────────── */
.folio {
  position: absolute; left: ${PAGE.margin}mm; right: ${PAGE.margin}mm; bottom: 8mm;
  display: flex; justify-content: space-between; align-items: baseline;
  font-family: 'IBM Plex Mono', monospace; font-size: 6pt; letter-spacing: .22em;
  text-transform: uppercase; color: ${T.mute};
}
.dark .folio { color: rgba(255,255,255,.45); }

.wordmark { font-variation-settings: 'wdth' 118, 'wght' 700; letter-spacing: 0; }
.wordmark em { font-style: normal; font-variation-settings: 'wdth' 112, 'wght' 400; letter-spacing: .16em; }

.grow { flex: 1; }
.row { display: flex; gap: 8mm; }
.col { flex: 1; min-width: 0; }
img.fit { width: 100%; height: 100%; object-fit: cover; display: block; }
img.contain { width: 100%; height: 100%; object-fit: contain; display: block; }
.frame { overflow: hidden; background: ${T.panel}; }
`
