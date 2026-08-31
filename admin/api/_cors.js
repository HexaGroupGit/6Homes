// CORS for the public endpoints the website calls.
//
// The Next.js site normally forwards enquiries server-to-server (no CORS
// involved), but the fallback path and any direct browser call need this.
// Returns true when the request was an OPTIONS preflight (already answered).
export function applyCors(req, res, methods = 'GET, POST, OPTIONS') {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', methods)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return true
  }
  return false
}

// Small helper so handlers don't each hand-roll the same guard.
export function methodNotAllowed(res, allowed) {
  return res.status(405).json({ error: `Method not allowed. Use ${allowed}.` })
}
