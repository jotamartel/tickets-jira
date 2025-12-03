import { NextRequest, NextResponse } from 'next/server'

/**
 * API route para subir imágenes a Imgur
 * Retorna una URL pública que se puede usar en Jira
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó ningún archivo' },
        { status: 400 }
      )
    }
    
    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'El archivo debe ser una imagen' },
        { status: 400 }
      )
    }
    
    // Validar tamaño (máximo 10MB para Imgur)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'La imagen es demasiado grande. Máximo 10MB' },
        { status: 400 }
      )
    }
    
    // Convertir a base64 para Imgur
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')
    
    // Subir a Imgur usando API
    // Usar Client ID de variable de entorno o uno público por defecto
    const imgurClientId = process.env.IMGUR_CLIENT_ID || '546c25a59c58ad7' // Client ID público por defecto
    
    const imgurResponse = await fetch('https://api.imgur.com/3/image', {
      method: 'POST',
      headers: {
        'Authorization': `Client-ID ${imgurClientId}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image: base64,
        type: 'base64',
        name: file.name
      })
    })
    
    if (!imgurResponse.ok) {
      const errorData = await imgurResponse.json().catch(() => ({}))
      console.error('Error subiendo a Imgur:', errorData)
      
      // Si falla Imgur, usar data URL como fallback
      console.warn('⚠️ Fallando a data URL como respaldo')
      const dataUrl = `data:${file.type};base64,${base64}`
      return NextResponse.json({
        url: dataUrl,
        filename: file.name,
        size: file.size,
        type: file.type,
        isPublicUrl: false
      })
    }
    
    const imgurData = await imgurResponse.json()
    
    if (imgurData.success && imgurData.data?.link) {
      console.log(`✅ Imagen subida a Imgur: ${imgurData.data.link}`)
      return NextResponse.json({
        url: imgurData.data.link,
        filename: file.name,
        size: file.size,
        type: file.type,
        isPublicUrl: true,
        deleteHash: imgurData.data.deletehash // Para poder eliminar después si es necesario
      })
    } else {
      throw new Error('Imgur no retornó una URL válida')
    }
  } catch (error: any) {
    console.error('Error subiendo imagen:', error)
    
    // Fallback: intentar convertir a data URL
    try {
      const formData = await request.formData()
      const file = formData.get('file') as File
      if (file) {
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const base64 = buffer.toString('base64')
        const dataUrl = `data:${file.type};base64,${base64}`
        
        return NextResponse.json({
          url: dataUrl,
          filename: file.name,
          size: file.size,
          type: file.type,
          isPublicUrl: false,
          warning: 'Se usó data URL como respaldo'
        })
      }
    } catch (fallbackError) {
      // Ignorar error del fallback
    }
    
    return NextResponse.json(
      { error: 'Error al procesar la imagen: ' + (error.message || 'Error desconocido') },
      { status: 500 }
    )
  }
}

