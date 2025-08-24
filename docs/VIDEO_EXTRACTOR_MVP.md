# 🎬 Video Extractor MVP - Thumbnail Extraction API

## 📋 Descripción

Sistema asíncrono de extracción de thumbnails de videos que utiliza una API externa de procesamiento de video con arquitectura de colas Redis y BullMQ.

## 🏗️ Arquitectura

```
[Cliente] → [Endpoint Enqueue] → [Redis Queue] → [Worker] → [Video API] → [Callback URL]
```

### Componentes:

1. **Endpoint de Encolamiento** (`POST /video-extractor/enqueue`)
2. **Cola Redis** (BullMQ) para gestionar trabajos
3. **Worker/Procesador** que hace polling a la API externa
4. **Callback** para entregar resultados con file_ids de OpenAI

## 🚀 Endpoints Disponibles

### 1. `POST /video-extractor/enqueue`

Encola una nueva extracción de thumbnails.

**Body:**

```json
{
  "videoUrl": "https://ejemplo.com/video.mp4",
  "callbackUrl": "https://webhook.site/31b126fb-82ba-4274-931a-5ff1ab51b41c",
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
- `callbackUrl` (requerido): URL donde recibir el resultado
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
  "message": "Extracción de thumbnails encolada exitosamente..."
}
```

### 2. `GET /video-extractor/status/{requestId}`

Consulta el estado de una extracción.

**Response:**

```json
{
  "requestId": "uuid-de-la-peticion",
  "status": "completed",
  "state": "completed",
  "progress": 100,
  "result": {
    "success": true,
    "thumbnails": ["thumbnail_0001_1.50s.jpg"],
    "openaiFileIds": ["file-abc123"],
    "totalThumbnails": 5
  }
}
```

### 3. `GET /video-extractor/queue/stats`

Obtiene estadísticas de la cola.

**Response:**

```json
{
  "waiting": 2,
  "active": 1,
  "completed": 45,
  "failed": 1,
  "total": 49
}
```

### 4. `GET /video-extractor/health`

Verifica el estado del servicio.

**Response:**

```json
{
  "status": "healthy",
  "videoExtractor": {
    "configured": true,
    "apiHealthy": true
  },
  "queue": {
    "waiting": 0,
    "active": 1,
    "completed": 10,
    "failed": 0
  }
}
```

### 5. `POST /video-extractor/callback/test`

Endpoint de prueba para recibir callbacks.

## ⚙️ Configuración Requerida

### Variables de Entorno:

```bash
# Video Extractor API
VIDEO_EXTRACTOR_API_URL=https://tu-api-privada.render.com

# Redis (para BullMQ)
REDIS_URL=redis://localhost:6379

# Configuración opcional
VIDEO_EXTRACTOR_POLLING_INTERVAL=2000  # ms
VIDEO_EXTRACTOR_MAX_POLLING_ATTEMPTS=300  # intentos
```

### Configuración por Defecto:

- **FPS:** 1.0 (thumbnails por segundo)
- **Dimensiones:** 320x240 píxeles
- **Formato:** JPG
- **Max Thumbnails:** 10
- **Polling Interval:** 2000ms (2 segundos)
- **Max Polling Attempts:** 300 (10 minutos)

> **Nota Técnica:** El sistema se comunica con una API externa privada en Render.com que procesa los videos y sube automáticamente los thumbnails a OpenAI storage.

## 🔄 Flujo de Trabajo

### 1. **Encolamiento**

```bash
curl -X POST "http://localhost:3000/video-extractor/enqueue" \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://sample-videos.com/zip/10/mp4/SampleVideo_720x480_1mb.mp4",
    "callbackUrl": "https://mi-app.com/video-result",
    "options": {
      "fps": 0.5,
      "width": 640,
      "height": 480,
      "format": "png"
    }
  }'
```

### 2. **Procesamiento Asíncrono**

- El worker toma el job de la cola
- Envía petición a la API externa `/extract-thumbnails`
- Obtiene `task_id` de la API externa
- Hace polling cada 2 segundos hasta completarse

### 3. **Polling a la API Externa**

```bash
# El worker hace esto automáticamente
GET https://tu-api-privada.render.com/status/{task_id}
```

### 4. **Entrega de Resultado**

```bash
# El worker envía esto a tu callbackUrl
POST https://tu-dominio.com/callback
Content-Type: application/json

{
  "success": true,
  "requestId": "uuid-de-tu-peticion",
  "taskId": "task-id-de-la-api-externa",
  "thumbnails": ["thumbnail_0001_1.50s.jpg", "thumbnail_0002_2.50s.jpg"],
  "openaiFileIds": ["file-abc123", "file-def456"],
  "totalThumbnails": 5,
  "duration": 30.5,
  "processingTime": 45000,
  "completedAt": "2024-01-15T10:30:00.000Z",
  "metadata": {
    "taskId": "external-task-id",
    "webhookDelivered": true,
    "extractionOptions": {
      "fps": 0.5,
      "width": 640,
      "height": 480,
      "format": "png"
    }
  }
}
```

## 📊 Logs del Sistema

### Encolamiento Exitoso:

```
📥 [VIDEO_CONTROLLER] === NUEVA PETICIÓN DE EXTRACCIÓN ===
📥 [VIDEO_CONTROLLER] Video URL: https://sample-videos.com/...
📤 [VIDEO_QUEUE] Job encolado exitosamente en 15ms
🎬 [VIDEO_QUEUE] Opciones: FPS=0.5, Tamaño=640x480, Formato=png
✅ [VIDEO_CONTROLLER] Petición encolada exitosamente en 18ms
```

### Procesamiento del Worker:

```
🚀 [VIDEO_PROCESSOR] === PROCESANDO JOB ===
🎬 [VIDEO_EXTRACTOR] === INICIANDO EXTRACCIÓN DE THUMBNAILS ===
✅ [VIDEO_EXTRACTOR] Extracción iniciada exitosamente en 342ms
⏰ [VIDEO_EXTRACTOR] === INICIANDO POLLING ===
✅ [VIDEO_EXTRACTOR] Extracción completada en 45023ms después de 23 intentos
🖼️ [VIDEO_EXTRACTOR] Thumbnails generados: 5
☁️ [VIDEO_EXTRACTOR] OpenAI File IDs: 5
📡 [VIDEO_PROCESSOR] Enviando resultado a callback
🎉 [VIDEO_PROCESSOR] === JOB COMPLETADO EXITOSAMENTE ===
```

## 🧪 Testing

### Prerequisitos:

```bash
# 1. Iniciar Redis (local o Docker)
docker run -d -p 6379:6379 redis:alpine

# 2. Configurar variables de entorno
export VIDEO_EXTRACTOR_API_URL=https://tu-api-privada.render.com
export REDIS_URL=redis://localhost:6379

# 3. Iniciar la aplicación
bun dev
```

### Tests Básicos:

#### 1. **Health Check**

```bash
curl http://localhost:3000/video-extractor/health
```

#### 2. **Extracción Simple**

```bash
curl -X POST "http://localhost:3000/video-extractor/enqueue" \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://sample-videos.com/zip/10/mp4/SampleVideo_720x480_1mb.mp4",
    "callbackUrl": "http://localhost:3000/video-extractor/callback/test"
  }'
```

#### 3. **Monitorear Estado**

```bash
# Usar el requestId devuelto en el paso anterior
curl http://localhost:3000/video-extractor/status/your-request-id
```

## ⚡ Casos de Uso

### 1. **Análisis de Video Educativo**

```json
{
  "videoUrl": "https://mi-plataforma.com/video-leccion-1.mp4",
  "callbackUrl": "https://mi-app.com/video-analysis",
  "metadata": { "type": "educational", "course": "math-101" },
  "options": {
    "fps": 0.2,
    "width": 480,
    "height": 270,
    "format": "jpg",
    "maxThumbnails": 15
  }
}
```

### 2. **Procesamiento de Contenido de Redes Sociales**

```json
{
  "videoUrl": "https://social-platform.com/user-video.mp4",
  "callbackUrl": "https://mi-app.com/social-content",
  "options": {
    "fps": 1.0,
    "width": 320,
    "height": 320,
    "format": "webp",
    "maxThumbnails": 8
  }
}
```

### 3. **Análisis de Presentaciones**

```json
{
  "videoUrl": "https://conference.com/presentation-recording.mp4",
  "callbackUrl": "https://mi-app.com/presentation-analysis",
  "metadata": { "event": "tech-conference-2024", "speaker": "john-doe" },
  "options": {
    "fps": 0.1,
    "width": 800,
    "height": 600,
    "format": "png",
    "maxThumbnails": 20
  }
}
```

## 🚨 Manejo de Errores

### Errores Comunes:

#### 1. **API URL No Configurada**

```json
{
  "statusCode": 503,
  "message": "Video Extractor API no está configurada..."
}
```

#### 2. **Video URL Inválida**

```json
{
  "statusCode": 400,
  "message": "Video URL no tiene un formato válido"
}
```

#### 3. **Parámetros Fuera de Rango**

```json
{
  "statusCode": 400,
  "message": "FPS debe estar entre 0.1 y 30.0"
}
```

#### 4. **Timeout de API Externa**

```json
{
  "success": false,
  "error": "Timeout: La extracción no se completó después de 300 intentos"
}
```

#### 5. **Error de Callback**

```json
{
  "success": true,
  "requestId": "uuid",
  "metadata": {
    "callbackError": "Request failed with status code 404",
    "callbackDelivered": false
  }
}
```

## 📈 Métricas y Monitoreo

### Logs de Rendimiento:

- **Tiempo de encolamiento:** ~15-50ms
- **Tiempo de extracción:** 30-300 segundos (según duración y configuración)
- **Tiempo de callback:** ~100-500ms

### Estado de la Cola:

```
📊 [VIDEO_QUEUE] Estado cola - En espera: 2, Activos: 1
```

## 🔧 Configuración Avanzada

### Personalizar Timeouts:

```bash
# Aumentar tiempo máximo de polling (por defecto 10 minutos)
VIDEO_EXTRACTOR_MAX_POLLING_ATTEMPTS=600  # 20 minutos

# Cambiar intervalo de polling (por defecto 2 segundos)
VIDEO_EXTRACTOR_POLLING_INTERVAL=3000     # 3 segundos
```

### Formatos y Límites:

- **Formatos de video soportados:** MP4, AVI, MOV, MKV, WebM, FLV
- **Formatos de imagen soportados:** JPG, JPEG, PNG, WebP
- **FPS mínimo/máximo:** 0.1 - 30.0
- **Dimensiones:** 64x64 hasta 1920x1080
- **Thumbnails máximos:** 1-100

## 🔗 Integración con OpenAI

El sistema automáticamente:

1. Procesa el video en la API externa
2. Genera thumbnails según la configuración
3. Sube los thumbnails a OpenAI storage
4. Devuelve los `file_ids` para uso inmediato con GPT-4 Vision

### Ejemplo de uso con OpenAI:

```javascript
// Después de recibir el callback con file_ids
const fileIds = result.openaiFileIds; // ["file-abc123", "file-def456"]

// Usar con GPT-4 Vision
const response = await openai.chat.completions.create({
  model: "gpt-4-vision-preview",
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: "Analiza estos thumbnails del video" },
        ...fileIds.map(fileId => ({
          type: "image_file",
          image_file: { file_id: fileId }
        }))
      ]
    }
  ]
});
```

## 🎯 Próximos Pasos (Fuera del MVP)

1. **Dashboard de Monitoreo** - UI para ver estado de extracciones
2. **Retry Logic** - Reintentos automáticos con backoff exponencial
3. **Rate Limiting** - Limitar peticiones por usuario
4. **Webhooks Seguros** - Firma de callbacks con HMAC
5. **Caché de Resultados** - Almacenar file_ids para videos ya procesados
6. **Análisis con IA** - Integración automática con GPT-4 Vision
7. **Batch Processing** - Procesar múltiples videos simultáneamente

¡El MVP está listo para extraer thumbnails de videos de forma asíncrona! 🚀
