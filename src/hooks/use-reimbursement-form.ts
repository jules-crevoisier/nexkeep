'use client'

import { useState, useCallback } from 'react'
import { upload } from '@vercel/blob/client'

const INITIAL_FORM_DATA = {
  requesterName: '',
  requesterEmail: '',
  amount: '',
  description: '',
  notes: ''
}

const MAX_FILE_SIZE = 8 * 1024 * 1024 // 8 Mo
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']

export { parseAndValidateAmount } from '@/lib/api-utils'
export { parseApiError } from '@/lib/api-utils'

/**
 * Valide un fichier côté client (taille + type).
 * Retourne un message d'erreur FR si invalide, sinon null.
 */
export const validateUploadFile = (file: File): string | null => {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return 'Format non supporté. Utilisez une image (JPG, PNG) ou un PDF.'
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'Fichier trop volumineux (max 8 Mo). Réduisez la photo et réessayez.'
  }
  return null
}

/**
 * Upload direct vers Vercel Blob depuis le navigateur.
 * Le fichier ne passe pas par la fonction serverless → pas de limite 4,5 Mo.
 */
export const uploadFileToApi = async (file: File): Promise<string> => {
  const blob = await upload(file.name, file, {
    access: 'public',
    handleUploadUrl: '/api/upload',
  })
  return blob.url
}

export const useReimbursementFormState = () => {
  const [formData, setFormData] = useState(INITIAL_FORM_DATA)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [ribFile, setRibFile] = useState<File | null>(null)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [fileError, setFileError] = useState<string | null>(null)

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: 'receipt' | 'rib') => {
    const file = e.target.files?.[0] ?? null
    setFileError(null)

    if (file) {
      const error = validateUploadFile(file)
      if (error) {
        setFileError(error)
        e.target.value = ''
        if (type === 'receipt') setReceiptFile(null)
        else setRibFile(null)
        return
      }
    }

    if (type === 'receipt') {
      setReceiptFile(file)
    } else {
      setRibFile(file)
    }
  }, [])

  const clearFile = useCallback((type: 'receipt' | 'rib') => {
    setFileError(null)
    if (type === 'receipt') setReceiptFile(null)
    else setRibFile(null)
    setFileInputKey(prev => prev + 1)
  }, [])

  const resetForm = useCallback(() => {
    setFormData(INITIAL_FORM_DATA)
    setReceiptFile(null)
    setRibFile(null)
    setFileError(null)
    setFileInputKey(prev => prev + 1)
  }, [])

  return {
    formData,
    receiptFile,
    ribFile,
    fileInputKey,
    fileError,
    handleInputChange,
    handleFileChange,
    clearFile,
    resetForm
  }
}
