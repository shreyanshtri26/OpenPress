import { useEffect, useState } from 'react'
import { getToken } from '../../../utils/auth'

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', marginBottom: 16 }}>
      {label && <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>{label}</span>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Color Preview Swatch */}
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: selectedValue,
            border: '1px solid #cbd5e1',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)',
            flexShrink: 0,
            transition: 'background-color 0.2s ease',
          }}
        />
        <select
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
          style={{
            flexGrow: 1,
            padding: '8px 12px',
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            background: '#f8fafc',
            color: '#334155',
            cursor: 'pointer',
            outline: 'none',
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            appearance: 'auto',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#3b82f6';
            e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#cbd5e1';
            e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.03)';
          }}
        >
          <option value="">Default Color</option>
          {isLoading && options.length === 0 ? <option value="">Loading colors...</option> : null}
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
