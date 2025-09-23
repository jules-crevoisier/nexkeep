'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RequestReimbursementPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the main reimbursements page
    router.push('/reimbursements')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Redirection...</p>
    </div>
  )
}


