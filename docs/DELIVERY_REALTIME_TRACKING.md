# 🗺️ Rastreamento em Tempo Real de Entregador

Guia completo para implementar rastreamento em tempo real da localização do entregador.

## 📊 Status Atual

✅ **WebSocket Gateway já existe** - `src/modules/business/delivery/delivery.gateway.ts`
✅ **Tracking Entity já existe** - Armazena latitude/longitude
✅ **Método de envio já existe** - `driver:location` event

❌ **O que falta:**
- App do entregador enviar localização periodicamente
- App do cliente receber localização em tempo real
- Persistência de histórico de localização

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENTE (App)                             │
│  - Se inscreve no pedido via WebSocket                       │
│  - Recebe atualizações de localização em tempo real          │
│  - Mostra mapa com localização do entregador                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ WebSocket
                     │ subscribe:order
                     │
┌────────────────────▼────────────────────────────────────────┐
│              DELIVERY GATEWAY (Backend)                      │
│  - Gerencia conexões WebSocket                               │
│  - Recebe localização do entregador                          │
│  - Broadcast para clientes inscritos                         │
│  - Persiste no banco de dados                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ WebSocket
                     │ driver:location
                     │
┌────────────────────▼────────────────────────────────────────┐
│              ENTREGADOR (App Mobile)                         │
│  - Envia localização a cada 10-30 segundos                   │
│  - Usa GPS do dispositivo                                    │
│  - Continua mesmo com app em background                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Implementação

### Passo 1: App do Entregador - Enviar Localização

**Arquivo:** `src/modules/business/delivery/controllers/delivery-driver.controller.ts`

Adicionar endpoint para o entregador enviar sua localização:

```typescript
@Post('drivers/:driverId/location')
@UseGuards(JwtGuard)
async updateDriverLocation(
  @Param('driverId') driverId: string,
  @Body() dto: {
    orderId: string;
    latitude: number;
    longitude: number;
  },
  @Request() req: any,
) {
  // Validar se o driver é o usuário autenticado
  if (req.user.id !== driverId) {
    throw new ForbiddenException('Você não pode atualizar localização de outro entregador');
  }

  // Atualizar localização no banco
  await this.deliveryService.updateDriverLocation(
    orderId,
    driverId,
    dto.latitude,
    dto.longitude,
  );

  // Emitir via WebSocket para clientes inscritos
  this.deliveryGateway.emitDriverLocation(orderId, {
    driverId,
    latitude: dto.latitude,
    longitude: dto.longitude,
  });

  return {
    success: true,
    message: 'Localização atualizada',
  };
}
```

---

### Passo 2: Adicionar Método no DeliveryService

**Arquivo:** `src/modules/business/delivery/delivery.service.ts`

```typescript
/**
 * Atualizar localização do entregador
 */
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

  // Adicionar tracking com localização
  await this.addTracking(orderId, {
    status: order.status,
    description: `Localização atualizada: ${latitude}, ${longitude}`,
    latitude,
    longitude,
    userId: driverId,
  });

  this.logger.log(`📍 Localização do entregador ${driverId} atualizada para pedido ${orderId}`);
}
```

---

### Passo 3: Atualizar Gateway WebSocket

**Arquivo:** `src/modules/business/delivery/delivery.gateway.ts`

Adicionar método para emitir localização:

```typescript
/**
 * Emitir localização do entregador para clientes inscritos
 */
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

### Passo 4: App do Cliente - Receber Localização

**React/React Native:**

```typescript
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export function OrderTracking({ orderId, token }) {
  const [driverLocation, setDriverLocation] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Conectar ao WebSocket
    const newSocket = io('http://seu-backend.com/delivery', {
      auth: {
        token: `Bearer ${token}`,
      },
    });

    // Se conectou com sucesso
    newSocket.on('connect', () => {
      console.log('✅ Conectado ao servidor de rastreamento');

      // Se inscrever no pedido
      newSocket.emit('subscribe:order', { orderId });
    });

    // Receber atualizações de localização
    newSocket.on('driver:location', (data) => {
      console.log('📍 Nova localização:', data);
      setDriverLocation({
        latitude: data.latitude,
        longitude: data.longitude,
        timestamp: data.timestamp,
      });
    });

    // Receber atualizações de status
    newSocket.on('status:update', (data) => {
      console.log('📢 Status atualizado:', data);
    });

    // Erro de conexão
    newSocket.on('connect_error', (error) => {
      console.error('❌ Erro de conexão:', error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [orderId, token]);

  return (
    <div>
      {driverLocation ? (
        <div>
          <h3>Localização do Entregador</h3>
          <p>Latitude: {driverLocation.latitude}</p>
          <p>Longitude: {driverLocation.longitude}</p>
          <p>Atualizado em: {new Date(driverLocation.timestamp).toLocaleTimeString()}</p>
          
          {/* Integrar com Google Maps ou Mapbox */}
          <MapComponent
            latitude={driverLocation.latitude}
            longitude={driverLocation.longitude}
          />
        </div>
      ) : (
        <p>Aguardando localização do entregador...</p>
      )}
    </div>
  );
}
```

---

### Passo 5: App do Entregador - Enviar Localização Periodicamente

**React Native (Expo):**

```typescript
import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import axios from 'axios';

export function DriverTracking({ orderId, token, driverId }) {
  const [location, setLocation] = useState(null);

  useEffect(() => {
    let locationSubscription;

    const startTracking = async () => {
      // Solicitar permissão de localização
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('Permissão de localização negada');
        return;
      }

      // Enviar localização a cada 10 segundos
      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000, // 10 segundos
          distanceInterval: 10, // 10 metros
        },
        async (newLocation) => {
          const { latitude, longitude } = newLocation.coords;
          setLocation({ latitude, longitude });

          // Enviar para o backend
          try {
            await axios.post(
              `http://seu-backend.com/business/establishments/est-id/delivery/drivers/${driverId}/location`,
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
            console.log('✅ Localização enviada:', latitude, longitude);
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
  }, [orderId, token, driverId]);

  return (
    <div>
      {location ? (
        <p>
          Rastreando: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
        </p>
      ) : (
        <p>Iniciando rastreamento...</p>
      )}
    </div>
  );
}
```

---

## 📱 Fluxo Completo

### 1. Cliente abre o app e acompanha pedido
```
GET /public/delivery/orders/{orderId}
```

### 2. Cliente se conecta ao WebSocket
```javascript
socket.emit('subscribe:order', { orderId: 'order-123' })
```

### 3. Entregador sai para entrega
```
PATCH /business/establishments/{id}/delivery/orders/{orderId}/status
{ "status": "OUT_FOR_DELIVERY" }
```

### 4. Entregador começa a enviar localização
```
POST /business/establishments/{id}/delivery/drivers/{driverId}/location
{ "orderId": "order-123", "latitude": -23.5505, "longitude": -46.6333 }
```

### 5. Cliente recebe localização em tempo real
```javascript
socket.on('driver:location', (data) => {
  // Atualizar mapa com nova localização
})
```

### 6. Entregador chega e marca como entregue
```
PATCH /business/establishments/{id}/delivery/orders/{orderId}/status
{ "status": "DELIVERED" }
```

---

## 🗺️ Integração com Google Maps

**React:**

```typescript
import { GoogleMap, Marker, Polyline } from '@react-google-maps/api';

export function DeliveryMap({ driverLocation, customerLocation, route }) {
  return (
    <GoogleMap
      mapContainerStyle={{ width: '100%', height: '400px' }}
      center={driverLocation}
      zoom={15}
    >
      {/* Marcador do entregador */}
      <Marker
        position={driverLocation}
        title="Entregador"
        icon={{
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#4285F4',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
        }}
      />

      {/* Marcador do cliente */}
      <Marker
        position={customerLocation}
        title="Seu endereço"
        icon={{
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#34A853',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
        }}
      />

      {/* Rota */}
      {route && (
        <Polyline
          path={route}
          options={{
            strokeColor: '#4285F4',
            strokeOpacity: 0.8,
            strokeWeight: 3,
          }}
        />
      )}
    </GoogleMap>
  );
}
```

---

## 🔋 Otimizações

### 1. Reduzir Consumo de Bateria

```typescript
// Enviar localização apenas quando há movimento significativo
const DISTANCE_THRESHOLD = 50; // metros

let lastLocation = null;

Location.watchPositionAsync(
  {
    accuracy: Location.Accuracy.Balanced, // Menos preciso = menos bateria
    timeInterval: 30000, // 30 segundos
    distanceInterval: DISTANCE_THRESHOLD,
  },
  (newLocation) => {
    // Só enviar se moveu mais de 50 metros
    if (
      !lastLocation ||
      calculateDistance(lastLocation, newLocation) > DISTANCE_THRESHOLD
    ) {
      sendLocation(newLocation);
      lastLocation = newLocation;
    }
  }
);
```

### 2. Compressão de Dados

```typescript
// Enviar apenas 4 casas decimais (precisão de ~1 metro)
const compressedLocation = {
  lat: parseFloat(latitude.toFixed(4)),
  lng: parseFloat(longitude.toFixed(4)),
};
```

### 3. Cache Local

```typescript
// Armazenar histórico de localização localmente
const [locationHistory, setLocationHistory] = useState([]);

const addToHistory = (location) => {
  setLocationHistory((prev) => [
    ...prev.slice(-99), // Manter últimas 100 localizações
    location,
  ]);
};
```

---

## 📊 Banco de Dados

A tabela `delivery_tracking` já armazena:
- `latitude` - Latitude da localização
- `longitude` - Longitude da localização
- `createdAt` - Timestamp da atualização

Histórico completo é mantido automaticamente!

---

## 🔐 Segurança

### 1. Validar Entregador
```typescript
if (req.user.id !== driverId) {
  throw new ForbiddenException('Não autorizado');
}
```

### 2. Validar Pedido
```typescript
if (order.driverId !== driverId) {
  throw new BadRequestException('Entregador não atribuído');
}
```

### 3. Rate Limiting
```typescript
// Máximo 1 atualização por segundo
const RATE_LIMIT = 1000; // ms
```

---

## 📈 Monitoramento

### Métricas Importantes

1. **Latência de Localização**
   - Tempo entre envio e recebimento
   - Ideal: < 1 segundo

2. **Precisão de GPS**
   - Erro de posicionamento
   - Ideal: < 10 metros

3. **Taxa de Atualização**
   - Quantas atualizações por minuto
   - Ideal: 2-6 atualizações/min

4. **Consumo de Bateria**
   - Impacto do rastreamento
   - Ideal: < 5% por hora

---

## ❓ Perguntas Frequentes

**P: Qual é a frequência ideal de envio?**
R: 10-30 segundos é ideal. Menos de 10s consome muita bateria, mais de 30s fica impreciso.

**P: Funciona com app em background?**
R: Sim, com `expo-location` e `watchPositionAsync`. No iOS pode ter limitações.

**P: Como funciona sem internet?**
R: Sem internet, não consegue enviar. Recomenda-se cache local e retry automático.

**P: Quanto de dados consome?**
R: ~1KB por atualização. 6 atualizações/min = ~360KB/hora.

**P: Posso ver histórico de localização?**
R: Sim! Está em `delivery_tracking` com latitude/longitude/timestamp.

**P: Como mostrar rota no mapa?**
R: Use Google Maps Directions API ou Mapbox Directions API.

---

## 🚀 Próximos Passos

1. ✅ Implementar endpoint de localização
2. ✅ Atualizar Gateway WebSocket
3. ✅ Integrar no app do entregador
4. ✅ Integrar no app do cliente
5. ⏳ Adicionar histórico de rota
6. ⏳ Adicionar ETA (tempo estimado de chegada)
7. ⏳ Adicionar geofencing (notificar quando chegar perto)
8. ⏳ Adicionar analytics de performance

