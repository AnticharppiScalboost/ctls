# 🔧 Configuración de Variables de Entorno para Debug

## Archivo .env para Debugging

Actualiza tu archivo `.env` con estas variables adicionales para habilitar logs detallados:

```bash
# Database (Requerida)
DATABASE_URL=postgresql://user:password@localhost:5432/database_name

# APIs para búsqueda semántica (Requeridas)
PINECONE_API_KEY=your_pinecone_api_key
REPLICATE_API_TOKEN=your_replicate_token

# === CONFIGURACIÓN DE DEBUG ===

# Habilitar logs detallados de debug (true/false)
ENABLE_SEMANTIC_DEBUG=true

# Nivel de log (error, warn, log, debug, verbose)
LOG_LEVEL=debug

# Entorno (development habilita debug automáticamente)
NODE_ENV=development

# Puerto del servidor (Opcional)
PORT=3000
```

## 🎛️ Configuraciones por Escenario

### 🔬 Debug Completo (Desarrollo)
```bash
ENABLE_SEMANTIC_DEBUG=true
LOG_LEVEL=debug
NODE_ENV=development
```
**Resultado:** Logs súper detallados de cada paso, vectores, scores, tiempos.

### 📊 Solo Información (Testing)
```bash
ENABLE_SEMANTIC_DEBUG=false
LOG_LEVEL=log
NODE_ENV=testing
```
**Resultado:** Solo logs importantes sin detalles técnicos.

### ⚠️ Solo Errores (Producción)
```bash
ENABLE_SEMANTIC_DEBUG=false
LOG_LEVEL=error
NODE_ENV=production
```
**Resultado:** Solo errores críticos, sin ruido.

### 🔍 Debug de Rendimiento
```bash
ENABLE_SEMANTIC_DEBUG=true
LOG_LEVEL=verbose
NODE_ENV=development
```
**Resultado:** Máximo detalle incluyendo métricas de rendimiento.

## 📋 Ejemplos de Logs por Configuración

### Con `LOG_LEVEL=debug`
```
🔍 [CONTROLLER] === BÚSQUEDA DE PROXIMIDAD ===
🔍 [CONTROLLER] Dirección: "calle 16 #31"
🧠 [SEMANTIC_SEARCH] Iniciando búsqueda semántica
🔧 [EMBEDDING] Iniciando generación para texto: "calle 16 #31"
🔧 [EMBEDDING] Texto completo: "calle 16 #31 | cl 16 #31"
🔧 [EMBEDDING] Longitud texto: 25 caracteres
✅ [EMBEDDING] Generado exitosamente en 342ms (768 dimensiones)
🔧 [EMBEDDING] Primeros 5 valores del vector: [0.1234, -0.5678...]
🔍 [PINECONE_SEARCH] Iniciando búsqueda vectorial
🔍 [PINECONE_SEARCH] Parámetros: topK=30, minScore=0.8
🔍 [PINECONE_SEARCH] Vector dimensión: 768
🔍 [PINECONE_SEARCH] Ejecutando consulta en Pinecone...
✅ [PINECONE_SEARCH] Completada en 156ms: 12 resultados
🧠 [SEMANTIC_SEARCH] Resultados vectoriales: 12 encontrados
✅ [CONTROLLER] Búsqueda semántica completada en 523ms - 10 resultados
```

### Con `LOG_LEVEL=log`
```
🔍 [CONTROLLER] === BÚSQUEDA DE PROXIMIDAD ===
🧠 [SEMANTIC_SEARCH] Iniciando búsqueda semántica
✅ [EMBEDDING] Generado exitosamente en 342ms (768 dimensiones)
✅ [PINECONE_SEARCH] Completada en 156ms: 12 resultados
✅ [CONTROLLER] Búsqueda semántica completada en 523ms - 10 resultados
```

### Con `LOG_LEVEL=error`
```
# Solo si hay errores:
❌ [EMBEDDING] Error después de 5234ms: Request failed with status 401
❌ [CONTROLLER] Error en búsqueda semántica: No se pudo generar embedding
```

## 🚀 Comandos de Prueba con Debug

### 1. Iniciar con Debug Habilitado
```bash
# Establecer variables
export ENABLE_SEMANTIC_DEBUG=true
export LOG_LEVEL=debug

# Iniciar servidor
npm run dev
```

### 2. Test de Configuración
```bash
curl -X GET "http://localhost:3000/addresses/admin/vector-stats"
```

**Logs esperados:**
```
📊 [CONTROLLER] === ESTADÍSTICAS DE VECTORES ===
🔧 [CONFIG] Pinecone: ✅ CONFIGURADO
📊 [CONTROLLER] Estadísticas obtenidas: {"totalVectorCount": 1234, ...}
```

### 3. Test de Búsqueda Semántica
```bash
curl -X POST "http://localhost:3000/addresses/search/semantic" \
  -H "Content-Type: application/json" \
  -d '{
    "address": "calle 16 numero 31",
    "options": {"searchRadius": 5, "limit": 5}
  }'
```

**Logs esperados:** Ver flujo completo arriba.

### 4. Test de Migración
```bash
curl -X POST "http://localhost:3000/addresses/admin/migrate-vectors" \
  -H "Content-Type: application/json" \
  -d '{"testMode": true, "batchSize": 5}'
```

**Logs esperados:**
```
🔄 [CONTROLLER] === MIGRACIÓN DE VECTORES ===
⚠️ [CONTROLLER] MODO TEST activado - solo procesará 100 registros
🚀 INICIANDO MIGRACIÓN DE DIRECCIONES A VECTORES
📊 Total direcciones en BD: 50000
🎯 Direcciones a procesar: 100
📦 Procesando lote 1/20 (5 direcciones)
📦 [BATCH_EMBEDDING] Iniciando generación para 5 textos
✅ [BATCH_EMBEDDING] Lote 1 completado en 1234ms
📤 [PINECONE_UPSERT] Iniciando inserción de 5 vectores
✅ [PINECONE_UPSERT] Inserción completada en 234ms
✅ MIGRACIÓN COMPLETADA
```

## 🛠️ Filtrado de Logs

### Ver Solo Logs de Búsqueda
```bash
npm run dev | grep "SEMANTIC_SEARCH\|CONTROLLER"
```

### Ver Solo Logs de Embedding
```bash
npm run dev | grep "EMBEDDING\|BATCH_EMBEDDING"
```

### Ver Solo Logs de Pinecone
```bash
npm run dev | grep "PINECONE"
```

### Ver Solo Errores
```bash
npm run dev 2>&1 | grep "❌\|ERROR"
```

### Ver Solo Métricas de Rendimiento
```bash
npm run dev | grep "⏱️\|PERFORMANCE\|completada en\|ms"
```

## 🔧 Debug Dinámico

### Cambiar Nivel de Log Sin Reiniciar
Aunque no está implementado aún, podrías agregar un endpoint:

```bash
# Futuro endpoint para cambiar nivel de log
curl -X POST "http://localhost:3000/admin/debug-level" \
  -d '{"level": "verbose"}'
```

## 📊 Interpretación de Logs

### ✅ Funcionamiento Normal
- Tiempos de embedding: 200-500ms
- Tiempos de Pinecone: 100-300ms
- Scores típicos: 0.7-0.95
- Resultados encontrados: 5-50

### ⚠️ Señales de Alerta
- Tiempos > 1000ms: Revisar conectividad
- Scores < 0.5: Pocos resultados relevantes
- 0 resultados: Revisar configuración o consulta

### ❌ Problemas Críticos
- Timeouts: Revisar APIs
- 401/403 errors: Revisar API keys
- 0 vectores en índice: Ejecutar migración

## 🎯 Tips de Debug

1. **Siempre empezar con `testMode: true`** en migraciones
2. **Usar `debug` level** para problemas específicos
3. **Filtrar logs** para enfocarse en un componente
4. **Comparar tiempos** antes/después de cambios
5. **Verificar scores** para entender relevancia

¡Con estos logs podrás debuggear cualquier problema en la búsqueda semántica! 🚀
