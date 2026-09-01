// Tiny class joiner — the site has no clsx dependency and doesn't need one.
export const cnJoin = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(' ')
