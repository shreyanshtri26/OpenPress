import type { ReactNode } from 'react'
import { ColorSelect } from './fields/ColorSelect'

// Every card can carry an accent colour picked from the Color taxonomy (the same palette the navbar uses).
// It becomes the CSS variable --chip, which the published stylesheet uses for category chips, so the
// canvas and the published page tint a card the same way (see helpers/registry/ComponentRegistry.ts).
const HEX = /^#[0-9a-fA-F]{6}$/
const SKIP = new Set(['Border', 'Heading', 'ErrorCard'])

export const withAccentColor = (blocks: Record<string, any>): Record<string, any> =>
  Object.fromEntries(
    Object.entries(blocks).map(([key, block]) => {
      if (SKIP.has(key) || key.startsWith('Ad_') || !block?.render) return [key, block]
      return [
        key,
        {
          ...block,
          fields: {
            ...(block.fields ?? {}),
            accentColor: {
              type: 'custom',
              label: 'Accent colour',
              render: ({ value, onChange }: { value?: string; onChange: (next: string) => void }) => (
                <ColorSelect value={value ?? ''} onChange={onChange} defaultColor="#6e6e73" label="Accent colour" />
              ),
            },
          },
          render: (props: any): ReactNode => {
            const out = block.render(props)
            return HEX.test(props?.accentColor ?? '') ? (
              <div style={{ display: 'contents', ['--chip' as any]: props.accentColor }}>{out}</div>
            ) : (
              out
            )
          },
        },
      ]
    })
  )
