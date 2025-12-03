import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

interface AnalyzeRequest {
  ticket: {
    cliente: string
    asunto: string
    descripcion: string
    tipo: string
    urgencia: string
    contacto?: string
    dueDate?: string
  }
  conversationHistory?: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
  images?: string[] // Data URLs de imágenes para análisis
}

interface AnalyzeResponse {
  needsClarification: boolean
  question?: string
  suggestions?: {
    tipo?: string
    urgencia?: string
    asunto?: string
    descripcion?: string
    dueDate?: string // Fecha de vencimiento sugerida en formato YYYY-MM-DD
  }
  interpretation?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<AnalyzeResponse>> {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY

    console.log('🤖 Iniciando análisis de IA...')
    console.log(`API Key configurada: ${apiKey ? 'Sí' : 'No'}`)

    if (!apiKey) {
      console.warn('⚠️ ANTHROPIC_API_KEY no configurada')
      return NextResponse.json(
        { 
          needsClarification: false,
          interpretation: 'Asistente de IA no configurado. Continuando con la solicitud original.'
        },
        { status: 200 }
      )
    }

    const body: AnalyzeRequest = await request.json()
    const { ticket, conversationHistory = [], images = [] } = body

    console.log(`📋 Analizando ticket: ${ticket.asunto}`)
    console.log(`💬 Historial de conversación: ${conversationHistory.length} mensajes`)
    console.log(`🖼️ Imágenes incluidas: ${images.length}`)

    const anthropic = new Anthropic({ apiKey })

    // Construir el historial de conversación
    const messages: Anthropic.MessageParam[] = conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }))

    // Construir contenido del mensaje con imágenes si están disponibles
    const initialContentBlocks: any[] = []
    
    // Si es el primer mensaje, agregar el contexto inicial
    if (messages.length === 0) {
      // Limpiar HTML de la descripción para reducir tokens (remover imágenes grandes)
      let descripcionLimpia = ticket.descripcion
      // Remover data URLs de imágenes que consumen muchos tokens
      descripcionLimpia = descripcionLimpia.replace(/<img[^>]*src="data:image\/[^"]*"[^>]*>/gi, '[Imagen adjunta]')
      // Limitar longitud de la descripción para evitar rate limits
      if (descripcionLimpia.length > 2000) {
        descripcionLimpia = descripcionLimpia.substring(0, 2000) + '...'
      }
      
      const textContent = `Eres un asistente de IA conversacional que ayuda a los clientes a crear tickets de soporte completos y precisos. Tu objetivo es hacer preguntas naturales y conversacionales para entender mejor la solicitud y mejorar el ticket.

Información inicial del ticket:
- Cliente: ${ticket.cliente}
- Asunto: ${ticket.asunto || '(no proporcionado - opcional)'}
- Descripción: ${descripcionLimpia}
- Tipo: ${ticket.tipo}
- Urgencia: ${ticket.urgencia}
${ticket.contacto ? `- Contacto: ${ticket.contacto}` : ''}
${ticket.dueDate ? `- Fecha de vencimiento: ${ticket.dueDate}` : ''}
${images.length > 0 ? `- Imágenes adjuntas: ${images.length} imagen(es) que puedes analizar visualmente. IMPORTANTE: Analiza el contenido de las imágenes para entender mejor el problema y hacer preguntas más específicas o sugerencias más precisas.` : ''}

Tu tarea es tener una conversación natural con el cliente para obtener TODA la información necesaria:

**CRITERIOS PARA HACER PREGUNTAS (SÉ EXIGENTE):**

Debes hacer preguntas si falta CUALQUIERA de estos elementos:

1. **Pasos para reproducir:** ¿Están claros los pasos exactos? Si no, pregunta: "¿Podrías describir paso a paso cómo se reproduce este problema?"

2. **Resultado esperado:** ¿Está claro qué debería suceder? Si no, pregunta: "¿Qué esperabas que sucediera?"

3. **Resultado actual:** ¿Está claro qué está sucediendo realmente? Si no, pregunta: "¿Qué está sucediendo en su lugar?"

4. **Contexto técnico:** ¿Hay información sobre navegadores, versiones, ambiente? Si no, pregunta: "¿En qué navegador o ambiente ocurre esto?"

5. **Alcance:** ¿Afecta a todos los usuarios o casos? Si no está claro, pregunta: "¿Este problema ocurre siempre o solo en ciertos casos?"

**REGLA IMPORTANTE:**
- NO generes una descripción completa hasta tener TODA la información necesaria
- Haz preguntas específicas para llenar los vacíos
- Sé conversacional pero directo
- Una pregunta a la vez, pero sé persistente

**SOLO cuando tengas TODA la información:**
- Proporciona una interpretación de lo que entiendes
- Genera la descripción con el formato estructurado COMPLETO
- Sugiere tipo y urgencia apropiados

**FORMATO DE DESCRIPCIÓN MEJORADA (ESTRICTAMENTE OBLIGATORIO - SIN EXCEPCIONES):**

LA DESCRIPCIÓN DEBE TENER EXACTAMENTE ESTAS SECCIONES EN ESTE ORDEN:

1. [Una oración resumen del problema]

2. Pasos para reproducir:
   - OBLIGATORIO SIEMPRE
   - Mínimo 3 pasos numerados
   - Si es una tarea sin pasos, escribe: "1. Realizar [tarea solicitada]"

3. Resultado esperado:
   - OBLIGATORIO SIEMPRE
   - Describe claramente qué debería suceder

4. Resultado actual:
   - OBLIGATORIO SIEMPRE
   - Describe claramente qué está sucediendo
   - Si es una tarea, escribe: "Pendiente de realizar"

5. Información adicional:
   - OBLIGATORIO SIEMPRE
   - Mínimo 2 viñetas con "-"
   - SIEMPRE incluye: navegador/dispositivo, ambiente (staging/producción), versión, etc.
   - Si no hay info específica, incluye: "- Reportado por: [cliente]", "- Fecha: [hoy]"

6. Adjunto capturas de pantalla mostrando:
   - OBLIGATORIO si hay imágenes
   - Si NO hay imágenes, OMITE esta sección

7. Dispositivo:
   - OBLIGATORIO si se menciona dispositivo específico (móvil, tablet, desktop, etc.)
   - Si NO se menciona, OMITE esta sección

REGLAS ABSOLUTAMENTE OBLIGATORIAS:
✅ SIEMPRE incluir: Pasos para reproducir, Resultado esperado, Resultado actual, Información adicional
✅ USA TEXTO PLANO, NO HTML
✅ Usa saltos de línea dobles entre secciones
✅ Numerar pasos: "1.", "2.", "3."
✅ Usar viñetas en información adicional: "- "
✅ NO omitir ninguna sección obligatoria bajo ninguna circunstancia
✅ Si falta información, pregunta ANTES de generar la descripción
✅ Mínimo 10 líneas de contenido total

EJEMPLO PERFECTO DE DESCRIPCIÓN (USA EXACTAMENTE ESTE FORMATO):

"Se ha detectado un problema en el proceso de checkout donde los cupones de descuento no se están aplicando correctamente al total de la compra.

Pasos para reproducir:
1. Agregar productos al carrito (monto total: S/. 500)
2. Proceder al checkout
3. Ingresar cupón de descuento "VERANO2024" (20% de descuento)
4. Hacer clic en "Aplicar cupón"
5. Observar el total

Resultado esperado:
El total debería ser S/. 400 (S/. 500 - 20%)

Resultado actual:
El total se mantiene en S/. 500, el cupón no se aplica

Información adicional:
- Navegadores afectados: Chrome, Firefox, Safari
- El cupón aparece como "aplicado" en la interfaz pero no descuenta del total
- El problema persiste incluso en modo incógnito
- Otros cupones también presentan el mismo comportamiento

Adjunto capturas de pantalla mostrando:
1. El cupón ingresado y marcado como "aplicado"
2. El total que no refleja el descuento"

OTRO EJEMPLO (con dispositivo):

"Los lead times no se actualizan correctamente en el checkout de staging para el ubigeo de Punta Negra.

Pasos para reproducir:
1. Ingresar al módulo Province Manager en ambiente Staging
2. Configurar lead times para el ubigeo de Punta Negra (150127)
3. Guardar la configuración
4. Abrir el checkout en el dispositivo móvil
5. Verificar los lead times mostrados para Punta Negra

Resultado esperado:
Los lead times configurados deben reflejarse correctamente en el checkout

Resultado actual:
Los lead times antiguos siguen mostrándose sin actualizarse

Información adicional:
- Ambiente: Staging de Hiraoka
- Ubigeo específico: Punta Negra (código 150127)
- Se intentó en modo incógnito con el mismo resultado
- El problema persiste después de limpiar caché del navegador

Dispositivo:
- iPhone 13 Pro, iOS 16.5, Safari
- También probado en Android 12, Chrome"

3. **Sobre fechas de vencimiento:**
   - Si detectas urgencia temporal o necesidad de resolver antes de cierta fecha, pregunta por la fecha específica
   - El formato debe ser YYYY-MM-DD (ejemplo: 2025-12-15)
   - Sé conversacional: "¿Hay alguna fecha límite para resolver esto?"

TIPOS DE TICKET VÁLIDOS (DEBES USAR EXACTAMENTE ESTOS VALORES):
- "Bug" - Para errores, bugs o problemas técnicos
- "Task" - Para tareas o trabajos a realizar
- "Support" - Para solicitudes de soporte o consultas

URGENCIAS VÁLIDAS (DEBES USAR EXACTAMENTE ESTOS VALORES):
- "Low" - Baja urgencia
- "Medium" - Urgencia media
- "High" - Alta urgencia

IMPORTANTE: 
- Sé conversacional y amigable, como si estuvieras hablando con un colega
- Puedes hacer múltiples preguntas de seguimiento si es necesario
- No tengas miedo de hacer preguntas adicionales si crees que pueden mejorar el ticket
- Mantén las preguntas específicas y útiles
- CRÍTICO: Solo usa los tipos y urgencias válidos mencionados arriba. No inventes otros valores.

Responde SOLO en formato JSON válido con esta estructura:
{
  "needsClarification": true/false,
  "question": "Pregunta conversacional y específica si needsClarification es true, null si es false",
  "suggestions": {
    "tipo": "Bug, Task o Support (SOLO uno de estos tres valores)",
    "urgencia": "Low, Medium o High (SOLO uno de estos tres valores)",
    "asunto": "Asunto mejorado si aplica",
    "descripcion": "Descripción mejorada si aplica",
    "dueDate": "Fecha de vencimiento sugerida en formato YYYY-MM-DD si aplica"
  },
  "interpretation": "Breve interpretación de la solicitud (solo si needsClarification es false)"
}`
      
      initialContentBlocks.push({ type: 'text', text: textContent })
      
      // Agregar imágenes al contenido inicial si están disponibles
      if (images.length > 0) {
        for (const imageUrl of images) {
          if (imageUrl.startsWith('data:')) {
            // Data URL: extraer base64 y tipo
            const [header, base64] = imageUrl.split(',')
            const mimeMatch = header.match(/data:([^;]+)/)
            const mimeType = mimeMatch ? mimeMatch[1] : 'image/png'
            
            initialContentBlocks.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: base64
              }
            })
          } else if (imageUrl.includes('imgur.com')) {
            // URL de Imgur: usar como URL externa
            initialContentBlocks.push({
              type: 'image',
              source: {
                type: 'url',
                url: imageUrl
              }
            })
          }
        }
      }
      
      messages.push({
        role: 'user',
        content: initialContentBlocks
      })
    } else {
      // Respuesta del cliente a una pregunta anterior - continuar la conversación
      // Construir el contexto completo de la conversación de manera natural
      const conversationContext = conversationHistory
        .map(msg => `${msg.role === 'user' ? 'Cliente' : 'Asistente'}: ${msg.content}`)
        .join('\n\n')
      
      // Limpiar HTML de la descripción para reducir tokens
      let descripcionLimpia = ticket.descripcion
      descripcionLimpia = descripcionLimpia.replace(/<img[^>]*src="data:image\/[^"]*"[^>]*>/gi, '[Imagen adjunta]')
      if (descripcionLimpia.length > 2000) {
        descripcionLimpia = descripcionLimpia.substring(0, 2000) + '...'
      }
      
      messages.push({
        role: 'user',
        content: `Continúa la conversación con el cliente. Aquí está el historial completo de la conversación:

${conversationContext}

Información actual del ticket:
- Cliente: ${ticket.cliente}
- Asunto: ${ticket.asunto}
- Descripción: ${descripcionLimpia}
- Tipo: ${ticket.tipo}
- Urgencia: ${ticket.urgencia}
${ticket.contacto ? `- Contacto: ${ticket.contacto}` : ''}
${ticket.dueDate ? `- Fecha de vencimiento: ${ticket.dueDate}` : ''}

Ahora que el cliente ha respondido, analiza la situación:

1. **Si aún necesitas más información:**
   - Haz otra pregunta conversacional y específica
   - Puedes hacer preguntas de seguimiento para profundizar
   - Ejemplo: "Gracias por esa información. Para asegurarme de entender completamente, ¿podrías decirme...?"

2. **Si ya tienes suficiente información:**
   - Proporciona una interpretación clara de lo que entiendes
   - Sugiere mejoras específicas para el ticket (tipo, urgencia, asunto más descriptivo, descripción mejorada)
   - Incluye TODA la información nueva proporcionada por el cliente en la descripción mejorada
   - Si el cliente mencionó fechas límite o urgencia temporal, sugiere una dueDate

**FORMATO DE DESCRIPCIÓN MEJORADA (ESTRICTAMENTE OBLIGATORIO - SIN EXCEPCIONES):**

LA DESCRIPCIÓN DEBE TENER EXACTAMENTE ESTAS SECCIONES EN ESTE ORDEN:

1. [Una oración resumen del problema]

2. Pasos para reproducir:
   - OBLIGATORIO SIEMPRE
   - Mínimo 3 pasos numerados
   - Si es una tarea sin pasos, escribe: "1. Realizar [tarea solicitada]"

3. Resultado esperado:
   - OBLIGATORIO SIEMPRE
   - Describe claramente qué debería suceder

4. Resultado actual:
   - OBLIGATORIO SIEMPRE
   - Describe claramente qué está sucediendo
   - Si es una tarea, escribe: "Pendiente de realizar"

5. Información adicional:
   - OBLIGATORIO SIEMPRE
   - Mínimo 2 viñetas con "-"
   - SIEMPRE incluye: navegador/dispositivo, ambiente (staging/producción), versión, etc.
   - Si no hay info específica, incluye: "- Reportado por: [cliente]", "- Fecha: [hoy]"

6. Adjunto capturas de pantalla mostrando:
   - OBLIGATORIO si hay imágenes
   - Si NO hay imágenes, OMITE esta sección

7. Dispositivo:
   - OBLIGATORIO si se menciona dispositivo específico (móvil, tablet, desktop, etc.)
   - Si NO se menciona, OMITE esta sección

REGLAS ABSOLUTAMENTE OBLIGATORIAS:
✅ SIEMPRE incluir: Pasos para reproducir, Resultado esperado, Resultado actual, Información adicional
✅ USA TEXTO PLANO, NO HTML
✅ Usa saltos de línea dobles entre secciones
✅ Numerar pasos: "1.", "2.", "3."
✅ Usar viñetas en información adicional: "- "
✅ NO omitir ninguna sección obligatoria bajo ninguna circunstancia
✅ Si falta información, pregunta ANTES de generar la descripción
✅ Mínimo 10 líneas de contenido total

EJEMPLO PERFECTO DE DESCRIPCIÓN (USA EXACTAMENTE ESTE FORMATO):

"Se ha detectado un problema en el proceso de checkout donde los cupones de descuento no se están aplicando correctamente al total de la compra.

Pasos para reproducir:
1. Agregar productos al carrito (monto total: S/. 500)
2. Proceder al checkout
3. Ingresar cupón de descuento "VERANO2024" (20% de descuento)
4. Hacer clic en "Aplicar cupón"
5. Observar el total

Resultado esperado:
El total debería ser S/. 400 (S/. 500 - 20%)

Resultado actual:
El total se mantiene en S/. 500, el cupón no se aplica

Información adicional:
- Navegadores afectados: Chrome, Firefox, Safari
- El cupón aparece como "aplicado" en la interfaz pero no descuenta del total
- El problema persiste incluso en modo incógnito
- Otros cupones también presentan el mismo comportamiento

Adjunto capturas de pantalla mostrando:
1. El cupón ingresado y marcado como "aplicado"
2. El total que no refleja el descuento"

OTRO EJEMPLO (con dispositivo):

"Los lead times no se actualizan correctamente en el checkout de staging para el ubigeo de Punta Negra.

Pasos para reproducir:
1. Ingresar al módulo Province Manager en ambiente Staging
2. Configurar lead times para el ubigeo de Punta Negra (150127)
3. Guardar la configuración
4. Abrir el checkout en el dispositivo móvil
5. Verificar los lead times mostrados para Punta Negra

Resultado esperado:
Los lead times configurados deben reflejarse correctamente en el checkout

Resultado actual:
Los lead times antiguos siguen mostrándose sin actualizarse

Información adicional:
- Ambiente: Staging de Hiraoka
- Ubigeo específico: Punta Negra (código 150127)
- Se intentó en modo incógnito con el mismo resultado
- El problema persiste después de limpiar caché del navegador

Dispositivo:
- iPhone 13 Pro, iOS 16.5, Safari
- También probado en Android 12, Chrome"

3. **Sobre fechas de vencimiento:**
   - Si el cliente mencionó una fecha límite, urgencia temporal, o necesidad de resolver antes de cierta fecha, pregunta por la fecha específica o sugiere una
   - Formato: YYYY-MM-DD (ejemplo: 2025-12-15)
   - Sé conversacional: "¿Hay alguna fecha límite para resolver esto?" o "¿Necesitas esto resuelto antes del [fecha]?"

TIPOS DE TICKET VÁLIDOS (DEBES USAR EXACTAMENTE ESTOS VALORES):
- "Bug" - Para errores, bugs o problemas técnicos
- "Task" - Para tareas o trabajos a realizar
- "Support" - Para solicitudes de soporte o consultas

URGENCIAS VÁLIDAS (DEBES USAR EXACTAMENTE ESTOS VALORES):
- "Low" - Baja urgencia
- "Medium" - Urgencia media
- "High" - Alta urgencia

IMPORTANTE:
- Mantén un tono conversacional y amigable
- Puedes hacer múltiples preguntas de seguimiento si es necesario
- No tengas miedo de hacer preguntas adicionales si crees que pueden mejorar significativamente el ticket
- Si ya tienes buena información pero puedes hacer una pregunta más para perfeccionar el ticket, hazla
- CRÍTICO: Solo usa los tipos y urgencias válidos mencionados arriba. No inventes otros valores como "Incidencia Técnica" o "Media". Usa EXACTAMENTE "Bug", "Task" o "Support" para tipo, y "Low", "Medium" o "High" para urgencia.

Responde SOLO en formato JSON válido con esta estructura:
{
  "needsClarification": true/false,
  "question": "Pregunta conversacional y específica si needsClarification es true, null si es false",
  "suggestions": {
    "tipo": "Bug, Task o Support (SOLO uno de estos tres valores, NUNCA uses otros como 'Incidencia Técnica')",
    "urgencia": "Low, Medium o High (SOLO uno de estos tres valores, NUNCA uses otros como 'Media' o 'Baja')",
    "asunto": "Asunto mejorado que refleje la información completa",
    "descripcion": "Descripción mejorada que incluya TODA la información proporcionada por el cliente",
    "dueDate": "Fecha de vencimiento sugerida en formato YYYY-MM-DD si aplica"
  },
  "interpretation": "Interpretación completa de la solicitud con toda la información (solo si needsClarification es false)"
}`
      })
    }

    // Agregar imágenes al contenido del mensaje si están disponibles
    if (images.length > 0 && messages.length > 0 && messages[messages.length - 1].role === 'user') {
      // Si hay imágenes y el último mensaje es del usuario, agregar las imágenes
      const lastMessage = messages[messages.length - 1]
      if (typeof lastMessage.content === 'string') {
        // Convertir el contenido a array de bloques
        const contentBlocks: any[] = [
          { type: 'text', text: lastMessage.content }
        ]
        
        // Agregar cada imagen
        for (const imageUrl of images) {
          if (imageUrl.startsWith('data:')) {
            // Data URL: extraer base64 y tipo
            const [header, base64] = imageUrl.split(',')
            const mimeMatch = header.match(/data:([^;]+)/)
            const mimeType = mimeMatch ? mimeMatch[1] : 'image/png'
            
            contentBlocks.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: base64
              }
            })
          } else if (imageUrl.includes('imgur.com')) {
            // URL de Imgur: usar como URL externa
            contentBlocks.push({
              type: 'image',
              source: {
                type: 'url',
                url: imageUrl
              }
            })
          }
        }
        
        // Reemplazar el último mensaje con contenido que incluye imágenes
        messages[messages.length - 1] = {
          ...lastMessage,
          content: contentBlocks
        }
      }
    }
    
    console.log('📤 Enviando request a Anthropic API...')
    console.log(`🖼️ Imágenes incluidas en el request: ${images.length}`)
    // Usar solo modelos que sabemos que funcionan
    // claude-3-5-haiku-20241022 es el único modelo disponible actualmente
    const modelsToTry = [
      'claude-3-5-haiku-20241022'   // Modelo disponible y funcional
    ]
    
    let lastError: any = null
    let response: any = null
    
    for (const model of modelsToTry) {
      try {
        console.log(`🤖 Intentando con modelo: ${model}`)
        response = await anthropic.messages.create({
          model: model,
          max_tokens: 1024,
          messages,
          // Reducir tokens de entrada para evitar rate limits
          temperature: 0.7
        })
        console.log(`✅ Modelo ${model} funcionó correctamente`)
        break // Salir del loop si funciona
      } catch (error: any) {
        console.log(`❌ Modelo ${model} falló:`, {
          message: error.message,
          status: error.status,
          statusText: error.statusText,
          error: error.error
        })
        lastError = error
        
        // Si es un error de autenticación, no tiene sentido probar otros modelos
        if (error.status === 401) {
          console.error('🔑 Error de autenticación - deteniendo intentos con otros modelos')
          throw error
        }
        
        // Continuar con el siguiente modelo
        continue
      }
    }
    
    if (!response) {
      const errorDetails = lastError?.error || lastError?.message || 'Desconocido'
      console.error('❌ Todos los modelos fallaron. Último error:', errorDetails)
      throw new Error(`Todos los modelos fallaron. Último error: ${JSON.stringify(errorDetails)}`)
    }

    console.log('📥 Respuesta recibida de Anthropic')
    const content = response.content[0]
    
    if (content.type !== 'text') {
      console.error('❌ Respuesta inesperada de Anthropic:', content)
      throw new Error(`Respuesta inesperada de Anthropic: tipo ${content.type}`)
    }

    console.log(`📝 Contenido recibido (${content.text.length} caracteres):`, content.text.substring(0, 200))

    // Parsear la respuesta JSON
    let analysis: AnalyzeResponse
    try {
      // Intentar extraer JSON del texto (puede venir con markdown)
      const jsonMatch = content.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0])
        console.log('✅ JSON parseado exitosamente:', JSON.stringify(analysis, null, 2))
        
        // Limpiar campos de texto si contienen JSON residual
        if (analysis.interpretation && typeof analysis.interpretation === 'string') {
          // Si la interpretación contiene JSON, limpiarla
          if (analysis.interpretation.includes('{') && analysis.interpretation.includes('}')) {
            const cleanMatch = analysis.interpretation.match(/^[^{]*/)
            if (cleanMatch && cleanMatch[0].trim()) {
              analysis.interpretation = cleanMatch[0].trim()
            } else {
              // Si no hay texto antes del JSON, usar un mensaje por defecto
              analysis.interpretation = 'Tu solicitud está completa y clara.'
            }
          }
        }
      } else {
        console.error('❌ No se encontró JSON en la respuesta')
        throw new Error('No se encontró JSON en la respuesta')
      }
    } catch (parseError: any) {
      console.error('❌ Error parseando JSON:', parseError.message)
      console.error('Texto completo:', content.text)
      // Si falla el parsing, crear una respuesta por defecto usando el texto completo
      let interpretationText = content.text.substring(0, 300)
      // Limpiar JSON si existe
      interpretationText = interpretationText.replace(/\{[\s\S]*\}/, '').trim()
      analysis = {
        needsClarification: false,
        interpretation: interpretationText || 'Tu solicitud está completa y clara.'
      }
    }

    return NextResponse.json(analysis)

  } catch (error: any) {
    console.error('❌ Error en análisis de IA:', error)
    console.error('Error tipo:', error.constructor.name)
    console.error('Error mensaje:', error.message)
    console.error('Error stack:', error.stack)
    
    // Detectar tipos específicos de errores
    let errorMessage = 'Error al analizar la solicitud. Continuando con el envío.'
    
    if (error.status === 401) {
      errorMessage = 'Error de autenticación con Anthropic. Verifica tu API key.'
      console.error('🔑 Error de autenticación - verifica ANTHROPIC_API_KEY')
    } else if (error.status === 429) {
      const rateLimitMsg = error.error?.message || error.message || ''
      if (rateLimitMsg.includes('input tokens')) {
        errorMessage = 'Límite de tokens por minuto excedido. Las imágenes grandes consumen muchos tokens. Intenta más tarde o reduce el tamaño de las imágenes.'
      } else {
        errorMessage = 'Límite de solicitudes excedido. Intenta más tarde.'
      }
      console.error('⏱️ Rate limit excedido:', rateLimitMsg)
    } else if (error.status === 400) {
      errorMessage = 'Solicitud inválida a Anthropic. Verifica la configuración.'
      console.error('📋 Error 400 - solicitud inválida')
    } else if (error.message?.includes('model') || error.error?.message?.includes('model')) {
      const modelError = error.error?.message || error.message || 'Modelo no disponible'
      errorMessage = `Modelo de IA no disponible: ${modelError}. Verifica los logs en Vercel para más detalles.`
      console.error('🤖 Error con el modelo especificado:', modelError)
    } else if (error.message?.includes('Todos los modelos fallaron')) {
      errorMessage = 'No se pudo conectar con ningún modelo de IA. Verifica tu API key y los logs en Vercel.'
      console.error('🤖 Todos los modelos fallaron')
    }
    
    return NextResponse.json(
      {
        needsClarification: false,
        interpretation: errorMessage
      },
      { status: 200 } // No fallar, solo continuar sin IA
    )
  }
}

