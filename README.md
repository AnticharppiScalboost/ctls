# 🏗️ CTLS API

Sistema de APIs para investigación profunda y extracción de thumbnails de videos.

## 📋 Descripción

CTLS (Content Technology Learning System) es una API desarrollada con NestJS que proporciona servicios para:

- 🔍 **Deep Research**: Investigación profunda usando Perplexity AI
- 🎬 **Video Extractor**: Extracción de thumbnails de videos con integración a OpenAI

Construido con arquitectura de colas asíncronas usando Redis y BullMQ para procesamiento escalable.

## ⚙️ Instalación y Configuración

### Prerequisitos

- **Node.js 18+**
- **PostgreSQL 14+** (base de datos principal)
- **Redis 6+** (para colas BullMQ)
- **API Keys** (Perplexity, Video Extractor)

### 1. Clonar el Repositorio

```bash
git clone <tu-repositorio>
cd ctls
```

### 2. Instalar Dependencias

```bash
# Con Bun (recomendado)
bun install

# o con npm
npm install
```

### 3. Configurar Base de Datos PostgreSQL

```bash
# Instalar PostgreSQL (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib

# o con Docker
docker run --name ctls-postgres \
  -e POSTGRES_PASSWORD=tu_password \
  -e POSTGRES_DB=ctls \
  -p 5432:5432 \
  -d postgres:14

# Crear base de datos (si instalaste localmente)
sudo -u postgres createdb ctls
sudo -u postgres psql -c "CREATE USER ctls_user WITH PASSWORD 'tu_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ctls TO ctls_user;"
```

### 4. Configurar Redis

```bash
# Instalar Redis (Ubuntu/Debian)
sudo apt install redis-server

# o con Docker
docker run --name ctls-redis \
  -p 6379:6379 \
  -d redis:7-alpine

# Verificar que Redis esté corriendo
redis-cli ping
# Debe responder: PONG
```

### 5. Variables de Entorno

Crear archivo `.env` en la raíz del proyecto:

```bash
# Base de datos PostgreSQL
DATABASE_URL="postgresql://ctls_user:tu_password@localhost:5432/ctls"

# Redis para BullMQ (colas asíncronas)
REDIS_URL=redis://localhost:6379

# Deep Research - Perplexity API
# Obtén tu API key en: https://docs.perplexity.ai/
PERPLEXITY_API_KEY=pplx-tu-api-key-aqui

# Video Extractor - API Externa
# URL de tu servicio privado de extracción de thumbnails
VIDEO_EXTRACTOR_API_URL=https://tu-api-privada.render.com

# Configuración del servidor (opcional)
PORT=3000
NODE_ENV=development
```

> **💡 Tip**: Copia el contenido anterior y guárdalo como `.env` en la raíz del proyecto.

> **Nota**: Las configuraciones de Perplexity (baseUrl, model, etc.) se definen en `src/config/perplexity.config.ts` con valores por defecto. Solo necesitas configurar `PERPLEXITY_API_KEY`.

### 6. Migrar Base de Datos

```bash
# Generar migración inicial (solo la primera vez)
bun run db:generate

# Aplicar migraciones
bun run db:migrate

# Verificar que las tablas se crearon correctamente
bun run db:studio
# Abre Drizzle Studio en http://localhost:4983
```

### 7. Verificar Servicios

```bash
# Verificar PostgreSQL
psql $DATABASE_URL -c "SELECT version();"

# Verificar Redis
redis-cli -u $REDIS_URL ping

# Verificar configuración del proyecto
bun run lint
```

## 🚀 Ejecutar el Proyecto

### Desarrollo

```bash
# Modo desarrollo con auto-reload
bun dev

# o con npm
npm run dev

# El servidor iniciará en http://localhost:3000
```

### Producción

```bash
# Construir proyecto
bun run build

# Ejecutar en producción
bun run prod
```

### Scripts Adicionales

```bash
# Linting y formato
bun run lint          # Verificar código
bun run format        # Formatear código

# Base de datos
bun run db:generate   # Generar migraciones
bun run db:migrate    # Aplicar migraciones  
bun run db:studio     # Abrir Drizzle Studio

# Testing
bun test              # Ejecutar tests
bun test:watch        # Tests en modo watch
bun test:cov          # Tests con cobertura
```

## 🧪 Testing

```bash
# Tests unitarios
bun test

# Tests end-to-end
bun test:e2e

# Cobertura de tests
bun test:cov
```

## 🔧 Troubleshooting

### Problemas Comunes

#### Base de Datos no conecta
```bash
# Verificar que PostgreSQL esté corriendo
sudo systemctl status postgresql

# Verificar conexión manual
psql "postgresql://ctls_user:tu_password@localhost:5432/ctls"
```

#### Redis no conecta
```bash
# Verificar que Redis esté corriendo
sudo systemctl status redis

# Probar conexión
redis-cli ping
```

#### Error en migraciones
```bash
# Resetear migraciones (¡cuidado en producción!)
bun run db:push

# Verificar estado de la DB
bun run db:studio
```

#### Puerto en uso
```bash
# Encontrar proceso usando puerto 3000
lsof -i :3000

# Usar otro puerto
PORT=3001 bun dev
```

### Verificación de Servicios

```bash
# Health check completo
curl http://localhost:3000/deep-research/health

# Verificar Redis
redis-cli -u $REDIS_URL ping

# Verificar PostgreSQL
psql $DATABASE_URL -c "SELECT 1;"
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
