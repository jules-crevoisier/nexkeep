"use client"

import { useEffect, useRef, useState } from "react"
import { PermissionDeniedDialog } from "./permission-denied-dialog"
import {
  PERMISSION_DENIED_EVENT,
  type PermissionDeniedDetail,
  permissionMessageFromResponse,
} from "@/lib/permission-denied"

/**
 * Écoute les 403 des appels /api/ et les événements explicites,
 * pour afficher un message quand une action est refusée côté serveur.
 */
export function PermissionDeniedListener() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState("")
  const lastNotifyRef = useRef(0)

  const show = (msg: string) => {
    const now = Date.now()
    if (now - lastNotifyRef.current < 400) return
    lastNotifyRef.current = now
    setMessage(msg)
    setOpen(true)
  }

  useEffect(() => {
    const onEvent = (event: Event) => {
      const detail = (event as CustomEvent<PermissionDeniedDetail>).detail
      if (detail?.message) show(detail.message)
    }

    window.addEventListener(PERMISSION_DENIED_EVENT, onEvent)
    return () => window.removeEventListener(PERMISSION_DENIED_EVENT, onEvent)
  }, [])

  useEffect(() => {
    const original = window.fetch.bind(window)

    window.fetch = async (input, init) => {
      const response = await original(input, init)
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url

      if (response.status === 403 && url.includes("/api/")) {
        const msg = await permissionMessageFromResponse(response.clone())
        show(msg)
      }

      return response
    }

    return () => {
      window.fetch = original
    }
  }, [])

  return (
    <PermissionDeniedDialog
      open={open}
      onOpenChange={setOpen}
      message={message}
    />
  )
}
