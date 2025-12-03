/**
 * Script de prueba para verificar la funcionalidad de adjuntar archivos a Jira
 * 
 * Uso: tsx scripts/test-attachment.ts <ISSUE_KEY> <FILE_PATH>
 * Ejemplo: tsx scripts/test-attachment.ts HIR-123 ./test-image.png
 */

import dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { join } from 'path'
import FormData from 'form-data'

dotenv.config({ path: join(process.cwd(), '.env.local') })

async function testAttachment(issueKey: string, filePath: string) {
  const host = process.env.JIRA_HOST
  const email = process.env.JIRA_EMAIL
  const apiToken = process.env.JIRA_API_TOKEN

  if (!host || !email || !apiToken) {
    console.error('❌ Configuración de Jira incompleta')
    console.error('Variables requeridas: JIRA_HOST, JIRA_EMAIL, JIRA_API_TOKEN')
    process.exit(1)
  }

  console.log(`📎 Probando adjuntar archivo a ticket: ${issueKey}`)
  console.log(`📁 Archivo: ${filePath}`)
  console.log(`🌐 Host: ${host}`)
  console.log(`👤 Email: ${email}`)

  try {
    // Leer archivo
    const fileBuffer = readFileSync(filePath)
    const fileName = filePath.split('/').pop() || 'test-file'
    
    console.log(`\n📊 Tamaño del archivo: ${fileBuffer.length} bytes`)

    // Crear FormData
    const formData = new FormData()
    formData.append('file', fileBuffer, {
      filename: fileName,
      contentType: 'image/png', // Ajustar según el tipo de archivo
      knownLength: fileBuffer.length
    })

    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64')
    const formHeaders = formData.getHeaders()

    console.log(`\n📤 Headers:`, {
      'Authorization': 'Basic ***',
      'X-Atlassian-Token': 'no-check',
      'Content-Type': formHeaders['content-type']
    })

    const url = `${host}/rest/api/3/issue/${issueKey}/attachments`
    console.log(`\n🔗 URL: ${url}`)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'X-Atlassian-Token': 'no-check',
        ...formHeaders
      },
      // @ts-ignore
      body: formData
    })

    console.log(`\n📥 Response Status: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`\n❌ Error:`, errorText)
      try {
        const errorData = JSON.parse(errorText)
        console.error(`Error detallado:`, JSON.stringify(errorData, null, 2))
      } catch {
        console.error(`Error raw:`, errorText)
      }
      process.exit(1)
    }

    const responseData = await response.json()
    console.log(`\n✅ Archivo adjuntado exitosamente!`)
    console.log(`📋 Respuesta:`, JSON.stringify(responseData, null, 2))
    
  } catch (error: any) {
    console.error(`\n❌ Error:`, error.message)
    console.error(`Stack:`, error.stack)
    process.exit(1)
  }
}

// Ejecutar
const issueKey = process.argv[2]
const filePath = process.argv[3]

if (!issueKey || !filePath) {
  console.error('Uso: tsx scripts/test-attachment.ts <ISSUE_KEY> <FILE_PATH>')
  console.error('Ejemplo: tsx scripts/test-attachment.ts HIR-123 ./test-image.png')
  process.exit(1)
}

testAttachment(issueKey, filePath)

