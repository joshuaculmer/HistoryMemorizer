import { useEffect } from 'react'
import { MAX_DELAY, MIN_DELAY, type Settings } from '../settings'

interface Props {
  settings: Settings
  onChange: (next: Settings) => void
  onClose: () => void
}

export function SettingsModal({ settings, onChange, onClose }: Props) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const setDelay = (value: number) => {
    if (!Number.isFinite(value)) return
    onChange({ ...settings, revealDelay: Math.min(MAX_DELAY, Math.max(MIN_DELAY, Math.round(value))) })
  }

  return (
    <div className="modal-back" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        onClick={(event) => event.stopPropagation()}
      >
        <h2>Settings</h2>

        <label className="field">
          <span className="field-label">Hide answers for</span>
          <span className="field-input">
            <input
              type="number"
              min={MIN_DELAY}
              max={MAX_DELAY}
              value={settings.revealDelay}
              onChange={(event) => setDelay(event.target.valueAsNumber)}
            />
            <span className="unit">seconds</span>
          </span>
          <span className="field-note">
            How long a date or event stands alone before the choices appear, when the
            hide-answers toggle is on.
          </span>
        </label>

        <button type="button" className="primary" onClick={onClose} autoFocus>
          Done
        </button>
      </div>
    </div>
  )
}
