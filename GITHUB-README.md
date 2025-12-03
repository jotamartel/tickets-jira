# 🎫 Ticket Portal - Sistema de Gestión de Tickets con IA

[![Vercel](https://img.shields.io/badge/deployed%20on-vercel-black)](https://ticket-portal-bwyspgp19-julianmartel-infracommercs-projects.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Anthropic](https://img.shields.io/badge/AI-Anthropic%20Claude-orange)](https://www.anthropic.com/)

Portal moderno de tickets integrado con Jira, Google Chat y asistente de IA para refinamiento inteligente de solicitudes.

## 🌟 Características Principales

### ✨ Asistente de IA Integrado
- 🤖 **Refinamiento inteligente** de tickets con Anthropic Claude
- 💬 **Conversación natural** para obtener información completa
- 📝 **Formato estructurado obligatorio** con todas las secciones necesarias
- 🖼️ **Análisis de imágenes** para mejor contexto

### 🎨 Editor Avanzado
- 📄 **Editor de texto enriquecido** con ReactQuill
- 🖼️ **Inserción de imágenes inline** con preview
- ☁️ **Upload automático a Imgur** para hosting
- ✅ **Deduplicación automática** de imágenes

### 🔗 Integraciones
- ✅ **Jira API v3** - Creación automática de tickets
- ✅ **Google Chat** - Notificaciones en tiempo real
- ✅ **Imgur API** - Hosting de imágenes
- ✅ **Vercel** - Despliegue continuo

### 🎯 Características Adicionales
- 🔐 **Rutas dinámicas por cliente** con prefill
- ⚡ **Rate limiting básico** en memoria
- 📱 **Responsive design** con Tailwind CSS
- 🛡️ **Validación robusta** de formularios

## 📋 Formato de Tickets

Todos los tickets generados incluyen obligatoriamente:

1. **Resumen** del problema
2. **Pasos para reproducir** (mínimo 3)
3. **Resultado esperado**
4. **Resultado actual**
5. **Información adicional** (navegador, ambiente, etc.)
6. **Capturas de pantalla** (si aplica)
7. **Dispositivo** (si aplica)

## 🚀 Deploy Rápido

### Vercel (Recomendado)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/jotamartel/tickets-jira.git)

1. Click en el botón de arriba
2. Configura las variables de entorno (ver abajo)
3. ¡Listo!

### Variables de Entorno Requeridas

```env
# Jira
JIRA_HOST=https://tu-empresa.atlassian.net
JIRA_EMAIL=tu-email@empresa.com
JIRA_API_TOKEN=tu_jira_api_token

# Google Chat (opcional)
GOOGLE_CHAT_WEBHOOK_URL=https://chat.googleapis.com/v1/spaces/...

# Anthropic AI
ANTHROPIC_API_KEY=sk-ant-api...

# Imgur (opcional - usa client ID público por defecto)
IMGUR_CLIENT_ID=tu_imgur_client_id
```

## 🛠️ Instalación Local

```bash
# Clonar el repositorio
git clone https://github.com/jotamartel/tickets-jira.git
cd tickets-jira

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.local.example .env.local
# Editar .env.local con tus credenciales

# Verificar configuración de Jira
npm run verify-jira

# Iniciar en desarrollo
npm run dev

# Abrir http://localhost:3000
```

## 📚 Documentación

- 📖 [**README.md**](./README.md) - Documentación completa del proyecto
- 🔧 [**SETUP.md**](./SETUP.md) - Guía de configuración paso a paso
- 🚀 [**DEPLOY.md**](./DEPLOY.md) - Instrucciones de despliegue
- 🤖 [**INTEGRACION-IA.md**](./INTEGRACION-IA.md) - Detalles de la integración de IA
- 🔗 [**ENLACES-CLIENTES.md**](./ENLACES-CLIENTES.md) - Enlaces dinámicos por cliente
- 🖼️ [**IMGUR-SETUP.md**](./IMGUR-SETUP.md) - Configuración de Imgur
- 🐛 [**TROUBLESHOOTING.md**](./TROUBLESHOOTING.md) - Solución de problemas

## 🏗️ Stack Tecnológico

- **Framework:** Next.js 14 (App Router)
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS
- **Editor:** ReactQuill
- **IA:** Anthropic Claude (Haiku/Sonnet)
- **Hosting Imágenes:** Imgur API
- **Deploy:** Vercel
- **APIs:** Jira REST API v3, Google Chat Webhooks

## 📁 Estructura del Proyecto

```
ticket-portal/
├── app/
│   ├── api/
│   │   ├── ai/analyze/       # Endpoint de análisis con IA
│   │   ├── ticket/            # Endpoint de creación de tickets
│   │   └── upload-image/      # Endpoint de upload a Imgur
│   ├── ticket/[cliente]/      # Rutas dinámicas por cliente
│   └── page.tsx               # Página principal
├── components/
│   ├── AIAssistant.tsx        # Asistente de IA conversacional
│   ├── RichTextEditor.tsx     # Editor con soporte de imágenes
│   └── TicketForm.tsx         # Formulario principal
├── lib/
│   ├── jira.ts                # Funciones de Jira API
│   ├── googleChat.ts          # Notificaciones a Google Chat
│   └── htmlToAdf.ts           # Conversión HTML a Jira ADF
└── config/
    └── projects.ts            # Mapeo de clientes a proyectos Jira
```

## 🔒 Seguridad

- ✅ Variables de entorno para credenciales sensibles
- ✅ Rate limiting para prevenir abuse
- ✅ Validación y sanitización de inputs
- ✅ HTTPS obligatorio en producción
- ✅ No se exponen API keys al cliente

## 🌐 Clientes Configurados

- **Adobe Suite (IAS)** - https://tu-portal.vercel.app/ticket/adobe-suite
- **CMS Admin (CMS)** - https://tu-portal.vercel.app/ticket/cms-admin
- **Hiraoka (HIR)** - https://tu-portal.vercel.app/ticket/hiraoka

## 📊 Ejemplo de Uso

1. **Usuario accede** al portal por enlace específico de su empresa
2. **Completa formulario** con descripción inicial
3. **IA hace preguntas** para clarificar y completar información
4. **Usuario responde** en conversación natural
5. **IA genera ticket** con formato estructurado
6. **Sistema crea ticket** en Jira automáticamente
7. **Notificación enviada** a Google Chat
8. **Imágenes adjuntas** disponibles en Jira

## 🤝 Contribuir

Las contribuciones son bienvenidas! Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Changelog

### v1.8.7 (2025-12-03)
- ✅ Formato estructurado estrictamente obligatorio
- ✅ Deduplicación completa de imágenes (cliente + servidor)
- ✅ IA más exigente con preguntas específicas
- ✅ Integración completa con Imgur para hosting
- ✅ Mejoras en conversión HTML a ADF de Jira

### v1.0.0 (2025-11-XX)
- 🎉 Release inicial con integración de Jira y IA

## 📞 Soporte

Para problemas o preguntas:
- 📧 Email: [tu-email@empresa.com]
- 🐛 Issues: [GitHub Issues](https://github.com/jotamartel/tickets-jira/issues)
- 📚 Documentación: Ver carpeta de docs en el repositorio

## 📄 Licencia

Este proyecto es privado y de uso interno.

---

**Desarrollado con ❤️ por el equipo de ISS**

**Última actualización:** Diciembre 2025

