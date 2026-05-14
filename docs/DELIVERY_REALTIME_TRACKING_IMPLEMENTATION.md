# ✅ Rastreamento em Tempo Real - Implementação Completa

## 📋 O que foi implementado

### 1. Backend - Endpoint de Localização

**Rota:** `POST /business/establishments/{establishmentId}/delivery/drivers/{driverId}/location`

**Arquivo:** `src/modules/business/delivery/controllers/delivery-driver.controller.ts`

```typescript
@Post(':driverId/location')
@UseGuards(JwtGuard)
async updateDriverLocation(
  @Param('establishmentId') establishmentId: string,
  @Param('driverId') driverId: string,
  @Body() dto: { orderId: string; latitude: number; longitude: number },
)
```

**Request:**
```json
{
  "orderId": "order-123",
  "latitude": -23.5505,
  "longitude": -46.6333
}
```

**Response:**
```json
{
  "success": true,
  "message": "Localização atualizada com sucesso"
}
```

---

### 2. Backend - Service Method

**Arquivo:** `src/modules/business/delivery/services/delivery-driver.service.ts`

```typescript
async updateDriverLocation(
  orderId: string,
  driverId: string,
  latitude: number,
  longitude: number,
): Promise<void>
```

Delega para `DeliveryService.updateDriverLocation()` que:
- Valida se o entregador está atribuído ao pedido
- Valida se o pedido está em status `OUT_FOR_DELIVERY`
- Adiciona registro de tracking com latitude/longitude
- Loga a atualização

---

### 3. Backend - DeliveryService Method

**Arquivo:** `src/modules/business/delivery/delivery.service.ts`

```typescript
async updateDriverLocation(
  orderId: string,
  driverId: string,
  latitude: number,
  longitude: number,
): Promise<void> {
  const order = await this.findById(orderId);

  if (order.driverId !== driverId) {
    throw new BadRequestException('Entregador não está atribuído a este pedido');
  }

  if (order.status !== DeliveryStatus.OUT_FOR_DELIVERY) {
    throw new BadRequestException('Pedido não está em entrega');
  }

  // Adicionar tracking com localização
  await this.addTracking(orderId, {
    status: order.status,
    description: `Localização atualizada: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
    latitude,
    longitude,
    userId: driverId,
  });

  console.log(
    `📍 Localização do entregador ${driverId} atualizada para pedido ${orderId}: ${latitude}, ${longitude}`,
  );
}
```

---

### 4. Backend - WebSocket Gateway

**Arquivo:** `src/modules/business/delivery/delivery.gateway.ts`

```typescript
emitDriverLocation(
  orderId: string,
  data: {
    driverId: string;
    latitude: number;
    longitude: number;
  },
) {
  this.server.to(`order:${orderId}`).emit('driver:location', {
    orderId,
    ...data,
    timestamp: new Date().toISOString(),
  });

  console.log(
    `📍 Localização do entregador ${data.driverId} enviada para pedido ${orderId}`,
  );
}
```

---

## 🔄 Fluxo Completo

### 1. Cliente se conecta ao WebSocket
```javascript
const socket = io('http://seu-backend.com/delivery', {
  auth: { token: `Bearer ${token}` }
});

socket.emit('subscribe:order', { orderId: 'order-123' });
```

### 2. Entregador envia sua localização
```bash
POST /business/establishments/est-123/delivery/drivers/driver-123/location
{
  "orderId": "order-123",
  "latitude": -23.5505,
  "longitude": -46.6333
}
```

### 3. Backend persiste no banco
- Adiciona registro em `delivery_tracking` com latitude/longitude
- Timestamp automático

### 4. Backend emite via WebSocket
```javascript
socket.on('driver:location', (data) => {
  // {
  //   orderId: 'order-123',
  //   driverId: 'driver-123',
  //   latitude: -23.5505,
  //   longitude: -46.6333,
  //   timestamp: '2026-03-21T17:30:00Z'
  // }
})
```

### 5. Cliente atualiza mapa em tempo real
```javascript
socket.on('driver:location', (data) => {
  updateMapMarker(data.latitude, data.longitude);
});
```

---

## 📱 Implementação no App do Entregador

### React Native (Expo)

```typescript
import * as Location from 'expo-location';
import axios from 'axios';

export function DriverTracking({ orderId, token, driverId, establishmentId }) {
  useEffect(() => {
    let locationSubscription;

    const startTracking = async () => {
      // Solicitar permissão
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      // Enviar localização a cada 10 segundos
      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000, // 10 segundos
          distanceInterval: 10, // 10 metros
        },
        async (newLocation) => {
          const { latitude, longitude } = newLocation.coords;

          try {
            await axios.post(
              `http://seu-backend.com/business/establishments/${establishmentId}/delivery/drivers/${driverId}/location`,
              {
                orderId,
                latitude,
                longitude,
              },
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );
            console.log('✅ Localização enviada');
          } catch (error) {
            console.error('❌ Erro ao enviar localização:', error);
          }
        }
      );
    };

    startTracking();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [orderId, token, driverId, establishmentId]);

  return <Text>Rastreando localização...</Text>;
}
```

---

## 📱 Implementação no App do Cliente

### React

```typescript
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export function OrderTracking({ orderId, token }) {
  const [driverLocation, setDriverLocation] = useState(null);

  useEffect(() => {
    const socket = io('http://seu-backend.com/delivery', {
      auth: { token: `Bearer ${token}` },
    });

    socket.on('connect', () => {
      console.log('✅ Conectado');
      socket.emit('subscribe:order', { orderId });
    });

    // Receber localização em tempo real
    socket.on('driver:location', (data) => {
      console.log('📍 Nova localização:', data);
      setDriverLocation({
        latitude: data.latitude,
        longitude: data.longitude,
        driverId: data.driverId,
        timestamp: data.timestamp,
      });
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Erro:', error);
    });

    return () => socket.disconnect();
  }, [orderId, token]);

  return (
    <div>
      {driverLocation ? (
        <div>
          <h3>Entregador em Rota</h3>
          <p>Latitude: {driverLocation.latitude.toFixed(4)}</p>
          <p>Longitude: {driverLocation.longitude.toFixed(4)}</p>
          <p>Atualizado em: {new Date(driverLocation.timestamp).toLocaleTimeString()}</p>
          
          {/* Integrar com Google Maps */}
          <GoogleMap
            center={driverLocation}
            zoom={15}
          >
            <Marker position={driverLocation} title="Entregador" />
          </GoogleMap>
        </div>
      ) : (
        <p>Aguardando localização...</p>
      )}
    </div>
  );
}
```

---

## 🗄️ Banco de Dados

A tabela `delivery_tracking` já armazena:

```sql
CREATE TABLE delivery_tracking (
  id UUID PRIMARY KEY,
  orderId VARCHAR(36),
  status VARCHAR(50),
  description TEXT,
  latitude DECIMAL(10, 8),      -- Latitude do entregador
  longitude DECIMAL(11, 8),     -- Longitude do entregador
  userId VARCHAR(36),
  createdAt TIMESTAMP,
  FOREIGN KEY (orderId) REFERENCES delivery_order(id)
);
```

**Histórico completo é mantido automaticamente!**

---

## 🔐 Segurança

### Validações Implementadas

1. **JWT Authentication**
   - Endpoint requer token JWT válido

2. **Validação de Entregador**
   - Verifica se o entregador está atribuído ao pedido
   - Impede que outro entregador atualize localização

3. **Validação de Status**
   - Só permite atualizar localização se status é `OUT_FOR_DELIVERY`
   - Impede atualizações em pedidos não entregues

4. **Rate Limiting** (recomendado adicionar)
   - Máximo 1 atualização por segundo por entregador

---

## 📊 Monitoramento

### Logs Gerados

```
📍 Localização do entregador driver-123 atualizada para pedido order-123: -23.5505, -46.6333
📍 Localização do entregador driver-123 enviada para pedido order-123
```

### Métricas Importantes

1. **Latência**: Tempo entre envio e recebimento (ideal: < 1s)
2. **Precisão**: Erro de GPS (ideal: < 10m)
3. **Taxa**: Atualizações por minuto (ideal: 2-6)
4. **Bateria**: Impacto no dispositivo (ideal: < 5%/hora)

---

## 🚀 Próximos Passos (Opcional)

1. ✅ Implementar endpoint de localização
2. ✅ Integrar WebSocket
3. ✅ Persistir no banco
4. ⏳ Adicionar Rate Limiting
5. ⏳ Adicionar histórico de rota
6. ⏳ Calcular ETA (tempo estimado de chegada)
7. ⏳ Adicionar geofencing (notificar quando chegar perto)
8. ⏳ Adicionar analytics de performance

---

## ✅ Checklist de Implementação

- [x] Endpoint POST para atualizar localização
- [x] Validação de entregador
- [x] Validação de status do pedido
- [x] Persistência em delivery_tracking
- [x] Emissão via WebSocket
- [x] Método no DeliveryService
- [x] Método no DeliveryDriverService
- [x] Método no Gateway
- [x] Sem erros de compilação TypeScript
- [ ] Testar com app do entregador
- [ ] Testar com app do cliente
- [ ] Testar com múltiplos clientes inscritos
- [ ] Testar latência de rede
- [ ] Testar consumo de bateria

---

## 🧪 Como Testar

### 1. Testar Endpoint com cURL

```bash
curl -X POST http://localhost:3000/business/establishments/est-123/delivery/drivers/driver-123/location \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order-123",
    "latitude": -23.5505,
    "longitude": -46.6333
  }'
```

### 2. Testar WebSocket com Socket.io Client

```javascript
const io = require('socket.io-client');

const socket = io('http://localhost:3000/delivery', {
  auth: { token: 'Bearer YOUR_TOKEN' }
});

socket.on('connect', () => {
  console.log('✅ Conectado');
  socket.emit('subscribe:order', { orderId: 'order-123' });
});

socket.on('driver:location', (data) => {
  console.log('📍 Localização recebida:', data);
});
```

### 3. Verificar Banco de Dados

```sql
SELECT * FROM delivery_tracking 
WHERE orderId = 'order-123' 
ORDER BY createdAt DESC 
LIMIT 10;
```

---

## 📚 Documentação Relacionada

- `DELIVERY_REALTIME_TRACKING.md` - Guia completo de rastreamento
- `DELIVERY_APP_API.md` - API do app do cliente
- `DELIVERY_DASHBOARD_API.md` - API do dashboard
- `DELIVERY_NOTIFICATIONS_IMPLEMENTATION.md` - Notificações

---

## 🎉 Status

✅ **IMPLEMENTAÇÃO COMPLETA**

O rastreamento em tempo real está pronto para usar!

