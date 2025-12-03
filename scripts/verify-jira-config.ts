/**
 * Script para verificar la configuración de Jira
 * Verifica que los issue types y prioridades existan en tu instancia de Jira
 * 
 * Uso: npm run verify-jira
 * 
 * Nota: Asegúrate de tener un archivo .env.local en la raíz del proyecto
 */

// Cargar variables de entorno desde .env.local
import { config } from 'dotenv'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Cargar .env.local específicamente
config({ path: resolve(__dirname, '../.env.local') })

interface JiraIssueType {
  id: string
  name: string
  description?: string
  iconUrl?: string
}

interface JiraPriority {
  id: string
  name: string
  iconUrl?: string
}

interface JiraProject {
  id: string
  key: string
  name: string
  issueTypes?: JiraIssueType[]
}

async function verifyJiraConfig() {
  const host = process.env.JIRA_HOST
  const email = process.env.JIRA_EMAIL
  const apiToken = process.env.JIRA_API_TOKEN

  if (!host || !email || !apiToken) {
    console.error('❌ Error: Variables de entorno faltantes')
    console.log('\nAsegúrate de tener configurado .env.local con:')
    console.log('  - JIRA_HOST')
    console.log('  - JIRA_EMAIL')
    console.log('  - JIRA_API_TOKEN')
    process.exit(1)
  }

  console.log('🔍 Verificando configuración de Jira...\n')
  console.log(`Host: ${host}`)
  console.log(`Email: ${email}\n`)

  const auth = Buffer.from(`${email}:${apiToken}`).toString('base64')

  try {
    // 1. Verificar conexión básica
    console.log('1️⃣ Verificando conexión...')
    const myselfResponse = await fetch(`${host}/rest/api/3/myself`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    })

    if (!myselfResponse.ok) {
      throw new Error(`Error de autenticación: ${myselfResponse.status}`)
    }

    const myself = await myselfResponse.json()
    console.log(`   ✅ Conectado como: ${myself.displayName} (${myself.emailAddress})\n`)

    // 2. Obtener issue types disponibles
    console.log('2️⃣ Verificando Issue Types disponibles...')
    const issueTypesResponse = await fetch(`${host}/rest/api/3/issuetype`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    })

    if (!issueTypesResponse.ok) {
      throw new Error(`Error obteniendo issue types: ${issueTypesResponse.status}`)
    }

    const issueTypes: JiraIssueType[] = await issueTypesResponse.json()
    const issueTypeNames = issueTypes.map(it => it.name)
    
    console.log(`   📋 Issue Types encontrados (${issueTypes.length}):`)
    issueTypes.forEach(it => {
      console.log(`      - ${it.name} (ID: ${it.id})`)
    })

    // Verificar que los tipos requeridos existan
    const requiredTypes = ['Bug', 'Task']
    const missingTypes = requiredTypes.filter(type => !issueTypeNames.includes(type))
    
    if (missingTypes.length > 0) {
      console.log(`\n   ⚠️  ADVERTENCIA: Los siguientes tipos no existen en tu Jira:`)
      missingTypes.forEach(type => console.log(`      - ${type}`))
      console.log(`   💡 Sugerencia: Crea estos tipos en Jira o ajusta el mapeo en lib/jira.ts`)
    } else {
      console.log(`\n   ✅ Todos los tipos requeridos existen`)
    }

    // 3. Obtener prioridades disponibles
    console.log('\n3️⃣ Verificando Prioridades disponibles...')
    const prioritiesResponse = await fetch(`${host}/rest/api/3/priority`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    })

    if (!prioritiesResponse.ok) {
      throw new Error(`Error obteniendo prioridades: ${prioritiesResponse.status}`)
    }

    const priorities: JiraPriority[] = await prioritiesResponse.json()
    const priorityNames = priorities.map(p => p.name)
    
    console.log(`   🎯 Prioridades encontradas (${priorities.length}):`)
    priorities.forEach(p => {
      console.log(`      - ${p.name} (ID: ${p.id})`)
    })

    // Verificar que las prioridades requeridas existan
    const requiredPriorities = ['Low', 'Medium', 'High']
    const missingPriorities = requiredPriorities.filter(
      priority => !priorityNames.includes(priority)
    )
    
    if (missingPriorities.length > 0) {
      console.log(`\n   ⚠️  ADVERTENCIA: Las siguientes prioridades no existen en tu Jira:`)
      missingPriorities.forEach(priority => console.log(`      - ${priority}`))
      console.log(`\n   💡 Prioridades disponibles que podrías usar:`)
      priorityNames.forEach(name => console.log(`      - ${name}`))
      console.log(`\n   📝 Ajusta el mapeo en lib/jira.ts → mapUrgenciaToJira()`)
    } else {
      console.log(`\n   ✅ Todas las prioridades requeridas existen`)
    }

    // 4. Verificar proyectos configurados
    console.log('\n4️⃣ Verificando proyectos configurados...')
    const { JIRA_PROJECTS } = await import('../config/projects')
    
    for (const [clienteId, project] of Object.entries(JIRA_PROJECTS)) {
      console.log(`\n   Verificando proyecto: ${project.name} (${project.key})`)
      
      const projectResponse = await fetch(
        `${host}/rest/api/3/project/${project.key}`,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json'
          }
        }
      )

      if (!projectResponse.ok) {
        console.log(`      ❌ Proyecto no encontrado o sin acceso`)
        console.log(`      💡 Verifica que el proyecto key "${project.key}" exista y tengas acceso`)
      } else {
        const projectData: JiraProject = await projectResponse.json()
        console.log(`      ✅ Proyecto encontrado: ${projectData.name}`)
        
        // Verificar issue types del proyecto
        const projectIssueTypes = projectData.issueTypes || []
        if (projectIssueTypes.length > 0) {
          console.log(`      📋 Issue Types del proyecto:`)
          projectIssueTypes.forEach((it: JiraIssueType) => {
            console.log(`         - ${it.name}`)
          })
        }
      }
    }

    console.log('\n✅ Verificación completada\n')
    console.log('📝 Próximos pasos:')
    console.log('   1. Si faltan issue types o prioridades, créalos en Jira o ajusta los mapeos')
    console.log('   2. Ajusta lib/jira.ts si necesitas cambiar los nombres de tipos/prioridades')
    console.log('   3. Verifica que todos los proyectos existan y tengas acceso')

  } catch (error: any) {
    console.error('\n❌ Error durante la verificación:')
    console.error(error.message)
    
    if (error.message.includes('401') || error.message.includes('403')) {
      console.error('\n💡 Verifica tus credenciales (JIRA_EMAIL y JIRA_API_TOKEN)')
    }
    
    process.exit(1)
  }
}

verifyJiraConfig()

