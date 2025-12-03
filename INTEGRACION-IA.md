# 🤖 Integración con Anthropic Claude AI

## Descripción

Se ha integrado la API de Anthropic (Claude) para analizar las solicitudes de tickets antes de enviarlas a Jira. El asistente de IA:

1. **Analiza** la solicitud del cliente
2. **Hace preguntas** si necesita clarificación
3. **Sugiere mejoras** en tipo, urgencia, asunto o descripción
4. **Interpreta** la solicitud para asegurar que esté completa

## Flujo de Usuario

1. El cliente completa el formulario básico
2. Al hacer clic en "Continuar con Asistente de IA", se muestra el chat
3. La IA analiza la solicitud automáticamente
4. Si necesita clarificación, hace preguntas al cliente
5. El cliente responde las preguntas
6. La IA puede sugerir mejoras (tipo, urgencia, asunto, descripción)
7. El cliente puede aplicar las sugerencias o continuar sin cambios
8. Finalmente se envía el ticket a Jira

## Configuración

### 1. Obtener API Key de Anthropic

1. Ve a https://console.anthropic.com/
2. Crea una cuenta o inicia sesión
3. Ve a "API Keys"
4. Crea una nueva API key
5. Copia la key (formato: `sk-ant-api03-...`)

### 2. Configurar Variable de Entorno

Agrega a tu `.env.local`:

```env
ANTHROPIC_API_KEY=sk-ant-api03-tu-api-key-aqui
```

**Nota:** Si no configuras la API key, el sistema funcionará normalmente pero sin el asistente de IA.

### 3. Instalar Dependencias

```bash
npm install
```

El SDK de Anthropic (`@anthropic-ai/sdk`) ya está agregado al `package.json`.

## Componentes Creados

### `/app/api/ai/analyze/route.ts`
API route que se comunica con Anthropic Claude para:
- Analizar solicitudes de tickets
- Generar preguntas de clarificación
- Proporcionar sugerencias de mejora
- Interpretar la solicitud

### `/components/AIAssistant.tsx`
Componente de chat que:
- Muestra la conversación con la IA
- Permite al usuario responder preguntas
- Muestra sugerencias y permite aplicarlas
- Maneja el flujo de interacción

### Modificaciones en `/components/TicketForm.tsx`
- Integrado el asistente de IA
- El botón ahora dice "Continuar con Asistente de IA"
- Después de la interacción con IA, se envía el ticket

## Modelo de IA Utilizado

- **Modelo:** `claude-3-5-sonnet-20241022`
- **Max Tokens:** 1024
- **Temperatura:** Por defecto (no especificada)

## Formato de Respuesta de la IA

La IA responde en formato JSON:

```json
{
  "needsClarification": true/false,
  "question": "Pregunta si necesita clarificación",
  "suggestions": {
    "tipo": "Bug",
    "urgencia": "High",
    "asunto": "Asunto mejorado",
    "descripcion": "Descripción mejorada"
  },
  "interpretation": "Interpretación de la solicitud"
}
```

## Características

✅ **Análisis automático** cuando se muestra el asistente  
✅ **Preguntas contextuales** para clarificar solicitudes ambiguas  
✅ **Sugerencias inteligentes** para mejorar tipo, urgencia y contenido  
✅ **Interfaz de chat** intuitiva y fácil de usar  
✅ **Aplicación de sugerencias** con un solo clic  
✅ **Funcionamiento opcional** - si no hay API key, el sistema funciona sin IA  

## Ejemplo de Uso

1. Cliente completa: "Tengo un problema con el sistema"
2. IA pregunta: "¿Podrías describir qué tipo de problema estás experimentando? ¿Es un error técnico, una funcionalidad que no funciona, o necesitas ayuda con algo?"
3. Cliente responde: "El botón de guardar no funciona"
4. IA sugiere: Tipo: Bug, Urgencia: High
5. Cliente aplica sugerencias
6. Se envía el ticket con información completa

## Troubleshooting

### La IA no responde
- Verifica que `ANTHROPIC_API_KEY` esté configurada en `.env.local`
- Verifica que la API key sea válida
- Revisa la consola del navegador para errores

### Las sugerencias no se aplican
- Asegúrate de hacer clic en "Aplicar Sugerencias"
- Verifica que la IA haya generado sugerencias válidas

### Error 401/403
- Tu API key puede ser inválida o haber expirado
- Verifica que tengas créditos en tu cuenta de Anthropic

## Costos

- El uso de Anthropic API tiene costos asociados
- Consulta los precios en: https://www.anthropic.com/pricing
- Modelo `claude-3-5-sonnet`: ~$3 por millón de tokens de entrada, ~$15 por millón de tokens de salida

## Seguridad

- La API key nunca se expone al cliente
- Todas las llamadas se hacen desde el servidor (API route)
- Los datos del ticket se envían a Anthropic solo para análisis
- No se almacenan conversaciones

