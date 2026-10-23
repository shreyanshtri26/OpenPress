import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'

import { placeList, type Placement } from './dropdownPlacement'

export type DropdownOption = { label: string; value: unknown; disabled?: boolean }

type StudioDropdownProps = {
  options: DropdownOption[]
  value: unknown
  onChange: (value: unknown) => void
  id?: string
  ariaLabel?: string
  /** `toolbar`: compact pill in the header. `field`: full-width control in the properties panel. */
  variant?: 'toolbar' | 'field'
  disabled?: boolean
  placeholder?: string
}

const same = (a: unknown, b: unknown) =>
  Object.is(a, b) || (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null && JSON.stringify(a) === JSON.stringify(b))

/**
 * The one dropdown every Page Studio control uses (toolbar page switcher, colour and story pickers, and every Puck `select`
 * field through the fieldTypes override). The list renders in a portal at fixed coordinates, so a panel's overflow can never
 * clip it; it sizes itself for long labels instead of copying the trigger's width, wraps long labels instead of cutting them,
 * flips above when there is no room below, and follows the WAI-ARIA combobox/listbox keyboard pattern.
 */
export function StudioDropdown({ options, value, onChange, id, ariaLabel, variant = 'field', disabled, placeholder = 'Select…' }: StudioDropdownProps) {
  const uid = useId()
  const listId = `${uid}-list`
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const typeahead = useRef({ text: '', at: 0 })

  const selectedIndex = useMemo(() => options.findIndex((o) => same(o.value, value)), [options, value])
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined

  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [placement, setPlacement] = useState<Placement | null>(null)
  const [host, setHost] = useState<HTMLElement | null>(null)

  const reposition = useCallback(() => {
    const t = triggerRef.current
    if (!t) return
    setPlacement(placeList(t.getBoundingClientRect(), { width: window.innerWidth, height: window.innerHeight }))
  }, [])

  const openList = useCallback(() => {
    if (disabled || options.length === 0) return
    // The list lives inside .studio-shell so it inherits the Studio tokens, never body-level.
    setHost((triggerRef.current?.closest('.studio-shell') as HTMLElement | null) ?? document.body)
    setActive(selectedIndex >= 0 ? selectedIndex : Math.max(0, options.findIndex((o) => !o.disabled)))
    setOpen(true)
  }, [disabled, options, selectedIndex])

  const close = useCallback((refocus = true) => {
    setOpen(false)
    if (refocus) triggerRef.current?.focus()
  }, [])

  const choose = useCallback((index: number) => {
    const opt = options[index]
    if (!opt || opt.disabled) return
    onChange(opt.value)
    close()
  }, [options, onChange, close])

  // Position before paint, then track scrolling and resizing while open.
  useLayoutEffect(() => {
    if (!open) return
    reposition()
    listRef.current?.focus({ preventScroll: true })
  }, [open, reposition])

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      const n = e.target as Node
      if (!triggerRef.current?.contains(n) && !listRef.current?.contains(n)) close(false)
    }
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    document.addEventListener('pointerdown', onDown, true)
    return () => {
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
      document.removeEventListener('pointerdown', onDown, true)
    }
  }, [open, reposition, close])

  // Keep the highlighted option in view when moving with the keyboard.
  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  const move = (from: number, step: 1 | -1) => {
    for (let i = 1; i <= options.length; i++) {
      const idx = (from + step * i + options.length * i) % options.length
      if (!options[idx].disabled) return idx
    }
    return from
  }

  const onListKey = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setActive((a) => move(a, 1)); return
      case 'ArrowUp': e.preventDefault(); setActive((a) => move(a, -1)); return
      case 'Home': e.preventDefault(); setActive(options.findIndex((o) => !o.disabled)); return
      case 'End': e.preventDefault(); setActive(options.length - 1 - [...options].reverse().findIndex((o) => !o.disabled)); return
      case 'Enter': case ' ': e.preventDefault(); choose(active); return
      case 'Escape': e.preventDefault(); e.stopPropagation(); close(); return
      case 'Tab': close(false); return
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const t = typeahead.current
      const now = Date.now()
      t.text = (now - t.at > 600 ? '' : t.text) + e.key.toLowerCase()
      t.at = now
      const from = t.text.length === 1 ? active + 1 : active
      for (let i = 0; i < options.length; i++) {
        const idx = (from + i) % options.length
        if (!options[idx].disabled && options[idx].label.toLowerCase().startsWith(t.text)) { setActive(idx); break }
      }
    }
  }

  const onTriggerKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (open) close()
      else openList()
    }
  }

  return (
    <div className={`studio-dd studio-dd--${variant}`}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className="studio-dd__trigger"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        title={selected?.label}
        onClick={() => { if (open) close(); else openList() }}
        onKeyDown={onTriggerKey}
      >
        <span className={`studio-dd__value${selected ? '' : ' is-placeholder'}`}>{selected ? selected.label : placeholder}</span>
        <ChevronDown className="studio-dd__chevron" size={14} aria-hidden="true" />
      </button>

      {open && placement && host && createPortal(
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-label={ariaLabel}
          aria-activedescendant={`${uid}-opt-${active}`}
          className="studio-dd__list"
          style={{ left: placement.left, width: placement.width, maxHeight: placement.maxHeight, top: placement.top, bottom: placement.bottom }}
          onKeyDown={onListKey}
        >
          {options.map((opt, i) => (
            <div
              key={i}
              id={`${uid}-opt-${i}`}
              data-index={i}
              role="option"
              aria-selected={i === selectedIndex}
              aria-disabled={opt.disabled || undefined}
              className={`studio-dd__option${i === active ? ' is-active' : ''}${opt.disabled ? ' is-disabled' : ''}`}
              onPointerEnter={() => !opt.disabled && setActive(i)}
              onClick={() => choose(i)}
            >
              <span className="studio-dd__check" aria-hidden="true">{i === selectedIndex ? <Check size={14} /> : null}</span>
              <span className="studio-dd__label">{opt.label}</span>
            </div>
          ))}
        </div>,
        host,
      )}
    </div>
  )
}

export default StudioDropdown
