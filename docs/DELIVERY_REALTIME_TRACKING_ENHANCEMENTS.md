# 🚀 Melhorias para Rastreamento em Tempo Real

## 📋 O que já está implementado

✅ Envio de localização do entregador
✅ Recebimento em tempo real via WebSocket
✅ Persistência em banco de dados
✅ Emissão para clientes inscritos

---

## 🎯 O que falta implementar

### 1. **Cálculo de ETA (Tempo Estimado de Chegada)**

**Benefício:** Cliente sabe exatamente quando o entregador vai chegar

**Implementação:**

```typescript
// src/modules/business/delivery/services/delivery-tracking.service.ts

@Injectable()
export class DeliveryTrackingService {
  constructor(
    private deliveryService: DeliveryService,
    private deliveryGateway: DeliveryGateway,
  ) {}

  /**
   * Calcular ETA baseado na distância e velocidade média
   */
  calculateETA(
    currentLat: number,
    currentLon: number,
    destinationLat: number,
    destinationLon: number,
    averageSpeedKmh: number = 30, // Velocidade média em km/h
  ): number {
    // Calcular distância usando Haversine
    const distance = this.calculateDistance(
      currentLat,
      currentLon,
      destinationLat,
      destinationLon,
    );

    // Calcular tempo em minutos
    const timeMinutes = (distance / averageSpeedKmh) * 60;
    return Math.ceil(timeMinutes);
  }

  /**
   * Calcular distância entre dois pontos (Haversine)
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Raio da Terra em km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Emitir ETA para cliente
   */
  async emitETA(
    orderId: string,
    driverId: string,
    currentLat: number,
    currentLon: number,
  ): Promise<void> {
    const order = await this.deliveryService.findById(orderId);

    if (!order) return;

    const etaMinutes = this.calculateETA(
      currentLat,
      currentLon,
      parseFloat(order.latitude.toString()),
      parseFloat(order.longitude.toString()),
    );

    this.deliveryGateway.emitETA(orderId, {
      driverId,
      etaMinutes,
      estimatedArrivalTime: new Date(Date.now() + etaMinutes * 60000),
    });
  }
}
```

**Gateway:**
```typescript
emitETA(
  orderId: string,
  data: {
    driverId: string;
    etaMinutes: number;
    estimatedArrivalTime: Date;
  },
) {
  this.server.to(`order:${orderId}`).emit('driver:eta', {
    orderId,
    ...data,
    timestamp: new Date().toISOString(),
  });
}
```

**Cliente recebe:**
```javascript
socket.on('driver:eta', (data) => {
  console.log(`Entregador chegará em ${data.etaMinutes} minutos`);
  console.log(`Horário estimado: ${data.estimatedArrivalTime}`);
});
```

---

### 2. **Geofencing (Notificar quando chegar perto)**

**Benefício:** Cliente é notificado quando entregador está a 500m de distância

**Implementação:**

```typescript
// src/modules/business/delivery/services/delivery-geofencing.service.ts

@Injectable()
export class DeliveryGeofencingService {
  private readonly GEOFENCE_RADIUS_KM = 0.5; // 500 metros

  constructor(
    private deliveryService: DeliveryService,
    private deliveryGateway: DeliveryGateway,
    private notificationService: NotificationService,
  ) {}

  /**
   * Verificar se entregador entrou na zona de geofencing
   */
  async checkGeofence(
    orderId: string,
    driverId: string,
    currentLat: number,
    currentLon: number,
  ): Promise<void> {
    const order = await this.deliveryService.findById(orderId);

    if (!order) return;

    const distance = this.calculateDistance(
      currentLat,
      currentLon,
      parseFloat(order.latitude.toString()),
      parseFloat(order.longitude.toString()),
    );

    // Se entrou na zona de geofencing
    if (distance <= this.GEOFENCE_RADIUS_KM) {
      // Notificar cliente
      await this.notificationService.sendPushNotification({
        userId: order.customerId,
        title: '🚚 Entregador Chegando!',
        message: 'Seu entregador está chegando. Fique atento!',
        type: 'campaign',
        data: { orderId },
      });

      // Emitir via WebSocket
      this.deliveryGateway.emitGeofenceAlert(orderId, {
        driverId,
        message: 'Entregador está chegando',
        distance: distance.toFixed(2),
      });

      console.log(`🚨 Geofence ativado para pedido ${orderId}`);
    }
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
```

**Gateway:**
```typescript
emitGeofenceAlert(
  orderId: string,
  data: {
    driverId: string;
    message: string;
    distance: string;
  },
) {
  this.server.to(`order:${orderId}`).emit('driver:geofence', {
    orderId,
    ...data,
    timestamp: new Date().toISOString(),
  });
}
```

---

### 3. **Histórico de Rota**

**Benefício:** Cliente pode ver o caminho completo que o entregador percorreu

**Implementação:**

```typescript
// Adicionar ao DeliveryService

/**
 * Obter histórico de localização de um pedido
 */
async getLocationHistory(orderId: string): Promise<any[]> {
  const tracking = await this.deliveryTrackingRepository.find({
    where: { orderId },
    order: { createdAt: 'ASC' },
  });

  return tracking
    .filter((t) => t.latitude && t.longitude)
    .map((t) => ({
      latitude: t.latitude,
      longitude: t.longitude,
      timestamp: t.createdAt,
      status: t.status,
    }));
}
```

**Endpoint:**
```typescript
@Get('orders/:orderId/location-history')
async getLocationHistory(@Param('orderId') orderId: string) {
  const history = await this.deliveryService.getLocationHistory(orderId);

  return {
    success: true,
    data: history,
    count: history.length,
  };
}
```

**Cliente:**
```javascript
// Buscar histórico completo
const response = await fetch(
  `/public/delivery/orders/${orderId}/location-history`,
  { headers: { Authorization: `Bearer ${token}` } }
);
const { data: locationHistory } = await response.json();

// Desenhar rota no mapa
const polyline = new google.maps.Polyline({
  path: locationHistory.map((loc) => ({
    lat: loc.latitude,
    lng: loc.longitude,
  })),
  geodesic: true,
  strokeColor: '#4285F4',
  strokeOpacity: 0.8,
  strokeWeight: 3,
  map: map,
});
```

---

### 4. **Velocidade Média do Entregador**

**Benefício:** Dashboard mostra performance do entregador

**Implementação:**

```typescript
/**
 * Calcular velocidade média entre duas localizações
 */
calculateAverageSpeed(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  timeMinutes: number,
): number {
  const distance = this.calculateDistance(lat1, lon1, lat2, lon2);
  const speedKmh = (distance / timeMinutes) * 60;
  return Math.round(speedKmh * 10) / 10; // Arredondar para 1 casa decimal
}
```

---

### 5. **Alertas de Atraso**

**Benefício:** Sistema notifica cliente se entregador está muito atrasado

**Implementação:**

```typescript
// src/modules/business/delivery/services/delivery-delay-alert.service.ts

@Injectable()
export class DeliveryDelayAlertService {
  private readonly DELAY_THRESHOLD_MINUTES = 15; // Alertar após 15 min de atraso

  constructor(
    private deliveryService: DeliveryService,
    private notificationService: NotificationService,
    private deliveryGateway: DeliveryGateway,
  ) {}

  /**
   * Verificar se há atraso e notificar
   */
  async checkDelay(orderId: string): Promise<void> {
    const order = await this.deliveryService.findById(orderId);

    if (!order || order.status !== DeliveryStatus.OUT_FOR_DELIVERY) {
      return;
    }

    const now = new Date();
    const estimatedTime = new Date(order.dispatchedAt);
    estimatedTime.setMinutes(
      estimatedTime.getMinutes() + order.deliveryZone.estimatedTime,
    );

    const delayMinutes = Math.floor(
      (now.getTime() - estimatedTime.getTime()) / 60000,
    );

    if (delayMinutes > this.DELAY_THRESHOLD_MINUTES) {
      // Notificar cliente
      await this.notificationService.sendPushNotification({
        userId: order.customerId,
        title: '⏰ Entrega Atrasada',
        message: `Seu pedido está ${delayMinutes} minutos atrasado`,
        type: 'campaign',
        data: { orderId, delayMinutes },
      });

      // Emitir via WebSocket
      this.deliveryGateway.emitDelayAlert(orderId, {
        delayMinutes,
        message: `Entrega ${delayMinutes} minutos atrasada`,
      });

      console.log(`⏰ Alerta de atraso para pedido ${orderId}: ${delayMinutes}min`);
    }
  }
}
```

---

### 6. **Endpoint para Obter Localização Atual**

**Benefício:** Cliente pode fazer polling se preferir não usar WebSocket

**Implementação:**

```typescript
@Get('orders/:orderId/driver-location')
async getDriverLocation(@Param('orderId') orderId: string) {
  const order = await this.deliveryService.findById(orderId);

  if (!order || !order.driverId) {
    return {
      success: false,
      message: 'Pedido não tem entregador atribuído',
    };
  }

  // Obter última localização
  const lastTracking = await this.deliveryTrackingRepository.findOne({
    where: { orderId },
    order: { createdAt: 'DESC' },
  });

  if (!lastTracking || !lastTracking.latitude) {
    return {
      success: false,
      message: 'Localização não disponível',
    };
  }

  return {
    success: true,
    data: {
      driverId: order.driverId,
      driverName: order.driver.name,
      latitude: lastTracking.latitude,
      longitude: lastTracking.longitude,
      timestamp: lastTracking.createdAt,
      status: order.status,
    },
  };
}
```

---

## 📊 Resumo das Melhorias

| Funcionalidade | Prioridade | Complexidade | Benefício |
|---|---|---|---|
| ETA (Tempo Estimado) | 🔴 Alta | Média | Cliente sabe quando chega |
| Geofencing | 🔴 Alta | Média | Notificar quando chegar perto |
| Histórico de Rota | 🟡 Média | Baixa | Visualizar caminho completo |
| Velocidade Média | 🟡 Média | Baixa | Analytics de performance |
| Alertas de Atraso | 🟡 Média | Baixa | Notificar atrasos |
| Endpoint de Localização | 🟢 Baixa | Baixa | Alternativa ao WebSocket |

---

## 🚀 Implementação Recomendada

### Fase 1 (Essencial)
1. ✅ Envio de localização
2. ✅ Recebimento em tempo real
3. 🔴 **ETA (Tempo Estimado)**
4. 🔴 **Geofencing**

### Fase 2 (Importante)
5. 🟡 Histórico de rota
6. 🟡 Alertas de atraso
7. 🟡 Endpoint de localização

### Fase 3 (Otimizações)
8. 🟢 Velocidade média
9. 🟢 Analytics avançados

---

## 💡 Dicas de Implementação

### 1. Usar Scheduler para Alertas
```typescript
// Verificar atrasos a cada 5 minutos
@Cron('*/5 * * * *')
async checkDelaysScheduled() {
  // Buscar todos os pedidos em entrega
  // Verificar atrasos
  // Notificar se necessário
}
```

### 2. Cache de Localização
```typescript
// Armazenar última localização em cache para queries rápidas
private locationCache = new Map<string, LocationData>();
```

### 3. Otimizar Queries
```typescript
// Usar índices no banco
CREATE INDEX idx_delivery_tracking_orderId_createdAt 
ON delivery_tracking(orderId, createdAt DESC);
```

---

## ✅ Checklist de Implementação

- [ ] ETA (Tempo Estimado)
- [ ] Geofencing (Alerta de proximidade)
- [ ] Histórico de Rota
- [ ] Velocidade Média
- [ ] Alertas de Atraso
- [ ] Endpoint de Localização Atual
- [ ] Testes com múltiplos pedidos
- [ ] Testes de performance
- [ ] Documentação atualizada

