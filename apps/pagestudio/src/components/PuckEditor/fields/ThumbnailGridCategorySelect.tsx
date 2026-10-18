import { useEffect, useState } from 'react'
import { initializeThumbnailGridTaxonomyOptions } from '../storyData'

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
      <select
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        style={{
          width: '100%',
          padding: '6px 8px',
          border: '1px solid #ccc',
          borderRadius: 4,
          fontSize: 14,
          background: '#fff',
          color: '#333',
          cursor: 'pointer',
        }}
      >
        <option value="">Off</option>
        {isLoading && options.length === 0 ? <option value="">Loading taxonomy values...</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
