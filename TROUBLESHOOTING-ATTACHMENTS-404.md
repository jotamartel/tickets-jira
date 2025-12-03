# 🔧 Troubleshooting: Error 404 al Adjuntar Archivos a Jira

## 🚨 Problema

Al intentar adjuntar archivos a un ticket de Jira recién creado, el sistema recibe un error **404 Not Found** con el mensaje:

```
Issue does not exist or you do not have permission to see it.
```

Este error persiste incluso después de:
- ✅ Esperar 3 segundos antes de adjuntar
- ✅ Reintentar hasta 5 veces con backoff exponencial (2s, 4s, 8s, 16s)
- ✅ Verificar que el ticket se creó correctamente (visible en Jira UI)

## 🔍 Causa Raíz

Este error **NO es un problema de timing** (el ticket ya existe). Es un **problema de permisos de la API key de Jira**.

### Explicación Técnica

Jira tiene permisos granulares para diferentes operaciones:
- ✅ **CREATE_ISSUES**: Permite crear tickets
- ❌ **ADD_ATTACHMENTS**: Permite adjuntar archivos a tickets

**Tu API key actual tiene permisos para crear tickets, pero NO para adjuntar archivos.**

## ✅ Solución

### Opción 1: Actualizar Permisos de la API Key (Recomendado)

1. **Accede a la configuración de API tokens de Jira:**
   - Ve a: https://id.atlassian.com/manage-profile/security/api-tokens
   - O desde Jira: Settings → Atlassian account settings → Security → API tokens

2. **Verifica el usuario asociado al token:**
   - El token usa los permisos del usuario que lo creó
   - Asegúrate de que el usuario tenga permisos de **"Add Attachments"** en el proyecto

3. **Verifica los permisos del proyecto en Jira:**
   - Ve a: Project Settings → Permissions
   - Busca el permiso **"Create Attachments"**
   - Asegúrate de que el rol del usuario (o el usuario específico) tenga este permiso habilitado

4. **Si no tienes permisos suficientes:**
   - Contacta al administrador de Jira de tu organización
   - Solicita que agreguen el permiso **"Create Attachments"** para tu usuario en el proyecto HIRAOKA (HIR)

### Opción 2: Usar un Usuario con Más Permisos

Si no puedes modificar los permisos del usuario actual:

1. Crea un nuevo API token con un usuario que tenga permisos de administrador del proyecto
2. Actualiza la variable de entorno `JIRA_API_TOKEN` en Vercel con el nuevo token
3. Actualiza `JIRA_EMAIL` con el email del nuevo usuario

### Opción 3: Configurar Permisos por Rol

Si tu organización usa roles:

1. Ve a: Jira Settings → System → Permission schemes
2. Encuentra el esquema de permisos usado por el proyecto HIRAOKA
3. Edita el esquema y asegúrate de que el rol del usuario tenga:
   - ✅ Create Issues
   - ✅ **Create Attachments**
   - ✅ Add Comments (recomendado)

## 🧪 Verificar la Solución

Después de actualizar los permisos, ejecuta el script de prueba:

```bash
cd /Users/julianmartel/Desktop/ISS-Solicitudes\ de\ clientes/ticket-portal
npm run test:attachment
```

Si ves:
```
✅ Archivo adjuntado exitosamente
```

¡Los permisos están correctos!

## 📋 Estado Actual del Sistema

Mientras tanto, el sistema **sigue funcionando**:
- ✅ Los tickets se crean correctamente en Jira
- ✅ Las notificaciones de Google Chat se envían
- ✅ Las imágenes de Imgur se incluyen como **enlaces clickeables** en la descripción del ticket
- ⚠️ Las imágenes NO se adjuntan físicamente al ticket (solo aparecen como enlaces)

### Flujo Actual (Sin Attachments)

1. Usuario sube imágenes → Se suben a Imgur
2. Imágenes se insertan en el editor como URLs de Imgur
3. Al crear el ticket:
   - ✅ La descripción incluye enlaces a las imágenes de Imgur
   - ✅ El resumen al final lista todas las URLs únicas
   - ❌ Las imágenes NO se descargan y adjuntan físicamente

### Flujo Deseado (Con Attachments)

1. Usuario sube imágenes → Se suben a Imgur
2. Imágenes se insertan en el editor como URLs de Imgur
3. Al crear el ticket:
   - ✅ La descripción incluye enlaces a las imágenes de Imgur
   - ✅ Las imágenes se descargan de Imgur
   - ✅ Las imágenes se adjuntan físicamente al ticket de Jira
   - ✅ Los usuarios pueden ver las imágenes directamente en Jira sin salir

## 🔐 Permisos Necesarios en Jira

Para que el sistema funcione completamente, el usuario de la API key necesita:

| Permiso | Descripción | Estado |
|---------|-------------|--------|
| **Browse Projects** | Ver proyectos | ✅ OK |
| **Create Issues** | Crear tickets | ✅ OK |
| **Create Attachments** | Adjuntar archivos | ❌ FALTA |
| **Add Comments** | Agregar comentarios | ⚠️ Recomendado |
| **Edit Issues** | Editar tickets | ⚠️ Opcional |

## 📞 Contacto con el Administrador

Si necesitas ayuda del administrador de Jira, envía este mensaje:

---

**Asunto:** Solicitud de Permisos para API de Integración - Proyecto HIRAOKA

Hola,

Estoy configurando una integración con Jira para automatizar la creación de tickets desde un portal web. La integración está funcionando correctamente para crear tickets, pero necesito permisos adicionales para adjuntar archivos.

**Usuario API:** [TU_EMAIL_DE_JIRA]  
**Proyecto:** HIRAOKA (HIR)  
**Permiso necesario:** Create Attachments

¿Podrías habilitar este permiso para mi usuario en el proyecto HIRAOKA?

Gracias,
[TU_NOMBRE]

---

## 🛠️ Alternativa Temporal

Si no puedes obtener los permisos inmediatamente, el sistema actual funciona bien con **enlaces a Imgur**. Las imágenes son accesibles y los usuarios pueden hacer clic en los enlaces para verlas.

**Ventajas:**
- ✅ No requiere permisos adicionales
- ✅ Las imágenes están alojadas en un servicio confiable (Imgur)
- ✅ Los enlaces son permanentes
- ✅ Funciona inmediatamente

**Desventajas:**
- ⚠️ Los usuarios deben hacer clic en el enlace para ver la imagen
- ⚠️ Las imágenes no aparecen en la sección "Attachments" de Jira
- ⚠️ Dependencia de un servicio externo (Imgur)

## 📊 Logs de Diagnóstico

Para verificar el problema, busca estos logs en Vercel:

```
✅ Ticket creado exitosamente: HIR-XXXX
📎 Total de archivos a adjuntar: 2
⏳ Esperando 3 segundos antes de adjuntar archivos...
🔍 Verificando que el ticket HIR-XXXX existe...
⚠️ Verificación del ticket HIR-XXXX falló (404)
📤 Intento 1/5 de adjuntar archivo...
📥 Response recibida: 404 Not Found
❌ Error: Issue does not exist or you do not have permission to see it.
```

Si ves estos logs, **confirma que es un problema de permisos**, no de timing.

## 🎯 Próximos Pasos

1. **Inmediato:** Contacta al administrador de Jira para solicitar permisos
2. **Mientras tanto:** El sistema funciona con enlaces a Imgur
3. **Después de obtener permisos:** Ejecuta `npm run test:attachment` para verificar
4. **Confirmación:** Crea un ticket de prueba y verifica que las imágenes se adjunten

---

**Última actualización:** 3 de diciembre de 2025

