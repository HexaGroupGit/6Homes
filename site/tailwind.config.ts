import type { Config } from 'tailwindcss'

// 6Homes — architectural specification catalogue.
//
// The palette is derived from the logo mark (bright teal → deep teal → navy
// wordmark) rather than from a stock scheme. The ground is a COOL pale
// concrete, not a warm cream: this brand is teal, and warm paper fights it.
//
// The teal is an annotation colour. It marks dimension rules, tick marks, small
// caps labels and hover states — never a large fill. A big teal button turns an
// architectural page into a SaaS landing page.

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F2F4F4', // pale concrete / drawing paper
        panel: '#E7EBEC', // one step down, for inset blocks
        ink: '#0F1A1E', // near-black, blue cast
        mute: '#5B6B71', // secondary type
        rule: '#C9D4D6', // hairline
        teal: '#00BDCA', // the mark's highlight — annotation only
        'teal-deep': '#00727E',
        navy: '#025376', // the wordmark colour
        deep: '#0E3A44', // inverted field
        'deep-2': '#0A2C34', // deeper still, for the footer
      },
      fontFamily: {
        // Archivo carries the personality: expanded and heavy for display,
        // normal and light for body. Plex Mono is the engineering face and is
        // used only where the content is genuinely data.
        sans: ['var(--font-archivo)', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        spec: '0.22em', // mono labels and eyebrows
        nav: '0.14em',
      },
      maxWidth: {
        page: '1560px',
      },
      transitionTimingFunction: {
        // Long, decelerating — everything on this site eases like this.
        drafting: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        rise: {
          '0%': { opacity: '0', transform: 'translateY(22px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fade: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        // The dimension rule draws itself in, like a line being struck on a plan.
        measure: {
          '0%': { transform: 'scaleX(0)' },
          '100%': { transform: 'scaleX(1)' },
        },
      },
      animation: {
        rise: 'rise 0.9s cubic-bezier(0.16,1,0.3,1) both',
        fade: 'fade 1.6s ease both',
        measure: 'measure 1.1s cubic-bezier(0.16,1,0.3,1) both',
      },
    },
  },
  plugins: [],
}

export default config
