import type { FC } from 'react'
import { PUBLISHED_PAGE_STYLES } from '../../generated/publishedPageStyles'
import { renderSupportUs, type SupportUsProps } from '../../helpers/renderers/renderSupportUs'

// The editor preview is the published block: same renderer, scripts removed (the canvas is not a live page).
export const SupportUs: FC<SupportUsProps> = (props) => (
  <>
    <style dangerouslySetInnerHTML={{ __html: PUBLISHED_PAGE_STYLES }} />
    <div dangerouslySetInnerHTML={{ __html: renderSupportUs(props).replace(/<script[\s\S]*?<\/script>/g, '') }} />
  </>
)
