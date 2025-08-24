# 🏗️ CTLS API

Sistema de APIs para investigación profunda y extracción de thumbnails de videos.

## 📋 Descripción

CTLS (Content Technology Learning System) es una API desarrollada con NestJS que proporciona servicios para:

- 🔍 **Deep Research**: Investigación profunda usando Perplexity AI
- 🎬 **Video Extractor**: Extracción de thumbnails de videos con integración a OpenAI

Construido con arquitectura de colas asíncronas usando Redis y BullMQ para procesamiento escalable.

## ⚙️ Configuración del Proyecto

### Prerequisitos

- Node.js 18+
- Redis
- Variables de entorno configuradas

### Instalación

```bash
# Instalar dependencias
$ bun install

# o con npm
$ npm install
```

### Variables de Entorno

```bash
# Redis (requerido para BullMQ)
REDIS_URL=redis://localhost:6379

# Deep Research - Perplexity API (requerido)
PERPLEXITY_API_KEY=tu-api-key-aqui

# Video Extractor - API Externa (requerido)
VIDEO_EXTRACTOR_API_URL=https://tu-api-privada.render.com
```

> **Nota**: Las configuraciones de Perplexity (baseUrl, model, etc.) se definen en `src/config/perplexity.config.ts` con valores por defecto sensatos. Solo necesitas configurar `PERPLEXITY_API_KEY`.

## 🚀 Ejecutar el Proyecto

```bash
# desarrollo con watch
$ bun dev

# desarrollo
$ bun start

# producción
$ bun run prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```



## 📚 Documentación

- [Deep Research MVP](./docs/DEEP_RESEARCH_MVP.md) - Sistema de investigación con Perplexity
- [Video Extractor MVP](./docs/VIDEO_EXTRACTOR_MVP.md) - Sistema de extracción de thumbnails

## 🔗 Endpoints Principales

### Deep Research
```bash
POST /deep-research/enqueue    # Encolar investigación
GET  /deep-research/health     # Estado del servicio
```

### Video Extractor
```bash
POST /video-extractor/enqueue  # Encolar extracción de thumbnails
```

## 🏗️ Arquitectura

```
[Cliente] → [API] → [Redis Queue] → [Worker] → [Servicios Externos] → [Webhooks]
```

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.
