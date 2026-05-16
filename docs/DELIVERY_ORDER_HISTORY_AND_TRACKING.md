# Histórico de Pedidos e Acompanhamento de Delivery

Este documento explica como o usuário acessa o histórico de pedidos no app e como funciona a tela de acompanhamento do pedido atual.

---

## 1. Onde acessar o histórico de pedidos

### Rota
`/delivery/orders`

### O que a tela mostra
- Lista todos os pedidos do customer logado.
- Permite filtrar por status.
- Exibe número do pedido, data, endereço, total e forma de pagamento.
- Permite abrir o detalhe de um pedido para acompanhar sua evolução.

### Arquivo relacionado
- [`app/delivery/orders.tsx`](../app/delivery/orders.tsx)

---

## 2. Como o histórico é carregado

### Origem dos dados
A tela usa o hook `useDeliveryMyOrders`, que busca os pedidos do usuário autenticado.

### Serviço usado
- [`services/deliveryApi.ts`](../services/deliveryApi.ts)

### API usada
```http
GET /public/delivery/my-orders
```

### Como o app chama a API
```ts
deliveryAPI.getMyOrders(customerId);
```

### Regras importantes
- O customer precisa estar autenticado.
- Se não houver `customerId`, a busca falha.
- A lista pode ser atualizada com pull-to-refresh.
- O app mantém um indicador de última atualização.

---

## 3. Estrutura da tela de histórico

### Filtros disponíveis
- Todos
- Pendente
- Confirmado
- Preparando
- Pronto
- Saiu
- Entregue
- Cancelado

### Comportamento da UI
- Se estiver carregando, mostra spinner.
- Se não houver pedidos, mostra estado vazio.
- Se houver erro, exibe banner de alerta.
- Ao tocar em um pedido, o app navega para tracking.

### Navegação para tracking
```ts
router.push(`/delivery/tracking?orderId=${order.id}`);
```

---

## 4. Como funciona o acompanhamento do pedido

### Rota
`/delivery/tracking`

### Query params
- `orderId`

### Arquivo relacionado
- [`app/delivery/tracking.tsx`](../app/delivery/tracking.tsx)

### O que a tela faz
- Busca os dados do pedido pelo ID.
- Exibe status atual, histórico de eventos e resumo do pedido.
- Mostra dados do entregador quando disponíveis.
- Atualiza o tracking em tempo real quando o backend fornece essa informação.
- Permite ações como cancelar pedido ou confirmar recebimento, quando liberadas.

---

## 5. Fluxo de carregamento do tracking

Quando a tela abre, o app tenta seguir esta ordem:

1. Busca o pedido diretamente pelo `orderId`.
2. Busca o tracking live do pedido.
3. Se a busca direta falhar, tenta localizar o pedido na lista de pedidos do usuário.

### Chamadas usadas
```ts
deliveryAPI.getOrderById(orderId);
deliveryAPI.getOrderTracking(orderId);
deliveryAPI.findOrderInUserOrders(orderId, user.id);
```

### APIs usadas
```http
GET /public/delivery/orders/{orderId}
GET /public/delivery/orders/{orderId}/tracking
```

### Fallback para histórico
Se a rota direta não retornar o pedido, o app pode procurar o pedido dentro de `my-orders` para manter a experiência funcionando mesmo em backends com comportamento antigo ou dados ainda não sincronizados.

---

## 6. Atualização em tempo real

O acompanhamento pode ser atualizado em tempo real quando o backend envia eventos pelo WebSocket.

### Evento esperado
```ts
socket.emit('subscribe:order', { orderId });
```

### O que o app aguarda
- Mudança de status
- Atualização de localização
- Atualização de previsão de entrega

### Fluxo básico
- O app entra na sala do pedido.
- Escuta eventos referentes àquele `orderId`.
- Atualiza a UI assim que chegam novos dados.
- Ao sair da tela, remove a inscrição do pedido.

### Documentação complementar
- [`docs/WEBSOCKET_APP_INTEGRATION.md`](./WEBSOCKET_APP_INTEGRATION.md)
- [`docs/WEBSOCKET_CLIENT_GUIDE.md`](./WEBSOCKET_CLIENT_GUIDE.md)

---

## 7. Status mostrados no histórico e no tracking

### Status mais comuns
- `PENDING`
- `CONFIRMED`
- `PREPARING`
- `READY_FOR_DELIVERY`
- `OUT_FOR_DELIVERY`
- `DELIVERED`
- `CANCELLED`
- `FAILED`

### Como a UI usa esses status
- Cada status recebe um texto amigável.
- Cada status recebe uma cor.
- O histórico mostra a sequência dos eventos quando o backend envia `tracking`.

---

## 8. Estrutura dos dados exibidos

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

## 12. Fluxo de Customer

O fluxo do app deve considerar `customer` como o dono do pedido no delivery.

### Identificadores
- `customerId`: cliente do estabelecimento, usado no pedido e no tracking
- `userId`: usuário interno, usado apenas em ações de staff/entregador

### Fluxo recomendado
1. Customer autentica no app
2. App chama `GET /public/delivery/my-orders`
3. App abre `GET /public/delivery/orders/{orderId}/tracking`
4. Backend valida o acesso por `customerId`
5. Tracking do pedido usa eventos do customer, não do usuário interno

### Observação
Se a integração ainda estiver usando `userId` no frontend, o ideal é migrar para `customerId` para bater com o modelo do backend.

### `tracking`
O histórico de tracking costuma vir como uma lista de eventos contendo:
- status
- descrição
- data de criação
- timestamp

---

## 9. Ações possíveis na tela de tracking

### Cancelar pedido
```ts
deliveryAPI.cancelOrder(orderId, reason);
```

### Confirmar recebimento
```ts
deliveryAPI.confirmReceipt(orderId);
```

### Avaliar pedido
Depois da entrega, o usuário pode seguir para a avaliação do pedido quando o fluxo estiver habilitado no app/backend.

---

## 10. Resumo do fluxo

```text
/delivery
  -> /delivery/orders
  -> toca em um pedido
  -> /delivery/tracking?orderId=...
  -> carrega detalhe + tracking
  -> atualiza em tempo real
```

---

## 11. Rotas e endpoints principais

### Histórico
- `GET /public/delivery/my-orders`

### Tracking
- `GET /public/delivery/orders/{orderId}`
- `GET /public/delivery/orders/{orderId}/tracking`

### Ações no pedido
- `POST /public/delivery/orders/{orderId}/cancel`
- `POST /public/delivery/orders/{orderId}/confirm-receipt`

---

## Arquivos relacionados

- [`app/delivery/orders.tsx`](../app/delivery/orders.tsx)
- [`app/delivery/tracking.tsx`](../app/delivery/tracking.tsx)
- [`services/deliveryApi.ts`](../services/deliveryApi.ts)
- [`docs/WEBSOCKET_APP_INTEGRATION.md`](./WEBSOCKET_APP_INTEGRATION.md)
