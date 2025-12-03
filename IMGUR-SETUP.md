# Configuración de Imgur para Subida de Imágenes

## ¿Por qué usar Imgur?

Las imágenes se suben a Imgur y se obtienen URLs públicas que se insertan directamente en la descripción de Jira. Esto evita los problemas de permisos y attachments en Jira.

## ✅ Buena Noticia: No Necesitas Crear una Aplicación

El sistema **ya funciona sin configuración adicional**. Usa un Client ID público de Imgur que permite subir imágenes de forma anónima. 

**Puedes empezar a usarlo inmediatamente** - las imágenes se subirán a Imgur automáticamente cuando las insertes en el editor.

## Opcional: Crear tu Propia Aplicación (Solo si Necesitas Más Límites)

Si necesitas límites de rate más altos o más control, puedes crear tu propia aplicación. Sin embargo, **Imgur ha cambiado su proceso** y actualmente es difícil crear nuevas aplicaciones.

### Métodos para Crear una Aplicación (Pueden No Funcionar)

1. **Desde Settings** (si el botón está visible):
   - Ve a: https://imgur.com/account/settings/apps
   - Busca un botón "New Application" o "Register Application"
   - Si no lo ves, este método no está disponible

2. **Contactar Soporte de Imgur**:
   - Si necesitas crear una aplicación, contacta al soporte de Imgur
   - Explica que necesitas un Client ID para uso anónimo de la API
   - Referencia: https://apidocs.imgur.com/

### Si Logras Obtener un Client ID

### Opción 1: Acceso directo a la API (RECOMENDADO - Más confiable)

Si no ves el botón "New Application" en la página de Settings, usa este método:

1. **Ve directamente a la página de registro de aplicación**:
   ```
   https://api.imgur.com/oauth2/addclient
   ```
   ⚠️ **IMPORTANTE**: Asegúrate de estar **logueado en Imgur** antes de acceder a esta URL

2. **Completa el formulario**:
   - **Application name**: `Ticket Portal` (o el nombre que prefieras)
   - **Authorization type**: Selecciona **"Anonymous usage without user authorization"**
   - **Authorization callback URL**: Puedes dejarlo vacío o usar `http://localhost:3000`
   - **Application website**: Opcional, puedes usar tu dominio de Vercel (ej: `https://ticket-portal-tu-proyecto.vercel.app`)
   - **Email**: Tu email

3. **Haz clic en "Submit"** o "Register Application"

4. **Obtén tu Client ID**:
   - Después de crear la aplicación, verás tu **Client ID**
   - Copia este ID (no necesitas el Client Secret para uso anónimo)

### Opción 2: Desde Settings (si el botón está visible)

1. **Accede a la página de aplicaciones**:
   - Ve a: https://imgur.com/account/settings/apps
   - O desde Settings → Applications

2. **Busca el botón "New Application" o "Register Application"**:
   - Puede estar en la parte superior derecha o en el centro de la página
   - Si no lo ves, usa la Opción 1

3. **Completa el formulario** (mismo que arriba)

### Nota importante

Si estás en la página "Apps Used" y no ves ningún botón para crear aplicaciones, es posible que:
- Necesites usar la URL directa de la API: https://api.imgur.com/oauth2/addclient
- O que Imgur haya cambiado la interfaz y ahora requiera usar la API directamente

## Configurar el Client ID en Vercel

Una vez que tengas tu Client ID:

1. **Ve a tu proyecto en Vercel**
2. **Settings** → **Environment Variables**
3. **Agrega una nueva variable**:
   - **Name**: `IMGUR_CLIENT_ID`
   - **Value**: Tu Client ID de Imgur
   - **Environment**: Production, Preview, Development (según necesites)

4. **Redeploy** tu aplicación para que los cambios surtan efecto

## Configurar el Client ID localmente

Para desarrollo local:

1. Crea o edita `.env.local`:
   ```bash
   IMGUR_CLIENT_ID=tu_client_id_aqui
   ```

2. Reinicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

## Sin Client ID (Configuración Actual)

**El sistema funciona perfectamente sin configuración adicional**. Usa un Client ID público de Imgur que permite:
- ✅ Subir imágenes de forma anónima
- ✅ Obtener URLs públicas
- ✅ Funcionar inmediatamente sin configuración

**Limitaciones del Client ID público**:
- Límites de rate más estrictos (pero suficientes para uso normal)
- Si tienes mucho tráfico, podrías necesitar tu propio Client ID

**Para la mayoría de casos de uso, el Client ID público es suficiente.**

## Verificación

Para verificar que funciona:

1. Inserta una imagen en el editor de texto
2. La imagen debería subirse a Imgur automáticamente
3. Revisa los logs en Vercel para ver la URL de Imgur generada
4. La URL debería aparecer en el HTML de la descripción del ticket

## Troubleshooting

### Error: "Rate limit exceeded"
- **Causa**: Estás usando el Client ID público y se alcanzó el límite
- **Solución**: Configura tu propio Client ID siguiendo los pasos arriba

### Error: "Invalid client_id"
- **Causa**: El Client ID no es válido
- **Solución**: Verifica que copiaste el Client ID correctamente (sin espacios)

### Las imágenes no se suben
- **Causa**: Problema de conexión o configuración
- **Solución**: El sistema automáticamente usa data URLs como fallback, pero las imágenes serán más grandes

## Referencias

- [Documentación de Imgur API](https://apidocs.imgur.com/)
- [Página de aplicaciones de Imgur](https://imgur.com/account/settings/apps)

