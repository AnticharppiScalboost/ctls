# 🧪 Testing con Datos Existentes de Pinecone

## 📋 Datos Disponibles en el Índice

Basándose en el ejemplo proporcionado, el índice `hability-addresses` contiene direcciones con la siguiente estructura:

```json
{
  "namespace": "__default__",
  "ID": "24118134",
  "values": [-0.0158901084, -0.0321895964, ...],
  "metadata": {
    "address_canonical": "cm reserva silvestre lt 16 parc",
    "address_norm": "cm reserva silvestre lt 16 parc",
    "address_raw": "CM RESERVA SILVESTRE LT 16 PARC",
    "address_struct": "{\"via_code\": null, \"via_label\": null, ...}",
    "department": "ANTIOQUIA MUNICIPIO: LA CEJA VEREDA: GUAMITO",
    "id": "24118134",
    "municipality": "LA CEJA VEREDA: GUAMITO",
    "transaction_value_cop": "0.0"
  }
}
```

## 🚀 Comandos de Prueba

### 1. Verificar Conexión y Estadísticas

```bash
# Verificar que Pinecone esté conectado
curl -X GET "http://localhost:3000/addresses/admin/vector-stats"
```

**Respuesta esperada:**
```json
{
  "totalVectorCount": 12345,
  "dimension": 768,
  "indexFullness": 0.1,
  "namespaces": {
    "__default__": {"vectorCount": 12345}
  }
}
```

### 2. Test Básico con Endpoint Específico

```bash
# Test con dirección exacta del ejemplo
curl -X POST "http://localhost:3000/admin/test-existing-vectors" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "cm reserva silvestre lt 16",
    "limit": 5
  }'
```

### 3. Búsqueda Semántica Normal

```bash
# Búsqueda semántica estándar
curl -X POST "http://localhost:3000/addresses/search/semantic" \
  -H "Content-Type: application/json" \
  -d '{
    "address": "cm reserva silvestre",
    "options": {
      "searchRadius": 10,
      "page": 1,
      "limit": 5
    }
  }'
```

### 4. Test de Variaciones de Escritura

```bash
# Test con diferentes formas de escribir la misma dirección
curl -X POST "http://localhost:3000/admin/test-existing-vectors" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "carrera reserva silvestre lote 16",
    "limit": 5
  }'
```

## 📊 Logs Esperados

### Búsqueda Exitosa
```
🧪 [CONTROLLER] === TEST CON VECTORES EXISTENTES ===
🧪 [CONTROLLER] Query: "cm reserva silvestre lt 16"
🧠 [SEMANTIC_SEARCH] ===========================================
🧠 [SEMANTIC_SEARCH] Iniciando búsqueda semántica
🧠 [SEMANTIC_SEARCH] Consulta: "cm reserva silvestre lt 16"
🧠 [SEMANTIC_SEARCH] Texto para embedding: "cm reserva silvestre lt 16 | ..."
✅ [EMBEDDING] Generado exitosamente en 342ms (768 dimensiones)
🔍 [PINECONE_SEARCH] Iniciando búsqueda vectorial
✅ [PINECONE_SEARCH] Completada en 156ms: 5 resultados con score >= 0.6
🎯 [PINECONE_SEARCH] Mejor resultado: "CM RESERVA SILVESTRE LT 16 PARC" (score: 0.9876)
🧠 [SEMANTIC_SEARCH] Usando datos de Pinecone para ID: 24118134
✅ [CONTROLLER] Test completado: 5 resultados encontrados
🎯 [CONTROLLER] Resultado 1: "CM RESERVA SILVESTRE LT 16 PARC" (similarity: 0.9876)
```

### Si No Encuentra Resultados
```
🧠 [SEMANTIC_SEARCH] Sin resultados vectoriales - devolviendo respuesta vacía
⚠️ [CONTROLLER] Test completado: 0 resultados encontrados
```

## 🔧 Configuración de Debug

Para ver logs detallados:

```bash
# En .env
ENABLE_SEMANTIC_DEBUG=true
LOG_LEVEL=debug

# Reiniciar servidor
npm run dev
```

## 🎯 Casos de Prueba Específicos

### Test 1: Dirección Exacta
```json
{
  "query": "CM RESERVA SILVESTRE LT 16 PARC",
  "expected": "Score muy alto (>0.95)"
}
```

### Test 2: Variación de Escritura
```json
{
  "query": "cm reserva silvestre lote 16",
  "expected": "Score alto (>0.8)"
}
```

### Test 3: Abreviaciones
```json
{
  "query": "cr reserva lt 16",
  "expected": "Score moderado (>0.6)"
}
```

### Test 4: Error Tipográfico
```json
{
  "query": "cm reserba silvesttre lt 16",
  "expected": "Score moderado (>0.5)"
}
```

### Test 5: Búsqueda Geográfica
```json
{
  "query": "la ceja antioquia",
  "expected": "Múltiples resultados de La Ceja"
}
```

## 📈 Métricas de Rendimiento

### Tiempos Esperados
- **Embedding generation:** 200-500ms
- **Pinecone search:** 100-300ms
- **Total search:** 400-800ms

### Scores Esperados
- **Dirección exacta:** 0.95-1.0
- **Variación menor:** 0.8-0.95
- **Abreviaciones:** 0.6-0.8
- **Errores tipográficos:** 0.4-0.7

## 🔍 Debugging

### Si No Encuentra Resultados
1. Verificar conexión a Pinecone
2. Verificar que el índice tenga datos
3. Revisar scores mínimos en logs
4. Probar con consultas más genéricas

### Si Los Scores Son Bajos
1. Verificar calidad del embedding
2. Revisar texto normalizado en logs
3. Ajustar parámetros de búsqueda
4. Comparar con direcciones existentes

### Comandos de Debug
```bash
# Ver solo logs de Pinecone
npm run dev | grep "PINECONE"

# Ver solo errores
npm run dev | grep "❌\|ERROR"

# Ver métricas de tiempo
npm run dev | grep "ms\|⏱️"
```

## 🎛️ Ajustes de Configuración

### Para Más Resultados
```javascript
// Reducir score mínimo en semantic-search.service.ts
private calculateMinScore(searchRadius: number): number {
  return 0.4; // Valor más bajo
}
```

### Para Búsquedas Más Rápidas
```javascript
// Reducir topK en semantic-search.service.ts
const topK = Math.min((options.limit || 10) * 2, 50); // Menos vectores
```

## ✅ Checklist de Pruebas

- [ ] ✅ Conexión a Pinecone exitosa
- [ ] ✅ Estadísticas del índice disponibles
- [ ] ✅ Búsqueda con dirección exacta funciona
- [ ] ✅ Búsqueda con variaciones funciona
- [ ] ✅ Logs detallados visibles
- [ ] ✅ Scores apropiados (>0.6 para coincidencias)
- [ ] ✅ Tiempos de respuesta aceptables (<1s)
- [ ] ✅ Fallback a búsqueda tradicional funciona

## 🚨 Troubleshooting

### Error: "PINECONE_API_KEY no configurada"
```bash
echo "PINECONE_API_KEY=tu_key_aqui" >> .env
npm run dev
```

### Error: "Index not found"
```bash
# Verificar nombre del índice en pinecone.service.ts
private readonly indexName: string = 'hability-addresses';
```

### Sin Resultados de Búsqueda
```bash
# Probar con query muy genérico
curl -X POST "http://localhost:3000/admin/test-existing-vectors" \
  -d '{"query": "antioquia", "limit": 10}'
```

¡Con estos tests podrás verificar que la búsqueda semántica funciona correctamente con tus datos existentes! 🎯
