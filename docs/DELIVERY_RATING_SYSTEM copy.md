# Sistema de Avaliação de Delivery

Sistema completo para avaliação de estabelecimentos e entregadores após a entrega de pedidos.

## Estrutura

### Entidade: DeliveryRating

Armazena avaliações de clientes sobre:
- **Estabelecimento**: Qualidade, embalagem, precisão do pedido
- **Entregador**: Pontualidade, limpeza do veículo, profissionalismo

### Campos

#### Avaliação Geral
- `establishmentRating` (1-5): Nota geral do estabelecimento
- `driverRating` (1-5): Nota geral do entregador

#### Avaliação Detalhada do Estabelecimento
- `establishmentQuality` (1-5): Qualidade do produto
- `establishmentPackaging` (1-5): Qualidade da embalagem
- `establishmentAccuracy` (1-5): Precisão do pedido (chegou correto?)

#### Avaliação Detalhada do Entregador
- `driverPunctuality` (1-5): Pontualidade na entrega
- `driverCleanliness` (1-5): Limpeza do veículo
- `driverProfessionalism` (1-5): Profissionalismo

#### Comentários
- `establishmentComment` (até 500 caracteres)
- `driverComment` (até 500 caracteres)

## Endpoints

### 1. Criar Avaliação

```
POST /delivery/ratings/orders/{orderId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "establishmentRating": 5,
  "establishmentComment": "Excelente qualidade!",
  "establishmentQuality": 5,
  "establishmentPackaging": 4,
  "establishmentAccuracy": 5,
  
  "driverRating": 4,
  "driverComment": "Entrega rápida, mas poderia ter sido mais cuidadoso",
  "driverPunctuality": 5,
  "driverCleanliness": 3,
  "driverProfessionalism": 4
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": "rating-123",
    "orderId": "order-456",
    "customerId": "customer-789",
    "establishmentRating": 5,
    "establishmentComment": "Excelente qualidade!",
    "driverRating": 4,
    "driverComment": "Entrega rápida, mas poderia ter sido mais cuidadoso",
    "createdAt": "2024-03-21T14:30:00.000Z"
  },
  "message": "Avaliação registrada com sucesso"
}
```

**Validações:**
- Pedido deve estar em status `DELIVERED`
- Cliente deve ser o dono do pedido
- Apenas uma avaliação por pedido
- Pelo menos uma avaliação (estabelecimento ou entregador) é obrigatória

### 2. Obter Avaliação de um Pedido

```
GET /delivery/ratings/orders/{orderId}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": "rating-123",
    "orderId": "order-456",
    "customer": {
      "id": "customer-789",
      "name": "João Silva"
    },
    "establishmentRating": 5,
    "driverRating": 4
  }
}
```

### 3. Listar Avaliações do Estabelecimento

```
GET /delivery/ratings/establishments/{establishmentId}?page=1&limit=20
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "rating-1",
      "establishmentRating": 5,
      "establishmentComment": "Ótimo!",
      "customer": { "name": "João" },
      "createdAt": "2024-03-21T14:30:00.000Z"
    },
    {
      "id": "rating-2",
      "establishmentRating": 4,
      "establishmentComment": "Bom",
      "customer": { "name": "Maria" },
      "createdAt": "2024-03-20T10:15:00.000Z"
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 20,
  "averageRating": 4.6
}
```

### 4. Obter Estatísticas do Estabelecimento

```
GET /delivery/ratings/establishments/{establishmentId}/stats
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "totalRatings": 45,
    "averageRating": 4.6,
    "averageQuality": 4.7,
    "averagePackaging": 4.5,
    "averageAccuracy": 4.8,
    "ratingDistribution": {
      "1": 1,
      "2": 2,
      "3": 5,
      "4": 15,
      "5": 22
    }
  }
}
```

### 5. Listar Avaliações do Entregador

```
GET /delivery/ratings/drivers/{driverId}?page=1&limit=20
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "rating-1",
      "driverRating": 5,
      "driverComment": "Excelente!",
      "driverPunctuality": 5,
      "driverCleanliness": 4,
      "driverProfessionalism": 5,
      "customer": { "name": "João" },
      "createdAt": "2024-03-21T14:30:00.000Z"
    }
  ],
  "total": 120,
  "page": 1,
  "limit": 20,
  "averageRating": 4.8
}
```

### 6. Obter Estatísticas do Entregador

```
GET /delivery/ratings/drivers/{driverId}/stats
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "totalRatings": 120,
    "averageRating": 4.8,
    "averagePunctuality": 4.9,
    "averageCleanliness": 4.6,
    "averageProfessionalism": 4.8,
    "ratingDistribution": {
      "1": 0,
      "2": 1,
      "3": 5,
      "4": 30,
      "5": 84
    }
  }
}
```

## Exemplos de Uso

### Exemplo 1: Cliente avalia apenas o estabelecimento

```bash
curl -X POST http://localhost:3000/delivery/ratings/orders/order-123 \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{
    "establishmentRating": 5,
    "establishmentComment": "Comida deliciosa!",
    "establishmentQuality": 5,
    "establishmentPackaging": 4,
    "establishmentAccuracy": 5
  }'
```

### Exemplo 2: Cliente avalia apenas o entregador

```bash
curl -X POST http://localhost:3000/delivery/ratings/orders/order-123 \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{
    "driverRating": 4,
    "driverComment": "Entrega rápida",
    "driverPunctuality": 5,
    "driverCleanliness": 3,
    "driverProfessionalism": 4
  }'
```

### Exemplo 3: Cliente avalia ambos

```bash
curl -X POST http://localhost:3000/delivery/ratings/orders/order-123 \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{
    "establishmentRating": 5,
    "establishmentComment": "Excelente!",
    "establishmentQuality": 5,
    "establishmentPackaging": 5,
    "establishmentAccuracy": 5,
    
    "driverRating": 5,
    "driverComment": "Perfeito!",
    "driverPunctuality": 5,
    "driverCleanliness": 5,
    "driverProfessionalism": 5
  }'
```

## Integração com Entidades Existentes

### DeliveryDriver
- Campo `averageRating` é atualizado automaticamente quando uma nova avaliação é criada
- Reflete a média de todas as avaliações do entregador

### DeliveryOrder
- Pode ter no máximo uma avaliação
- Avaliação só pode ser criada após o pedido estar em status `DELIVERED`

## Fluxo Recomendado

1. **Pedido Entregue** → Status muda para `DELIVERED`
2. **Cliente Recebe Notificação** → "Avalie sua entrega"
3. **Cliente Acessa Tela de Avaliação** → Vê formulário com campos de avaliação
4. **Cliente Submete Avaliação** → POST `/delivery/ratings/orders/{orderId}`
5. **Médias Atualizadas** → Estabelecimento e entregador recebem novas médias
6. **Dashboard Atualizado** → Estatísticas refletem a nova avaliação

## Considerações de Negócio

### Visibilidade
- Avaliações são públicas (qualquer um pode ver)
- Comentários podem ser moderados se necessário

### Incentivos
- Entregadores com alta avaliação podem receber mais pedidos
- Estabelecimentos com alta avaliação aparecem em destaque

### Proteção
- Apenas um cliente pode avaliar um pedido
- Avaliações não podem ser deletadas (apenas criadas)
- Histórico completo é mantido

## Próximas Melhorias

1. **Moderação de Comentários** - Filtrar conteúdo inapropriado
2. **Resposta a Avaliações** - Estabelecimentos/entregadores podem responder
3. **Filtros Avançados** - Filtrar por período, nota mínima, etc.
4. **Badges** - Entregadores com 4.8+ ganham badge "Excelente"
5. **Relatórios** - Análise de tendências de avaliação
