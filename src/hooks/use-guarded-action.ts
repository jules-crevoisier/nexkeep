"use client"

import { useCallback, useState } from "react"

/**
 * Encadre une action : si non autorisé, ouvre un dialogue au lieu d'exécuter.
 */
export function useGuardedAction(allowed: boolean, deniedMessage: string) {
  const [deniedOpen, setDeniedOpen] = useState(false)

  const guard = useCallback(
    <T extends (...args: never[]) => void>(fn: T): T =>
      ((...args: Parameters<T>) => {
        if (allowed) {
          fn(...args)
        } else {
          setDeniedOpen(true)
        }
      }) as T,
    [allowed]
  )

  /** Retourne un handler à passer à onClick — n'exécute pas fn au render. */
  const run = useCallback(
    (fn: () => void): (() => void) =>
      () => {
        if (allowed) fn()
        else setDeniedOpen(true)
      },
    [allowed]
  )

  return {
    allowed,
    deniedMessage,
    deniedOpen,
    setDeniedOpen,
    guard,
    run,
  }
}
