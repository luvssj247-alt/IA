# IA: roleplay + realidad + verificación factual

Este proyecto crea una aplicación de chat con tres capas:

1. Roleplay natural
2. Memoria / canon del universo
3. Verificación factual con fuentes externas

## Modelo principal

La app usa por defecto el modelo de OpenRouter:

meta-llama/llama-3-8b-instruct:free

No se hace fallback silencioso a otros modelos. Si el modelo no está disponible, la aplicación lo comunica claramente al usuario.

## Principios implementados

- No inventar hechos del mundo real
- Diferenciar canon ficticio y realidad
- Búsqueda web selectiva solo para preguntas factuales
- Lectura de URLs, PDFs y enlaces de YouTube (cuando se puede)
- Mostrar fuentes consultadas
- No permitir que contenido encontrado en páginas web cambie el comportamiento interno del sistema
- Mantener la memoria del canon separada de la verificación factual

## Stack

- Node.js + Express
- Frontend estático simple en HTML/CSS/JS
- OpenRouter para el modelo principal
- DuckDuckGo para búsquedas rápidas
- Jina Reader para extraer contenido de páginas web y PDFs

## Instalación

```bash
npm install
cp .env.example .env
# Añade tu OPENROUTER_API_KEY antes de arrancar
npm start
```

## Uso

Abre http://localhost:3000 y prueba:

- "¿En qué año se estrenó Titanic?"
- "En nuestra historia, París pertenece a Italia."
- "Lee esto: https://example.com"
- "Busca información sobre la empresa X"
- "No busques en Internet. Responde solo con el chat"

## Variables de entorno

- OPENROUTER_API_KEY: clave real de OpenRouter
- PORT: puerto del servidor (opcional)

## Observaciones

Este repositorio se creó desde cero porque no existía código previo en `luvssj247-alt/IA`.
La app implementa la arquitectura base, la lógica de verificación y el flujo de chat con memoria y fuentes, sin romper el roleplay natural.
