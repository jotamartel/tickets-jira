# 🔗 Enlaces por Cliente

Cada cliente tiene su propio enlace único que ya tiene prefijado su cliente y no puede ver otros clientes.

## 📋 Enlaces Disponibles

### Infracommerce Adobe Suite
```
https://tu-dominio.com/ticket/adobe-suite
```

### Goodyear Brasil
```
https://tu-dominio.com/ticket/goodyear
```

### Modelo Adobe
```
https://tu-dominio.com/ticket/modelo
```

### HIRAOKA
```
https://tu-dominio.com/ticket/hiraoka
```

## 🔒 Seguridad

- Cada enlace solo muestra el formulario para el cliente correspondiente
- El selector de cliente está oculto cuando se accede por enlace específico
- Si se intenta acceder a un cliente inválido, se muestra un error
- Los clientes no pueden cambiar su cliente una vez en el formulario

## 📝 Cómo Usar

1. **Generar enlaces**: Usa los enlaces de arriba reemplazando `tu-dominio.com` con tu dominio de producción
2. **Compartir con clientes**: Envía a cada cliente su enlace específico
3. **Personalización**: Cada cliente verá su nombre en un badge azul en la parte superior del formulario

## 🛠️ Agregar Nuevos Clientes

Para agregar un nuevo cliente:

1. Edita `config/projects.ts` y agrega el nuevo cliente:
```typescript
export const JIRA_PROJECTS: Record<string, JiraProject> = {
  'nuevo-cliente': { key: 'NC', name: 'Nuevo Cliente' },
  // ... otros clientes
}
```

2. El nuevo enlace estará disponible automáticamente:
```
https://tu-dominio.com/ticket/nuevo-cliente
```

## 🧪 Probar Localmente

Para probar localmente, usa:
- `http://localhost:3000/ticket/adobe-suite`
- `http://localhost:3000/ticket/goodyear`
- `http://localhost:3000/ticket/modelo`
- `http://localhost:3000/ticket/hiraoka`

## ⚠️ Nota

La página principal (`/`) sigue disponible y muestra todos los clientes. Esto puede ser útil para administradores, pero considera restringir el acceso si solo quieres que los clientes usen sus enlaces específicos.

