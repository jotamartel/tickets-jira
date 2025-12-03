# Ticket Portal - Portal de Solicitudes de Clientes

Portal web para que los clientes puedan crear tickets directamente en Jira, con notificaciones automáticas a Google Chat.

## 🚀 Características

- ✅ Formulario web intuitivo para crear tickets
- ✅ Integración directa con Jira (API v3)
- ✅ Notificaciones automáticas a Google Chat
- ✅ Soporte para múltiples clientes/proyectos
- ✅ Validación y sanitización de inputs
- ✅ Rate limiting básico

## 📋 Requisitos Previos

- Node.js 18+ y npm
- Cuenta de Jira con permisos para crear tickets
- (Opcional) Webhook de Google Chat para notificaciones

## 🔧 Configuración

> 📖 **¿Primera vez configurando?** Sigue la [Guía de Configuración Paso a Paso](./SETUP.md) para instrucciones detalladas.

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```env
# Jira Configuration
JIRA_HOST=https://tu-empresa.atlassian.net
JIRA_EMAIL=tu-email@ejemplo.com
JIRA_API_TOKEN=tu-api-token-aqui

# Google Chat Webhook (opcional)
GOOGLE_CHAT_WEBHOOK_URL=https://chat.googleapis.com/v1/spaces/SPACE_ID/messages?key=KEY&token=TOKEN
```

#### Cómo obtener las credenciales:

**JIRA_API_TOKEN:**
1. Ve a https://id.atlassian.com/manage-profile/security/api-tokens
2. Haz clic en "Create API token"
3. Copia el token generado

**GOOGLE_CHAT_WEBHOOK_URL:**
1. Abre Google Chat
2. Ve a Configuración → Webhooks
3. Crea un nuevo webhook
4. Copia la URL del webhook

### 3. Verificar configuración de Jira

Ejecuta el script de verificación para asegurarte de que los issue types y prioridades existen:

```bash
# Instalar dependencias (incluye tsx y dotenv)
npm install

# Ejecuta el script de verificación
npm run verify-jira
```

Este comando ejecutará el script que verifica tu configuración de Jira.

Este script verificará:
- ✅ Conexión con Jira
- ✅ Issue types disponibles (Bug, Task)
- ✅ Prioridades disponibles (Low, Medium, High)
- ✅ Proyectos configurados en `config/projects.ts`

### 4. Ajustar configuración si es necesario

Si tu instancia de Jira usa nombres diferentes para issue types o prioridades, edita `lib/jira.ts`:

```typescript
// Ajustar mapeo de tipos
function mapTipoToJira(tipo: string): string {
  const mapping: Record<string, string> = {
    'Bug': 'Bug',        // Cambia si tu Jira usa otro nombre
    'Task': 'Task',      // Cambia si tu Jira usa otro nombre
    'Support': 'Task'
  }
  return mapping[tipo] || 'Task'
}

// Ajustar mapeo de prioridades
function mapUrgenciaToJira(urgencia: string): string {
  const mapping: Record<string, string> = {
    'Low': 'Low',        // Cambia si tu Jira usa otro nombre
    'Medium': 'Medium',  // Cambia si tu Jira usa otro nombre
    'High': 'High'       // Cambia si tu Jira usa otro nombre
  }
  return mapping[urgencia] || 'Medium'
}
```

### 5. Configurar proyectos de clientes

Edita `config/projects.ts` para agregar o modificar los proyectos de Jira:

```typescript
export const JIRA_PROJECTS: Record<string, JiraProject> = {
  'cliente-id': { key: 'PROJECT_KEY', name: 'Nombre del Cliente' },
  // Agrega más clientes aquí
}
```

## 🏃 Desarrollo

```bash
# Iniciar servidor de desarrollo
npm run dev

# Abre http://localhost:3000 en tu navegador
```

## 🏗️ Build para Producción

```bash
# Crear build de producción
npm run build

# Iniciar servidor de producción
npm start
```

## 🚢 Deploy a Vercel

### Opción 1: Deploy desde CLI

1. Instala Vercel CLI:
```bash
npm i -g vercel
```

2. Inicia sesión:
```bash
vercel login
```

3. Deploy:
```bash
vercel
```

4. Configura las variables de entorno en el dashboard de Vercel:
   - Ve a tu proyecto en Vercel
   - Settings → Environment Variables
   - Agrega todas las variables de `.env.local`

### Opción 2: Deploy desde GitHub

1. Conecta tu repositorio a Vercel:
   - Ve a https://vercel.com/new
   - Importa tu repositorio de GitHub
   - Vercel detectará automáticamente que es un proyecto Next.js

2. Configura las variables de entorno:
   - En la configuración del proyecto, ve a "Environment Variables"
   - Agrega:
     - `JIRA_HOST`
     - `JIRA_EMAIL`
     - `JIRA_API_TOKEN`
     - `GOOGLE_CHAT_WEBHOOK_URL` (opcional)

3. Deploy:
   - Vercel desplegará automáticamente en cada push a la rama principal

### Variables de Entorno en Vercel

Asegúrate de configurar estas variables en el dashboard de Vercel:

- `JIRA_HOST`: URL de tu instancia de Jira
- `JIRA_EMAIL`: Email de la cuenta de Jira
- `JIRA_API_TOKEN`: Token de API de Jira
- `GOOGLE_CHAT_WEBHOOK_URL`: URL del webhook de Google Chat (opcional)

## 📁 Estructura del Proyecto

```
ticket-portal/
├── app/
│   ├── api/
│   │   ├── ticket/route.ts   # POST → Crea ticket en Jira + notifica Chat
│   │   └── notify/route.ts    # POST → Solo notifica a Google Chat
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── TicketForm.tsx         # Formulario principal
│   └── SuccessMessage.tsx     # Mensaje de éxito
├── config/
│   └── projects.ts            # Mapeo de clientes a proyectos Jira
├── lib/
│   ├── jira.ts                # Lógica de creación de tickets en Jira
│   ├── googleChat.ts          # Lógica de notificaciones a Google Chat
│   └── types.ts               # Tipos TypeScript
├── scripts/
│   └── verify-jira-config.ts  # Script de verificación de configuración
└── vercel.json                 # Configuración de Vercel
```

## 🔒 Seguridad

- ✅ Sanitización de inputs HTML
- ✅ Rate limiting básico (10 requests/minuto)
- ✅ Validación de tipos y urgencias
- ✅ Validación de longitud de campos
- ✅ Manejo seguro de errores

## 🐛 Troubleshooting

### Error: "Configuración de Jira incompleta"
- Verifica que todas las variables de entorno estén configuradas en `.env.local`
- En producción, verifica que estén configuradas en Vercel

### Error: "Issue type does not exist"
- Ejecuta el script de verificación: `npx tsx scripts/verify-jira-config.ts`
- Ajusta los mapeos en `lib/jira.ts` según los nombres de tu Jira

### Error: "Priority does not exist"
- Ejecuta el script de verificación para ver las prioridades disponibles
- Ajusta el mapeo en `lib/jira.ts` → `mapUrgenciaToJira()`

### Las notificaciones a Google Chat no funcionan
- Verifica que `GOOGLE_CHAT_WEBHOOK_URL` esté configurado correctamente
- Las notificaciones son opcionales y no bloquean la creación del ticket

### Las imágenes no se adjuntan físicamente a Jira (Error 404)
- **Causa:** La API key de Jira no tiene permisos para adjuntar archivos
- **Solución:** Ver [`TROUBLESHOOTING-ATTACHMENTS-404.md`](./TROUBLESHOOTING-ATTACHMENTS-404.md)
- **Mientras tanto:** Las imágenes aparecen como enlaces clickeables en la descripción (funcional)
- **Acción requerida:** Contactar al administrador de Jira para solicitar el permiso "Create Attachments"

## 📝 Notas

- El proyecto usa Next.js 14 con App Router
- Las notificaciones a Google Chat se envían de forma asíncrona (no bloquean la respuesta)
- El rate limiting es básico (en memoria). Para producción a gran escala, considera usar Redis
- Las imágenes se suben a Imgur y se muestran como enlaces en Jira (deduplicadas automáticamente)

## 📄 Licencia

Este proyecto es privado y de uso interno.

