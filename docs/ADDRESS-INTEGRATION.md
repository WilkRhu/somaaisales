# Integração de Endereços do Cliente Business

Este documento descreve a integração do CRUD de endereços do cliente autenticado no módulo `business/customers`.

## Visão Geral

Os endereços do cliente são armazenados na entidade `business_consumer_addresses` e vinculados diretamente ao cliente via `business_consumer_id`.

O fluxo foi desenhado para o cliente autenticado editar os próprios endereços sem precisar informar `establishmentId` na URL.

## Endpoints

Todos os endpoints exigem:
- `Authorization: Bearer <token>`
- `JwtGuard`

### 1. Criar endereço

**POST** `/public/customers/me/addresses`

**Body**
```json
{
  "label": "Casa",
  "street": "Rua das Flores",
  "number": "123",
  "complement": "Apto 101",
  "neighborhood": "Centro",
  "city": "Recife",
  "state": "PE",
  "zipCode": "50000000",
  "latitude": -8.047562,
  "longitude": -34.876964,
  "isDefault": true
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "label": "Casa",
    "street": "Rua das Flores",
    "number": "123",
    "complement": "Apto 101",
    "neighborhood": "Centro",
    "city": "Recife",
    "state": "PE",
    "zipCode": "50000000",
    "latitude": -8.047562,
    "longitude": -34.876964,
    "isDefault": true,
    "isActive": true,
    "createdAt": "2026-05-13T00:00:00.000Z",
    "updatedAt": "2026-05-13T00:00:00.000Z"
  }
}
```

### 2. Listar endereços

**GET** `/public/customers/me/addresses`

**Response**
```json
{
  "success": true,
  "data": [],
  "count": 0
}
```

### 3. Obter endereço padrão

**GET** `/public/customers/me/addresses/default`

**Response**
```json
{
  "success": true,
  "data": null
}
```

### 4. Obter endereço por ID

**GET** `/public/customers/me/addresses/:addressId`

**Response**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "label": "Casa"
  }
}
```

### 5. Atualizar endereço

**PATCH** `/public/customers/me/addresses/:addressId`

**Body**
```json
{
  "label": "Trabalho",
  "isDefault": false
}
```

### 6. Remover endereço

**DELETE** `/public/customers/me/addresses/:addressId`

**Response**
```json
{
  "success": true,
  "message": "Endereço removido com sucesso"
}
```

### 7. Definir como padrão

**PATCH** `/public/customers/me/addresses/:addressId/set-default`

**Response**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "isDefault": true
  }
}
```

## Regras de Negócio

- Um endereço pertence a um único cliente via `business_consumer_id`
- Se `isDefault` vier como `true`, os demais endereços do cliente são desmarcados como padrão
- Remoção é lógica: `isActive = false`
- O relacionamento usa `onDelete: CASCADE` no banco

## Estrutura da Entidade

```typescript
{
  id: string;
  businessConsumerId: string;
  label: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

## Integração com Frontend

### Exemplo de criação

```typescript
await fetch('/public/customers/me/addresses', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    label: 'Casa',
    street: 'Rua das Flores',
    number: '123',
    neighborhood: 'Centro',
    city: 'Recife',
    state: 'PE',
    zipCode: '50000000',
    latitude: -8.047562,
    longitude: -34.876964,
    isDefault: true,
  }),
});
```

### Exemplo de listagem

```typescript
const response = await fetch('/public/customers/me/addresses', {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const data = await response.json();
console.log(data.data);
```

## Observações

- O CRUD atual usa o cliente autenticado vindo do JWT.
- A tabela nova precisa da migration `CreateBusinessConsumerAddressesTable1779000000000`.
- Se o frontend precisar de edição em formulário único, o fluxo recomendado é:
  1. listar endereços
  2. editar o endereço selecionado
  3. marcar como padrão quando necessário

