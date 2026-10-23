import type { ComponentType, ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { StudioDropdown, type DropdownOption } from './StudioDropdown'

// What Puck passes to a field-type override (see Puck's own SelectField).
type PuckSelectFieldProps = {
  field: { type: string; options?: DropdownOption[] }
  value: unknown
  onChange: (value: unknown) => void
  readOnly?: boolean
  id?: string
  name?: string
  label?: string
  labelIcon?: ReactNode
  Label: ComponentType<{ label: string; icon?: ReactNode; readOnly?: boolean; children?: ReactNode }>
}

/**
 * Replaces Puck's native `select` field for every component and array field (Select Story, colours, ...), so all of them get
 * the same dropdown: never clipped by the panel, long labels wrapped, keyboard accessible. Puck's label and icon are kept.
 */
export function StudioSelectField({ field, value, onChange, readOnly, id, name, label, labelIcon, Label }: PuckSelectFieldProps) {
  if (field.type !== 'select' || !field.options) return null
  return (
    <Label label={label || name || ''} icon={labelIcon || <ChevronDown size={16} />} readOnly={readOnly}>
      <StudioDropdown variant="field" id={id} ariaLabel={label || name} disabled={readOnly} options={field.options} value={value} onChange={onChange} />
    </Label>
  )
}

export default StudioSelectField
