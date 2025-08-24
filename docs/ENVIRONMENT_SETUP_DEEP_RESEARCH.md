# 🔧 Configuración de Entorno - Deep Research

## 📋 Variables de Entorno Requeridas

### 1. **Perplexity API** (Obligatoria)
```bash
# Tu API key de Perplexity
PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 2. **Redis** (Obligatoria para BullMQ)
```bash
# Opción 1: URL completa (recomendado)
REDIS_URL=redis://localhost:6379

# Opción 2: URL con autenticación
REDIS_URL=redis://usuario:password@localhost:6379/0

# Opción 3: Redis remoto (ej: Railway, Render, etc.)
REDIS_URL=redis://default:password@red-abcdef123456.compute-1.amazonaws.com:6379
```

## 🐳 Redis con Docker (Desarrollo Local)

### Iniciar Redis:
```bash
# Redis básico
docker run -d --name redis -p 6379:6379 redis:alpine

# Redis con persistencia
docker run -d --name redis \
  -p 6379:6379 \
  -v redis-data:/data \
  redis:alpine redis-server --appendonly yes

# Verificar que funciona
docker exec -it redis redis-cli ping
# Debe responder: PONG
```

### Redis Commander (UI opcional):
```bash
docker run -d --name redis-commander \
  -p 8081:8081 \
  --link redis:redis \
  rediscommander/redis-commander:latest \
  --redis-host redis
```
Acceder en: http://localhost:8081

## ☁️ Redis en Servicios Cloud

### Railway:
1. Crear servicio Redis en Railway
2. Copiar la `REDIS_URL` del dashboard
3. Agregar a variables de entorno

### Render:
1. Crear Redis instance en Render
2. Usar la URL interna proporcionada
3. Formato: `redis://red-xxxxx:6379`

### Upstash (Redis serverless):
1. Crear database en https://upstash.com
2. Copiar la Redis URL
3. Usar directamente en `REDIS_URL`

## 🔑 Obtener API Key de Perplexity

### Paso 1: Registro
1. Ir a https://www.perplexity.ai/
2. Crear cuenta o iniciar sesión
3. Acceder al dashboard de API

### Paso 2: Crear API Key
1. Navegar a "API Keys" en el dashboard
2. Clic en "Create New API Key"
3. Nombrar la key (ej: "CTLS-DeepResearch")
4. Copiar la key generada

### Paso 3: Verificar Límites
- **Modelo:** `sonar-deep-research`
- **Rate Limits:** Verificar tu plan
- **Créditos:** Asegurar saldo suficiente

## 📝 Archivo .env de Ejemplo

```bash
# ===== DATABASE =====
DATABASE_URL=postgresql://username:password@localhost:5432/database_name

# ===== SEMANTIC SEARCH =====
PINECONE_API_KEY=your_pinecone_api_key_here
REPLICATE_API_TOKEN=your_replicate_api_token_here

# ===== DEEP RESEARCH (NUEVO) =====
PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
REDIS_URL=redis://localhost:6379

# ===== DEBUG =====
ENABLE_SEMANTIC_DEBUG=false
LOG_LEVEL=info
```

## 🧪 Verificación de Configuración

### 1. **Test Redis:**
```bash
# Desde terminal
redis-cli ping

# Desde Node.js
node -e "
const Redis = require('redis');
const client = Redis.createClient({ url: process.env.REDIS_URL });
client.connect().then(() => console.log('✅ Redis conectado')).catch(console.error);
"
```

### 2. **Test Perplexity API:**
```bash
curl -X POST "https://api.perplexity.ai/chat/completions" \
  -H "Authorization: Bearer $PERPLEXITY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sonar-small-online",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 10
  }'
```

### 3. **Health Check de la App:**
```bash
# Iniciar la aplicación
npm run start:dev

# Verificar endpoint
curl http://localhost:3000/deep-research/health
```

**Respuesta esperada:**
```json
{
  "status": "healthy",
  "perplexity": true,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🚨 Troubleshooting

### Redis Connection Error:
```
Error: Redis connection failed
```
**Soluciones:**
1. Verificar que Redis esté ejecutándose: `docker ps | grep redis`
2. Verificar la URL: `echo $REDIS_URL`
3. Probar conexión manual: `redis-cli -u $REDIS_URL ping`

### Perplexity API Error:
```
Error: Request failed with status code 401
```
**Soluciones:**
1. Verificar API key: `echo $PERPLEXITY_API_KEY`
2. Verificar que el key tenga acceso a `sonar-deep-research`
3. Verificar créditos disponibles en el dashboard

### BullMQ Queue Error:
```
Error: Job processor failed to start
```
**Soluciones:**
1. Verificar Redis connection
2. Revisar logs de la aplicación
3. Verificar que las colas estén registradas correctamente

## 📊 Monitoreo de Recursos

### Redis Memory Usage:
```bash
redis-cli info memory | grep used_memory_human
```

### Queue Stats:
```bash
curl http://localhost:3000/deep-research/health
```

### Application Logs:
```bash
# Ver logs del worker
npm run start:dev | grep "RESEARCH_PROCESSOR"

# Ver logs de Perplexity
npm run start:dev | grep "PERPLEXITY"
```

## 🔧 Configuración Avanzada

### Variables Opcionales:
```bash
# Personalizar timeouts de Perplexity
PERPLEXITY_POLLING_INTERVAL=2000      # 2 segundos (default: 1000)
PERPLEXITY_MAX_POLLING_ATTEMPTS=600   # 10 minutos (default: 300)

# Personalizar modelo por defecto
PERPLEXITY_DEFAULT_MODEL=sonar-deep-research

# Configuración de Redis avanzada
REDIS_RETRY_DELAY_ON_FAILOVER=200
REDIS_MAX_RETRIES_PER_REQUEST=5
```

### Producción:
```bash
# Redis con SSL
REDIS_URL=rediss://user:pass@host:6380/0

# Perplexity con mayor timeout
PERPLEXITY_MAX_POLLING_ATTEMPTS=900   # 15 minutos para investigaciones largas
```

¡Con estas configuraciones el sistema de Deep Research estará listo para funcionar! 🚀
