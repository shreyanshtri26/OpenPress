import { useEffect, useState } from 'react'

// The admin's taxonomy colours ({ "Politics": "#b42318", ... }), fetched once per session from the public /taxonomy/colors
// endpoint and shared by every dropdown. A failure just means no swatches: it never blocks a dropdown.
let cache: Record<string, string> | null = null
let inflight: Promise<Record<string, string>> | null = null

function load(): Promise<Record<string, string>> {
  if (cache) return Promise.resolve(cache)
  if (!inflight) {
    const base = import.meta.env.VITE_BACKEND_API
    inflight = fetch(`${base}/taxonomy/colors`)
      .then((res) => (res.ok ? res.json() : { colors: {} }))
      .then((json) => (cache = json?.colors && typeof json.colors === 'object' ? json.colors : {}))
      .catch(() => (cache = {}))
  }
  return inflight
}

export function useTaxonomyColors(): Record<string, string> {
  const [colors, setColors] = useState<Record<string, string>>(cache ?? {})
  useEffect(() => {
    let live = true
    load().then((c) => { if (live) setColors(c) })
    return () => { live = false }
  }, [])
  return colors
}
