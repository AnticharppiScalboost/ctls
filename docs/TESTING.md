# 🧪 Guía de Pruebas - Servicio de Búsqueda de Proximidad

## 📋 Archivos de Prueba Disponibles

### 1. **test-requests.http** 
Archivo para usar con REST Client (extensión de VS Code) o herramientas similares.
- ✅ 15 pruebas diferentes organizadas por escenarios
- ✅ Incluye tanto GET como POST requests
- ✅ Ejemplos con datos reales de la BD

### 2. **test-curl.sh**
Script bash para ejecutar todas las pruebas desde terminal.
```bash
chmod +x test-curl.sh
./test-curl.sh
```

## 🎯 Casos de Prueba Incluidos

### **Básicas**
1. **Verificar servidor** - `GET /`
2. **Obtener direcciones** - `GET /addresses`
3. **Búsqueda simple** - `GET /addresses/search/proximity`

### **Funcionalidad Principal**
4. **Radio configurable** - Prueba con radius=10, 20, 50
5. **Incluir barrios** - `includeNeighborhoods=true`
6. **Incluir cuadrantes** - `includeQuadrants=true`
7. **Búsqueda exacta** - `exactMatch=true`

### **Con Datos Reales**
8. **KR 81** - Basado en datos existentes en BD
9. **Pereira** - Direcciones rurales
10. **Bogotá** - Direcciones urbanas

### **Edge Cases**
11. **Sin resultados** - Direcciones inexistentes
12. **Caracteres especiales** - Carrera 7ª
13. **Rendimiento** - Radio muy amplio (100 calles)

### **Diferentes Formatos**
14. **GET con query params**
15. **POST con JSON payload**

## 🚀 Cómo Probar

### **Opción 1: VS Code + REST Client**
1. Instalar extensión "REST Client"
2. Abrir `test-requests.http`
3. Hacer clic en "Send Request" sobre cada prueba

### **Opción 2: Script Bash**
```bash
# Ejecutar todas las pruebas
./test-curl.sh

# Ver resultados con formato JSON (requiere jq)
sudo apt install jq  # Ubuntu/Debian
./test-curl.sh
```

### **Opción 3: cURL Manual**
```bash
# Búsqueda con POST (único método disponible)
curl -X POST "http://localhost:3000/addresses/search/proximity" \
  -H "Content-Type: application/json" \
  -d '{
    "address": "KR 81 #55", 
    "options": {
      "searchRadius": 5,
      "page": 1,
      "limit": 10
    }
  }'
```

## 📊 Resultados Esperados

### **Respuesta Exitosa**
```json
{
  "normalizedAddress": {
    "viaCode": "calle",
    "viaLabel": "85", 
    "primaryNumber": 85,
    "neighborhood": "centro",
    "addressStruct": "calle 85 #85 Barrio centro"
  },
  "nearbyAddresses": [
    {
      "address": {...},
      "similarity": 0.8,
      "distance": 2
    }
  ],
  "searchMetadata": {
    "totalFound": 5,
    "searchRadius": 10,
    "processingTime": 1200
  }
}
```

### **Métricas de Performance**
- ⏱️ **Tiempo de respuesta**: 1-3 segundos típico
- 🎯 **Precisión**: Similarity score 0.0-1.0
- 📏 **Distancia**: Calculada en calles/números

## 🐛 Troubleshooting

### **Servidor no responde**
```bash
# Verificar que el servidor esté corriendo
npm run dev

# Verificar puerto 3000
netstat -tlnp | grep 3000
```

### **Sin resultados en búsquedas**
- La BD podría estar vacía o sin datos que coincidan
- Probar con direcciones basadas en datos reales (KR 81, Pereira)
- Aumentar el `searchRadius`

### **Errores de SQL**
- Revisar logs del servidor en terminal
- Verificar conexión a la base de datos
- Comprobar que las migraciones se ejecutaron

## 📈 Optimizaciones Recomendadas

1. **Índices de BD**: Ya incluidos en el schema
2. **Cache**: Implementar Redis para búsquedas frecuentes
3. **Paginación**: Limitar resultados con LIMIT/OFFSET
4. **Logging**: Agregar métricas de performance

---
*Todas las pruebas están diseñadas para validar la funcionalidad completa del servicio de búsqueda de proximidad.*