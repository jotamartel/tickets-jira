# 🚀 Guía de Configuración Paso a Paso

Esta guía te llevará paso a paso para configurar y desplegar el Ticket Portal.

## Paso 1: Instalar Dependencias

```bash
cd ticket-portal
npm install
```

Esto instalará todas las dependencias necesarias, incluyendo `tsx` y `dotenv` para el script de verificación.

## Paso 2: Configurar Variables de Entorno

### 2.1 Crear archivo .env.local

Crea un archivo `.env.local` en la raíz del proyecto (`ticket-portal/.env.local`):

```bash
# En la raíz del proyecto ticket-portal
touch .env.local
```

### 2.2 Obtener credenciales de Jira

**JIRA_HOST:**
- Tu URL de Jira (ejemplo: `https://tu-empresa.atlassian.net`)
- No incluyas trailing slash al final

**JIRA_EMAIL:**
- El email de la cuenta de Jira que tiene permisos para crear tickets

**JIRA_API_TOKEN:**
1. Ve a https://id.atlassian.com/manage-profile/security/api-tokens
2. Haz clic en "Create API token"
3. Dale un nombre descriptivo (ej: "Ticket Portal")
4. Copia el token generado (solo se muestra una vez)

### 2.3 Obtener Webhook de Google Chat (Opcional)

Si quieres recibir notificaciones en Google Chat:

1. Abre Google Chat
2. Ve al espacio (Space) donde quieres recibir notificaciones
3. Haz clic en el nombre del espacio → "Apps e integraciones"
4. Busca "Incoming Webhook" o crea uno nuevo
5. Copia la URL del webhook generada

### 2.4 Completar .env.local

Edita `.env.local` con tus credenciales:

```env
JIRA_HOST=https://tu-empresa.atlassian.net
JIRA_EMAIL=tu-email@ejemplo.com
JIRA_API_TOKEN=tu-api-token-aqui
GOOGLE_CHAT_WEBHOOK_URL=https://chat.googleapis.com/v1/spaces/SPACE_ID/messages?key=KEY&token=TOKEN
```

**Nota:** `GOOGLE_CHAT_WEBHOOK_URL` es opcional. Si no lo configuras, el sistema funcionará pero no enviará notificaciones a Google Chat.

## Paso 3: Verificar Configuración de Jira

Ejecuta el script de verificación para asegurarte de que todo está configurado correctamente:

```bash
npm run verify-jira
```

Este script verificará:

✅ **Conexión con Jira** - Que tus credenciales funcionen  
✅ **Issue Types** - Que existan "Bug" y "Task" en tu Jira  
✅ **Prioridades** - Que existan "Low", "Medium" y "High"  
✅ **Proyectos** - Que los proyectos configurados en `config/projects.ts` existan y tengas acceso

### Si el script muestra advertencias:

**Issue Types faltantes:**
- Opción 1: Crea los tipos "Bug" y "Task" en tu instancia de Jira
- Opción 2: Ajusta el mapeo en `lib/jira.ts` → función `mapTipoToJira()`

**Prioridades faltantes:**
- Opción 1: Crea las prioridades "Low", "Medium", "High" en Jira
- Opción 2: Ajusta el mapeo en `lib/jira.ts` → función `mapUrgenciaToJira()`

**Proyectos no encontrados:**
- Verifica que las keys de proyecto en `config/projects.ts` coincidan con tus proyectos en Jira
- Asegúrate de tener permisos de creación de tickets en esos proyectos

## Paso 4: Probar Localmente

Inicia el servidor de desarrollo:

```bash
npm run dev
```

Abre http://localhost:3000 en tu navegador y prueba crear un ticket.

### Verificar que funciona:

1. Completa el formulario con datos de prueba
2. Envía el ticket
3. Verifica en Jira que el ticket se haya creado correctamente
4. Si configuraste Google Chat, verifica que llegó la notificación

## Paso 5: Preparar para Deploy

### 5.1 Verificar que el build funciona

```bash
npm run build
```

Si hay errores, corrígelos antes de hacer deploy.

### 5.2 Verificar archivos importantes

Asegúrate de que estos archivos existan:
- ✅ `.env.local` (local, no se sube a git)
- ✅ `env.example` (template para otros desarrolladores)
- ✅ `vercel.json` (configuración de Vercel)
- ✅ `README.md` (documentación)

## Paso 6: Deploy a Vercel

### Opción A: Deploy desde CLI (Recomendado)

1. **Instalar Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Iniciar sesión:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```
   
   Sigue las instrucciones:
   - ¿Set up and deploy? → **Y**
   - ¿Which scope? → Selecciona tu cuenta
   - ¿Link to existing project? → **N** (primera vez)
   - ¿Project name? → `ticket-portal` (o el que prefieras)
   - ¿Directory? → `./ticket-portal` o `.` (depende de dónde ejecutes)
   - ¿Override settings? → **N**

4. **Configurar variables de entorno en Vercel:**
   - Ve a https://vercel.com/dashboard
   - Selecciona tu proyecto
   - Ve a **Settings** → **Environment Variables**
   - Agrega cada variable:
     - `JIRA_HOST`
     - `JIRA_EMAIL`
     - `JIRA_API_TOKEN`
     - `GOOGLE_CHAT_WEBHOOK_URL` (opcional)
   - Selecciona los ambientes: **Production**, **Preview**, **Development**
   - Haz clic en **Save**

5. **Redeploy:**
   ```bash
   vercel --prod
   ```

### Opción B: Deploy desde GitHub

1. **Subir código a GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/tu-usuario/ticket-portal.git
   git push -u origin main
   ```

2. **Conectar con Vercel:**
   - Ve a https://vercel.com/new
   - Haz clic en **Import Git Repository**
   - Selecciona tu repositorio
   - Vercel detectará automáticamente que es Next.js

3. **Configurar variables de entorno:**
   - En la pantalla de configuración, ve a **Environment Variables**
   - Agrega todas las variables de `.env.local`
   - Haz clic en **Deploy**

4. **Configurar dominio (opcional):**
   - Una vez desplegado, ve a **Settings** → **Domains**
   - Agrega tu dominio personalizado si lo deseas

## Paso 7: Verificar Deploy

1. Visita la URL de tu proyecto en Vercel
2. Prueba crear un ticket
3. Verifica en Jira que se creó correctamente
4. Verifica notificaciones en Google Chat (si configuraste)

## 🔧 Troubleshooting

### Error: "Configuración de Jira incompleta"
- Verifica que `.env.local` exista y tenga todas las variables
- En producción, verifica que las variables estén en Vercel

### Error: "Issue type does not exist"
- Ejecuta `npm run verify-jira` para ver los tipos disponibles
- Ajusta `lib/jira.ts` según los nombres de tu Jira

### Error: "Priority does not exist"
- Ejecuta `npm run verify-jira` para ver las prioridades disponibles
- Ajusta `lib/jira.ts` → `mapUrgenciaToJira()`

### Las notificaciones no funcionan
- Verifica que `GOOGLE_CHAT_WEBHOOK_URL` esté correcto
- Las notificaciones son opcionales y no bloquean la creación del ticket

### Build falla en Vercel
- Verifica que todas las variables de entorno estén configuradas
- Revisa los logs de build en Vercel para más detalles

## ✅ Checklist Final

Antes de considerar el proyecto listo:

- [ ] Variables de entorno configuradas en `.env.local`
- [ ] Script de verificación ejecutado sin errores críticos
- [ ] Proyecto funciona localmente (`npm run dev`)
- [ ] Build de producción funciona (`npm run build`)
- [ ] Variables de entorno configuradas en Vercel
- [ ] Deploy exitoso en Vercel
- [ ] Ticket de prueba creado exitosamente en producción
- [ ] Notificaciones funcionando (si aplica)

## 📚 Recursos Adicionales

- [Documentación de Jira REST API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
- [Documentación de Google Chat Webhooks](https://developers.google.com/chat/api/guides/message-formats/cards)
- [Documentación de Vercel](https://vercel.com/docs)
- [Documentación de Next.js](https://nextjs.org/docs)

---

¿Necesitas ayuda? Revisa el `README.md` para más información detallada.

