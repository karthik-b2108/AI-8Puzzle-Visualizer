import type { CSSProperties } from 'react'
import { useId } from 'react'
import {
  MAX_SPEED,
  MIN_SPEED,
  SPEED_PRESETS,
} from '../../contract/defaults'
import styles from './SpeedSlider.module.css'

export interface SpeedSliderProps {
  speed: number
  onChange: (speed: number) => void
}

function formatSpeed(speed: number): string {
  return `${Number.isInteger(speed) ? speed : speed.toFixed(2).replace(/0$/, '')}×`
}

/** Playback speed, with a range control and the shared 0.5/1/2/5 presets. */
export default function SpeedSlider({ speed, onChange }: SpeedSliderProps) {
  const inputId = useId()
  const percent = ((speed - MIN_SPEED) / (MAX_SPEED - MIN_SPEED)) * 100
  const style = { '--speed-progress': `${percent}%` } as CSSProperties

  return (
    <div className={styles.slider} style={{marginTop: '0.25rem', marginRight: '1.0rem'  }}>
      <div className={styles.head}>
        <label className={styles.label} htmlFor={inputId}>
          Speed
        </label>
        <output className={styles.value} htmlFor={inputId} aria-live="polite">
          {formatSpeed(speed)}
        </output>
      </div>
      <input
        id={inputId}
        className={styles.range}
        style={style}
        type="range"
        min={MIN_SPEED}
        max={MAX_SPEED}
        step={0.25}
        value={speed}
        aria-valuetext={`${formatSpeed(speed)} playback speed`}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  )
}
