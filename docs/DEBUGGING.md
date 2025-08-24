# 🐛 Guía de Debugging - Búsqueda Semántica

## 🔧 Configuración de Logs

### Variables de Entorno para Debug

```bash
# Habilitar logs detallados de debug
ENABLE_SEMANTIC_DEBUG=true

# Nivel de log (error, warn, log, debug, verbose)
LOG_LEVEL=debug

# Entorno (development habilita debug automáticamente)
NODE_ENV=development
```

### Niveles de Log

| Nivel | Descripción | Cuándo usar |
|-------|-------------|-------------|
| `error` | Solo errores críticos | Producción |
| `warn` | Errores y advertencias | Producción |
| `log` | Información general | Por defecto |
| `debug` | Información detallada | Desarrollo/Debug |
| `verbose` | Máximo detalle | Debug profundo |

## 📋 Logs por Servicio

### 🔧 [EMBEDDING] - Servicio de Embeddings
```
🔧 [EMBEDDING] Iniciando generación para texto: "calle 16 #31"
🔧 [EMBEDDING] Texto completo: "calle 16 #31 | cl 16 #31 | 16"
🔧 [EMBEDDING] Longitud texto: 25 caracteres
✅ [EMBEDDING] Generado exitosamente en 342ms (768 dimensiones)
🔧 [EMBEDDING] Primeros 5 valores del vector: [0.1234, -0.5678, 0.9012, -0.3456, 0.7890...]
```

### 📤 [PINECONE_UPSERT] - Inserción de Vectores
```
📤 [PINECONE_UPSERT] Iniciando inserción de 50 vectores
📤 [PINECONE_UPSERT] Ejemplo de registro: ID="addr_12345", dimensiones=768
📤 [PINECONE_UPSERT] Dirección ejemplo: "CALLE 16 NO 31-15"
📤 [PINECONE_UPSERT] Procesando lote 1/1 (50 vectores)
✅ [PINECONE_UPSERT] Lote 1 completado en 234ms
✅ [PINECONE_UPSERT] Inserción completada en 234ms (promedio: 5ms por vector)
```

### 🔍 [PINECONE_SEARCH] - Búsqueda Vectorial
```
🔍 [PINECONE_SEARCH] Iniciando búsqueda vectorial
🔍 [PINECONE_SEARCH] Parámetros: topK=30, minScore=0.8
🔍 [PINECONE_SEARCH] Vector dimensión: 768
🔍 [PINECONE_SEARCH] Primeros 5 valores del vector: [0.1234, -0.5678, 0.9012...]
🔍 [PINECONE_SEARCH] Ejecutando consulta en Pinecone...
🔍 [PINECONE_SEARCH] Respuesta de Pinecone recibida en 156ms
🔍 [PINECONE_SEARCH] Matches encontrados: 15
🔍 [PINECONE_SEARCH] Top 3 matches: [
  {"id": "addr_12345", "score": "0.9234", "address": "CALLE 16 NO 31-15..."},
  {"id": "addr_67890", "score": "0.8945", "address": "CALLE 16 NO 29-30..."}
]
✅ [PINECONE_SEARCH] Completada en 156ms: 12 resultados con score >= 0.8
🎯 [PINECONE_SEARCH] Mejor resultado: "CALLE 16 NO 31-15" (score: 0.9234)
```

### 🧠 [SEMANTIC_SEARCH] - Búsqueda Completa
```
🧠 [SEMANTIC_SEARCH] ===========================================
🧠 [SEMANTIC_SEARCH] Iniciando búsqueda semántica
🧠 [SEMANTIC_SEARCH] Consulta: "calle 16 #31"
🧠 [SEMANTIC_SEARCH] Paso 1: Normalizando dirección...
🧠 [SEMANTIC_SEARCH] Dirección normalizada: {"viaCode": "cl", "viaLabel": "16", "primaryNumber": 31}
🧠 [SEMANTIC_SEARCH] Paso 2: Generando texto para embedding...
🧠 [SEMANTIC_SEARCH] Texto para embedding: "calle 16 #31 | cl 16 #31 | 16"
🧠 [SEMANTIC_SEARCH] Paso 3: Generando embedding...
🧠 [SEMANTIC_SEARCH] Embedding generado: 768 dimensiones
🧠 [SEMANTIC_SEARCH] Paso 4: Búsqueda vectorial en Pinecone...
🧠 [SEMANTIC_SEARCH] Resultados vectoriales: 12 encontrados
🧠 [SEMANTIC_SEARCH] Paso 5: Obteniendo datos completos de BD...
🧠 [SEMANTIC_SEARCH] IDs a consultar: [12345, 67890, 54321, 98765, 13579...]
🧠 [SEMANTIC_SEARCH] Datos de BD obtenidos: 12 registros
🧠 [SEMANTIC_SEARCH] Paso 6: Enriqueciendo resultados...
🧠 [SEMANTIC_SEARCH] Resultados enriquecidos: 12 direcciones
🧠 [SEMANTIC_SEARCH] Top 3 resultados: [
  {"id": "12345", "address": "CALLE 16 NO 31-15...", "similarity": "0.9234", "distance": 0.2},
  {"id": "67890", "address": "CALLE 16 NO 29-30...", "similarity": "0.8945", "distance": 1.2}
]
🧠 [SEMANTIC_SEARCH] Paso 7: Aplicando paginación...
🧠 [SEMANTIC_SEARCH] Paginación: página 1, mostrando 10 de 12
✅ [SEMANTIC_SEARCH] Búsqueda completada en 523ms: 12 resultados totales
🧠 [SEMANTIC_SEARCH] ===========================================
```

### 🔍 [CONTROLLER] - Control de Flujo
```
🔍 [CONTROLLER] === BÚSQUEDA DE PROXIMIDAD ===
🔍 [CONTROLLER] Dirección: "calle 16 #31"
🔍 [CONTROLLER] Opciones: {"searchRadius": 5, "page": 1, "limit": 10}
🧠 [CONTROLLER] Usando búsqueda SEMÁNTICA (APIs configuradas)
✅ [CONTROLLER] Búsqueda semántica completada en 523ms - 10 resultados
```

## 🛠️ Herramientas de Debug

### 1. Habilitar Debug Completo
```bash
# En .env
ENABLE_SEMANTIC_DEBUG=true
LOG_LEVEL=debug

# Reiniciar servidor
npm run dev
```

### 2. Debug Solo de Errores
```bash
# En .env
ENABLE_SEMANTIC_DEBUG=false
LOG_LEVEL=error

# Reiniciar servidor
npm run dev
```

### 3. Monitoreo en Tiempo Real
```bash
# Ver logs en tiempo real
npm run dev | grep "SEMANTIC_SEARCH\|EMBEDDING\|PINECONE"

# Filtrar solo errores
npm run dev 2>&1 | grep "ERROR\|❌"

# Ver solo estadísticas de rendimiento
npm run dev | grep "PERFORMANCE\|⏱️"
```

## 🔍 Casos de Debug Comunes

### ❌ Error: "PINECONE_API_KEY no configurada"
```
❌ [CONTROLLER] Búsqueda semántica no configurada (falta PINECONE_API_KEY o REPLICATE_API_TOKEN)
```
**Solución:** Verificar variables de entorno y reiniciar servidor.

### ❌ Error: "No se pudo generar embedding"
```
❌ [EMBEDDING] Error después de 5234ms: Request failed with status 401
❌ [EMBEDDING] Stack trace: ...
```
**Solución:** Verificar token de Replicate y límites de API.

### ⚠️ Pocos Resultados Encontrados
```
🔍 [PINECONE_SEARCH] Matches encontrados: 2
🔍 [PINECONE_SEARCH] Descartando resultado con score 0.6500 < 0.8000
✅ [PINECONE_SEARCH] Completada: 0 resultados con score >= 0.8
```
**Solución:** Reducir `minScore` o aumentar `searchRadius`.

### 🐌 Búsqueda Muy Lenta
```
⏱️ [PERFORMANCE] Embedding generation: 2342ms
⏱️ [PERFORMANCE] Pinecone search: 1567ms
⏱️ [PERFORMANCE] Database query: 234ms
```
**Solución:** Verificar conectividad a APIs y optimizar consultas.

## 📊 Métricas de Rendimiento

### Tiempos Esperados
- **Embedding:** 200-500ms
- **Búsqueda Pinecone:** 100-300ms
- **Consulta BD:** 50-200ms
- **Total:** 400-1000ms

### Alertas de Rendimiento
- **> 1000ms:** Lento (revisar conectividad)
- **> 2000ms:** Muy lento (posible timeout)
- **> 5000ms:** Crítico (revisar configuración)

## 🧪 Comandos de Prueba

### Test de Configuración
```bash
curl -X GET "http://localhost:3000/addresses/admin/vector-stats"
```

### Test de Embedding
```bash
curl -X POST "http://localhost:3000/addresses/search/semantic" \
  -H "Content-Type: application/json" \
  -d '{"address": "test", "options": {"searchRadius": 5, "limit": 1}}'
```

### Test de Migración
```bash
curl -X POST "http://localhost:3000/addresses/admin/migrate-vectors" \
  -H "Content-Type: application/json" \
  -d '{"testMode": true, "batchSize": 5}'
```

## 🔧 Debug Avanzado

### Interceptar Vectores
En código, agregar logs temporales:
```typescript
// En semantic-search.service.ts
console.log('VECTOR DEBUG:', queryVector.slice(0, 10));
```

### Verificar Scores
```typescript
// En pinecone.service.ts  
console.log('SCORES:', results.map(r => ({id: r.id, score: r.score})));
```

### Timing Personalizado
```typescript
const start = Date.now();
// ... operación
console.log(`CUSTOM TIMING: ${Date.now() - start}ms`);
```

## 🎯 Tips de Optimización

1. **Usar testMode** en migraciones iniciales
2. **Reducir batchSize** si hay timeouts
3. **Filtrar por municipio** para búsquedas más rápidas
4. **Aumentar topK** si pocos resultados
5. **Revisar logs de Pinecone** para errores de índice

¿Problemas específicos? Busca el patrón de log correspondiente en esta guía. 🚀
