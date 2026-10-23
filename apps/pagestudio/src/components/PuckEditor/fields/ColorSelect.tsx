import { useEffect, useState } from 'react'
import { getToken } from '../../../utils/auth'
import { StudioDropdown } from './StudioDropdown'

type ColorSelectProps = {
  value: string
  onChange: (value: string) => void
  defaultColor?: string
  label?: string
}

export function ColorSelect({
  value,
  onChange,
  defaultColor = '#0057FF',
  label,
}: ColorSelectProps) {
  const [options, setOptions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const loadColors = async () => {
      setIsLoading(true)
      try {
        const base = import.meta.env.VITE_BACKEND_API
        const token = getToken()
        
        const response = await fetch(`${base}/taxonomies`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch taxonomies: ${response.status}`)
        }

        const payload = await response.json()
        const allTaxonomies: any[] = payload?.taxonomies ?? []
        const COLOR_ALIASES: Record<string, string> = {
          color: 'color',
          colors: 'color',
          colour: 'color',
          colours: 'color',
        }

        const normalizeColorInput = (value = ''): string => {
          return String(value)
            .trim()
            .toLowerCase()
            .replace(/[_\s]+/g, '-')   // spaces/underscores -> dash
            .replace(/[^\w-]/g, '');   // keep word chars + dash
        };

        const canonicalColor = (value = ''): string => {
          const normalized = normalizeColorInput(value);
          return COLOR_ALIASES[normalized] || normalized;
        };

        const colorTaxonomies = allTaxonomies.filter((t: any) => {
          const name = String(t?.name ?? '').replace(/^\[c\]\s*/i, '');
          return canonicalColor(name) === 'color';
        });

        let colorValues: unknown[] = []
        for (const tax of colorTaxonomies) {
          if (Array.isArray(tax?.values)) {
            colorValues = [...colorValues, ...tax.values]
          }
        }

        if (!cancelled) {
          const colorList = Array.from(new Set(
            colorValues
              .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
              .map(c => c.trim())
          ))
          setOptions(colorList)
        }
      } catch (error) {
        console.error('ColorSelect: failed to load colors', error)
        if (!cancelled) {
          setOptions([])
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadColors()

    return () => {
      cancelled = true
    }
  }, [])

  const selectedValue = value || defaultColor

  return (
    <div className="studio-color-field">
      {label && <span className="studio-color-field__label">{label}</span>}
      <div className="studio-color-field__row">
        {/* Color Preview Swatch */}
        <span className="studio-color-field__swatch" style={{ backgroundColor: selectedValue }} aria-hidden="true" />
        <StudioDropdown
          variant="field"
          value={value ?? ''}
          onChange={(v) => onChange(String(v ?? ''))}
          ariaLabel={label ?? 'Colour'}
          options={[
            { label: 'Default Color', value: '' },
            ...(isLoading && options.length === 0 ? [{ label: 'Loading colors…', value: '__loading', disabled: true }] : []),
            ...options.map((option) => ({ label: option, value: option })),
          ]}
        />
      </div>
    </div>
  )
}
