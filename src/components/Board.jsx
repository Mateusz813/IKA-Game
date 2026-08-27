import { useMemo } from 'react'
import { layoutBoard } from '../lib/layout.js'
import { useFreshAction } from '../lib/hooks.js'

// ghost=true — admin widzi nieodsłonięte litery przyciemnione
export default function Board({
  phrase,
  revealed = {},
  lastAction = null,
  ghost = false,
  size = 'tv',
}) {
  const { rows } = useMemo(() => layoutBoard(phrase), [phrase])
  const flash = useFreshAction(lastAction, 4200)
  const hitLetter = flash?.type === 'hit' ? flash.letter : null
  const shaking = flash?.type === 'miss'
  let flipIdx = 0

  return (
    <div className="board-box">
      <div className={`board board--${size} ${shaking ? 'board--shake' : ''}`}>
        {rows.map((row, ri) => (
        <div className="board-row" key={ri}>
          {row.cells.map((cell, ci) => {
            if (!cell) return <div className="tile tile--filler" key={ci} />
            if (!cell.letter)
              return (
                <div className="tile tile--face tile--shown" key={ci}>
                  <span className="tile-ch">{cell.ch}</span>
                </div>
              )
            const isShown = !!revealed[cell.ch]
            const isFlipping = isShown && hitLetter === cell.ch
            const cls = isFlipping
              ? 'tile tile--face tile--flip'
              : isShown
                ? 'tile tile--face tile--shown'
                : `tile tile--face ${ghost ? 'tile--ghost' : ''}`
            return (
              <div
                className={cls}
                key={`${ci}-${isFlipping ? flash.ts : 's'}`}
                style={
                  isFlipping ? { animationDelay: `${flipIdx++ * 0.35}s` } : undefined
                }
              >
                {(isShown || ghost) && <span className="tile-ch">{cell.ch}</span>}
              </div>
            )
          })}
          </div>
        ))}
      </div>
    </div>
  )
}
