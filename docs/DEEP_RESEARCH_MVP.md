# 🔍 Deep Research MVP - Perplexity Integration

## 📋 Descripción

Sistema asíncrono de investigación profunda que utiliza la API de Perplexity (sonar-deep-research) con arquitectura de colas Redis y BullMQ.

## 🏗️ Arquitectura

```
[Cliente] → [Endpoint Enqueue] → [Redis Queue] → [Worker] → [Perplexity API] → [Callback URL]
```

### Componentes:

1. **Endpoint de Encolamiento** (`POST /deep-research/enqueue`)
2. **Cola Redis** (BullMQ) para gestionar trabajos
3. **Worker/Procesador** que hace polling a Perplexity
4. **Callback** para entregar resultados

## 🚀 Endpoints Disponibles

### 1. `POST /deep-research/enqueue`

Encola una nueva investigación profunda.

**Body:**

```json
{
  "prompt": "Tu pregunta de investigación aquí",
  "callbackUrl": "https://webhook.site/31b126fb-82ba-4274-931a-5ff1ab51b41c",
  "requestId": "optional-custom-id",
  "metadata": {
    "cualquier": "dato adicional"
  },
  "options": {
    "maxTokens": 4096,
    "temperature": 0.7,
    "model": "sonar-deep-research"
  }
}
```

**Response:**

```json
{
  "success": true,
  "requestId": "uuid-generado-automaticamente",
  "message": "Investigación encolada exitosamente..."
}
```

### 2. `GET /deep-research/health`

Verifica el estado del servicio.

**Response:**

```json
{
  "status": "healthy|degraded",
  "perplexity": true,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 3. `POST /deep-research/callback/test`

Endpoint de prueba para recibir callbacks.

## ⚙️ Configuración Requerida

### Variables de Entorno:

```bash
# Perplexity API
PERPLEXITY_API_KEY=tu_api_key_aqui

# Redis (para BullMQ)
REDIS_URL=redis://localhost:6379
```

### Configuración por Defecto:

- **Modelo:** `sonar-deep-research`
- **Max Tokens:** 8192
- **Temperature:** 0.7
- **Polling Interval:** 1000ms (1 segundo)
- **Max Polling Attempts:** 300 (5 minutos)

> **Nota Técnica:** El sistema maneja automáticamente las diferencias de estructura de payload entre modelos. Para `sonar-deep-research`, el payload se envuelve en un campo `request` según los requerimientos de la API de Perplexity.

## 🔄 Flujo de Trabajo

### 1. **Encolamiento**

```bash
curl -X POST "http://localhost:3000/deep-research/enqueue" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "¿Cuáles son las tendencias de IA en 2024?",
    "callbackUrl": "https://mi-app.com/research-result"
  }'
```

### 2. **Procesamiento Asíncrono**

- El worker toma el job de la cola
- Envía petición a Perplexity `/async/chat/completions`
- Obtiene `request_id` de Perplexity
- Hace polling cada 1 segundo hasta completarse

### 3. **Polling a Perplexity**

```bash
# El worker hace esto automáticamente
GET https://api.perplexity.ai/async/chat/completions/{request_id}
Authorization: Bearer {API_KEY}
```

### 4. **Entrega de Resultado**

```bash
# El worker envía esto a tu callbackUrl
POST https://tu-dominio.com/callback
Content-Type: application/json

{
  "success": true,
  "requestId": "uuid-de-tu-peticion",
  "content": "Resultado de la investigación...",
  "usage": {
    "prompt_tokens": 150,
    "completion_tokens": 2048,
    "total_tokens": 2198
  },
  "processingTime": 45000,
  "completedAt": "2024-01-15T10:30:00.000Z"
}
```

## 📊 Logs del Sistema

### Encolamiento Exitoso:

```
📥 [CONTROLLER] === NUEVA PETICIÓN DE INVESTIGACIÓN ===
📥 [CONTROLLER] Prompt: "¿Cuáles son las tendencias de IA en 2024?..."
📥 [CONTROLLER] Callback URL: https://mi-app.com/callback
📤 [RESEARCH_QUEUE] Job encolado exitosamente en 15ms
📤 [RESEARCH_QUEUE] Job ID: uuid-generado
✅ [CONTROLLER] Petición encolada exitosamente en 18ms
```

### Procesamiento del Worker:

```
🚀 [RESEARCH_PROCESSOR] === PROCESANDO JOB ===
🚀 [RESEARCH_PROCESSOR] Request ID: uuid-generado
🔍 [PERPLEXITY] === INICIANDO INVESTIGACIÓN PROFUNDA ===
✅ [PERPLEXITY] Petición iniciada exitosamente en 342ms
⏰ [PERPLEXITY] === INICIANDO POLLING ===
⏰ [PERPLEXITY] Intento 1/300...
✅ [PERPLEXITY] Investigación completada en 45023ms después de 45 intentos
📡 [RESEARCH_PROCESSOR] Enviando resultado a callback
✅ [RESEARCH_PROCESSOR] Job completado exitosamente en 45156ms
```

## 🧪 Testing

### Prerequisitos:

```bash
# 1. Iniciar Redis (local o Docker)
docker run -d -p 6379:6379 redis:alpine

# 2. Configurar variables de entorno
export PERPLEXITY_API_KEY=tu_api_key
export REDIS_URL=redis://localhost:6379

# 3. Iniciar la aplicación
npm run start:dev
```

### Tests Básicos:

#### 1. **Health Check**

```bash
curl http://localhost:3000/deep-research/health
```

#### 2. **Investigación Simple**

```bash
curl -X POST "http://localhost:3000/deep-research/enqueue" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explica las ventajas de TypeScript sobre JavaScript",
    "callbackUrl": "http://localhost:3000/deep-research/callback/test"
  }'
```

#### 3. **Monitorear Logs**

Los logs muestran todo el flujo:

- Encolamiento → Procesamiento → Perplexity → Callback

## ⚡ Casos de Uso

### 1. **Investigación de Mercado**

```json
{
  "prompt": "Analiza el mercado de criptomonedas en 2024",
  "callbackUrl": "https://mi-app.com/market-analysis",
  "metadata": { "type": "market_research" }
}
```

### 2. **Análisis Técnico**

```json
{
  "prompt": "Compara frameworks de JavaScript: React vs Vue vs Angular",
  "callbackUrl": "https://mi-app.com/tech-analysis",
  "options": { "maxTokens": 6144, "temperature": 0.3 }
}
```

### 3. **Investigación Académica**

```json
{
  "prompt": "Últimos avances en computación cuántica y sus aplicaciones",
  "callbackUrl": "https://mi-app.com/academic-research",
  "metadata": { "field": "quantum_computing", "depth": "comprehensive" }
}
```

## 🚨 Manejo de Errores

### Errores Comunes:

#### 1. **API Key No Configurada**

```json
{
  "statusCode": 503,
  "message": "Perplexity API no está configurada..."
}
```

#### 2. **Callback URL Inválida**

```json
{
  "success": false,
  "error": "Error enviando callback: Request failed with status code 404"
}
```

#### 3. **Timeout de Perplexity**

```json
{
  "success": false,
  "error": "Timeout: La investigación no se completó después de 300 intentos"
}
```

#### 4. **Campo 'request' Requerido (RESUELTO)**

**Error previo (ya corregido):**
```json
{
  "error": {
    "message": "[\"At body -> request: Field required\"]",
    "type": "bad_request",
    "code": 400
  }
}
```

**Causa:** El modelo `sonar-deep-research` requiere una estructura de payload específica donde el request debe estar envuelto en un campo `request`.

**Solución implementada:** El sistema ahora detecta automáticamente el modelo `sonar-deep-research` y ajusta la estructura del payload:

```typescript
// Estructura automática para sonar-deep-research:
{
  "request": {
    "model": "sonar-deep-research",
    "messages": [...],
    "max_tokens": 4096,
    // ... otros parámetros
  }
}

// Estructura normal para otros modelos:
{
  "model": "otro-modelo",
  "messages": [...],
  "max_tokens": 4096,
  // ... otros parámetros
}
```

## 📈 Métricas y Monitoreo

### Logs de Rendimiento:

- **Tiempo de encolamiento:** ~15-50ms
- **Tiempo de investigación:** 30-300 segundos (según complejidad)
- **Tiempo de callback:** ~100-500ms

### Estado de la Cola:

```
📊 [RESEARCH_QUEUE] Estado cola - En espera: 2, Activos: 1
```

## 🔧 Configuración Avanzada

### Personalizar Timeouts:

```bash
# Aumentar tiempo máximo de polling (por defecto 5 minutos)
PERPLEXITY_MAX_POLLING_ATTEMPTS=600  # 10 minutos

# Cambiar intervalo de polling (por defecto 1 segundo)
PERPLEXITY_POLLING_INTERVAL=2000     # 2 segundos
```

### Redis Personalizado:

```bash
# Redis remoto
REDIS_URL=redis://usuario:password@redis-host:6379/0

# Redis con SSL
REDIS_URL=rediss://usuario:password@redis-host:6380/0
```

## 🎯 Próximos Pasos (Fuera del MVP)

1. **Dashboard de Monitoreo** - UI para ver estado de jobs
2. **Retry Logic** - Reintentos automáticos con backoff exponencial
3. **Rate Limiting** - Limitar peticiones por usuario/API key
4. **Webhooks Seguros** - Firma de callbacks con HMAC
5. **Persistencia de Resultados** - Almacenar en BD para consulta posterior

¡El MVP está listo para procesar investigaciones profundas de forma asíncrona! 🚀
