# Troubleshooting: Archivos no aparecen en Jira

## Problema: Las imágenes no se ven adjuntas en el ticket de Jira

### Verificación 1: Revisar logs en Vercel

1. Ve a tu proyecto en Vercel
2. **Deployments** → Último deployment
3. **View Function Logs** o **View Logs**
4. Busca mensajes que empiecen con:
   - `📎 Adjuntando X archivo(s) al ticket`
   - `📤 Enviando request a: .../attachments`
   - `Response status: 200 OK` o el error específico
   - `✅ Archivo X adjuntado exitosamente` o `❌ Error adjuntando`

### Verificación 2: Verificar permisos en Jira

El usuario de Jira necesita tener permisos para adjuntar archivos:

1. Ve a **Project Settings** → **Permissions**
2. Verifica que el usuario tenga el permiso **Create Attachments**
3. Verifica que el campo de adjuntos esté habilitado en la pantalla de creación

### Verificación 3: Verificar tamaño y formato

- **Tamaño máximo**: Verifica los límites de tu instancia de Jira (generalmente 10MB por archivo)
- **Formatos soportados**: Jira acepta imágenes (JPG, PNG, GIF, WebP)

### Verificación 4: Probar manualmente con el script

Ejecuta el script de prueba con un ticket existente:

```bash
# Primero crea un ticket manualmente y obtén su ISSUE_KEY (ej: HIR-123)
# Luego ejecuta:
npx tsx scripts/test-attachment.ts HIR-123 ./ruta/a/tu/imagen.png
```

### Errores comunes

#### Error 403: Forbidden
**Causa**: El usuario no tiene permisos para adjuntar archivos
**Solución**: Verificar permisos en Jira Project Settings

#### Error 413: Payload Too Large
**Causa**: El archivo excede el tamaño máximo permitido
**Solución**: Reducir el tamaño del archivo o verificar límites en Jira

#### Error 400: Bad Request
**Causa**: Formato incorrecto del request
**Solución**: Verificar que el campo se llame 'file' y que el Content-Type sea correcto

#### Status 200 pero no aparece el archivo
**Causa**: El archivo se adjuntó pero puede estar en una ubicación diferente o requiere permisos especiales para verlo
**Solución**: 
- Verificar que el ticket tenga el campo de adjuntos visible
- Verificar permisos de visualización en Jira
- Revisar la respuesta completa en los logs para ver el ID del adjunto

### Debug avanzado

Si los logs muestran que el archivo se adjuntó exitosamente (status 200) pero no lo ves:

1. **Verificar en Jira directamente**: Ve al ticket y busca la sección "Attachments" o "Adjuntos"
2. **Verificar permisos de visualización**: Puede que el archivo esté adjunto pero no tengas permisos para verlo
3. **Verificar el ID del adjunto**: Los logs deberían mostrar el ID del adjunto creado
4. **Probar con otro tipo de archivo**: Prueba con un archivo pequeño de texto para verificar que funciona

### Logs mejorados

El código ahora incluye logging detallado:
- `📎 Adjuntando X archivo(s) al ticket ISSUE-KEY`
- `📎 Archivos a adjuntar: [{name, size, type}]`
- `📤 Enviando request a: .../attachments`
- `📋 Headers: {...}`
- `📋 File info: {name, size, type, filename}`
- `Response status: XXX`
- `📥 Response body: ...` (primeros 200 caracteres)
- `✅ Archivo X adjuntado exitosamente (ID: ...)` o `❌ Error adjuntando`

Revisa estos logs para identificar el problema exacto.

