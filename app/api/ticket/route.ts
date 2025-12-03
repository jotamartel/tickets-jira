import { NextRequest, NextResponse } from 'next/server'
import { TicketRequest, TicketResponse } from '@/lib/types'
import { JIRA_PROJECTS } from '@/config/projects'
import { createJiraTicket, attachFilesToJiraIssue } from '@/lib/jira'
import { sendGoogleChatNotification } from '@/lib/googleChat'
import { htmlToAdf, extractImageFilesFromHtml } from '@/lib/htmlToAdf'

// Rate limiting simple (en memoria - para producción usar Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 10 // requests
const RATE_WINDOW = 60 * 1000 // 1 minuto

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW })
    return true
  }

  if (record.count >= RATE_LIMIT) {
    return false
  }

  record.count++
  return true
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0] ||
         request.headers.get('x-real-ip') ||
         'unknown'
}

function sanitizeInput(input: string, isHtml: boolean = false): string {
  if (isHtml) {
    // Para HTML del editor, solo limpiar caracteres peligrosos pero mantener estructura
    // Eliminar scripts y eventos peligrosos
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/javascript:/gi, '')
      .trim()
  }
  // Para texto plano, eliminar HTML completamente
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>]/g, '') // Remove remaining angle brackets
    .trim()
}

export async function POST(request: NextRequest): Promise<NextResponse<TicketResponse>> {
  try {
    // Rate limiting
    const ip = getClientIp(request)
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: 'Demasiadas solicitudes. Intenta en un minuto.' },
        { status: 429 }
      )
    }

    // Verificar si es FormData (con archivos) o JSON
    const contentType = request.headers.get('content-type') || ''
    let body: TicketRequest
    let files: File[] = []

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      
      // Extraer datos del formulario
      body = {
        cliente: formData.get('cliente') as string,
        asunto: formData.get('asunto') as string,
        descripcion: formData.get('descripcion') as string,
        tipo: formData.get('tipo') as TicketRequest['tipo'],
        urgencia: formData.get('urgencia') as TicketRequest['urgencia'],
        contacto: formData.get('contacto') as string || undefined,
        dueDate: formData.get('dueDate') as string || undefined
      }

      // Extraer archivos - manejar correctamente los objetos File de Next.js
      const allEntries = Array.from(formData.keys())
      console.log(`📋 FormData entries totales: ${allEntries.length}`, allEntries)
      
      const fileEntries: File[] = []
      for (const key of allEntries) {
        if (key.startsWith('archivo_')) {
          const value = formData.get(key)
          console.log(`📋 Procesando entrada: ${key}`)
          console.log(`📋 Tipo de valor: ${value?.constructor?.name || typeof value}`)
          
          if (value instanceof File) {
            console.log(`✅ Archivo válido (File): ${value.name} (${value.size} bytes, ${value.type})`)
            fileEntries.push(value)
          } else if (value && typeof value === 'object') {
            // Verificar si es un Blob usando duck typing
            const isBlob = 'type' in value && 'size' in value && typeof (value as any).arrayBuffer === 'function'
            
            if (isBlob) {
              // Si es un Blob, intentar convertirlo a File
              try {
                const blob = value as any
                const file = new File([blob], `archivo-${fileEntries.length}.${blob.type?.split('/')[1] || 'bin'}`, { type: blob.type || 'application/octet-stream' })
                console.log(`✅ Blob convertido a File: ${file.name} (${file.size} bytes)`)
                fileEntries.push(file)
              } catch (convertError) {
                console.error(`❌ Error convirtiendo Blob a File:`, convertError)
              }
            } else {
              // En Next.js, los archivos pueden venir como objetos Blob-like
              const fileLike = value as any
              if (fileLike.name && (fileLike.size !== undefined || fileLike.length !== undefined)) {
              console.log(`⚠️ Objeto File-like detectado:`, {
                name: fileLike.name,
                size: fileLike.size || fileLike.length,
                type: fileLike.type
              })
              // Intentar convertir a File si es posible
              try {
                // Si tiene arrayBuffer o stream, usarlo
                if (fileLike.arrayBuffer) {
                  const arrayBuffer = await fileLike.arrayBuffer()
                  const blob = new Blob([arrayBuffer], { type: fileLike.type || 'application/octet-stream' })
                  const file = new File([blob], fileLike.name, { type: fileLike.type || 'application/octet-stream' })
                  console.log(`✅ Convertido a File desde arrayBuffer: ${file.name} (${file.size} bytes)`)
                  fileEntries.push(file)
                } else if (fileLike.stream) {
                  const chunks: BlobPart[] = []
                  const reader = fileLike.stream.getReader()
                  while (true) {
                    const { done, value: chunk } = await reader.read()
                    if (done) break
                    chunks.push(chunk)
                  }
                  const blob = new Blob(chunks, { type: fileLike.type || 'application/octet-stream' })
                  const file = new File([blob], fileLike.name, { type: fileLike.type || 'application/octet-stream' })
                  console.log(`✅ Convertido a File desde stream: ${file.name} (${file.size} bytes)`)
                  fileEntries.push(file)
                } else {
                  // Último recurso: crear Blob desde el objeto
                  const blob = new Blob([fileLike], { type: fileLike.type || 'application/octet-stream' })
                  const file = new File([blob], fileLike.name, { type: fileLike.type || 'application/octet-stream' })
                  console.log(`✅ Convertido a File desde objeto: ${file.name} (${file.size} bytes)`)
                  fileEntries.push(file)
                }
              } catch (convertError) {
                console.error(`❌ Error convirtiendo a File:`, convertError)
              }
              }
            }
          } else {
            console.warn(`⚠️ Valor inesperado para ${key}:`, typeof value, value)
          }
        }
      }
      
      files = fileEntries
      console.log(`📎 Archivos recibidos después del procesamiento: ${files.length}`)
      if (files.length > 0) {
        console.log(`📎 Detalles de archivos:`, files.map(f => ({ 
          name: f.name, 
          size: f.size, 
          type: f.type,
          lastModified: f.lastModified
        })))
      } else {
        console.warn(`⚠️ No se recibieron archivos.`)
        console.warn(`⚠️ Entradas disponibles:`, allEntries)
        console.warn(`⚠️ Revisa que se estén enviando correctamente desde el cliente.`)
      }
    } else {
      body = await request.json()
    }

    // Sanitizar inputs
    // La descripción puede contener HTML del editor enriquecido
    const descripcionHtml = body.descripcion || ''
    
    // Log para debugging: verificar si hay URLs de Imgur en la descripción
    let imgurFiles: File[] = []
    if (descripcionHtml.includes('imgur.com')) {
      const imgurUrlsRaw = descripcionHtml.match(/https?:\/\/[i\.]*imgur\.com\/[a-zA-Z0-9]+\.(png|jpg|jpeg|gif|webp)/gi)
      
      // Eliminar URLs duplicadas usando Set
      const imgurUrls = imgurUrlsRaw ? Array.from(new Set(imgurUrlsRaw)) : []
      
      console.log(`🖼️ URLs de Imgur encontradas en descripción: ${imgurUrlsRaw?.length || 0} (${imgurUrls.length} únicas)`, imgurUrls)
      
      if (imgurUrls.length > 0) {
        console.log('📥 Descargando imágenes únicas de Imgur para adjuntarlas a Jira...')
        
        // Descargar cada imagen única de Imgur
        for (let i = 0; i < imgurUrls.length; i++) {
          const url = imgurUrls[i]
          try {
            console.log(`📥 Descargando imagen ${i + 1}/${imgurUrls.length}: ${url}`)
            const response = await fetch(url)
            
            if (response.ok) {
              const arrayBuffer = await response.arrayBuffer()
              const buffer = Buffer.from(arrayBuffer)
              
              // Extraer extensión de la URL
              const extension = url.match(/\.(png|jpg|jpeg|gif|webp)$/i)?.[1] || 'png'
              const fileName = `imgur-image-${i + 1}.${extension}`
              const mimeType = `image/${extension === 'jpg' ? 'jpeg' : extension}`
              
              // Crear File object
              const file = new File([buffer], fileName, { type: mimeType })
              imgurFiles.push(file)
              console.log(`✅ Imagen descargada: ${fileName} (${buffer.length} bytes)`)
            } else {
              console.warn(`⚠️ No se pudo descargar imagen ${i + 1}: ${response.status} ${response.statusText}`)
            }
          } catch (error: any) {
            console.error(`❌ Error descargando imagen ${i + 1}:`, error.message)
          }
        }
        
        console.log(`📥 Total de imágenes únicas de Imgur descargadas: ${imgurFiles.length}`)
      }
    }
    
    // Extraer imágenes del HTML para adjuntarlas también como archivos
    let imagesFromHtml: File[] = []
    try {
      // En el servidor necesitamos usar una librería para parsear HTML
      // Por ahora, las imágenes ya vienen como archivos separados del cliente
      // Pero podemos intentar extraer data URLs si existen
      if (descripcionHtml.includes('data:image')) {
        // Las imágenes en data URLs ya fueron extraídas en el cliente
        // Solo necesitamos asegurarnos de que se incluyan en los archivos
        console.log('ℹ️ HTML contiene data URLs de imágenes (deberían estar en archivos)')
      }
    } catch (error) {
      console.warn('No se pudieron extraer imágenes del HTML:', error)
    }
    
    const sanitizedTicket: TicketRequest = {
      cliente: body.cliente,
      asunto: sanitizeInput(body.asunto || ''),
      descripcion: sanitizeInput(descripcionHtml, true), // HTML del editor
      tipo: body.tipo,
      urgencia: body.urgencia,
      contacto: body.contacto ? sanitizeInput(body.contacto) : undefined,
      dueDate: body.dueDate || undefined
    }

    // Validación básica (asunto es opcional, la IA puede sugerirlo)
    if (!sanitizedTicket.cliente || !sanitizedTicket.descripcion) {
      return NextResponse.json(
        { success: false, error: 'Campos requeridos faltantes: cliente y descripción son obligatorios' },
        { status: 400 }
      )
    }
    
    // Si no hay asunto, usar un valor por defecto basado en la descripción
    if (!sanitizedTicket.asunto || sanitizedTicket.asunto.trim() === '') {
      // Extraer las primeras palabras de la descripción como asunto por defecto
      const descripcionTexto = sanitizedTicket.descripcion.replace(/<[^>]*>/g, ' ').trim()
      const palabras = descripcionTexto.split(/\s+/).slice(0, 8).join(' ')
      sanitizedTicket.asunto = palabras.length > 0 ? palabras + (palabras.length < descripcionTexto.length ? '...' : '') : 'Solicitud de soporte'
      console.log(`ℹ️ Asunto no proporcionado, usando valor por defecto: ${sanitizedTicket.asunto}`)
    }

    // Validar que el cliente exista
    const project = JIRA_PROJECTS[sanitizedTicket.cliente]
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Cliente no válido' },
        { status: 400 }
      )
    }

    // Validar longitud del asunto (solo si tiene contenido)
    if (sanitizedTicket.asunto && sanitizedTicket.asunto.length > 255) {
      return NextResponse.json(
        { success: false, error: 'El asunto no puede exceder 255 caracteres' },
        { status: 400 }
      )
    }

    // Validar tipo y urgencia
    const tiposValidos = ['Bug', 'Task', 'Support']
    const urgenciasValidas = ['Low', 'Medium', 'High']

    if (!tiposValidos.includes(sanitizedTicket.tipo)) {
      return NextResponse.json(
        { success: false, error: 'Tipo de ticket no válido' },
        { status: 400 }
      )
    }

    if (!urgenciasValidas.includes(sanitizedTicket.urgencia)) {
      return NextResponse.json(
        { success: false, error: 'Urgencia no válida' },
        { status: 400 }
      )
    }

    // Crear ticket en Jira
    console.log('🎫 Creando ticket en Jira...')
    const jiraResult = await createJiraTicket(sanitizedTicket)

    if (!jiraResult.success) {
      console.error('❌ Error creando ticket en Jira:', jiraResult.error)
      return NextResponse.json(
        { success: false, error: jiraResult.error },
        { status: 500 }
      )
    }

    console.log(`✅ Ticket creado exitosamente: ${jiraResult.issueKey}`)
    console.log(`🔗 URL: ${jiraResult.issueUrl}`)

    // Combinar archivos recibidos con imágenes descargadas de Imgur
    const allFiles = [...files, ...imgurFiles]
    console.log(`📎 Total de archivos a adjuntar: ${allFiles.length} (${files.length} recibidos + ${imgurFiles.length} de Imgur)`)

    // Adjuntar archivos si hay
    let attachmentStatus = 'none'
    if (allFiles.length > 0 && jiraResult.issueKey) {
      console.log(`📎 ===== ADJUNTANDO ${allFiles.length} ARCHIVO(S) AL TICKET ${jiraResult.issueKey} =====`)
      console.log(`📎 Archivos a adjuntar:`, allFiles.map(f => ({ name: f.name, size: f.size, type: f.type })))
      
      // Esperar un momento para asegurar que el ticket esté completamente creado en Jira
      // Jira a veces necesita un pequeño delay después de crear el ticket antes de permitir attachments
      console.log(`⏳ Esperando 3 segundos antes de adjuntar archivos...`)
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      const attachResult = await attachFilesToJiraIssue(jiraResult.issueKey, allFiles)
      
      if (!attachResult.success) {
        console.error('❌ Error adjuntando archivos:', attachResult.error)
        attachmentStatus = 'failed'
        // No fallar el ticket si los archivos fallan, solo loguear el error
      } else {
        console.log(`✅ ${allFiles.length} archivo(s) adjuntado(s) exitosamente`)
        attachmentStatus = 'success'
      }
    } else if (allFiles.length > 0) {
      console.warn('⚠️ No se puede adjuntar archivos: issueKey no disponible')
      attachmentStatus = 'no_issue_key'
    } else {
      console.log('ℹ️ No hay archivos para adjuntar')
    }

    // Enviar notificación a Google Chat (async, no bloquea respuesta)
    console.log('📨 ===== INICIANDO NOTIFICACIÓN A GOOGLE CHAT =====')
    console.log(`📋 Ticket creado: ${jiraResult.issueKey} - ${jiraResult.issueUrl}`)
    console.log(`📋 Cliente: ${sanitizedTicket.cliente}`)
    console.log(`📋 Asunto: ${sanitizedTicket.asunto}`)
    
    // Usar await para asegurar que se complete antes de responder
    try {
      const notificationResult = await sendGoogleChatNotification(
        sanitizedTicket,
        jiraResult.issueKey!,
        jiraResult.issueUrl!
      )
      
      if (!notificationResult.success) {
        console.error('❌ Error enviando notificación a Google Chat:', notificationResult.error)
        console.error('   Verifica que GOOGLE_CHAT_WEBHOOK_URL esté configurada en Vercel')
        console.error('   Revisa los logs anteriores para más detalles del error')
      } else {
        console.log('✅ Notificación a Google Chat enviada correctamente')
        console.log(`   Ticket: ${jiraResult.issueKey}`)
        console.log(`   Cliente: ${sanitizedTicket.cliente}`)
      }
    } catch (err: any) {
      console.error('❌ Excepción al enviar notificación a Google Chat:', err)
      console.error('Error mensaje:', err.message)
      console.error('Error stack:', err.stack)
      console.error('Error completo:', JSON.stringify(err, null, 2))
    }

    return NextResponse.json({
      success: true,
      issueKey: jiraResult.issueKey,
      issueUrl: jiraResult.issueUrl
    })

  } catch (error) {
    console.error('❌ Error procesando ticket:', error)
    console.error('Error tipo:', (error as any)?.constructor?.name)
    console.error('Error mensaje:', (error as any)?.message)
    console.error('Error stack:', (error as any)?.stack)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
