# Fluxo Completo do Delivery

Este documento explica o fluxo ponta a ponta do delivery no app:

1. lista de estabelecimentos
2. tela de produtos
3. carrinho
4. checkout
5. cálculo de frete
6. pagamento
7. criação do pedido
8. tracking do pedido

---

## 1. Tela inicial do delivery

### Rota
`/delivery`

### O que faz
- Carrega os estabelecimentos com delivery disponível.
- Verifica acesso do usuário ao módulo.
- Mostra os pedidos do usuário.
- Ao clicar em um estabelecimento, prepara o contexto e navega para os produtos.

### Navegação para produtos

```ts
deliveryAPI.setEstablishment(establishment.id);
router.push(
  `/delivery/products?establishmentId=${establishment.id}&establishmentName=${encodeURIComponent(establishment.name)}`
);
```

### Arquivo relacionado
- [`app/delivery/index.tsx`](../app/delivery/index.tsx)

---

## 2. Tela de produtos do estabelecimento

### Rota
`/delivery/products`

### Query params
- `establishmentId`
- `establishmentName`
- `offerId` opcional

### O que faz
- Busca o estabelecimento com inventário.
- Bloqueia a tela se o delivery estiver desabilitado.
- Bloqueia a tela se o estabelecimento estiver fechado.
- Exibe os produtos e permite adicionar ao carrinho.
- Salva o carrinho no `AsyncStorage` por estabelecimento.

### API usada

```http
GET /public/establishments/{id}
```

Com oferta:

```http
GET /public/establishments/{id}?offerId={offerId}
```

### Chamadas no app

```ts
deliveryAPI.getEstablishmentById(establishmentId, offerId);
```

### Regras de bloqueio
- `deliveryEnabled === false` -> mostra modal de delivery indisponível
- `isOpen === false` -> mostra modal de estabelecimento fechado
- `inventory` vazio/inválido -> mostra aviso de sem produtos

### Arquivo relacionado
- [`app/delivery/products.tsx`](../app/delivery/products.tsx)

---

## 3. Carrinho

### Como funciona
- Cada item adicionado fica ligado ao `establishmentId`.
- O carrinho é salvo em:

```ts
somaai:delivery-cart-${establishmentId}
```

- O carrinho é recarregado quando a tela ganha foco.
- Se o pedido for finalizado, o carrinho é limpo.

### Regras importantes
- Produtos por peso usam `weight`.
- Produtos com oferta usam `offerPrice`.
- Produtos com estoque são validados antes de adicionar.

---

## 4. Checkout

### Rota
`/delivery/checkout`

### Origem do carrinho
O checkout recebe o carrinho por parâmetro:

```ts
router.push({
  pathname: '/delivery/checkout',
  params: {
    establishmentId,
    cart: JSON.stringify(cart),
  }
});
```

### O que faz
- Carrega o endereço padrão do usuário.
- Exibe o resumo do pedido.
- Calcula o frete.
- Mostra as formas de pagamento disponíveis.
- Permite observações do pedido.
- Cria o pedido ao confirmar.

### Arquivo relacionado
- [`app/delivery/checkout.tsx`](../app/delivery/checkout.tsx)

---

## 5. Cálculo de frete

### Quando acontece
O app calcula o frete quando:
- `neighborhood` existe
- `zipCode` existe
- há itens no carrinho
- o endereço do usuário foi carregado

### API usada

```http
POST /public/delivery/establishments/{establishmentId}/calculate-fee
```

### Body enviado
```json
{
  "neighborhood": "Centro",
  "zipCode": "01310-100",
  "latitude": -23.5505,
  "longitude": -46.6333,
  "subtotal": 150.0
}
```

### Resposta esperada
```json
{
  "success": true,
  "data": {
    "deliveryFee": 5.0,
    "isFreeDelivery": false,
    "freeDeliveryMinimum": 200.0,
    "estimatedTime": 30,
    "zone": {
      "id": "zone-123",
      "name": "Zona Centro"
    }
  }
}
```

### Regras da UI
- Se `isFreeDelivery === true`, o app avisa frete grátis.
- Se o subtotal estiver perto do mínimo para frete grátis, o app mostra uma mensagem de incentivo.
- Se a API falhar, o checkout zera o frete e mostra alerta.

---

## 6. Pagamento

### Formas exibidas
O checkout oferece:
- `CREDIT_CARD`
- `DEBIT_CARD`
- `PIX`
- `CASH`

### Como o app decide os métodos
O frontend tenta ler:
- `availablePaymentMethods`
- `deliveryPaymentTypes`
- `deliveryPaymentAppEnabled`

### Regras de pagamento
- Se `deliveryPaymentAppEnabled === false`, o app força pagamento na entrega.
- Se `deliveryPaymentTypes` incluir `driver`, o app entende que há pagamento com o entregador.
- Se o usuário escolhe `CASH`, o app pede o valor do troco.

### Observação importante
O checkout envia:
- `paymentMethod`
- `deliveryPaymentType`
- `changeFor`

Nem todo backend antigo necessariamente usa todos esses campos. Se você for integrar no backend, vale confirmar quais deles são aceitos de fato.

---

## 7. Criação do pedido

### API usada

```http
POST /public/delivery/establishments/{establishmentId}/orders
```

### Body enviado pelo app
```json
{
  "customerId": "user-123",
  "customerName": "João Silva",
  "customerEmail": "joao@example.com",
  "customerPhone": "11999999999",
  "deliveryAddress": "Rua A, 123",
  "deliveryNeighborhood": "Centro",
  "deliveryCity": "São Paulo",
  "deliveryState": "SP",
  "deliveryZipCode": "01310-100",
  "deliveryComplement": "Apto 42",
  "deliveryReference": "Próximo ao mercado",
  "latitude": -23.5505,
  "longitude": -46.6333,
  "items": [
    {
      "itemId": "item-1",
      "productName": "Arroz 1kg",
      "unitPrice": 8.9,
      "quantity": 2,
      "discount": 0
    }
  ],
  "paymentMethod": "PIX",
  "deliveryPaymentType": "pix",
  "changeFor": "",
  "notes": "Sem cebola",
  "discount": 0,
  "addressId": "addr-123"
}
```

### Resposta esperada
```json
{
  "success": true,
  "data": {
    "id": "order-123",
    "orderNumber": "DEL-20260321-0001",
    "status": "PENDING",
    "customerId": "user-123",
    "customerName": "João Silva",
    "deliveryAddress": "Rua A, 123",
    "subtotal": 130.0,
    "deliveryFee": 5.0,
    "discount": 0,
    "total": 135.0,
    "estimatedDeliveryTime": 30,
    "paymentMethod": "PIX",
    "createdAt": "2026-03-21T17:30:00Z"
  }
}
```

### Depois de criar
- o carrinho é limpo no `AsyncStorage`
- o app redireciona para tracking

```ts
router.replace(`/delivery/tracking?orderId=${order.id}`);
```

---

## 8. Tracking do pedido

### Rota
`/delivery/tracking`

### Entrada
- `orderId`

### O que faz
- Busca o pedido pelo ID.
- Mostra status atual, histórico e dados do entregador.
- Pode atualizar em tempo real conforme o backend.

### API usada

```http
GET /public/delivery/orders/{orderId}
```

### Arquivo relacionado
- [`app/delivery/tracking.tsx`](../app/delivery/tracking.tsx)

---

## 9. Rotas principais da API

### Estabelecimentos
- `GET /public/establishments/delivery/available`
- `GET /public/establishments/{id}`

### Frete
- `POST /public/delivery/establishments/{establishmentId}/calculate-fee`

### Pedido
- `POST /public/delivery/establishments/{establishmentId}/orders`
- `GET /public/delivery/orders/{orderId}`
- `GET /public/delivery/my-orders`

---

## 10. Tipos usados no frontend

### `Establishment`
```ts
{
  id: string;
  name: string;
  logo?: string;
  isOpen?: boolean;
  deliveryEnabled?: boolean;
  inventory?: InventoryItem[];
}
```

### `InventoryItem`
```ts
{
  id: string;
  name: string;
  price: number;
  currentStock: number;
  isActive: boolean;
  trackStock?: boolean;
  description?: string;
  image?: string;
  category?: string;
  unit?: string;
  hasOffer?: boolean;
  offerPrice?: number;
  offerDetails?: {
    offerId: string;
    offerPrice: number;
    originalPrice: number;
    discountPercentage: number;
    title: string;
    description: string;
    endDate: string;
  };
}
```

### `DeliveryOrder`
```ts
{
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  deliveryAddress: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  estimatedDeliveryTime: number;
  paymentMethod: string;
  createdAt: string;
}
```

---

## 11. Resumo do fluxo

```text
/delivery
  -> escolhe estabelecimento
  -> /delivery/products?establishmentId=...
  -> adiciona itens ao carrinho
  -> /delivery/checkout
  -> calcula frete
  -> escolhe pagamento
  -> cria pedido
  -> /delivery/tracking?orderId=...
```

---

## Arquivos relacionados

- [`app/delivery/index.tsx`](../app/delivery/index.tsx)
- [`app/delivery/products.tsx`](../app/delivery/products.tsx)
- [`app/delivery/checkout.tsx`](../app/delivery/checkout.tsx)
- [`app/delivery/tracking.tsx`](../app/delivery/tracking.tsx)
- [`services/deliveryApi.ts`](../services/deliveryApi.ts)

