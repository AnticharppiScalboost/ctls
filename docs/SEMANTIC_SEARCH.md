# 🧠 Búsqueda Semántica de Direcciones

## 🎯 Funcionalidad

Sistema avanzado de búsqueda de direcciones que utiliza **embeddings vectoriales** para encontrar direcciones similares por significado, no solo por texto exacto. Integra **Pinecone** como base de datos vectorial y **Replicate** para generar embeddings.

## 🚀 Ventajas sobre Búsqueda Tradicional

- **Tolerancia a errores de escritura:** "clle 15" encuentra "calle 15"
- **Comprensión semántica:** "carrera 7" ≈ "kr 7" ≈ "cr 7"
- **Búsqueda inteligente:** Encuentra direcciones relacionadas por contexto
- **Mejor ranking:** Resultados ordenados por similitud semántica real

## 📡 Endpoints

### 1. Búsqueda Automática
```
POST /addresses/search/proximity
```
Usa búsqueda semántica si está configurada, sino fallback a tradicional.

### 2. Búsqueda Semántica Explícita
```
POST /addresses/search/semantic
```
Fuerza el uso de búsqueda vectorial.

### 3. Migración de Datos (Admin)
```
POST /addresses/admin/migrate-vectors
GET /addresses/admin/vector-stats
```

## 🛠️ Configuración

### Variables de Entorno Requeridas

```bash
# Pinecone (base de datos vectorial)
PINECONE_API_KEY=your_pinecone_api_key

# Replicate (generación de embeddings)
REPLICATE_API_TOKEN=your_replicate_token

# Base de datos (existente)
DATABASE_URL=postgresql://...
```

### Obtener API Keys

**Pinecone:**
1. Ve a [Pinecone.io](https://www.pinecone.io/)
2. Crea una cuenta gratuita
3. Genera una API key en el dashboard
4. Usa el plan "Starter" (gratuito)

**Replicate:**
1. Ve a [Replicate.com](https://replicate.com/)
2. Crea una cuenta
3. Genera un token en Settings > API tokens
4. El modelo usado: `mark3labs/embeddings-gte-base`

## 🔄 Proceso de Migración

### 1. Migración Test (Recomendado primero)
```bash
curl -X POST "http://localhost:3000/addresses/admin/migrate-vectors" \
  -H "Content-Type: application/json" \
  -d '{"testMode": true, "batchSize": 10}'
```

### 2. Migración Completa
```bash
curl -X POST "http://localhost:3000/addresses/admin/migrate-vectors" \
  -H "Content-Type: application/json" \
  -d '{"testMode": false, "batchSize": 50, "skipExisting": true}'
```

### Parámetros de Migración
- `testMode`: Solo procesa 100 registros (para pruebas)
- `batchSize`: Direcciones por lote (recomendado: 50)
- `skipExisting`: Saltar registros ya vectorizados
- `maxRetries`: Reintentos por lote en caso de error

## 📊 Monitoreo

### Estadísticas del Índice
```bash
curl "http://localhost:3000/addresses/admin/vector-stats"
```

### Logs de Progreso
Durante la migración verás logs como:
```
🚀 INICIANDO MIGRACIÓN DE DIRECCIONES A VECTORES
📊 Total direcciones en BD: 50000
🎯 Direcciones a procesar: 50000
📦 Procesando lote 1/1000 (50 direcciones)
📈 Progreso: 50/50000 (0.1%)
⏱️  Tiempo estimado restante: 167 minutos
```

## 🔍 Ejemplos de Uso

### Búsqueda Básica
```json
{
  "address": "calle 16 #31",
  "options": {
    "searchRadius": 5,
    "page": 1,
    "limit": 10
  }
}
```

### Búsqueda con Filtros Geográficos
```json
{
  "address": "avenida 68",
  "options": {
    "searchRadius": 20,
    "municipality": "BOGOTA",
    "includeNeighborhoods": true,
    "page": 1,
    "limit": 15
  }
}
```

### Respuesta Típica
```json
{
  "normalizedAddress": {
    "viaCode": "cl",
    "viaLabel": "16",
    "primaryNumber": 31,
    "addressStruct": "cl 16 #31"
  },
  "nearbyAddresses": [
    {
      "address": {
        "id": "12345",
        "addressRaw": "CALLE 16 NO 31-15",
        "similarity": 0.95,
        "distance": 0.2
      }
    }
  ],
  "searchMetadata": {
    "totalFound": 25,
    "processingTime": 340,
    "searchRadius": 5
  }
}
```

## 🧪 Testing

### Comparación de Métodos
```bash
# Tradicional
curl -X POST "http://localhost:3000/addresses/search/proximity" \
  -d '{"address": "clle 15 # 23", "options": {"searchRadius": 10}}'

# Semántica
curl -X POST "http://localhost:3000/addresses/search/semantic" \
  -d '{"address": "clle 15 # 23", "options": {"searchRadius": 10}}'
```

La búsqueda semántica debería encontrar más resultados relevantes para consultas con errores tipográficos.

## ⚡ Rendimiento

### Tiempos Esperados
- **Búsqueda:** 200-500ms (depende de Pinecone/Replicate)
- **Migración:** ~2-5 minutos por cada 1000 direcciones
- **Embedding:** ~200ms por dirección

### Optimizaciones
- Búsquedas se realizan en paralelo con la BD
- Embeddings se cachean automáticamente en Pinecone
- Resultados se filtran por score mínimo según radio

## 🚨 Troubleshooting

### Error: "PINECONE_API_KEY no configurada"
- Verifica la variable de entorno
- Reinicia el servidor

### Error: "REPLICATE_API_TOKEN no configurada"  
- Genera token en Replicate.com
- Agrega a tu `.env`

### Migración muy lenta
- Reduce `batchSize` a 20-30
- Verifica conectividad a APIs
- Usa `testMode: true` para pruebas

### Pocos resultados en búsqueda
- Reduce score mínimo modificando `calculateMinScore()`
- Aumenta `searchRadius`
- Verifica que la migración se completó

## 💡 Casos de Uso Avanzados

### Búsqueda Fuzzy
```json
{
  "address": "clle 85 num 15 guion 20",
  "options": {"searchRadius": 15}
}
```

### Búsqueda por Contexto
```json
{
  "address": "cerca al centro comercial andino",
  "options": {"searchRadius": 50}
}
```

### Búsqueda Multiidioma
```json
{
  "address": "street 15 number 25",
  "options": {"searchRadius": 20}
}
```
