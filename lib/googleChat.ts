import { TicketRequest } from './types'
import { JIRA_PROJECTS } from '@/config/projects'

interface GoogleChatResponse {
  name?: string
  error?: {
    code: number
    message: string
  }
}

export async function sendGoogleChatNotification(
  ticket: TicketRequest,
  issueKey: string,
  issueUrl: string
): Promise<{ success: boolean; error?: string }> {
  // Limpiar la URL del webhook (remover espacios y saltos de línea)
  const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL?.trim().replace(/\n/g, '')

  console.log('📨 ===== INICIANDO NOTIFICACIÓN A GOOGLE CHAT =====')
  console.log(`📨 Webhook URL configurada: ${webhookUrl ? 'Sí' : 'No'}`)
  if (webhookUrl) {
    console.log(`📨 URL (primeros 80 chars): ${webhookUrl.substring(0, 80)}...`)
    console.log(`📨 URL longitud: ${webhookUrl.length} caracteres`)
  }
  
  if (!webhookUrl) {
    console.error('❌ Google Chat webhook not configured, skipping notification')
    console.error('   Configura GOOGLE_CHAT_WEBHOOK_URL en tus variables de entorno')
    console.error('   En Vercel: Settings → Environment Variables')
    return { success: false, error: 'Webhook URL no configurada' }
  }

  // Validar que la URL sea válida
  try {
    new URL(webhookUrl)
  } catch (error) {
    console.error('❌ URL del webhook inválida:', webhookUrl)
    return { success: false, error: 'URL del webhook inválida' }
  }

  const project = JIRA_PROJECTS[ticket.cliente]
  const clienteName = project?.name || ticket.cliente

  // Formatear descripción (resumir si es muy larga y limpiar HTML)
  let descripcionLimpia = ticket.descripcion
  // Remover HTML tags pero mantener el texto
  descripcionLimpia = descripcionLimpia.replace(/<[^>]*>/g, ' ')
  // Remover espacios múltiples
  descripcionLimpia = descripcionLimpia.replace(/\s+/g, ' ').trim()
  const descripcionResumida = formatDescripcion(descripcionLimpia)

  // Mapear urgencia a emoji
  const urgenciaEmoji = {
    'Low': '🟢',
    'Medium': '🟡',
    'High': '🔴'
  }[ticket.urgencia] || '⚪'

  // Mapear tipo a emoji
  const tipoEmoji = {
    'Bug': '🐛',
    'Task': '📋',
    'Support': '🎧'
  }[ticket.tipo] || '📝'

  // Formato del mensaje para Google Chat
  // Usamos formato de texto simple primero, si falla intentamos con cards
  // Limpiar asunto de caracteres especiales que pueden causar problemas en Google Chat
  const asuntoLimpio = ticket.asunto.replace(/[*_`]/g, '')
  
  // Limpiar issueUrl para evitar doble barra
  const cleanIssueUrl = issueUrl.replace(/([^:]\/)\/+/g, '$1')
  
  const simpleMessage: { text: string } = {
    text: `🔔 *Nueva Solicitud de Ticket*\n\n` +
          `*Cliente:* ${clienteName}\n` +
          `*Ticket:* ${issueKey}\n` +
          `*Asunto:* ${asuntoLimpio}\n` +
          `*Tipo:* ${tipoEmoji} ${ticket.tipo}\n` +
          `*Urgencia:* ${urgenciaEmoji} ${ticket.urgencia}\n` +
          `*Descripción:* ${descripcionResumida}\n\n` +
          `<${cleanIssueUrl}|Ver en Jira>`
  }

  // Formato con Cards v2 (más visual, pero puede no ser compatible con todos los webhooks)
  const cardMessage: { cardsV2: any[] } = {
    cardsV2: [
      {
        cardId: `card-${issueKey}`,
        card: {
          header: {
            title: '🔔 Nueva Solicitud',
            subtitle: issueKey
          },
          sections: [
            {
              widgets: [
                {
                  decoratedText: {
                    topLabel: 'Cliente',
                    text: clienteName
                  }
                },
                {
                  decoratedText: {
                    topLabel: 'Asunto',
                    text: ticket.asunto
                  }
                },
                {
                  decoratedText: {
                    topLabel: 'Tipo',
                    text: `${tipoEmoji} ${ticket.tipo}`
                  }
                },
                {
                  decoratedText: {
                    topLabel: 'Urgencia',
                    text: `${urgenciaEmoji} ${ticket.urgencia}`
                  }
                },
                {
                  decoratedText: {
                    topLabel: 'Descripción',
                    text: descripcionResumida,
                    wrapText: true
                  }
                },
                {
                  button: {
                    text: 'Ver en Jira',
                    onClick: {
                      openLink: {
                        url: cleanIssueUrl
                      }
                    }
                  }
                }
              ]
            },
            {
              widgets: [
                {
                  buttonList: {
                    buttons: [
                      {
                        text: 'Ver en Jira',
                        onClick: {
                          openLink: {
                            url: cleanIssueUrl
                          }
                        }
                      }
                    ]
                  }
                }
              ]
            }
          ]
        }
      }
    ]
  }

  // Intentar primero con formato simple, si falla intentar con cards
  let message: { text: string } | { cardsV2: any[] } = simpleMessage
  let useCards = false

  try {
    // Limpiar URL nuevamente antes de usar (por si acaso hay caracteres extra)
    const cleanWebhookUrl = webhookUrl.trim().replace(/\n/g, '').replace(/\r/g, '')
    
    console.log(`📤 Enviando mensaje a: ${cleanWebhookUrl.substring(0, 60)}...`)
    console.log(`📋 Ticket: ${issueKey} - ${ticket.asunto}`)
    console.log(`📝 Formato: ${useCards ? 'Cards v2' : 'Texto simple'}`)
    console.log(`📝 Mensaje:`, JSON.stringify(message).substring(0, 200))
    console.log(`🔗 URL limpia (longitud: ${cleanWebhookUrl.length}):`, cleanWebhookUrl.substring(0, 80))
    
    let response = await fetch(cleanWebhookUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Ticket-Portal/1.0'
      },
      body: JSON.stringify(message)
    })

    console.log(`📥 Response status: ${response.status} ${response.statusText}`)
    console.log(`📥 Response headers:`, Object.fromEntries(response.headers.entries()))

    // Si el formato simple falla con 400, intentar con cards
    if (!response.ok && response.status === 400 && !useCards) {
      console.log('⚠️ Formato simple falló, intentando con Cards v2...')
      message = cardMessage
      useCards = true
      
      response = await fetch(cleanWebhookUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'Ticket-Portal/1.0'
        },
        body: JSON.stringify(message)
      })
      
      console.log(`📥 Response status (Cards): ${response.status} ${response.statusText}`)
    }

    if (!response.ok) {
      const responseText = await response.text()
      console.error(`❌ Response body completo:`, responseText)
      
      let errorData: GoogleChatResponse
      try {
        errorData = JSON.parse(responseText)
      } catch {
        errorData = { error: { code: response.status, message: responseText } }
      }
      console.error('❌ Google Chat error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        responseText: responseText.substring(0, 1000) // Primeros 1000 caracteres
      })
      return { success: false, error: errorData.error?.message || `Error ${response.status}: ${response.statusText}` }
    }

    const responseText = await response.text()
    console.log(`📥 Response body completo (primeros 500 chars):`, responseText.substring(0, 500))
    
    let responseData = null
    try {
      responseData = JSON.parse(responseText)
      console.log(`📥 Response data parseado:`, JSON.stringify(responseData, null, 2))
    } catch (parseError) {
      // Si no es JSON, usar el texto directamente
      console.log(`📥 Response (no JSON):`, responseText.substring(0, 200))
      console.log(`⚠️ No se pudo parsear como JSON, pero el status fue ${response.status}`)
    }
    
    // Verificar que la respuesta sea exitosa
    if (response.status === 200 || response.status === 204) {
      console.log('✅ Notificación enviada exitosamente a Google Chat')
      console.log(`   Status: ${response.status}`)
      console.log(`   Response: ${responseText.substring(0, 200)}`)
      return { success: true }
    } else {
      console.error(`❌ Respuesta inesperada: ${response.status}`)
      return { success: false, error: `Respuesta inesperada: ${response.status}` }
    }

  } catch (error: any) {
    console.error('❌ Error sending Google Chat notification:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause
    })
    return { success: false, error: `Error de conexión con Google Chat: ${error.message || 'Error desconocido'}` }
  }
}

function formatDescripcion(descripcion: string, maxLength = 300): string {
  if (descripcion.length <= maxLength) {
    return descripcion
  }
  return descripcion.substring(0, maxLength) + '...'
}
