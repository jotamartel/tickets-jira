import { NextRequest, NextResponse } from 'next/server'
import { TicketRequest } from '@/lib/types'
import { sendGoogleChatNotification } from '@/lib/googleChat'

interface NotifyRequest {
  ticket: TicketRequest
  issueKey: string
  issueUrl: string
}

export async function POST(request: NextRequest) {
  try {
    const body: NotifyRequest = await request.json()

    if (!body.ticket || !body.issueKey || !body.issueUrl) {
      return NextResponse.json(
        { success: false, error: 'Datos incompletos' },
        { status: 400 }
      )
    }

    const result = await sendGoogleChatNotification(
      body.ticket,
      body.issueKey,
      body.issueUrl
    )

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error en notificación:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
