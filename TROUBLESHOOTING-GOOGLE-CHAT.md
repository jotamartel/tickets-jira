# Troubleshooting: Notificaciones de Google Chat

## Problema: Las notificaciones no se envían a Google Chat

### Verificación 1: Variable de entorno en Vercel

1. Ve a tu proyecto en Vercel: https://vercel.com/dashboard
2. Selecciona tu proyecto `ticket-portal`
3. Ve a **Settings** → **Environment Variables**
4. Verifica que existe la variable `GOOGLE_CHAT_WEBHOOK_URL` con el valor:
   ```
   https://chat.googleapis.com/v1/spaces/AAQA9iNk-sE/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=bHSX5S06WJzfJwxNaQpZESYsW8tLxsm0pryLZVdz41Q
   ```
5. Asegúrate de que esté configurada para **Production**, **Preview** y **Development**
6. Si la agregaste o modificaste, **redespliega** la aplicación

### Verificación 2: Logs en Vercel

1. Ve a tu proyecto en Vercel
2. Ve a **Deployments** → Selecciona el último deployment
3. Haz clic en **View Function Logs** o **View Logs**
4. Busca mensajes que empiecen con:
   - `📨 Enviando notificación a Google Chat...`
   - `Webhook URL configurada: Sí/No`
   - `❌ Error enviando notificación...`

### Verificación 3: Probar el webhook directamente

Ejecuta el script de prueba:

```bash
npx tsx scripts/test-google-chat.ts
```

Si funciona, deberías ver:
```
✅ Formato de texto simple funcionó correctamente!
```

### Verificación 4: Verificar que el ticket se crea correctamente

El código envía la notificación **después** de crear el ticket en Jira. Si el ticket no se crea, la notificación tampoco se enviará.

Revisa los logs para ver:
- `✅ Ticket creado exitosamente en Jira: ISSUE-KEY`
- `📨 Enviando notificación a Google Chat...`

### Problemas comunes

#### 1. Variable de entorno no configurada
**Síntoma:** En los logs ves `Webhook URL configurada: No`
**Solución:** Configura `GOOGLE_CHAT_WEBHOOK_URL` en Vercel y redespliega

#### 2. Variable de entorno incorrecta
**Síntoma:** En los logs ves errores 400 o 401
**Solución:** Verifica que la URL del webhook sea correcta y esté completa

#### 3. Formato del mensaje incorrecto
**Síntoma:** En los logs ves error 400 con mensaje sobre formato
**Solución:** El código intenta primero con texto simple, luego con Cards v2. Si ambos fallan, revisa los logs para el error específico.

#### 4. Error de red/timeout
**Síntoma:** En los logs ves `Error de conexión con Google Chat`
**Solución:** Verifica que el webhook de Google Chat esté activo y accesible

### Debug local

Para probar localmente, agrega la variable en tu `.env.local`:

```bash
GOOGLE_CHAT_WEBHOOK_URL=https://chat.googleapis.com/v1/spaces/AAQA9iNk-sE/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=bHSX5S06WJzfJwxNaQpZESYsW8tLxsm0pryLZVdz41Q
```

Luego ejecuta:
```bash
npm run dev
```

Y crea un ticket de prueba. Revisa la consola del servidor para ver los logs.

### Formato del mensaje

El sistema usa dos formatos:

1. **Texto simple** (intentado primero):
   ```json
   {
     "text": "🔔 *Nueva Solicitud de Ticket*\n\n..."
   }
   ```

2. **Cards v2** (si el texto simple falla):
   ```json
   {
     "cardsV2": [...]
   }
   ```

El formato de texto simple es más compatible y debería funcionar con la mayoría de webhooks de Google Chat.

