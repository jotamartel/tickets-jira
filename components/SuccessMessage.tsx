'use client'

import { TicketResponse } from '@/lib/types'

interface SuccessMessageProps {
  response: TicketResponse
  onReset: () => void
}

export default function SuccessMessage({ response, onReset }: SuccessMessageProps) {
  return (
    <div className="text-center space-y-6">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100">
        <svg
          className="w-8 h-8 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Solicitud Enviada
        </h2>
        <p className="text-gray-600">
          Tu ticket ha sido creado exitosamente.
        </p>
      </div>

      {response.issueKey && (
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-500 mb-1">Número de ticket</p>
          <p className="text-xl font-mono font-semibold text-blue-600">
            {response.issueKey}
          </p>
        </div>
      )}

      {response.issueUrl && (
        <a
          href={response.issueUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:underline"
        >
          Ver ticket en Jira
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      )}

      <button
        onClick={onReset}
        className="w-full sm:w-auto px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
      >
        Crear otra solicitud
      </button>
    </div>
  )
}
