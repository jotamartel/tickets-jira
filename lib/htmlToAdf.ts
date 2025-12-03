/**
 * Convierte HTML a formato ADF (Atlassian Document Format) para Jira
 */

import { parse } from 'node-html-parser'

interface ADFNode {
  type: string
  version?: number
  content?: ADFNode[]
  text?: string
  marks?: Array<{ type: string; attrs?: Record<string, any> }>
  attrs?: Record<string, any>
}

/**
 * Extrae imágenes del HTML y las convierte a formato ADF
 */
export function extractImagesFromHtml(html: string): string[] {
  const root = parse(html)
  const images = root.querySelectorAll('img')
  const imageUrls: string[] = []
  
  images.forEach(img => {
    const src = img.getAttribute('src')
    if (src) {
      imageUrls.push(src)
    }
  })
  
  return imageUrls
}

/**
 * Convierte HTML a formato ADF
 */
export function htmlToAdf(html: string): ADFNode {
  const root = parse(html)
  const body = root.querySelector('body') || root
  
  // IMPORTANTE: Deduplicar imágenes antes de procesar
  // Extraer todas las URLs de imágenes y eliminar duplicados del HTML
  const allImages = body.querySelectorAll('img')
  const seenUrls = new Set<string>()
  
  allImages.forEach(img => {
    const src = img.getAttribute('src')
    if (src) {
      if (seenUrls.has(src)) {
        // Esta imagen es duplicada, eliminarla del DOM
        img.remove()
      } else {
        seenUrls.add(src)
      }
    }
  })
  
  const content: ADFNode[] = []
  
  // Procesar cada nodo hijo del body
  body.childNodes.forEach(node => {
    const adfNode = processNode(node)
    if (adfNode) {
      content.push(adfNode)
    }
  })
  
  // Si no hay contenido, crear un párrafo vacío
  if (content.length === 0) {
    content.push({
      type: 'paragraph',
      content: []
    })
  }
  
  // Agregar un resumen de imágenes al final si hay URLs de Imgur
  const imgurUrlsRaw = extractImagesFromHtml(html).filter(url => url.includes('imgur.com'))
  // Eliminar URLs duplicadas
  const imgurUrls = Array.from(new Set(imgurUrlsRaw))
  
  if (imgurUrls.length > 0) {
    // Agregar separador
    content.push({
      type: 'paragraph',
      content: []
    })
    content.push({
      type: 'paragraph',
      content: [{
        type: 'text',
        text: '─────────────────────────────',
        marks: []
      }]
    })
    content.push({
      type: 'paragraph',
      content: [{
        type: 'text',
        text: `📎 Imágenes adjuntas (${imgurUrls.length}):`,
        marks: [{ type: 'strong' }]
      }]
    })
    
    // Agregar lista numerada de URLs únicas
    const listItems: ADFNode[] = imgurUrls.map((url, index) => ({
      type: 'listItem',
      content: [{
        type: 'paragraph',
        content: [{
          type: 'text',
          text: url,
          marks: [{
            type: 'link',
            attrs: { href: url }
          }]
        }]
      }]
    }))
    
    content.push({
      type: 'orderedList',
      content: listItems
    })
  }
  
  return {
    type: 'doc',
    version: 1,
    content
  }
}

function processNode(node: any): ADFNode | null {
  // node-html-parser usa diferentes tipos de nodos
  if (node.nodeType === 3) { // TEXT_NODE
    const text = node.text
    if (!text || !text.trim()) return null
    
    return {
      type: 'text',
      text: text
    }
  }
  
  if (node.nodeType !== 1) { // ELEMENT_NODE
    return null
  }
  
  const element = node
  const tagName = element.tagName?.toLowerCase() || ''
  
  // Procesar <br> como salto de línea
  if (tagName === 'br') {
    return {
      type: 'hardBreak'
    }
  }
  
  // Procesar imágenes
  if (tagName === 'img') {
    const src = element.getAttribute('src')
    const alt = element.getAttribute('alt') || ''
    
    if (src) {
      // Si es una data URL, las imágenes se adjuntan como archivos
      // En ADF, creamos un párrafo que indica que hay una imagen adjunta
      if (src.startsWith('data:')) {
        const imageInfo = alt || 'imagen adjunta'
        return {
          type: 'paragraph',
          content: [{
            type: 'text',
            text: `📎 ${imageInfo} (ver imágenes adjuntas en la sección de attachments)`,
            marks: [{ type: 'strong' }]
          }]
        }
      }
      
      // Si es una URL externa (Imgur, etc.), crear un enlace clickeable prominente
      // Formato mejorado para mejor visualización en Jira
      const imageLabel = alt || 'Imagen'
      return {
        type: 'paragraph',
        content: [{
          type: 'text',
          text: `🖼️ ${imageLabel}: `,
          marks: [{
            type: 'strong'
          }]
        }, {
          type: 'text',
          text: src,
          marks: [{
            type: 'link',
            attrs: {
              href: src
            }
          }, {
            type: 'code'
          }]
        }]
      }
    }
  }
  
  // Procesar párrafos
  if (tagName === 'p') {
    const paragraphContent: ADFNode[] = []
    
    element.childNodes.forEach((child: any) => {
      const childNode = processNode(child)
      if (childNode) {
        if (childNode.type === 'text') {
          paragraphContent.push(childNode)
        } else if (childNode.type === 'paragraph' && childNode.content) {
          // Si el hijo es un párrafo, agregar su contenido
          paragraphContent.push(...childNode.content)
        } else {
          paragraphContent.push(childNode)
        }
      }
    })
    
    // Si el párrafo está vacío, crear uno con espacio
    if (paragraphContent.length === 0) {
      return {
        type: 'paragraph',
        content: []
      }
    }
    
    return {
      type: 'paragraph',
      content: paragraphContent
    }
  }
  
  // Procesar texto con formato
  if (tagName === 'strong' || tagName === 'b') {
    const textContent = element.text?.trim()
    if (!textContent) return null
    
    return {
      type: 'text',
      text: textContent,
      marks: [{ type: 'strong' }]
    }
  }
  
  if (tagName === 'em' || tagName === 'i') {
    const textContent = element.text?.trim()
    if (!textContent) return null
    
    return {
      type: 'text',
      text: textContent,
      marks: [{ type: 'em' }]
    }
  }
  
  if (tagName === 'u') {
    const textContent = element.text?.trim()
    if (!textContent) return null
    
    return {
      type: 'text',
      text: textContent,
      marks: [{ type: 'underline' }]
    }
  }
  
  // Procesar listas
  if (tagName === 'ul' || tagName === 'ol') {
    const listContent: ADFNode[] = []
    
    element.querySelectorAll('li').forEach((li: any) => {
      const liContent: ADFNode[] = []
      
      li.childNodes.forEach((child: any) => {
        const childNode = processNode(child)
        if (childNode) {
          if (childNode.type === 'text') {
            liContent.push(childNode)
          } else if (childNode.type === 'paragraph' && childNode.content) {
            liContent.push(...childNode.content)
          } else {
            liContent.push(childNode)
          }
        }
      })
      
      if (liContent.length > 0) {
        listContent.push({
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: liContent.length > 0 ? liContent : [{ type: 'text', text: '' }]
          }]
        })
      }
    })
    
    if (listContent.length > 0) {
      return {
        type: tagName === 'ul' ? 'bulletList' : 'orderedList',
        content: listContent
      }
    }
  }
  
  // Procesar encabezados
  if (tagName.match(/^h[1-6]$/)) {
    const level = parseInt(tagName[1])
    const textContent = element.text?.trim()
    
    if (textContent) {
      return {
        type: 'heading',
        attrs: { level: Math.min(level, 6) },
        content: [{ type: 'text', text: textContent }]
      }
    }
  }
  
  // Procesar enlaces
  if (tagName === 'a') {
    const href = element.getAttribute('href')
    const textContent = element.text?.trim() || href || ''
    
    if (href) {
      return {
        type: 'text',
        text: textContent,
        marks: [{
          type: 'link',
          attrs: { href }
        }]
      }
    }
  }
  
  // Para otros elementos, procesar recursivamente
  const children: ADFNode[] = []
  element.childNodes.forEach((child: any) => {
    const childNode = processNode(child)
    if (childNode) {
      children.push(childNode)
    }
  })
  
  if (children.length > 0) {
    // Si hay hijos, crear un párrafo con ellos
    return {
      type: 'paragraph',
      content: children
    }
  }
  
  return null
}

/**
 * Extrae imágenes como File objects desde data URLs en el HTML
 * Esta función solo funciona en el navegador (usa Blob y File)
 */
export function extractImageFilesFromHtml(html: string): File[] {
  // Solo ejecutar en el navegador
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    console.warn('⚠️ extractImageFilesFromHtml: Solo funciona en el navegador')
    return []
  }
  
  console.log('📎 extractImageFilesFromHtml: Iniciando extracción...')
  console.log('📎 HTML recibido (primeros 200 chars):', html.substring(0, 200))
  console.log('📎 HTML contiene data:image?', html.includes('data:image'))
  
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const images = doc.querySelectorAll('img')
  console.log(`📎 Imágenes encontradas en HTML: ${images.length}`)
  
  const files: File[] = []
  
  images.forEach((img, index) => {
    const src = img.getAttribute('src')
    console.log(`📎 Imagen ${index + 1}: src = ${src ? src.substring(0, 50) + '...' : 'null'}`)
    
    if (src && src.startsWith('data:')) {
      console.log(`📎 Procesando imagen ${index + 1} con data URL...`)
      try {
        // Parsear data URL: data:image/png;base64,... o data:image/jpeg;base64,...
        const matches = src.match(/^data:image\/(\w+);base64,(.+)$/)
        if (matches) {
          const mimeType = matches[1]
          const base64Data = matches[2]
          console.log(`📎 Tipo MIME: ${mimeType}, Tamaño base64: ${base64Data.length} caracteres`)
          
          // Convertir base64 a blob
          const byteCharacters = atob(base64Data)
          const byteNumbers = new Array(byteCharacters.length)
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i)
          }
          const byteArray = new Uint8Array(byteNumbers)
          const blob = new Blob([byteArray], { type: `image/${mimeType}` })
          
          // Crear File object
          const fileName = `image-${index + 1}.${mimeType}`
          const file = new File([blob], fileName, { type: `image/${mimeType}` })
          console.log(`✅ Imagen ${index + 1} convertida a File: ${file.name} (${file.size} bytes)`)
          files.push(file)
        } else {
          console.warn(`⚠️ Imagen ${index + 1}: No coincide con el patrón esperado de data URL`)
          console.warn(`   Patrón esperado: data:image/[tipo];base64,[datos]`)
          console.warn(`   Recibido (primeros 100 chars): ${src.substring(0, 100)}`)
        }
      } catch (error) {
        console.error(`❌ Error extrayendo imagen ${index + 1}:`, error)
      }
    } else if (src) {
      console.log(`ℹ️ Imagen ${index + 1}: No es data URL, es URL externa (${src.substring(0, 50)})`)
    } else {
      console.warn(`⚠️ Imagen ${index + 1}: No tiene atributo src`)
    }
  })
  
  console.log(`📎 Total de archivos File creados: ${files.length}`)
  return files
}

