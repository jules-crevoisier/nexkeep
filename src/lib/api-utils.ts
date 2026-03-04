/**
 * Utilitaires pour éviter les erreurs non-JSON et NaN dans les appels API
 */

/**
 * Parse une Response en JSON de manière sécurisée.
 * Évite les erreurs quand le serveur renvoie du HTML (ex: page 500) au lieu de JSON.
 */
export const safeParseJson = async <T = unknown>(response: Response): Promise<T | null> => {
  const contentType = response.headers.get('content-type')
  if (!contentType?.includes('application/json')) {
    return null
  }
  try {
    const text = await response.text()
    if (!text?.trim()) return null
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

/**
 * Extrait le message d'erreur d'une Response API.
 * Gère les réponses non-JSON (HTML, texte brut).
 */
export const parseApiError = async (response: Response): Promise<string> => {
  const data = await safeParseJson<{ error?: string }>(response)
  if (data?.error) return data.error
  if (response.status >= 500) return 'Erreur serveur'
  if (response.status === 401) return 'Non autorisé'
  if (response.status === 404) return 'Ressource non trouvée'
  return 'Une erreur est survenue'
}

/**
 * Parse et valide un montant (string ou number).
 * Retourne { valid, amount?, error? }
 */
export const parseAndValidateAmount = (
  value: string | number
): { valid: boolean; amount?: number; error?: string } => {
  if (value === '' || value === null || value === undefined) {
    return { valid: false, error: 'Le montant est requis' }
  }
  const str = typeof value === 'string' ? value.trim().replace(',', '.') : String(value)
  const amount = parseFloat(str)
  if (Number.isNaN(amount)) {
    return { valid: false, error: 'Le montant doit être un nombre valide' }
  }
  if (amount <= 0) {
    return { valid: false, error: 'Le montant doit être supérieur à 0' }
  }
  return { valid: true, amount }
}
