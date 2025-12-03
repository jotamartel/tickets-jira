'use client'

import { useState } from 'react'
import TicketForm from '@/components/TicketForm'
import SuccessMessage from '@/components/SuccessMessage'
import { TicketResponse } from '@/lib/types'

export default function Home() {
  const [successResponse, setSuccessResponse] = useState<TicketResponse | null>(null)

  const handleSuccess = (response: TicketResponse) => {
    setSuccessResponse(response)
  }

  const handleReset = () => {
    setSuccessResponse(null)
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Portal de Solicitudes
            </h1>
            <p className="text-gray-500">
              Completa el formulario para crear un nuevo ticket de soporte.
            </p>
          </div>

          {/* Contenido dinámico */}
          {successResponse ? (
            <SuccessMessage response={successResponse} onReset={handleReset} />
          ) : (
            <TicketForm onSuccess={handleSuccess} />
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Infracommerce - Sistema de Tickets
        </p>
      </div>
    </main>
  )
}
