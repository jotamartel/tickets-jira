# Troubleshooting: Asistente de IA

## Problema: "Error al analizar la solicitud"

Si ves este mensaje, significa que hay un problema al comunicarse con la API de Anthropic.

### Verificación 1: API Key configurada

```bash
vercel env ls | grep ANTHROPIC
```

Deberías ver:
```
ANTHROPIC_API_KEY    Encrypted    Production
ANTHROPIC_API_KEY    Encrypted    Preview
ANTHROPIC_API_KEY    Encrypted    Development
```

Si no aparece, configura la variable:
```bash
vercel env add ANTHROPIC_API_KEY production
```

### Verificación 2: Revisar logs en Vercel

1. Ve a tu proyecto en Vercel
2. **Deployments** → Último deployment
3. **View Function Logs** o **View Logs**
4. Busca mensajes que empiecen con:
   - `🤖 Iniciando análisis de IA...`
   - `API Key configurada: Sí/No`
   - `❌ Error en análisis de IA:`

### Errores comunes y soluciones

#### Error 401: Autenticación
**Síntoma:** `Error de autenticación con Anthropic`
**Solución:**
- Verifica que tu API key sea correcta
- Asegúrate de que la key esté activa en https://console.anthropic.com/
- Verifica que tengas créditos disponibles

#### Error 429: Rate Limit
**Síntoma:** `Límite de solicitudes excedido`
**Solución:**
- Espera unos minutos antes de intentar nuevamente
- Verifica tu plan de Anthropic y los límites

#### Error 400: Solicitud inválida
**Síntoma:** `Solicitud inválida a Anthropic`
**Solución:**
- Verifica que el modelo especificado esté disponible
- Revisa los logs para ver el error específico

#### Error de parsing JSON
**Síntoma:** `No se encontró JSON en la respuesta`
**Solución:**
- La IA puede estar devolviendo un formato diferente
- Revisa los logs para ver la respuesta completa
- El sistema intentará usar el texto directamente como interpretación

### Probar localmente

1. Agrega la variable en `.env.local`:
```bash
ANTHROPIC_API_KEY=sk-ant-api03-...
```

2. Ejecuta el servidor:
```bash
npm run dev
```

3. Crea un ticket de prueba y revisa la consola del servidor para ver los logs detallados

### Verificar que la API key funciona

Puedes probar directamente con curl:

```bash
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: TU_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Hola"}]
  }'
```

Si funciona, deberías recibir una respuesta JSON con el contenido generado.

### Modelos disponibles

El sistema usa `claude-3-5-sonnet-20241022` por defecto. Si este modelo no está disponible, puedes cambiarlo en `app/api/ai/analyze/route.ts`:

```typescript
const response = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022', // Cambiar aquí si es necesario
  max_tokens: 1024,
  messages
})
```

Modelos alternativos:
- `claude-3-5-sonnet-20241022` (recomendado)
- `claude-3-opus-20240229`
- `claude-3-sonnet-20240229`
- `claude-3-haiku-20240307`

### Logs mejorados

El código ahora incluye logging detallado:
- `🤖 Iniciando análisis de IA...`
- `API Key configurada: Sí/No`
- `📋 Analizando ticket: ...`
- `📤 Enviando request a Anthropic API...`
- `📥 Respuesta recibida de Anthropic`
- `✅ JSON parseado exitosamente`
- `❌ Error en análisis de IA:` (con detalles)

Revisa estos logs para identificar el problema exacto.

