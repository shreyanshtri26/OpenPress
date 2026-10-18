import type { FC } from 'react'
import { renderFooter } from '../../../helpers/renderers/renderFooter'

export type FooterProps = {
    id?: string
    aboutText?: string
    copyrightText?: string
}

// The editor preview uses the same renderer as the published page, so the two cannot drift apart.
export const FooterBlock: FC<FooterProps> = ({ id, copyrightText }) => (
    <div dangerouslySetInnerHTML={{ __html: renderFooter({ id, copyrightText }) }} />
)
