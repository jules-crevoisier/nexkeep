import { PERMISSION_MESSAGES } from "@/lib/permissions"
import { safeParseJson } from "@/lib/api-utils"

export const PERMISSION_DENIED_EVENT = "nexkeep:permission-denied"

export interface PermissionDeniedDetail {
  message: string
}

/** Affiche le dialogue global « Action non autorisée ». */
export function notifyPermissionDenied(message: string): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(
    new CustomEvent<PermissionDeniedDetail>(PERMISSION_DENIED_EVENT, {
      detail: { message },
    })
  )
}

/** Déduit un message utilisateur à partir d'une réponse 403. */
export async function permissionMessageFromResponse(
  response: Response
): Promise<string> {
  const data = await safeParseJson<{ error?: string }>(response)
  const err = data?.error?.trim() ?? ""

  if (
    err.toLowerCase().includes("trésorerie") ||
    err.toLowerCase().includes("tresorerie")
  ) {
    return PERMISSION_MESSAGES.treasuryWrite
  }
  if (err === "Droits insuffisants") {
    return PERMISSION_MESSAGES.scopeDenied
  }
  if (err.includes("administrateur")) {
    return PERMISSION_MESSAGES.adminOnly
  }
  if (err) return err
  return PERMISSION_MESSAGES.orgaWrite
}

/** Si 403, notifie l'utilisateur et retourne true. */
export async function notifyIfForbidden(response: Response): Promise<boolean> {
  if (response.status !== 403) return false
  notifyPermissionDenied(await permissionMessageFromResponse(response.clone()))
  return true
}
