import { TicketRequest } from './types'
import { JIRA_PROJECTS } from '@/config/projects'
import { htmlToAdf } from './htmlToAdf'

interface JiraIssueResponse {
  id: string
  key: string
  self: string
}

interface JiraError {
  errorMessages?: string[]
  errors?: Record<string, string>
}

/**
 * Verifica que un ticket de Jira existe y está accesible
 * Si falla, no bloquea el proceso (podría ser un problema de permisos de lectura)
 */
async function verifyIssueExists(issueKey: string, host: string, auth: string): Promise<boolean> {
  try {
    const nodeFetch = (await import('node-fetch')).default
    const cleanHost = host.endsWith('/') ? host.slice(0, -1) : host
    // Intentar con campos mínimos para reducir problemas de permisos
    const verifyUrl = `${cleanHost}/rest/api/3/issue/${issueKey}?fields=key`
    
    const response = await nodeFetch(verifyUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    })
    
    if (response.ok) {
      console.log(`✅ Ticket ${issueKey} verificado exitosamente`)
      return true
    } else {
      const errorText = await response.text()
      console.warn(`⚠️ Verificación del ticket ${issueKey} falló (${response.status}):`, errorText.substring(0, 200))
      // No fallar si es 404 o 403 - podría ser un problema de permisos de lectura
      // pero aún así podríamos tener permisos para adjuntar archivos
      return false
    }
  } catch (error: any) {
    console.warn(`⚠️ Error verificando existencia del ticket ${issueKey}:`, error.message)
    return false
  }
}

export async function attachFilesToJiraIssue(
  issueKey: string,
  files: File[]
): Promise<{ success: boolean; error?: string }> {
  // Limpiar host de espacios, saltos de línea y barras finales
  const host = (process.env.JIRA_HOST || '').trim().replace(/\n/g, '').replace(/\r/g, '').replace(/\r/g, '').replace(/\/+$/, '')
  const email = process.env.JIRA_EMAIL
  const apiToken = process.env.JIRA_API_TOKEN

  if (!host || !email || !apiToken) {
    return { success: false, error: 'Configuración de Jira incompleta' }
  }

  const auth = Buffer.from(`${email}:${apiToken}`).toString('base64')
  
  // Verificar que el ticket existe antes de intentar adjuntar archivos
  // Si la verificación falla, continuar de todos modos (podría ser un problema de permisos de lectura)
  console.log(`🔍 Verificando que el ticket ${issueKey} existe...`)
  const issueExists = await verifyIssueExists(issueKey, host, auth)
  if (!issueExists) {
    console.warn(`⚠️ No se pudo verificar el ticket ${issueKey}, pero continuaremos intentando adjuntar archivos...`)
    console.warn(`   (Esto podría ser normal si el usuario tiene permisos para crear pero no para leer tickets)`)
    // Esperar un poco más antes de intentar adjuntar
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  try {
    // Usar node-fetch para mejor compatibilidad con form-data
    const nodeFetch = (await import('node-fetch')).default
    
    // Subir cada archivo
    console.log(`📎 Total de archivos a adjuntar: ${files.length}`)
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      console.log(`📎 [${i + 1}/${files.length}] Adjuntando archivo: ${file.name} (${file.size} bytes, tipo: ${file.type})`)
      
      // Validar que el archivo tenga contenido
      if (!file || file.size === 0) {
        console.warn(`⚠️ Archivo ${file.name} está vacío, saltando...`)
        continue
      }
      
      // Convertir File a Buffer para el servidor
      console.log(`📎 Convirtiendo archivo ${file.name} a Buffer...`)
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      console.log(`📎 Buffer creado: ${buffer.length} bytes`)
      
      // Usar form-data para Node.js
      const FormDataModule = await import('form-data')
      const FormData = FormDataModule.default
      const formData = new FormData()
      
      // Append file con opciones correctas
      // IMPORTANTE: Jira espera el campo 'file' (no 'file[]' ni otro nombre)
      formData.append('file', buffer, {
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        knownLength: buffer.length
      })

      // Obtener headers de form-data
      const formHeaders = formData.getHeaders()

      console.log(`📤 Enviando request a: ${host}/rest/api/3/issue/${issueKey}/attachments`)
      console.log(`📋 Headers:`, {
        'Authorization': 'Basic ***',
        'X-Atlassian-Token': 'no-check',
        'Content-Type': formHeaders['content-type'],
        'Content-Length': buffer.length
      })
      console.log(`📋 File info:`, {
        name: file.name,
        size: buffer.length,
        type: file.type,
        filename: file.name
      })

      // Limpiar host para evitar doble barra
      const cleanHost = host.endsWith('/') ? host.slice(0, -1) : host
      const attachmentUrl = `${cleanHost}/rest/api/3/issue/${issueKey}/attachments`
      
      // Intentar adjuntar con retry logic (máximo 5 intentos con backoff exponencial)
      let lastError: any = null
      let success = false
      const maxRetries = 5
      const baseDelay = 2000 // 2 segundos base (más tiempo para que Jira procese el ticket)
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`📤 Intento ${attempt}/${maxRetries} de adjuntar archivo ${file.name}...`)
          
          // Crear nuevo FormData para cada intento (no se puede reutilizar)
          const retryFormData = new FormData()
          retryFormData.append('file', buffer, {
            filename: file.name,
            contentType: file.type || 'application/octet-stream',
            knownLength: buffer.length
          })
          const retryFormHeaders = retryFormData.getHeaders()
          
          console.log(`📤 Enviando POST a: ${attachmentUrl}`)
          console.log(`📤 Body type: FormData`)
          console.log(`📤 Body size aproximado: ${buffer.length} bytes`)
          
          const response = await nodeFetch(attachmentUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${auth}`,
              'X-Atlassian-Token': 'no-check', // Requerido para evitar CSRF
              ...retryFormHeaders // Headers necesarios para FormData (incluye Content-Type con boundary)
            },
            body: retryFormData as any // node-fetch maneja form-data correctamente
          })
          
          console.log(`📥 Response recibida: ${response.status} ${response.statusText}`)

          if (!response.ok) {
            const errorText = await response.text()
            let errorData
            try {
              errorData = JSON.parse(errorText)
            } catch {
              errorData = { message: errorText }
            }
            
            // Si es 404 y no es el último intento, esperar y reintentar
            if (response.status === 404 && attempt < maxRetries) {
              const delay = baseDelay * Math.pow(2, attempt - 1) // Backoff exponencial: 1s, 2s, 4s
              console.log(`⚠️ Error 404 en intento ${attempt}, esperando ${delay}ms antes de reintentar...`)
              console.log(`   Error: ${errorData.errorMessages?.[0] || errorData.message || response.statusText}`)
              await new Promise(resolve => setTimeout(resolve, delay))
              lastError = { status: response.status, error: errorData }
              continue
            }
            
            // Si es otro error o último intento, fallar
            console.error(`❌ Error adjuntando archivo ${file.name} (intento ${attempt}/${maxRetries}):`, {
              status: response.status,
              statusText: response.statusText,
              error: errorData
            })
            return { success: false, error: `Error adjuntando ${file.name}: ${errorData.errorMessages?.[0] || errorData.message || response.statusText}` }
          }
          
          // Éxito - parsear respuesta
          const responseText = await response.text()
          let responseData
          try {
            responseData = JSON.parse(responseText)
            const attachmentId = Array.isArray(responseData) ? responseData[0]?.id : responseData.id
            console.log(`✅ Archivo ${file.name} adjuntado exitosamente en intento ${attempt}`, attachmentId ? `(ID: ${attachmentId})` : '')
          } catch (parseError) {
            console.log(`✅ Archivo ${file.name} adjuntado exitosamente en intento ${attempt} (Status ${response.status} OK)`)
          }
          
          success = true
          break
          
        } catch (fetchError: any) {
          console.error(`❌ Error de red al adjuntar archivo ${file.name} (intento ${attempt}/${maxRetries}):`, fetchError.message)
          if (attempt < maxRetries) {
            const delay = baseDelay * Math.pow(2, attempt - 1)
            console.log(`   Esperando ${delay}ms antes de reintentar...`)
            await new Promise(resolve => setTimeout(resolve, delay))
            lastError = fetchError
          } else {
            return { success: false, error: `Error de red adjuntando ${file.name}: ${fetchError.message}` }
          }
        }
      }
      
      if (!success) {
        return { success: false, error: `No se pudo adjuntar ${file.name} después de ${maxRetries} intentos: ${lastError?.error?.errorMessages?.[0] || lastError?.message || 'Error desconocido'}` }
      }
    }

    return { success: true }
  } catch (error: any) {
    console.error('❌ Error adjuntando archivos:', error)
    console.error('Error stack:', error.stack)
    return { success: false, error: `Error adjuntando archivos: ${error.message || 'Error desconocido'}` }
  }
}

export async function createJiraTicket(ticket: TicketRequest): Promise<{
  success: boolean
  issueKey?: string
  issueUrl?: string
  error?: string
}> {
  // Limpiar host de espacios, saltos de línea y barras finales
  const host = (process.env.JIRA_HOST || '').trim().replace(/\n/g, '').replace(/\r/g, '').replace(/\/+$/, '')
  const email = process.env.JIRA_EMAIL
  const apiToken = process.env.JIRA_API_TOKEN

  if (!host || !email || !apiToken) {
    console.error('Jira credentials not configured')
    return { success: false, error: 'Configuración de Jira incompleta' }
  }

  const project = JIRA_PROJECTS[ticket.cliente]
  if (!project) {
    return { success: false, error: 'Cliente no válido' }
  }

  // Construir descripción con contacto y fecha de vencimiento si existen
  let descripcionHtml = ticket.descripcion
  
  // Agregar metadata al HTML antes de convertir a ADF
  const metadata: string[] = []
  
  if (ticket.contacto) {
    metadata.push(`Contacto: ${ticket.contacto}`)
  }
  
  // Incluir fecha de vencimiento en la descripción ya que el campo duedate puede no estar disponible
  if (ticket.dueDate) {
    const date = new Date(ticket.dueDate)
    metadata.push(`Fecha de vencimiento: ${date.toLocaleDateString('es-ES')} (${ticket.dueDate})`)
  }
  
  // Agregar metadata al HTML si existe
  if (metadata.length > 0) {
    const metadataHtml = `<hr><p><strong>Información adicional:</strong></p><ul>${metadata.map(m => `<li>${m}</li>`).join('')}</ul>`
    descripcionHtml += metadataHtml
  }

  // Contar imágenes en el HTML para agregar nota informativa
  const imageCount = (descripcionHtml.match(/<img[^>]*>/gi) || []).length
  
  // Extraer URLs de Imgur para agregarlas en metadata
  const imgurUrls: string[] = []
  if (descripcionHtml.includes('i.imgur.com') || descripcionHtml.includes('imgur.com')) {
    // Buscar URLs de Imgur en el HTML (pueden estar en src de img tags o como texto)
    const imgMatches = descripcionHtml.match(/https?:\/\/[i\.]*imgur\.com\/[a-zA-Z0-9]+\.(png|jpg|jpeg|gif|webp)/gi)
    if (imgMatches) {
      imgurUrls.push(...imgMatches)
    }
    // También buscar en atributos src de img tags
    const srcMatches = descripcionHtml.match(/src=["'](https?:\/\/[i\.]*imgur\.com\/[a-zA-Z0-9]+\.(png|jpg|jpeg|gif|webp))["']/gi)
    if (srcMatches) {
      srcMatches.forEach(match => {
        const urlMatch = match.match(/https?:\/\/[i\.]*imgur\.com\/[a-zA-Z0-9]+\.(png|jpg|jpeg|gif|webp)/i)
        if (urlMatch && !imgurUrls.includes(urlMatch[0])) {
          imgurUrls.push(urlMatch[0])
        }
      })
    }
  }
  
  console.log(`🖼️ URLs de Imgur encontradas en HTML: ${imgurUrls.length}`, imgurUrls)
  
  // Convertir HTML a ADF (Atlassian Document Format)
  let descriptionAdf: any
  try {
    // Si la descripción contiene HTML (del editor enriquecido), convertir a ADF
    if (descripcionHtml.includes('<') && descripcionHtml.includes('>')) {
      descriptionAdf = htmlToAdf(descripcionHtml)
      
      // Nota: htmlToAdf.ts ya agrega el resumen de imágenes al final
      // No necesitamos duplicar esa información aquí
    } else {
      // Si es texto plano, crear ADF simple
      descriptionAdf = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: descripcionHtml }]
          }
        ]
      }
    }
  } catch (error) {
    console.error('Error convirtiendo HTML a ADF:', error)
    // Fallback a texto plano si falla la conversión
    descriptionAdf = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: descripcionHtml.replace(/<[^>]*>/g, '') }]
        }
      ]
    }
  }

  // Payload para Jira API v3 (ADF format)
  const payload: any = {
    fields: {
      project: { key: project.key },
      summary: ticket.asunto,
      description: descriptionAdf,
      issuetype: { name: mapTipoToJira(ticket.tipo) },
      priority: { name: mapUrgenciaToJira(ticket.urgencia) }
    }
  }

  // NOTA: No intentamos establecer duedate como campo porque puede no estar disponible
  // en todos los proyectos de Jira. La fecha se incluye en la descripción.
  // Si necesitas el campo duedate, primero verifica que esté disponible en tu proyecto.

  try {
    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64')

    const response = await fetch(`${host}/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorData: JiraError = await response.json()
      console.error('Jira API error:', errorData)
      const errorMsg = errorData.errorMessages?.[0] ||
                       Object.values(errorData.errors || {})[0] ||
                       `Error ${response.status}`
      return { success: false, error: errorMsg }
    }

    const data: JiraIssueResponse = await response.json()

    // Host ya está limpio (sin barras finales ni saltos de línea)
    // Solo asegurarnos de que no haya doble barra en la construcción de la URL
    const issueUrl = `${host}/browse/${data.key}`.replace(/([^:]\/)\/+/g, '$1')
    
    return {
      success: true,
      issueKey: data.key,
      issueUrl
    }

  } catch (error) {
    console.error('Error creating Jira ticket:', error)
    return { success: false, error: 'Error de conexión con Jira' }
  }
}

function mapTipoToJira(tipo: string): string {
  const mapping: Record<string, string> = {
    'Bug': 'Bug',
    'Task': 'Task',
    'Support': 'Task' // Si no existe Support en Jira, usar Task
  }
  return mapping[tipo] || 'Task'
}

function mapUrgenciaToJira(urgencia: string): string {
  const mapping: Record<string, string> = {
    'Low': 'Low',
    'Medium': 'Medium',
    'High': 'High'
  }
  return mapping[urgencia] || 'Medium'
}
