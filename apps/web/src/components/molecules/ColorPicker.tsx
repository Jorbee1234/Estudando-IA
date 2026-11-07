import { useId } from 'react'
import { cva } from 'class-variance-authority'
import { focusRing } from '../../lib/cn'
import { ACCENT_PRESETS, DEFAULT_ACCENT, hasEnoughContrast, messages } from '../../lib/profileValidation'

const swatch = cva(`size-9 cursor-pointer rounded-full border-2 ${focusRing}`, {
  variants: {
    selected: {
      true: 'border-white',
      false: 'border-transparent hover:border-field',
    },
  },
})

type ColorPickerProps = {
  label: string
  value: string | null
  onChange: (value: string | null) => void
}

export function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  const errorId = useId()
  const current = (value ?? DEFAULT_ACCENT).toUpperCase()
  const lowContrast = !hasEnoughContrast(current)

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-2 text-lg leading-normal text-content">{label}</legend>
      <div className="flex flex-wrap items-center gap-3">
        {ACCENT_PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            aria-label={preset.name}
            aria-pressed={current === preset.value}
            onClick={() => onChange(preset.value === DEFAULT_ACCENT ? null : preset.value)}
            style={{ backgroundColor: preset.value }}
            className={swatch({ selected: current === preset.value })}
          />
        ))}
        <input
          type="color"
          aria-label="Escolher outra cor"
          aria-describedby={lowContrast ? errorId : undefined}
          value={current.toLowerCase()}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="size-9 cursor-pointer rounded-full border-0 bg-transparent p-0"
        />
      </div>
      <p className="text-sm text-field">
        Cor atual: <span className="font-semibold text-content">{current}</span>
      </p>
      {lowContrast && (
        <p id={errorId} role="alert" className="text-sm text-red-600">
          {messages.lowContrast}
        </p>
      )}
    </fieldset>
  )
}
