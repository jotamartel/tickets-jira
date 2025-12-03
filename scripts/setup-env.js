#!/usr/bin/env node

/**
 * Script interactivo para configurar .env.local
 * Uso: node scripts/setup-env.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupEnv() {
  console.log('🔧 Configuración de Variables de Entorno\n');
  console.log('Este script te ayudará a configurar tu archivo .env.local\n');

  const envPath = path.join(__dirname, '..', '.env.local');
  
  // Leer valores existentes si el archivo existe
  let existingValues = {};
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const match = line.match(/^([A-Z_]+)=(.*)$/);
      if (match) {
        existingValues[match[1]] = match[2];
      }
    });
  }

  const config = {};

  // JIRA_HOST
  const defaultHost = existingValues.JIRA_HOST || 'https://tu-empresa.atlassian.net';
  const host = await question(`JIRA_HOST [${defaultHost}]: `);
  config.JIRA_HOST = host.trim() || defaultHost;

  // JIRA_EMAIL
  const defaultEmail = existingValues.JIRA_EMAIL || 'tu-email@ejemplo.com';
  const email = await question(`JIRA_EMAIL [${defaultEmail}]: `);
  config.JIRA_EMAIL = email.trim() || defaultEmail;

  // JIRA_API_TOKEN
  const defaultToken = existingValues.JIRA_API_TOKEN || 'tu-api-token-aqui';
  console.log('\n💡 Para obtener tu API Token:');
  console.log('   https://id.atlassian.com/manage-profile/security/api-tokens\n');
  const token = await question(`JIRA_API_TOKEN [${defaultToken}]: `);
  config.JIRA_API_TOKEN = token.trim() || defaultToken;

  // GOOGLE_CHAT_WEBHOOK_URL (opcional)
  const defaultWebhook = existingValues.GOOGLE_CHAT_WEBHOOK_URL || '';
  console.log('\n💡 Google Chat Webhook es opcional.');
  console.log('   Si no lo configuras, el sistema funcionará sin notificaciones.\n');
  const webhook = await question(`GOOGLE_CHAT_WEBHOOK_URL [${defaultWebhook || '(opcional)'}]: `);
  config.GOOGLE_CHAT_WEBHOOK_URL = webhook.trim() || defaultWebhook;

  // Crear contenido del archivo
  const content = `# Jira Configuration
# URL base de tu instancia de Jira (sin trailing slash)
# Ejemplo: https://tu-empresa.atlassian.net
JIRA_HOST=${config.JIRA_HOST}

# Email de la cuenta de Jira que tiene permisos para crear tickets
JIRA_EMAIL=${config.JIRA_EMAIL}

# API Token de Jira
# Obtén tu token en: https://id.atlassian.com/manage-profile/security/api-tokens
JIRA_API_TOKEN=${config.JIRA_API_TOKEN}

# Google Chat Webhook URL (opcional)
# Si no se configura, las notificaciones a Google Chat se omitirán sin error
# Crea un webhook en Google Chat: https://chat.google.com → Configuración → Webhooks
GOOGLE_CHAT_WEBHOOK_URL=${config.GOOGLE_CHAT_WEBHOOK_URL}
`;

  // Escribir archivo
  fs.writeFileSync(envPath, content, 'utf8');
  
  console.log('\n✅ Archivo .env.local configurado exitosamente!\n');
  console.log('📝 Resumen de configuración:');
  console.log(`   JIRA_HOST: ${config.JIRA_HOST}`);
  console.log(`   JIRA_EMAIL: ${config.JIRA_EMAIL}`);
  console.log(`   JIRA_API_TOKEN: ${config.JIRA_API_TOKEN.substring(0, 10)}...`);
  console.log(`   GOOGLE_CHAT_WEBHOOK_URL: ${config.GOOGLE_CHAT_WEBHOOK_URL || '(no configurado)'}\n`);
  
  console.log('🚀 Próximo paso: Ejecuta "npm run verify-jira" para verificar tu configuración\n');

  rl.close();
}

setupEnv().catch(err => {
  console.error('❌ Error:', err.message);
  rl.close();
  process.exit(1);
});

