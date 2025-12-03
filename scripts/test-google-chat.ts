/**
 * Script de prueba para verificar la funcionalidad de notificaciones de Google Chat
 * 
 * Uso: tsx scripts/test-google-chat.ts
 */

import dotenv from 'dotenv'
import { join } from 'path'

dotenv.config({ path: join(process.cwd(), '.env.local') })

async function testGoogleChat() {
  const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL || 'https://chat.googleapis.com/v1/spaces/AAQA9iNk-sE/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=bHSX5S06WJzfJwxNaQpZESYsW8tLxsm0pryLZVdz41Q'

  console.log('📨 Probando notificación de Google Chat...')
  console.log(`Webhook URL: ${webhookUrl.substring(0, 60)}...`)

  // Formato de texto simple (más compatible)
  const simpleMessage = {
    text: `🔔 *Prueba de Notificación*\n\n` +
          `*Ticket:* TEST-123\n` +
          `*Cliente:* Cliente de Prueba\n` +
          `*Asunto:* Ticket de prueba\n` +
          `*Tipo:* 🐛 Bug\n` +
          `*Urgencia:* 🟡 Medium\n` +
          `*Descripción:* Esta es una prueba del sistema de notificaciones.\n\n` +
          `<https://infracommerce.atlassian.net/browse/TEST-123|Ver en Jira>`
  }

  // Formato con Cards v2
  const cardMessage = {
    cardsV2: [
      {
        cardId: 'card-test-123',
        card: {
          header: {
            title: '🔔 Nueva Solicitud',
            subtitle: 'TEST-123'
          },
          sections: [
            {
              widgets: [
                {
                  decoratedText: {
                    topLabel: 'Cliente',
                    text: 'Cliente de Prueba'
                  }
                },
                {
                  decoratedText: {
                    topLabel: 'Asunto',
                    text: 'Ticket de prueba'
                  }
                },
                {
                  decoratedText: {
                    topLabel: 'Tipo',
                    text: '🐛 Bug'
                  }
                },
                {
                  decoratedText: {
                    topLabel: 'Urgencia',
                    text: '🟡 Medium'
                  }
                },
                {
                  decoratedText: {
                    topLabel: 'Descripción',
                    text: 'Esta es una prueba del sistema de notificaciones.',
                    wrapText: true
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
                            url: 'https://infracommerce.atlassian.net/browse/TEST-123'
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

  try {
    // Probar primero con formato simple
    console.log('\n📤 Probando formato de texto simple...')
    let response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(simpleMessage)
    })

    console.log(`📥 Response status: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      const responseText = await response.text()
      console.error('❌ Error con formato simple:', responseText)
      
      // Intentar con Cards v2
      console.log('\n📤 Probando formato Cards v2...')
      response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cardMessage)
      })

      console.log(`📥 Response status (Cards): ${response.status} ${response.statusText}`)

      if (!response.ok) {
        const responseText2 = await response.text()
        console.error('❌ Error con formato Cards:', responseText2)
        process.exit(1)
      } else {
        console.log('✅ Formato Cards v2 funcionó correctamente!')
      }
    } else {
      const responseData = await response.json().catch(() => null)
      console.log('✅ Formato de texto simple funcionó correctamente!', responseData ? `(${JSON.stringify(responseData)})` : '')
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message)
    console.error('Stack:', error.stack)
    process.exit(1)
  }
}

testGoogleChat()

