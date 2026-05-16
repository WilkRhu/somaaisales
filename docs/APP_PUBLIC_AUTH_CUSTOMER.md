# Rotas Públicas do App

Este documento reúne dois fluxos para uso em app:

- Login de usuário
- Cadastro público de cliente vinculado a um estabelecimento

## 1. Login

**POST** `/public/customers/login`

### Entrada

```json
{
  "email": "joao@email.com",
  "password": "123456"
}
```

### Saída

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "20988238-3f88-446e-8be5-90f1e961ef07",
      "name": "João Silva",
      "email": "joao@email.com",
      "phone": "+5511999999999",
      "cpf": "123.456.789-09",
      "role": "user",
      "avatar": "https://example.com/avatar.jpg",
      "accountScope": "independent",
      "planType": "free",
      "planExpiresAt": null,
      "hasCompletedOnboarding": false,
      "netIncome": null,
      "profession": null,
      "business_plan": null,
      "establishments": []
    }
  }
}
```

Se o cliente estiver vinculado ao estabelecimento usado no login, o retorno também pode incluir:

```json
{
  "establishments": [
    {
      "id": "est-123",
      "name": "Supermercado ABC",
      "logo": "https://cdn.suaapp.com/logo.png"
    }
  ]
}
```

## 2. Cadastro Público de Cliente

**POST** `/public/establishments/:id/customers`

Essa rota é indicada para o app quando o cliente quer se cadastrar dentro de um estabelecimento específico.

### Entrada

```json
{
  "name": "Maria Souza",
  "email": "maria@email.com",
  "phone": "+5581999999999",
  "cpf": "12345678909",
  "birthDate": "1995-08-20",
  "password": "Cliente123",
  "avatar": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

Se não tiver imagem, envie o campo `avatar` vazio ou remova o campo.
Não envie `data:image/...;base64,undefined`.

### Saída

```json
{
  "success": true,
  "data": {
    "id": "customer-123",
    "establishmentId": "est-123",
    "name": "Maria Souza",
    "email": "maria@email.com",
    "phone": "+5581999999999",
    "cpf": "12345678909",
    "birthDate": "1995-08-20",
    "avatar": "https://cdn.suaapp.com/customers/avatar.png",
    "isActive": true,
    "loyaltyPoints": 0,
    "totalSpent": 0,
    "purchaseCount": 0,
    "lastPurchaseDate": null,
    "createdAt": "2026-05-12T12:00:00.000Z",
    "updatedAt": "2026-05-12T12:00:00.000Z"
  }
}
```

## Observações

- `POST /auth/login` já existe no backend.
- `POST /public/customers/login` é o login público do cliente do app.
- `POST /public/establishments/:id/customers` já está disponível no backend e pode ser usada pelo app.
- Para o app, é melhor retornar apenas os campos necessários para autenticação e identificação.
