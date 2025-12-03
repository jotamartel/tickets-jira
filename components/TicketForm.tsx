'use client'

import { useState } from 'react'
import { TicketRequest, TipoTicket, Urgencia, FormErrors, TicketResponse } from '@/lib/types'
import { CLIENTES, TIPOS_TICKET, URGENCIAS } from '@/config/projects'
import AIAssistant from './AIAssistant'
import RichTextEditor from './RichTextEditor'
import { extractImageFilesFromHtml } from '@/lib/htmlToAdf'

interface TicketFormProps {
  onSuccess: (response: TicketResponse) => void
  prefilledCliente?: string // Cliente prefijado desde la URL
}

export default function TicketForm({ onSuccess, prefilledCliente }: TicketFormProps) {
  const [formData, setFormData] = useState<TicketRequest>({
    cliente: prefilledCliente || '',
    asunto: '',
    descripcion: '',
    tipo: 'Task',
    urgencia: 'Medium',
    contacto: '',
    dueDate: undefined
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [archivos, setArchivos] = useState<File[]>([])

  const validate = (): boolean => {
    const newErrors: FormErrors = {}

    // Solo validar cliente si no está prefijado
    if (!prefilledCliente && !formData.cliente) {
      newErrors.cliente = 'Selecciona un cliente'
    }

    // Asunto es opcional (la IA puede sugerirlo)
    if (formData.asunto.trim() && formData.asunto.length > 255) {
      newErrors.asunto = 'El asunto no puede exceder 255 caracteres'
    }

    if (!formData.descripcion.trim()) {
      newErrors.descripcion = 'La descripción es requerida'
    }

    if (formData.contacto && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contacto)) {
      newErrors.contacto = 'Email inválido'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (!validate()) return

    // Mostrar asistente de IA antes de enviar
    setShowAIAssistant(true)
  }

  const handleFinalSubmit = async () => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      // Extraer solo imágenes en formato data:image (no URLs públicas de Imgur)
      // Las URLs públicas de Imgur ya están en el HTML y se mostrarán directamente en Jira
      console.log('📎 ===== INICIANDO EXTRACCIÓN DE IMÁGENES =====')
      console.log('📎 Descripción HTML (primeros 500 chars):', formData.descripcion.substring(0, 500))
      console.log('📎 Descripción contiene data:image?', formData.descripcion.includes('data:image'))
      console.log('📎 Descripción contiene URLs de Imgur?', formData.descripcion.includes('i.imgur.com'))
      
      // Buscar todas las URLs de Imgur en el HTML
      const imgurUrls = formData.descripcion.match(/https?:\/\/[i\.]*imgur\.com\/[a-zA-Z0-9]+\.(png|jpg|jpeg|gif|webp)/gi)
      if (imgurUrls && imgurUrls.length > 0) {
        console.log(`🖼️ ✅ Encontradas ${imgurUrls.length} URLs de Imgur en la descripción:`, imgurUrls)
      } else {
        console.warn('⚠️ No se encontraron URLs de Imgur en la descripción HTML')
        // Buscar cualquier referencia a imgur en el HTML
        if (formData.descripcion.includes('imgur')) {
          console.log('📝 HTML contiene "imgur" pero no se encontraron URLs válidas')
          console.log('📝 HTML completo:', formData.descripcion)
        }
      }
      
      // Solo extraer data URLs (las URLs públicas de Imgur no necesitan adjuntarse)
      const imagesFromDescription = extractImageFilesFromHtml(formData.descripcion)
      console.log('📎 Imágenes data:image extraídas del editor:', imagesFromDescription.length)
      if (imagesFromDescription.length > 0) {
        console.log('📎 Detalles de imágenes extraídas:', imagesFromDescription.map(f => ({ name: f.name, size: f.size, type: f.type })))
      } else {
        console.log('ℹ️ No hay imágenes data:image para adjuntar (las URLs públicas de Imgur se mostrarán directamente en Jira)')
      }
      
      console.log('📎 Archivos adjuntos:', archivos.length, archivos.map(f => ({ name: f.name, size: f.size })))
      
      // Combinar archivos adjuntos con imágenes data:image del editor
      // Las URLs públicas de Imgur ya están en el HTML y no necesitan adjuntarse
      const allFiles = [...archivos, ...imagesFromDescription]
      console.log('📎 Total de archivos a enviar:', allFiles.length)
      
      // Crear FormData para enviar archivos
      const formDataToSend = new FormData()
      formDataToSend.append('cliente', formData.cliente)
      formDataToSend.append('asunto', formData.asunto)
      formDataToSend.append('descripcion', formData.descripcion) // HTML con imágenes embebidas
      formDataToSend.append('tipo', formData.tipo)
      formDataToSend.append('urgencia', formData.urgencia)
      if (formData.contacto) {
        formDataToSend.append('contacto', formData.contacto)
      }
      if (formData.dueDate) {
        formDataToSend.append('dueDate', formData.dueDate)
      }
      
      // Agregar todos los archivos (adjuntos + imágenes del editor)
      console.log('📎 ===== AGREGANDO ARCHIVOS AL FORMDATA =====')
      allFiles.forEach((file, index) => {
        formDataToSend.append(`archivo_${index}`, file)
        console.log(`📎 Agregado archivo ${index} (archivo_${index}):`, {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        })
      })
      console.log(`📎 Total de archivos agregados al FormData: ${allFiles.length}`)
      
      // Verificar que los archivos estén en el FormData
      const formDataKeys = Array.from(formDataToSend.keys())
      console.log('📎 Keys en FormData:', formDataKeys)
      const fileKeys = formDataKeys.filter(k => k.startsWith('archivo_'))
      console.log(`📎 Keys de archivos en FormData: ${fileKeys.length}`, fileKeys)

      const response = await fetch('/api/ticket', {
        method: 'POST',
        body: formDataToSend // No establecer Content-Type, el navegador lo hace automáticamente con FormData
      })

      const data: TicketResponse = await response.json()

      if (data.success) {
        onSuccess(data)
      } else {
        setSubmitError(data.error || 'Error al crear el ticket')
        setShowAIAssistant(false) // Volver al formulario si hay error
      }
    } catch {
      setSubmitError('Error de conexión. Intenta nuevamente.')
      setShowAIAssistant(false)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleImageUpload = async (file: File): Promise<string> => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al subir la imagen')
      }
      
      const data = await response.json()
      return data.url // Retorna la data URL
    } catch (error: any) {
      console.error('Error subiendo imagen:', error)
      throw error
    }
  }

  const handleRefineTicket = (refinedData: Partial<TicketRequest>) => {
    setFormData(prev => {
      const updated = { ...prev, ...refinedData }
      
      // Si se está actualizando la descripción, preservar las imágenes del HTML original
      if (refinedData.descripcion && refinedData.descripcion !== prev.descripcion) {
        console.log('📎 Preservando imágenes al refinar descripción...')
        
        // Extraer imágenes del HTML original (tanto data URLs como URLs de Imgur)
        const originalImages: string[] = []
        if (prev.descripcion && typeof window !== 'undefined') {
          const parser = new DOMParser()
          const doc = parser.parseFromString(prev.descripcion, 'text/html')
          const images = doc.querySelectorAll('img')
          images.forEach(img => {
            const src = img.getAttribute('src')
            if (src) {
              // Incluir tanto data URLs como URLs de Imgur
              if (src.startsWith('data:image') || src.includes('i.imgur.com') || src.includes('imgur.com')) {
                originalImages.push(src)
              }
            }
          })
        }
        
        console.log(`📎 Imágenes encontradas en descripción original: ${originalImages.length}`, originalImages)
        
        // Verificar si hay referencias a imágenes en el texto (nombres de archivo)
        const imageReferences = prev.descripcion.match(/image-[\w-]+\.(png|jpg|jpeg|gif|webp)/gi) || []
        if (imageReferences.length > 0 && originalImages.length === 0) {
          console.log(`ℹ️ Se encontraron referencias a imágenes en el texto: ${imageReferences.join(', ')}`)
          console.log(`ℹ️ Nota: Estas son solo nombres de archivo. Para incluir las imágenes usando el botón de imagen del editor.`)
        }
        
        // Si hay imágenes originales y la nueva descripción no las tiene, agregarlas
        if (originalImages.length > 0) {
          const newDesc = refinedData.descripcion
          
          // Verificar si la nueva descripción ya tiene imágenes (data URLs o URLs de Imgur)
          const hasImagesInNew = newDesc.includes('data:image') || 
                                 newDesc.includes('i.imgur.com') || 
                                 newDesc.includes('imgur.com')
          
          if (!hasImagesInNew) {
            console.log('📎 La nueva descripción no tiene imágenes, agregándolas...')
            
            // Si la nueva descripción es texto plano, convertirla a HTML
            let newDescHtml = newDesc
            if (!newDesc.includes('<') && !newDesc.includes('>')) {
              // Es texto plano, convertir a HTML con párrafos
              newDescHtml = newDesc.split('\n').map((line: string) => {
                const trimmed = line.trim()
                return trimmed ? `<p>${trimmed}</p>` : ''
              }).filter((p: string) => p).join('')
            }
            
            // Agregar las imágenes al final de la descripción
            const imagesHtml = originalImages.map((src, index) => {
              return `<p><img src="${src}" alt="Imagen ${index + 1}" /></p>`
            }).join('')
            
            updated.descripcion = newDescHtml + imagesHtml
            console.log('✅ Imágenes preservadas en la descripción refinada (incluyendo URLs de Imgur)')
          } else {
            console.log('ℹ️ La nueva descripción ya contiene imágenes, manteniendo ambas')
            // La nueva descripción ya tiene imágenes, mantener ambas
            // Extraer imágenes de la nueva descripción también
            const parser = new DOMParser()
            const newDoc = parser.parseFromString(newDesc, 'text/html')
            const newImages = newDoc.querySelectorAll('img')
            const newImageSrcs: string[] = []
            newImages.forEach(img => {
              const src = img.getAttribute('src')
              if (src && src.startsWith('data:image')) {
                newImageSrcs.push(src)
              }
            })
            
            // Combinar imágenes únicas (evitar duplicados)
            const allUniqueImages = Array.from(new Set([...originalImages, ...newImageSrcs]))
            
            if (allUniqueImages.length > newImageSrcs.length) {
              // Hay imágenes adicionales en el original, agregarlas
              const additionalImages = originalImages.filter(img => !newImageSrcs.includes(img))
              if (additionalImages.length > 0) {
                const additionalImagesHtml = additionalImages.map((src, index) => {
                  return `<p><img src="${src}" alt="Imagen adicional ${index + 1}" /></p>`
                }).join('')
                updated.descripcion = newDesc + additionalImagesHtml
                console.log(`✅ Agregadas ${additionalImages.length} imágenes adicionales del original`)
              }
            }
          }
        }
      }
      
      return updated
    })
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
  }

  // Si hay un cliente prefijado, mostrarlo como campo readonly
  const clienteInfo = prefilledCliente ? CLIENTES.find(c => c.id === prefilledCliente) : null

  return (
    <form onSubmit={handleInitialSubmit} className="space-y-6">
      {/* Cliente */}
      {prefilledCliente ? (
        // Cliente prefijado - mostrar como campo readonly
        <div>
          <label htmlFor="cliente" className="block text-sm font-medium text-gray-700 mb-1">
            Cliente
          </label>
          <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
            {clienteInfo?.name || prefilledCliente}
          </div>
          <input type="hidden" name="cliente" value={prefilledCliente} />
        </div>
      ) : (
        // Selector de cliente normal
        <div>
          <label htmlFor="cliente" className="block text-sm font-medium text-gray-700 mb-1">
            Cliente *
          </label>
          <select
            id="cliente"
            name="cliente"
            value={formData.cliente}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.cliente ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Seleccionar cliente...</option>
            {CLIENTES.map(cliente => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.name}
              </option>
            ))}
          </select>
          {errors.cliente && <p className="mt-1 text-sm text-red-600">{errors.cliente}</p>}
        </div>
      )}

      {/* Asunto */}
      <div>
        <label htmlFor="asunto" className="block text-sm font-medium text-gray-700 mb-1">
          Asunto <span className="text-gray-400 text-xs">(opcional - la IA puede sugerirlo)</span>
        </label>
        <input
          type="text"
          id="asunto"
          name="asunto"
          value={formData.asunto}
          onChange={handleChange}
          maxLength={255}
          placeholder="Breve descripción del problema o solicitud (opcional)"
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.asunto ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        <div className="flex justify-between mt-1">
          {errors.asunto ? (
            <p className="text-sm text-red-600">{errors.asunto}</p>
          ) : (
            <span />
          )}
          <span className="text-xs text-gray-400">{formData.asunto.length}/255</span>
        </div>
      </div>

      {/* Tipo y Urgencia en fila */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 mb-1">
            Tipo
          </label>
          <select
            id="tipo"
            name="tipo"
            value={formData.tipo}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {TIPOS_TICKET.map(tipo => (
              <option key={tipo.value} value={tipo.value}>
                {tipo.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="urgencia" className="block text-sm font-medium text-gray-700 mb-1">
            Urgencia
          </label>
          <select
            id="urgencia"
            name="urgencia"
            value={formData.urgencia}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {URGENCIAS.map(urgencia => (
              <option key={urgencia.value} value={urgencia.value}>
                {urgencia.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Descripción con editor enriquecido */}
      <div>
        <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-1">
          Descripción *
        </label>
        <RichTextEditor
          key="descripcion-editor"
          value={formData.descripcion}
          onChange={(html) => {
            setFormData(prev => ({ ...prev, descripcion: html }))
            if (errors.descripcion) {
              setErrors(prev => ({ ...prev, descripcion: undefined }))
            }
          }}
          placeholder="Describe en detalle tu solicitud o problema. Puedes insertar imágenes directamente en el texto."
          error={errors.descripcion}
          onImageUpload={handleImageUpload}
        />
        <p className="mt-1 text-xs text-gray-400">
          Puedes formatear el texto y agregar imágenes directamente en el editor usando el botón de imagen en la barra de herramientas.
        </p>
        <p className="mt-1 text-xs text-gray-500">
          💡 <strong>Tip:</strong> Si copias texto que menciona imágenes (ej: "image-20251121-193417.png"), 
          debes insertar las imágenes manualmente usando el botón de imagen del editor para que se incluyan en el ticket.
        </p>
      </div>

      {/* Contacto */}
      <div>
        <label htmlFor="contacto" className="block text-sm font-medium text-gray-700 mb-1">
          Email de contacto <span className="text-gray-400">(opcional)</span>
        </label>
        <input
          type="email"
          id="contacto"
          name="contacto"
          value={formData.contacto}
          onChange={handleChange}
          placeholder="tu@email.com"
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.contacto ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.contacto && <p className="mt-1 text-sm text-red-600">{errors.contacto}</p>}
      </div>

      {/* Fecha de vencimiento */}
      <div>
        <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
          Fecha de vencimiento <span className="text-gray-400">(opcional)</span>
        </label>
        <input
          type="date"
          id="dueDate"
          name="dueDate"
          value={formData.dueDate || ''}
          onChange={(e) => {
            setFormData(prev => ({ ...prev, dueDate: e.target.value || undefined }))
            if (errors.dueDate) {
              setErrors(prev => ({ ...prev, dueDate: undefined }))
            }
          }}
          min={new Date().toISOString().split('T')[0]}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.dueDate ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.dueDate && <p className="mt-1 text-sm text-red-600">{errors.dueDate}</p>}
        <p className="mt-1 text-xs text-gray-400">
          Fecha límite para resolver este ticket
        </p>
      </div>

      {/* Archivos/Imágenes */}
      <div>
        <label htmlFor="archivos" className="block text-sm font-medium text-gray-700 mb-1">
          Adjuntar imágenes <span className="text-gray-400">(opcional)</span>
        </label>
        <input
          type="file"
          id="archivos"
          name="archivos"
          accept="image/*"
          multiple
          onChange={(e) => {
            const files = Array.from(e.target.files || [])
            // Validar tamaño (máx 10MB por archivo)
            const maxSize = 10 * 1024 * 1024 // 10MB
            const invalidFiles = files.filter(file => file.size > maxSize)
            
            if (invalidFiles.length > 0) {
              setErrors(prev => ({
                ...prev,
                archivos: `Algunos archivos exceden el tamaño máximo de 10MB`
              }))
              return
            }
            
            setArchivos(files)
            if (errors.archivos) {
              setErrors(prev => ({ ...prev, archivos: undefined }))
            }
          }}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.archivos ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.archivos && <p className="mt-1 text-sm text-red-600">{errors.archivos}</p>}
        {archivos.length > 0 && (
          <div className="mt-2 space-y-1">
            <p className="text-xs text-gray-500">Archivos seleccionados:</p>
            {archivos.map((file, index) => (
              <div key={index} className="text-xs text-gray-600 flex items-center justify-between">
                <span className="truncate">{file.name}</span>
                <span className="ml-2 text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
            ))}
          </div>
        )}
        <p className="mt-1 text-xs text-gray-400">
          Máximo 10MB por archivo. Formatos soportados: JPG, PNG, GIF, WebP
        </p>
      </div>

      {/* Error general */}
      {submitError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{submitError}</p>
        </div>
      )}

      {/* Botón submit */}
      {!showAIAssistant ? (
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
            isSubmitting
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
          }`}
        >
          Continuar con Asistente de IA
        </button>
      ) : (
        <div className="space-y-4">
          <AIAssistant
            ticket={formData}
            onRefine={handleRefineTicket}
            onContinue={handleFinalSubmit}
          />
          <button
            type="button"
            onClick={() => setShowAIAssistant(false)}
            className="w-full py-2 px-4 text-gray-600 hover:text-gray-800"
          >
            ← Volver al formulario
          </button>
        </div>
      )}
    </form>
  )
}
