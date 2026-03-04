'use client'

import { useState, useCallback } from 'react'
import { parseApiError, safeParseJson } from '@/lib/api-utils'

const INITIAL_FORM_DATA = {
  requesterName: '',
  requesterEmail: '',
  amount: '',
  description: '',
  notes: ''
}

export { parseAndValidateAmount } from '@/lib/api-utils'
export { parseApiError } from '@/lib/api-utils'

export const uploadFileToApi = async (file: File): Promise<string> => {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const errorMessage = await parseApiError(response)
    throw new Error(errorMessage)
  }

  const result = await safeParseJson<{ fileUrl?: string; url?: string }>(response)
  const url = result?.fileUrl ?? result?.url
  if (!url) {
    throw new Error('Réponse serveur invalide')
  }
  return url
}

export const useReimbursementFormState = () => {
  const [formData, setFormData] = useState(INITIAL_FORM_DATA)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [ribFile, setRibFile] = useState<File | null>(null)
  const [fileInputKey, setFileInputKey] = useState(0)

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: 'receipt' | 'rib') => {
    const file = e.target.files?.[0]
    if (type === 'receipt') {
      setReceiptFile(file || null)
    } else {
      setRibFile(file || null)
    }
  }, [])

  const resetForm = useCallback(() => {
    setFormData(INITIAL_FORM_DATA)
    setReceiptFile(null)
    setRibFile(null)
    setFileInputKey(prev => prev + 1)
  }, [])

  return {
    formData,
    receiptFile,
    ribFile,
    fileInputKey,
    handleInputChange,
    handleFileChange,
    resetForm
  }
}
