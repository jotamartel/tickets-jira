# 🔧 Solución de Problemas

## Problema: CSS no se carga / Página sin estilos

### Solución 1: Limpiar caché del navegador
1. Abre las herramientas de desarrollador (F12 o Cmd+Option+I)
2. Haz clic derecho en el botón de recargar
3. Selecciona "Vaciar caché y recargar de forma forzada" (Hard Reload)

### Solución 2: Verificar que el servidor esté corriendo
```bash
# Verifica que el servidor esté corriendo
ps aux | grep "next dev"

# Si no está corriendo, inícialo:
cd ticket-portal
npm run dev
```

### Solución 3: Limpiar caché de Next.js y reiniciar
```bash
cd ticket-portal
rm -rf .next
npm run dev
```

### Solución 4: Verificar en la consola del navegador
1. Abre las herramientas de desarrollador (F12)
2. Ve a la pestaña "Console"
3. Busca errores relacionados con CSS o archivos estáticos
4. Ve a la pestaña "Network"
5. Recarga la página y verifica que `layout.css` se cargue correctamente (debe tener status 200)

## Problema: Solo funciona http://localhost:3000/

### Verificar rutas dinámicas
Las rutas dinámicas deberían funcionar:
- `http://localhost:3000/ticket/adobe-suite`
- `http://localhost:3000/ticket/goodyear`
- `http://localhost:3000/ticket/modelo`

Si no funcionan:
1. Verifica que el servidor esté corriendo
2. Limpia la caché: `rm -rf .next && npm run dev`
3. Verifica en la consola del navegador si hay errores

## Problema: Se queda en "Cargando..."

Esto ya debería estar resuelto. Si persiste:
1. Verifica la consola del navegador para errores
2. Asegúrate de que `config/projects.ts` tenga los clientes correctos
3. Verifica que la URL tenga el formato correcto: `/ticket/[cliente-id]`

## Verificación rápida

Ejecuta estos comandos para verificar que todo esté bien:

```bash
# 1. Verificar que el servidor esté corriendo
curl http://localhost:3000 | grep -o "Portal de Solicitudes"

# 2. Verificar que las rutas dinámicas funcionen
curl http://localhost:3000/ticket/adobe-suite | grep -o "Infracommerce Adobe Suite"

# 3. Verificar que el CSS se esté generando
ls -la .next/static/css/app/
```

## Si nada funciona

1. Detén todos los procesos de Next.js:
   ```bash
   pkill -f "next dev"
   ```

2. Limpia todo:
   ```bash
   cd ticket-portal
   rm -rf .next node_modules package-lock.json
   npm install
   npm run dev
   ```

3. Abre en modo incógnito para evitar problemas de caché del navegador

