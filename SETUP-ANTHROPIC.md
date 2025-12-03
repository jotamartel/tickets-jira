# Configurar Anthropic API Key

## Opción 1: Usando el CLI de Vercel (Recomendado)

### Paso 1: Ejecutar el script automático

```bash
cd ticket-portal
./scripts/setup-anthropic.sh
```

El script te pedirá tu API key y la configurará automáticamente en todos los entornos.

### Paso 2: O hacerlo manualmente

Si prefieres hacerlo manualmente, ejecuta estos comandos:

```bash
# Agregar en Production
vercel env add ANTHROPIC_API_KEY production

# Agregar en Preview  
vercel env add ANTHROPIC_API_KEY preview

# Agregar en Development
vercel env add ANTHROPIC_API_KEY development
```

Cuando se te solicite, pega tu API key de Anthropic (formato: `sk-ant-api03-...`)

## Opción 2: Desde el Dashboard de Vercel

1. Ve a tu proyecto en Vercel: https://vercel.com/dashboard
2. Selecciona tu proyecto `ticket-portal`
3. Ve a **Settings** → **Environment Variables**
4. Haz clic en **Add New**
5. Nombre: `ANTHROPIC_API_KEY`
6. Valor: Pega tu API key de Anthropic
7. Selecciona los entornos: **Production**, **Preview**, **Development**
8. Haz clic en **Save**

## Paso 3: Redesplegar la aplicación

Después de agregar la variable, necesitas redesplegar:

```bash
vercel --prod
```

O desde el dashboard de Vercel, haz un nuevo deployment.

## Verificar que está configurada

```bash
vercel env ls | grep ANTHROPIC
```

Deberías ver:
```
ANTHROPIC_API_KEY    Encrypted    Production
ANTHROPIC_API_KEY    Encrypted    Preview
ANTHROPIC_API_KEY    Encrypted    Development
```

## Obtener tu API Key de Anthropic

1. Ve a: https://console.anthropic.com/
2. Inicia sesión con tu cuenta
3. Ve a **API Keys** o **Settings** → **API Keys**
4. Haz clic en **Create Key**
5. Copia la key (formato: `sk-ant-api03-...`)

## Probar la integración

Una vez configurada y redesplegada:

1. Ve a tu aplicación: https://ticket-portal-*.vercel.app
2. Completa el formulario de ticket
3. Deberías ver el asistente de IA aparecer automáticamente
4. El asistente analizará tu solicitud y puede hacer preguntas o sugerencias

## Troubleshooting

### El asistente no aparece
- Verifica que la variable esté configurada: `vercel env ls | grep ANTHROPIC`
- Verifica que hayas redesplegado después de agregar la variable
- Revisa los logs en Vercel para ver si hay errores

### Error "Asistente de IA no configurado"
- La variable `ANTHROPIC_API_KEY` no está configurada o no se está leyendo correctamente
- Verifica que esté en el entorno correcto (Production/Preview/Development)
- Redespliega la aplicación

### Error de autenticación con Anthropic
- Verifica que tu API key sea válida y esté activa
- Verifica que tengas créditos disponibles en tu cuenta de Anthropic
- Revisa los logs en Vercel para el error específico

