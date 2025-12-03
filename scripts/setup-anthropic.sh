#!/bin/bash

# Script para configurar la API key de Anthropic en Vercel

echo "🔑 Configurando Anthropic API Key en Vercel..."
echo ""
echo "Este script agregará la variable ANTHROPIC_API_KEY en todos los entornos (Production, Preview, Development)"
echo ""
echo "Por favor, ingresa tu API key de Anthropic (formato: sk-ant-api03-...):"
read -s ANTHROPIC_KEY

if [ -z "$ANTHROPIC_KEY" ]; then
    echo "❌ Error: No se proporcionó una API key"
    exit 1
fi

echo ""
echo "📤 Agregando variable de entorno..."

# Agregar en Production
vercel env add ANTHROPIC_API_KEY production <<< "$ANTHROPIC_KEY"

# Agregar en Preview
vercel env add ANTHROPIC_API_KEY preview <<< "$ANTHROPIC_KEY"

# Agregar en Development
vercel env add ANTHROPIC_API_KEY development <<< "$ANTHROPIC_KEY"

echo ""
echo "✅ Variable ANTHROPIC_API_KEY configurada exitosamente!"
echo ""
echo "⚠️  IMPORTANTE: Necesitas redesplegar la aplicación para que los cambios surtan efecto:"
echo "   vercel --prod"
echo ""
echo "O desde el dashboard de Vercel, haz un nuevo deployment."

