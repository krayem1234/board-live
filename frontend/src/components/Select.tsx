import { useEffect, useRef, useState } from 'react'

type Option = { value: string; label: string }

type Props = {
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
}

export default function Select({ value, onChange, options, placeholder = 'Sélectionner...' }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const current = options.find((o) => o.value === value)

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="input"
        onClick={() => setOpen((o) => !o)}
        style={{ textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: current ? 'var(--text)' : 'var(--muted)' }}
      >
        <span>{current ? current.label : placeholder}</span>
        <span style={{ color: 'var(--muted)', fontSize: 11, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}>▾</span>
      </button>

      {open && (
        <div
          className="card-surface pop-in"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: 'var(--surface-2)',
            zIndex: 50,
            padding: 4,
            maxHeight: 220,
            overflowY: 'auto',
            boxShadow: '0 16px 36px var(--shadow)',
          }}
        >
          {options.map((o) => (
            <div
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false) }}
              style={{
                padding: '8px 10px',
                borderRadius: 8,
                fontSize: 13.5,
                cursor: 'pointer',
                color: 'var(--text)',
                background: o.value === value ? 'var(--chip-bg)' : 'transparent',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--icon-hover-bg)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = o.value === value ? 'var(--chip-bg)' : 'transparent')}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
