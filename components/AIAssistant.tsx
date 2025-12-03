'use client'

import { useState, useRef, useEffect } from 'react'
import { TicketRequest } from '@/lib/types'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface AIAssistantProps {
  ticket: TicketRequest
  onRefine: (refinedTicket: Partial<TicketRequest>) => void
  onContinue: () => void
}

export default function AIAssistant({ ticket, onRefine, onContinue }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [userResponse, setUserResponse] = useState('')
  const [showChat, setShowChat] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Analizar automáticamente cuando se muestra el componente
    if (showChat && messages.length === 0) {
      analyzeTicket()
    }
  }, [showChat])

  useEffect(() => {
    // Scroll al final cuando hay nuevos mensajes
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const analyzeTicket = async () => {
    setIsAnalyzing(true)
    
    try {
      // Extraer imágenes del HTML de la descripción (tanto data URLs como URLs de Imgur)
      const imagesFromDescription: string[] = []
      if (ticket.descripcion && typeof window !== 'undefined') {
        const parser = new DOMParser()
        const doc = parser.parseFromString(ticket.descripcion, 'text/html')
        const images = doc.querySelectorAll('img')
        images.forEach(img => {
          const src = img.getAttribute('src')
          if (src) {
            // Incluir tanto data URLs como URLs públicas de Imgur
            if (src.startsWith('data:') || src.includes('i.imgur.com') || src.includes('imgur.com')) {
              imagesFromDescription.push(src)
            }
          }
        })
      }
      
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket,
          conversationHistory: messages,
          images: imagesFromDescription // Enviar imágenes para análisis
        })
      })

      const analysis = await response.json()

      if (analysis.needsClarification && analysis.question) {
        // La IA tiene una pregunta
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: analysis.question
          }
        ])
      } else {
        // La solicitud está clara, mostrar sugerencias
        const suggestionMessages: Message[] = []
        
        if (analysis.interpretation) {
          suggestionMessages.push({
            role: 'assistant',
            content: `📋 **Interpretación:** ${analysis.interpretation}`
          })
        }

        if (analysis.suggestions) {
          const suggestions: string[] = []
          if (analysis.suggestions.tipo && analysis.suggestions.tipo !== ticket.tipo) {
            suggestions.push(`Tipo sugerido: ${analysis.suggestions.tipo}`)
          }
          if (analysis.suggestions.urgencia && analysis.suggestions.urgencia !== ticket.urgencia) {
            suggestions.push(`Urgencia sugerida: ${analysis.suggestions.urgencia}`)
          }
          if (analysis.suggestions.asunto && analysis.suggestions.asunto !== ticket.asunto) {
            suggestions.push(`Asunto mejorado: ${analysis.suggestions.asunto}`)
          }

          if (suggestions.length > 0) {
            suggestionMessages.push({
              role: 'assistant',
              content: `💡 **Sugerencias:**\n${suggestions.join('\n')}\n\n¿Quieres aplicar estas sugerencias?`
            })
          }
        }

        if (suggestionMessages.length > 0) {
          setMessages(prev => [...prev, ...suggestionMessages])
        } else {
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: '✅ Tu solicitud está completa y clara. Puedes proceder a enviarla.'
            }
          ])
        }
      }
    } catch (error) {
      console.error('Error al analizar:', error)
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: '⚠️ No pude analizar tu solicitud en este momento. Puedes continuar con el envío.'
        }
      ])
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSendResponse = async () => {
    if (!userResponse.trim()) return

    const responseText = userResponse.trim().toLowerCase()
    
    // Si el usuario dice "no", "nada", "listo", etc., continuar con el envío directamente
    if (responseText === 'no' || 
        responseText === 'nada' || 
        responseText === 'nada más' || 
        responseText === 'listo' ||
        responseText === 'no hay nada más' ||
        responseText === 'está bien' ||
        responseText === 'está completo' ||
        responseText === 'ok' ||
        responseText === 'okay' ||
        responseText === 'listo para enviar') {
      onContinue()
      return
    }

    // Agregar respuesta del usuario
    const newMessages: Message[] = [
      ...messages,
      {
        role: 'user',
        content: userResponse
      }
    ]
    setMessages(newMessages)
    setUserResponse('')

    // Analizar con la nueva información
    setIsAnalyzing(true)
    try {
      // Extraer imágenes del HTML de la descripción (tanto data URLs como URLs de Imgur)
      const imagesFromDescription: string[] = []
      if (ticket.descripcion && typeof window !== 'undefined') {
        const parser = new DOMParser()
        const doc = parser.parseFromString(ticket.descripcion, 'text/html')
        const images = doc.querySelectorAll('img')
        images.forEach(img => {
          const src = img.getAttribute('src')
          if (src) {
            // Incluir tanto data URLs como URLs públicas de Imgur
            if (src.startsWith('data:') || src.includes('i.imgur.com') || src.includes('imgur.com')) {
              imagesFromDescription.push(src)
            }
          }
        })
      }
      
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket,
          conversationHistory: newMessages,
          images: imagesFromDescription // Enviar imágenes para análisis
        })
      })

      const analysis = await response.json()

      if (analysis.needsClarification && analysis.question) {
        // La IA tiene otra pregunta - mantener la conversación activa
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: analysis.question
          }
        ])
      } else {
        // La IA ya tiene suficiente información
        const suggestionMessages: Message[] = []
        
        // Mostrar interpretación si existe (limpiar si contiene JSON)
        if (analysis.interpretation) {
          let interpretationText = analysis.interpretation
          // Si la interpretación contiene JSON, extraer solo el texto
          if (interpretationText.includes('{') && interpretationText.includes('}')) {
            try {
              const jsonMatch = interpretationText.match(/\{[\s\S]*\}/)
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0])
                interpretationText = parsed.interpretation || interpretationText.replace(/\{[\s\S]*\}/, '').trim()
              }
            } catch (e) {
              // Si falla el parse, remover el JSON manualmente
              interpretationText = interpretationText.replace(/\{[\s\S]*\}/, '').trim()
            }
          }
          
          if (interpretationText && interpretationText.length > 0) {
            suggestionMessages.push({
              role: 'assistant',
              content: `📋 **Entiendo que:** ${interpretationText}`
            })
          }
        }

        // Aplicar sugerencias automáticamente si existen
        if (analysis.suggestions) {
          const suggestions: Partial<TicketRequest> = {}
          let hasSuggestions = false
          
          // Validar que el tipo sugerido sea válido antes de aplicarlo
          const tiposValidos = ['Bug', 'Task', 'Support']
          if (analysis.suggestions.tipo && tiposValidos.includes(analysis.suggestions.tipo) && analysis.suggestions.tipo !== ticket.tipo) {
            suggestions.tipo = analysis.suggestions.tipo as any
            hasSuggestions = true
          } else if (analysis.suggestions.tipo && !tiposValidos.includes(analysis.suggestions.tipo)) {
            console.warn(`⚠️ Tipo sugerido inválido: ${analysis.suggestions.tipo}. Tipos válidos: ${tiposValidos.join(', ')}`)
          }
          
          // Validar que la urgencia sugerida sea válida antes de aplicarla
          const urgenciasValidas = ['Low', 'Medium', 'High']
          if (analysis.suggestions.urgencia && urgenciasValidas.includes(analysis.suggestions.urgencia) && analysis.suggestions.urgencia !== ticket.urgencia) {
            suggestions.urgencia = analysis.suggestions.urgencia as any
            hasSuggestions = true
          } else if (analysis.suggestions.urgencia && !urgenciasValidas.includes(analysis.suggestions.urgencia)) {
            console.warn(`⚠️ Urgencia sugerida inválida: ${analysis.suggestions.urgencia}. Urgencias válidas: ${urgenciasValidas.join(', ')}`)
          }
          // Solo aplicar sugerencia de asunto si el asunto actual está vacío o es muy genérico
          // El asunto es opcional, así que solo lo sugerimos si realmente falta o puede mejorarse mucho
          if (analysis.suggestions.asunto && 
              analysis.suggestions.asunto !== ticket.asunto &&
              (!ticket.asunto || ticket.asunto.trim() === '' || ticket.asunto.length < 10)) {
            suggestions.asunto = analysis.suggestions.asunto
            hasSuggestions = true
          }
          if (analysis.suggestions.descripcion && analysis.suggestions.descripcion !== ticket.descripcion) {
            // Preservar imágenes del HTML original al aplicar sugerencias
            let newDescription = analysis.suggestions.descripcion
            
            // Extraer imágenes del HTML original (tanto data URLs como URLs de Imgur)
            // IMPORTANTE: Usar Set para evitar duplicados desde el inicio
            const originalImagesSet = new Set<string>()
            if (ticket.descripcion && typeof window !== 'undefined') {
              const parser = new DOMParser()
              const doc = parser.parseFromString(ticket.descripcion, 'text/html')
              const images = doc.querySelectorAll('img')
              images.forEach(img => {
                const src = img.getAttribute('src')
                if (src) {
                  // Incluir tanto data URLs como URLs de Imgur
                  if (src.startsWith('data:image') || src.includes('i.imgur.com') || src.includes('imgur.com')) {
                    originalImagesSet.add(src)
                  }
                }
              })
            }
            const originalImages = Array.from(originalImagesSet)
            
            console.log(`📎 Imágenes encontradas en descripción original: ${originalImages.length}`, originalImages)
            
            // Verificar si hay referencias a imágenes en el texto original
            const imageReferences = ticket.descripcion.match(/image-[\w-]+\.(png|jpg|jpeg|gif|webp)/gi) || []
            if (imageReferences.length > 0 && originalImages.length === 0) {
              console.log(`ℹ️ Se encontraron referencias a imágenes en el texto: ${imageReferences.join(', ')}`)
              console.log(`ℹ️ Nota: Estas son solo nombres de archivo. Las imágenes deben insertarse usando el botón de imagen del editor.`)
            }
            
            // Si hay imágenes originales y la nueva descripción no las tiene, agregarlas
            const hasImagesInNew = newDescription.includes('data:image') || 
                                   newDescription.includes('i.imgur.com') || 
                                   newDescription.includes('imgur.com')
            
            if (originalImages.length > 0 && !hasImagesInNew) {
              console.log(`📎 Preservando ${originalImages.length} imagen(es) (incluyendo URLs de Imgur) al aplicar sugerencia de descripción`)
              
              // Si la nueva descripción es texto plano, convertirla a HTML
              if (!newDescription.includes('<') && !newDescription.includes('>')) {
                newDescription = newDescription.split('\n').map((line: string) => {
                  const trimmed = line.trim()
                  return trimmed ? `<p>${trimmed}</p>` : ''
                }).filter((p: string) => p).join('')
              }
              
              // Agregar las imágenes al final (ya deduplicadas en originalImages)
              const imagesHtml = originalImages.map((src, index) => {
                return `<p><img src="${src}" alt="Imagen ${index + 1}" /></p>`
              }).join('')
              
              newDescription = newDescription + imagesHtml
              console.log(`✅ Imágenes preservadas en nueva descripción`)
            } else if (originalImages.length > 0 && hasImagesInNew) {
              console.log(`ℹ️ La nueva descripción ya contiene imágenes, deduplicando...`)
              
              // IMPORTANTE: Deduplicar imágenes en la nueva descripción
              // La IA puede haber duplicado las imágenes en su respuesta
              if (typeof window !== 'undefined') {
                const parser = new DOMParser()
                const doc = parser.parseFromString(newDescription, 'text/html')
                const images = doc.querySelectorAll('img')
                const seenSrcs = new Set<string>()
                
                images.forEach(img => {
                  const src = img.getAttribute('src')
                  if (src) {
                    if (seenSrcs.has(src)) {
                      // Imagen duplicada, eliminarla
                      img.remove()
                      console.log(`🗑️ Eliminando imagen duplicada: ${src.substring(0, 50)}...`)
                    } else {
                      seenSrcs.add(src)
                    }
                  }
                })
                
                // Reconstruir el HTML sin duplicados
                newDescription = doc.body.innerHTML
                console.log(`✅ Imágenes deduplicadas. Total único: ${seenSrcs.size}`)
              }
            }
            
            suggestions.descripcion = newDescription
            hasSuggestions = true
          }
          if (analysis.suggestions.dueDate && analysis.suggestions.dueDate !== ticket.dueDate) {
            suggestions.dueDate = analysis.suggestions.dueDate
            hasSuggestions = true
          }

          if (hasSuggestions) {
            // Aplicar sugerencias automáticamente
            onRefine(suggestions)
            
            const suggestionList: string[] = []
            if (suggestions.tipo) suggestionList.push(`• Tipo: ${suggestions.tipo}`)
            if (suggestions.urgencia) suggestionList.push(`• Urgencia: ${suggestions.urgencia}`)
            if (suggestions.asunto) suggestionList.push(`• Asunto mejorado`)
            if (suggestions.descripcion) suggestionList.push(`• Descripción mejorada`)
            if (suggestions.dueDate) {
              const date = new Date(suggestions.dueDate)
              suggestionList.push(`• Fecha de vencimiento: ${date.toLocaleDateString('es-ES')}`)
            }
            
            suggestionMessages.push({
              role: 'assistant',
              content: `✅ **He actualizado tu ticket con:**\n${suggestionList.join('\n')}\n\n¿Hay algo más que quieras agregar o modificar antes de enviarlo?`
            })
          } else {
            // No hay sugerencias pero la solicitud está completa
            suggestionMessages.push({
              role: 'assistant',
              content: '✅ Perfecto, tu solicitud está completa y clara. ¿Hay algo más que quieras agregar o modificar antes de enviarla?'
            })
          }
        } else {
          // No hay sugerencias
          suggestionMessages.push({
            role: 'assistant',
            content: '✅ Gracias por la información. Tu solicitud está completa. ¿Hay algo más que quieras agregar o modificar antes de enviarla?'
          })
        }

        setMessages(prev => [...prev, ...suggestionMessages])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleApplySuggestions = async () => {
    // Obtener el análisis más reciente para aplicar sugerencias
    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket,
          conversationHistory: messages
        })
      })

      const analysis = await response.json()
      
      if (analysis.suggestions) {
        const suggestions: Partial<TicketRequest> = {}
        
        // Validar tipos y urgencias antes de aplicar
        const tiposValidos = ['Bug', 'Task', 'Support']
        const urgenciasValidas = ['Low', 'Medium', 'High']
        
        if (analysis.suggestions.tipo && tiposValidos.includes(analysis.suggestions.tipo)) {
          suggestions.tipo = analysis.suggestions.tipo as any
        } else if (analysis.suggestions.tipo) {
          console.warn(`⚠️ Tipo sugerido inválido: ${analysis.suggestions.tipo}. Tipos válidos: ${tiposValidos.join(', ')}`)
        }
        
        if (analysis.suggestions.urgencia && urgenciasValidas.includes(analysis.suggestions.urgencia)) {
          suggestions.urgencia = analysis.suggestions.urgencia as any
        } else if (analysis.suggestions.urgencia) {
          console.warn(`⚠️ Urgencia sugerida inválida: ${analysis.suggestions.urgencia}. Urgencias válidas: ${urgenciasValidas.join(', ')}`)
        }
        if (analysis.suggestions.asunto) suggestions.asunto = analysis.suggestions.asunto
        
        if (analysis.suggestions.descripcion) {
          // Preservar imágenes del HTML original al aplicar sugerencias manualmente
          let newDescription = analysis.suggestions.descripcion
          
          // Extraer imágenes del HTML original (tanto data URLs como URLs de Imgur)
          const originalImages: string[] = []
          if (ticket.descripcion && typeof window !== 'undefined') {
            const parser = new DOMParser()
            const doc = parser.parseFromString(ticket.descripcion, 'text/html')
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
          
          // Verificar si la nueva descripción ya tiene imágenes
          const hasImagesInNew = newDescription.includes('data:image') || 
                                newDescription.includes('i.imgur.com') || 
                                newDescription.includes('imgur.com')
          
          // Si hay imágenes originales y la nueva descripción no las tiene, agregarlas
          if (originalImages.length > 0 && !hasImagesInNew) {
            console.log(`📎 Preservando ${originalImages.length} imagen(es) (incluyendo URLs de Imgur) al aplicar sugerencia manual`)
            
            // Si la nueva descripción es texto plano, convertirla a HTML
            if (!newDescription.includes('<') && !newDescription.includes('>')) {
              newDescription = newDescription.split('\n').map((line: string) => {
                const trimmed = line.trim()
                return trimmed ? `<p>${trimmed}</p>` : ''
              }).filter((p: string) => p).join('')
            }
            
            // Agregar las imágenes al final
            const imagesHtml = originalImages.map((src: string, index: number) => {
              return `<p><img src="${src}" alt="Imagen ${index + 1}" /></p>`
            }).join('')
            
            newDescription = newDescription + imagesHtml
          }
          
          suggestions.descripcion = newDescription
        }
        
        if (analysis.suggestions.dueDate) suggestions.dueDate = analysis.suggestions.dueDate

        if (Object.keys(suggestions).length > 0) {
          onRefine(suggestions)
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: '✅ Sugerencias aplicadas. Revisa el formulario y continúa cuando estés listo.'
            }
          ])
        }
      }
    } catch (error) {
      console.error('Error al aplicar sugerencias:', error)
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: '⚠️ Error al aplicar sugerencias. Puedes continuar sin cambios.'
        }
      ])
    }
  }

  const lastMessage = messages[messages.length - 1]
  
  // Determinar si la IA está esperando una respuesta del usuario para clarificar
  // NO cuenta como pregunta de clarificación si pregunta "¿Hay algo más?" después de aplicar sugerencias
  const isWaitingForClarification = lastMessage?.role === 'assistant' && 
    (lastMessage.content.includes('?') || lastMessage.content.includes('¿')) &&
    !lastMessage.content.includes('¿Hay algo más') &&
    !lastMessage.content.includes('¿Quieres aplicar') &&
    !lastMessage.content.includes('✅') &&
    !lastMessage.content.includes('actualizado')
  
  // La IA pregunta si quiere agregar algo más (opcional, no bloquea el envío)
  const isAskingIfWantToAddMore = lastMessage?.role === 'assistant' && 
    lastMessage.content.includes('¿Hay algo más')
  
  // Permitir continuar refinando si hay mensajes pero no se está esperando respuesta específica
  const canContinueRefining = messages.length > 0 && 
    !isWaitingForClarification && 
    !isAnalyzing &&
    lastMessage?.role === 'assistant' &&
    (lastMessage.content.includes('✅') || lastMessage.content.includes('actualizado'))

  if (!showChat) {
    return (
      <button
        onClick={() => setShowChat(true)}
        className="w-full py-2 px-4 bg-purple-50 text-purple-700 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors"
      >
        🤖 Mostrar Asistente de IA
      </button>
    )
  }

  return (
    <div className="border border-purple-200 rounded-lg bg-white">
      {/* Header */}
      <div className="bg-purple-50 px-4 py-3 border-b border-purple-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <h3 className="font-semibold text-purple-900">Asistente de IA</h3>
        </div>
        <button
          onClick={() => setShowChat(false)}
          className="text-purple-600 hover:text-purple-800"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="max-h-96 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && isAnalyzing && (
          <div className="flex items-center gap-2 text-gray-500">
            <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full"></div>
            <span>Analizando tu solicitud...</span>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <p className="whitespace-pre-wrap text-sm">{message.content}</p>
            </div>
          </div>
        ))}

        {isAnalyzing && messages.length > 0 && (
          <div className="flex items-center gap-2 text-gray-500">
            <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full"></div>
            <span>Pensando...</span>
          </div>
        )}

        {/* Botón para continuar refinando */}
        {canContinueRefining && (
          <div className="flex justify-center pt-2">
            <button
              onClick={() => {
                setUserResponse('')
                analyzeTicket()
              }}
              className="px-4 py-2 text-sm bg-purple-50 text-purple-700 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors"
            >
              🔄 Continuar refinando
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input - Solo mostrar si la IA está esperando clarificación, no si pregunta si quiere agregar algo más */}
      {isWaitingForClarification && (
        <div className="border-t border-purple-200 p-4">
          <div className="flex gap-2 items-end">
            <textarea
              value={userResponse}
              onChange={(e) => setUserResponse(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  if (userResponse.trim()) {
                    handleSendResponse()
                  }
                }
              }}
              placeholder="Escribe tu respuesta... (Shift+Enter para nueva línea)"
              rows={3}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            />
            <button
              onClick={handleSendResponse}
              disabled={!userResponse.trim() || isAnalyzing}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed h-fit"
            >
              Enviar
            </button>
          </div>
        </div>
      )}

      {/* Input opcional - Si pregunta si quiere agregar algo más */}
      {isAskingIfWantToAddMore && (
        <div className="border-t border-purple-200 p-4">
          <div className="flex gap-2 mb-2 items-end">
            <textarea
              value={userResponse}
              onChange={(e) => setUserResponse(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && userResponse.trim()) {
                  e.preventDefault()
                  handleSendResponse()
                }
              }}
              placeholder="Escribe algo más o deja vacío para continuar... (Shift+Enter para nueva línea)"
              rows={3}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            />
            <button
              onClick={handleSendResponse}
              disabled={!userResponse.trim() || isAnalyzing}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed h-fit"
            >
              Agregar
            </button>
          </div>
          <button
            onClick={() => {
              setIsSubmitting(true)
              onContinue()
            }}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            ✅ No, enviar ticket ahora
          </button>
        </div>
      )}

      {/* Actions */}
      {lastMessage?.role === 'assistant' && lastMessage.content.includes('¿Quieres aplicar') && (
        <div className="border-t border-purple-200 p-4 flex gap-2">
          <button
            onClick={handleApplySuggestions}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            ✅ Aplicar Sugerencias
          </button>
          <button
            onClick={() => {
              setIsSubmitting(true)
              onContinue()
            }}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Continuar Sin Cambios
          </button>
        </div>
      )}

      {/* Botón para continuar cuando la conversación está completa (sin preguntas activas) */}
      {lastMessage?.role === 'assistant' && 
       !isWaitingForClarification && 
       !isAskingIfWantToAddMore &&
       !lastMessage.content.includes('¿Quieres aplicar') && (
        <div className="border-t border-purple-200 p-4 space-y-2">
          <button
            onClick={() => {
              setIsSubmitting(true)
              onContinue()
            }}
            disabled={isSubmitting}
            className={`w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              isSubmitting 
                ? 'bg-blue-400 cursor-not-allowed' 
                : 'hover:bg-blue-700'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Enviando ticket...</span>
              </>
            ) : (
              <span>✅ Enviar Ticket</span>
            )}
          </button>
          {canContinueRefining && (
            <button
              onClick={() => {
                setUserResponse('')
                analyzeTicket()
              }}
              className="w-full px-4 py-2 bg-purple-50 text-purple-700 rounded-lg border border-purple-200 hover:bg-purple-100 text-sm"
            >
              💬 Continuar conversando con la IA
            </button>
          )}
        </div>
      )}
    </div>
  )
}

