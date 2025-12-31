# Kanban Board PWA v1.5.0

## Descripción

Una aplicación de tareas estilo Kanban que funciona **offline**, es **privacy-first** y **local-first**.  
Incluye soporte multilenguaje, animaciones al crear tareas y la opción de marcar tareas como completadas.

## Características

- Crear, editar y eliminar columnas y tareas
- Marcar tareas como completadas (botón "Complete"/"Completed")
- **Contadores dinámicos** de tareas pendientes y completadas
- Drag & drop de tareas entre columnas (PC)
- Offline-first mediante Service Worker y Cache Storage
- Compatible con múltiples idiomas (actualmente inglés y español)
- Optimizado para escritorio y móvil

### Futuras actualizaciones

- Feedback visual al marcar tareas completadas
- Export / Import de tableros en JSON

## Privacidad y Datos

Todos los datos se guardan **localmente** en el navegador (Local Storage y Cache Storage).  
No se envía información a ningún servidor externo.

## Tecnologías

- HTML, CSS, JavaScript
- Service Worker para PWA
- Local Storage para persistencia de datos
- Cache Storage para offline-first
