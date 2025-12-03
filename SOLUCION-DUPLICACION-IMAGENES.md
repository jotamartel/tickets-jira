# ✅ Solución: Duplicación de Imágenes en Jira

**Fecha:** 3 de diciembre de 2025  
**Problema:** Las imágenes aparecían duplicadas (o más) en la descripción de los tickets de Jira

## 🔍 Análisis del Problema

### Causa Raíz

Cuando el usuario refinaba un ticket con la IA, el sistema preservaba las imágenes agregándolas al final del HTML. Si las imágenes ya estaban en el texto original, terminaban apareciendo múltiples veces.

**Ejemplo:**
- Usuario agrega 2 imágenes: `imagen1.png`, `imagen2.png`
- IA refina el ticket → Preserva imágenes al final
- Resultado: 4 URLs en la descripción (2 originales + 2 preservadas)
- Si se refinaba de nuevo: 6 URLs (2 originales + 2 preservadas + 2 más)

### Dónde Ocurría la Duplicación

1. **En el HTML de la descripción:** ✅ Ya corregido anteriormente
2. **Al descargar imágenes de Imgur:** ✅ Corregido en `app/api/ticket/route.ts`
3. **En el resumen final de ADF:** ❌ **Pendiente** → ✅ **Corregido ahora**

## 🛠️ Soluciones Implementadas

### 1. Deduplicación al Descargar Imágenes (Ya implementado)

**Archivo:** `app/api/ticket/route.ts`

```typescript
// Antes: Descargaba todas las URLs (incluyendo duplicadas)
const imgurUrls = descripcionHtml.match(/https?:\/\/[i\.]*imgur\.com\/[a-zA-Z0-9]+\.(png|jpg|jpeg|gif|webp)/gi)

// Después: Elimina duplicados usando Set
const imgurUrlsRaw = descripcionHtml.match(/https?:\/\/[i\.]*imgur\.com\/[a-zA-Z0-9]+\.(png|jpg|jpeg|gif|webp)/gi)
const imgurUrls = imgurUrlsRaw ? Array.from(new Set(imgurUrlsRaw)) : []
```

**Resultado:**
- ✅ Solo se descargan URLs únicas
- ✅ Logs muestran: `🖼️ URLs de Imgur encontradas: 4 (2 únicas)`

### 2. Deduplicación en el Cliente al Refinar (Nuevo - CRÍTICO)

**Archivo:** `components/AIAssistant.tsx`

```typescript
// Al extraer imágenes originales, usar Set para evitar duplicados
const originalImagesSet = new Set<string>()
// ... extraer imágenes ...
const originalImages = Array.from(originalImagesSet)

// Si la IA devuelve una descripción con imágenes, deduplicarlas
if (hasImagesInNew) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(newDescription, 'text/html')
  const images = doc.querySelectorAll('img')
  const seenSrcs = new Set<string>()
  
  images.forEach(img => {
    const src = img.getAttribute('src')
    if (src && seenSrcs.has(src)) {
      img.remove()  // Eliminar duplicado
    } else if (src) {
      seenSrcs.add(src)
    }
  })
  
  newDescription = doc.body.innerHTML
}
```

**Resultado:**
- ✅ Las imágenes se deduplican **en el cliente** cuando la IA refina el ticket
- ✅ Evita que las imágenes se dupliquen al aplicar sugerencias de la IA
- ✅ Funciona sin importar cuántas veces se refine el ticket

### 3. Deduplicación en el HTML Antes de Procesar (Servidor)

**Archivo:** `lib/htmlToAdf.ts`

```typescript
// ANTES de procesar el HTML a ADF, eliminar imágenes duplicadas del DOM
const allImages = body.querySelectorAll('img')
const seenUrls = new Set<string>()

allImages.forEach(img => {
  const src = img.getAttribute('src')
  if (src) {
    if (seenUrls.has(src)) {
      img.remove()  // Eliminar duplicado
    } else {
      seenUrls.add(src)
    }
  }
})
```

**Resultado:**
- ✅ Las imágenes duplicadas se eliminan del HTML **antes** de convertir a ADF
- ✅ Capa adicional de protección en el servidor
- ✅ Garantiza que Jira nunca reciba imágenes duplicadas

### 4. Deduplicación en el Resumen Final (Servidor)

**Archivo:** `lib/htmlToAdf.ts`

```typescript
// Elimina duplicados antes de mostrar el resumen
const imgurUrlsRaw = extractImagesFromHtml(html).filter(url => url.includes('imgur.com'))
const imgurUrls = Array.from(new Set(imgurUrlsRaw))
```

**Resultado:**
- ✅ El resumen al final solo muestra URLs únicas
- ✅ El contador es correcto: `📎 Imágenes adjuntas (2):` (no 4)

## 📋 Formato Actual en Jira

### Antes (Con Duplicación)

```
🖼️ Imagen: https://i.imgur.com/cQ06jH0.png
🖼️ Imagen: https://i.imgur.com/ez5Qely.png
🖼️ Imagen: https://i.imgur.com/cQ06jH0.png  ← Duplicado
🖼️ Imagen: https://i.imgur.com/ez5Qely.png  ← Duplicado

─────────────────────────────

📎 Imágenes adjuntas (4):  ← Contador incorrecto
1. https://i.imgur.com/cQ06jH0.png
2. https://i.imgur.com/ez5Qely.png
3. https://i.imgur.com/cQ06jH0.png  ← Duplicado
4. https://i.imgur.com/ez5Qely.png  ← Duplicado
```

### Después (Sin Duplicación) ✅

```
🖼️ Imagen: https://i.imgur.com/cQ06jH0.png
🖼️ Imagen: https://i.imgur.com/ez5Qely.png

─────────────────────────────

📎 Imágenes adjuntas (2):  ← Contador correcto
1. https://i.imgur.com/cQ06jH0.png
2. https://i.imgur.com/ez5Qely.png
```

## 🧪 Verificación

### Logs Esperados en Vercel

```
🖼️ URLs de Imgur encontradas en descripción: 4 (2 únicas)
📥 Descargando imágenes únicas de Imgur para adjuntarlas a Jira...
📥 Descargando imagen 1/2: https://i.imgur.com/cQ06jH0.png
✅ Imagen descargada: imgur-image-1.png (119363 bytes)
📥 Descargando imagen 2/2: https://i.imgur.com/ez5Qely.png
✅ Imagen descargada: imgur-image-2.png (64822 bytes)
📥 Total de imágenes únicas de Imgur descargadas: 2
```

### Ticket en Jira

1. **Descripción:** Solo muestra cada imagen una vez
2. **Resumen final:** `📎 Imágenes adjuntas (2):` con 2 URLs únicas
3. **Sin duplicados** en ninguna parte del texto

## ⚠️ Problema Pendiente: Attachments 404

**Nota importante:** Las imágenes aún NO se adjuntan físicamente a Jira debido a un problema de permisos de la API key.

### Estado Actual

- ✅ Las imágenes se muestran como **enlaces clickeables** en la descripción
- ✅ Los enlaces son únicos (sin duplicados)
- ❌ Las imágenes NO aparecen en la sección "Attachments" de Jira

### Causa

La API key de Jira tiene permisos para **crear tickets** pero NO para **adjuntar archivos**.

### Solución

Ver: [`TROUBLESHOOTING-ATTACHMENTS-404.md`](./TROUBLESHOOTING-ATTACHMENTS-404.md)

**Resumen:**
1. Contactar al administrador de Jira
2. Solicitar el permiso **"Create Attachments"** para tu usuario
3. Reintentar después de obtener los permisos

## 🎯 Resumen de Cambios

| Archivo | Cambio | Capa | Estado |
|---------|--------|------|--------|
| `components/AIAssistant.tsx` | **Deduplicar al extraer imágenes originales** | Cliente | ✅ Implementado |
| `components/AIAssistant.tsx` | **Deduplicar cuando IA devuelve descripción con imágenes** | Cliente | ✅ Implementado |
| `app/api/ticket/route.ts` | Deduplicar URLs al descargar de Imgur | Servidor | ✅ Implementado |
| `lib/htmlToAdf.ts` | Deduplicar imágenes en HTML antes de procesar | Servidor | ✅ Implementado |
| `lib/htmlToAdf.ts` | Deduplicar URLs en resumen final | Servidor | ✅ Implementado |
| Logs en Vercel | Mostrar "X (Y únicas)" | Servidor | ✅ Implementado |

## 📊 Impacto

### Antes
- ❌ Imágenes duplicadas en descripción
- ❌ Contador incorrecto en resumen
- ❌ Se descargaban imágenes duplicadas (desperdicio de recursos)
- ❌ Confusión para el usuario final

### Después
- ✅ Cada imagen aparece solo una vez
- ✅ Contador correcto en resumen
- ✅ Solo se descargan imágenes únicas (optimización)
- ✅ Descripción clara y profesional

## 🚀 Despliegue

**URL de producción:** https://ticket-portal-9fjrqswnf-julianmartel-infracommercs-projects.vercel.app

**Fecha de despliegue:** 3 de diciembre de 2025

**Versión:** v1.8.4 (Deduplicación completa - Cliente + Servidor)

### Historial de Despliegues

- **v1.8.4** (3 dic 2025): ✅ **Deduplicación completa** - Cliente (AIAssistant) + Servidor (htmlToAdf + route.ts)
- **v1.8.3** (3 dic 2025): ⚠️ Deduplicación solo en servidor - HTML antes de procesar
- **v1.8.2** (3 dic 2025): ⚠️ Deduplicación parcial - solo en descarga y resumen
- **v1.8.1** (anterior): ❌ Sin deduplicación

---

**Próximo paso:** Resolver el problema de permisos para que las imágenes se adjunten físicamente a Jira.

