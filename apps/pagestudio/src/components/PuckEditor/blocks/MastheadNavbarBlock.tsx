import type { FC } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { getToken } from '../../../utils/auth'
import { useActiveSection } from '../ActiveSectionContext'
import { PUBLISHED_PAGE_STYLES } from '../../../generated/publishedPageStyles'
import { renderMastheadNavbar } from '../../../helpers/renderers/renderMastheadNavbar'

export type MastheadNavbarProps = {
  id?: string
  isLoggedIn?: boolean
  showBanner?: boolean
  showSignIn?: boolean
  showSupportUs?: boolean
  showBecomeMember?: boolean
  showFacebook?: boolean
  showLinkedIn?: boolean
  // Dynamic top banner & button texts/colors
  bannerText?: string
  bannerBgColor?: string
  bannerTextColor?: string
  supportUsText?: string
  supportUsBgColor?: string
  supportUsTextColor?: string
  signInText?: string
  signInBgColor?: string
  signInTextColor?: string
  becomeMemberText?: string
  becomeMemberBgColor?: string
  becomeMemberTextColor?: string
  themeColor?: string
}

// The editor preview is the published navbar: the same renderer, fed the same props, so what you
// see here is what /publish writes. Scripts are dropped (the canvas is a preview, not a live page);
// the masthead date is the only thing they filled in.
export const MastheadNavbarBlock: FC<MastheadNavbarProps> = (props) => {
  const { activeSection } = useActiveSection()
  const [sections, setSections] = useState<string[]>([])
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false
    const token = getToken()
    fetch(`${import.meta.env.VITE_BACKEND_API}/taxonomy/section/values`, {
      headers: { Authorization: token ? `Bearer ${token}` : '', 'Content-Type': 'application/json' },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => { if (!cancelled && Array.isArray(json?.values)) setSections(json.values) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const html = useMemo(
    () =>
      renderMastheadNavbar({ ...props, sections, activeSection: activeSection || 'HOME' } as any).replace(
        /<script[\s\S]*?<\/script>/g,
        ''
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(props), sections, activeSection]
  )

  useEffect(() => {
    const el = ref.current?.querySelector('#navbar-date')
    if (el) el.textContent = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }, [html])

  return (
    <>
      {/* The stylesheet published pages carry, so the masthead lays out exactly as it does live */}
      <style dangerouslySetInnerHTML={{ __html: PUBLISHED_PAGE_STYLES }} />
      <div ref={ref} dangerouslySetInnerHTML={{ __html: html }} />
    </>
  )
}
