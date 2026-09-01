import type { Config } from 'tailwindcss'

// X-Homes — premium Melbourne townhouse builder.
//
// The art direction follows the reference site's colour-loop idea: a deep
// bookend, a sky world, a powder mid-tone, a cream editorial ground — but the
// values are X-Homes' own, anchored to their logo and Melbourne light rather
// than the Mediterranean. Exact accent values are refined against the
// extracted brand assets.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F7F6F2', // warm white ground
        ink: '#141B26', // the deep bookend — Melbourne bluestone, near-black
        navy: '#22304A', // headings on light grounds
        sky: '#B7D2E8', // the hero sky world
        'sky-deep': '#8FB4D6',
        powder: '#DCE9F4', // the pale section ground
        cream: '#F5F1E8', // editorial ground
        'cream-deep': '#EBE4D4',
        stone: '#6B7686', // secondary type
        hair: '#D8DDE4', // hairlines on light
        brass: '#A98D5F', // the accent — door hardware, not gold foil
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        script: ['var(--font-script)', 'cursive'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        page: '1600px',
      },
      letterSpacing: {
        caps: '0.22em',
      },
    },
  },
  plugins: [],
}

export default config
