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
            titleColor: {
              type: 'custom',
              label: 'Title colour',
              render: ({ value, onChange }: { value?: string; onChange: (next: string) => void }) => (
                <ColorSelect value={value ?? ''} onChange={onChange} defaultColor="#1d1d1f" label="Title colour" />
              ),
            },
            textColor: {
              type: 'custom',
              label: 'Paragraph colour',
              render: ({ value, onChange }: { value?: string; onChange: (next: string) => void }) => (
                <ColorSelect value={value ?? ''} onChange={onChange} defaultColor="#6e6e73" label="Paragraph colour" />
              ),
            },
          },
          render: (props: any): ReactNode => {
            const out = block.render(props)
            const vars: Record<string, string> = {}
            if (HEX.test(props?.accentColor ?? '')) vars['--chip'] = props.accentColor
            if (HEX.test(props?.titleColor ?? '')) vars['--card-title'] = props.titleColor
            if (HEX.test(props?.textColor ?? '')) vars['--card-text'] = props.textColor
            return Object.keys(vars).length ? <div style={{ display: 'contents', ...vars } as any}>{out}</div> : out
          },
        },
      ]
    })
  )
