# 🚀 Guía de Deploy a Vercel

## Pre-requisitos

✅ Build exitoso (`npm run build`)  
✅ Vercel CLI instalado (`vercel` está disponible)  
✅ Variables de entorno configuradas localmente  

## Paso 1: Iniciar sesión en Vercel

```bash
vercel login
```

Sigue las instrucciones para autenticarte.

## Paso 2: Deploy Inicial

Desde el directorio `ticket-portal`:

```bash
vercel
```

Sigue las instrucciones interactivas:
- **Set up and deploy?** → `Y`
- **Which scope?** → Selecciona tu cuenta/organización
- **Link to existing project?** → `N` (primera vez) o `Y` si ya existe
- **Project name?** → `ticket-portal` (o el que prefieras)
- **Directory?** → `./` (directorio actual)
- **Override settings?** → `N`

## Paso 3: Configurar Variables de Entorno

Después del deploy inicial, configura las variables de entorno en Vercel:

### Opción A: Desde el Dashboard (Recomendado)

1. Ve a https://vercel.com/dashboard
2. Selecciona tu proyecto `ticket-portal`
3. Ve a **Settings** → **Environment Variables**
4. Agrega cada variable:

| Variable | Valor | Ambientes |
|---------|-------|-----------|
| `JIRA_HOST` | `https://infracommerce.atlassian.net` | Production, Preview, Development |
| `JIRA_EMAIL` | `tu-email@infracommerce.lat` | Production, Preview, Development |
| `JIRA_API_TOKEN` | `tu-api-token` | Production, Preview, Development |
| `GOOGLE_CHAT_WEBHOOK_URL` | `tu-webhook-url` (opcional) | Production, Preview, Development |
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` (opcional) | Production, Preview, Development |

5. Haz clic en **Save** para cada variable

### Opción B: Desde CLI

```bash
vercel env add JIRA_HOST
vercel env add JIRA_EMAIL
vercel env add JIRA_API_TOKEN
vercel env add GOOGLE_CHAT_WEBHOOK_URL
vercel env add ANTHROPIC_API_KEY
```

Para cada variable, selecciona los ambientes (Production, Preview, Development).

## Paso 4: Deploy a Producción

```bash
vercel --prod
```

O desde el dashboard, haz clic en **Deploy** después de configurar las variables.

## Paso 5: Verificar el Deploy

1. Visita la URL de producción (te la dará Vercel después del deploy)
2. Prueba crear un ticket
3. Verifica en Jira que se creó correctamente
4. Verifica notificaciones en Google Chat (si configuraste)

## URLs de Producción

Después del deploy, tendrás:
- **Producción:** `https://ticket-portal.vercel.app` (o tu dominio personalizado)
- **Preview:** URLs automáticas para cada push a ramas

## Enlaces por Cliente en Producción

Una vez desplegado, los enlaces serán:

- Infracommerce Adobe Suite: `https://tu-dominio.com/ticket/adobe-suite`
- Goodyear Brasil: `https://tu-dominio.com/ticket/goodyear`
- Modelo Adobe: `https://tu-dominio.com/ticket/modelo`

## Troubleshooting

### Error: Variables de entorno no encontradas
- Verifica que todas las variables estén configuradas en Vercel
- Asegúrate de seleccionar los ambientes correctos (Production, Preview, Development)

### Error: Build falla
- Revisa los logs en Vercel Dashboard → Deployments → [tu deploy] → Build Logs
- Verifica que `npm run build` funcione localmente

### Error: API routes no funcionan
- Verifica que las variables de entorno estén configuradas
- Revisa los logs de función en Vercel Dashboard

### La IA no funciona
- Verifica que `ANTHROPIC_API_KEY` esté configurada
- El sistema funcionará sin IA si no está configurada (no es crítico)

## Comandos Útiles

```bash
# Ver información del proyecto
vercel ls

# Ver variables de entorno
vercel env ls

# Ver logs de producción
vercel logs

# Deploy a producción
vercel --prod

# Deploy a preview
vercel
```

## Actualizaciones Futuras

Para actualizar el proyecto después de cambios:

1. Haz tus cambios localmente
2. Verifica que `npm run build` funcione
3. Haz commit y push a tu repositorio (si está conectado)
4. O ejecuta `vercel --prod` para deploy manual

## Dominio Personalizado (Opcional)

1. Ve a **Settings** → **Domains** en Vercel
2. Agrega tu dominio personalizado
3. Sigue las instrucciones para configurar DNS

---

¡Listo para desplegar! 🎉

