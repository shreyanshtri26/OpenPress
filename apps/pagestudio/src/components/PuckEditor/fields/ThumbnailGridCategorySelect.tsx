import { useEffect, useState } from 'react'
import { initializeThumbnailGridTaxonomyOptions } from '../storyData'
import { StudioDropdown } from './StudioDropdown'

type ThumbnailGridCategorySelectProps = {
  value: string
  onChange: (value: string) => void
}

export function ThumbnailGridCategorySelect({
  value,
  onChange,
}: ThumbnailGridCategorySelectProps) {
  const [options, setOptions] = useState<Array<{ label: string; value: string }>>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const loadCategories = async () => {
      setIsLoading(true)
      try {
        const mappedOptions = await initializeThumbnailGridTaxonomyOptions()

        if (!cancelled) {
          setOptions(mappedOptions)
        }
      } catch (error) {
        console.error('ThumbnailGridCategorySelect: failed to load taxonomy options', error)
        if (!cancelled) {
          setOptions([])
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadCategories()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <StudioDropdown
        variant="field"
        value={value ?? ''}
        onChange={(v) => onChange(String(v ?? ''))}
        ariaLabel="Category"
        options={[
          { label: 'Off', value: '' },
          ...(isLoading && options.length === 0 ? [{ label: 'Loading taxonomy values…', value: '__loading', disabled: true }] : []),
          ...options.map((option) => ({ label: option.label, value: option.value })),
        ]}
      />
    </div>
  )
}
