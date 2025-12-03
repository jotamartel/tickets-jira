'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import TicketForm from '@/components/TicketForm'
import SuccessMessage from '@/components/SuccessMessage'
import { TicketResponse } from '@/lib/types'
import { JIRA_PROJECTS } from '@/config/projects'

export default function TicketPage() {
  const params = useParams()
  const router = useRouter()
  const clienteId = params?.cliente as string | undefined
  const [successResponse, setSuccessResponse] = useState<TicketResponse | null>(null)
  const [mounted, setMounted] = useState(false)
  const [isValidating, setIsValidating] = useState(true)

  useEffect(() => {
    setMounted(true)
    // Dar tiempo para que useParams se hidrate
    const timer = setTimeout(() => {
      setIsValidating(false)
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // Validar cliente directamente
  const isValidClient = clienteId ? Boolean(JIRA_PROJECTS[clienteId]) : false
  const clienteInfo = clienteId ? JIRA_PROJECTS[clienteId] : undefined

  const handleSuccess = (response: TicketResponse) => {
    setSuccessResponse(response)
  }

  const handleReset = () => {
    setSuccessResponse(null)
  }

  // Mostrar loading mientras se monta o valida
  if (!mounted || isValidating || !clienteId) {
    return (
      <main className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando...</p>
          </div>
        </div>
      </main>
    )
  }

  if (!isValidClient || !clienteInfo) {
    return (
      <main className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
            <div className="text-center">
              <div className="mb-4">
                <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Cliente no válido
              </h1>
              <p className="text-gray-600 mb-6">
                El enlace que intentaste acceder no es válido o el cliente no existe.
              </p>
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Volver al inicio
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mb-4">
              <div className="inline-block px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                {clienteInfo.name}
              </div>
            </div>
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
            <TicketForm onSuccess={handleSuccess} prefilledCliente={clienteId} />
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6 mt-6">
          Infracommerce - Sistema de Tickets
        </p>
      </div>
    </main>
  )
}

