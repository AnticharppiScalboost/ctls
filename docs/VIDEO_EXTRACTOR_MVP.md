# 🎬 Video Extractor MVP - Sistema Mínimo de Encolamiento

## 📋 Descripción

Sistema MVP que expone únicamente un endpoint para encolar tareas de extracción de thumbnails. La API externa maneja todo el procesamiento y los webhooks.

## 🏗️ Arquitectura

```
[Cliente] → [POST /video-extractor/enqueue] → [Redis Queue] → [Worker] → [API Externa]
```

### Componentes:

1. **Endpoint de Encolamiento** (`POST /video-extractor/enqueue`) - ÚNICO ENDPOINT
2. **Cola Redis** (BullMQ) para gestionar trabajos
3. **Worker** que envía la tarea a la API externa
4. **API Externa** maneja todo lo demás (procesamiento, webhooks, OpenAI storage)

## 🚀 Endpoint Disponible

### `POST /video-extractor/enqueue`

**Único endpoint del MVP** - Encola una nueva extracción de thumbnails.

**Body:**

```json
{
  "videoUrl": "https://ejemplo.com/video.mp4",
  "callbackUrl": "https://tu-webhook.com/endpoint",
  "requestId": "optional-custom-id",
  "metadata": {
    "cualquier": "dato adicional"
  },
  "options": {
    "fps": 1.0,
    "width": 640,
    "height": 480,
    "format": "jpg",
    "maxThumbnails": 10
  }
}
```

**Parámetros:**
- `videoUrl` (requerido): URL del video a procesar
- `callbackUrl` (requerido): URL donde la API externa enviará el resultado
- `requestId` (opcional): ID personalizado para la petición
- `metadata` (opcional): Datos adicionales
- `options` (opcional): Configuración de extracción
  - `fps` (0.1-30.0, default: 1.0): Thumbnails por segundo
  - `width` (64-1920, default: 320): Ancho en píxeles
  - `height` (64-1080, default: 240): Alto en píxeles
  - `format` (jpg/jpeg/png/webp, default: jpg): Formato de salida
  - `maxThumbnails` (1-100, default: 10): Máximo número de thumbnails

**Response:**

```json
{
  "success": true,
  "requestId": "uuid-generado-automaticamente",
  "message": "Extracción de thumbnails encolada exitosamente."
}
```

## ⚙️ Configuración Requerida

### Variables de Entorno:

```bash
# Requerida
VIDEO_EXTRACTOR_API_URL=https://tu-api-privada.render.com

# Redis (para BullMQ)
REDIS_URL=redis://localhost:6379
```

## 🔄 Flujo de Trabajo MVP

### 1. **Encolamiento (Único Paso)**

```bash
curl -X POST "http://localhost:3000/video-extractor/enqueue" \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://sample-videos.com/zip/10/mp4/SampleVideo_720x480_1mb.mp4",
    "callbackUrl": "https://mi-app.com/webhook"
  }'
```

### 2. **Procesamiento Automático**

- Worker toma el job y envía a API externa
- API externa procesa, genera thumbnails y envía webhook al callbackUrl
- **Nuestro sistema solo encola, todo lo demás lo maneja la API externa**

## 🧪 Testing

```bash
# 1. Iniciar Redis
docker run -d -p 6379:6379 redis:alpine

# 2. Configurar variables
export VIDEO_EXTRACTOR_API_URL=https://tu-api-privada.render.com
export REDIS_URL=redis://localhost:6379

# 3. Iniciar aplicación
bun dev

# 4. Probar endpoint
curl -X POST "http://localhost:3000/video-extractor/enqueue" \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://sample-videos.com/video.mp4",
    "callbackUrl": "https://webhook.site/tu-url"
  }'
```

## 📝 Resumen MVP

**Lo que hace este MVP:**
- ✅ Expone 1 endpoint: `POST /video-extractor/enqueue`
- ✅ Valida requests y encola tareas
- ✅ Worker envía tareas a API externa
- ✅ API externa maneja todo lo demás

**Lo que NO hace (lo maneja la API externa):**
- ❌ Procesamiento de videos
- ❌ Generación de thumbnails  
- ❌ Subida a OpenAI
- ❌ Webhooks de resultados
- ❌ Polling de estado
- ❌ Health checks
