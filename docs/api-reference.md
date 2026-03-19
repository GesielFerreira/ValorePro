# 📡 ValorePro — API Reference

> Referência de todos os endpoints da API. Base URL: `{NEXT_PUBLIC_APP_URL}/api`

---

## Autenticação

Todos os endpoints requerem sessão ativa via **Supabase Auth**.

```
Cookie: sb-<project-ref>-auth-token=...
```

A sessão é gerida automaticamente pelo middleware Supabase (`src/middleware.ts`).

---

## Busca de Produtos

### `POST /api/search`

Executa busca de produtos de forma síncrona (SerpAPI + MeLi + Playwright) e retorna resultados.

**Request:**
```json
{
  "query": "iPhone 15 128GB",
  "cep": "01001000"
}
```

**Response (200 OK):**
```json
{
  "searchId": "uuid",
  "query": "iPhone 15 128GB",
  "status": "completed",
  "results": [/* NormalizedResult[] */],
  "totalResults": 24,
  "bestPrice": {/* NormalizedResult */},
  "savings": 350.00,
  "duration": 12450
}
```

**Erros:**
| Status | Descrição |
|--------|-----------|
| 400 | Query vazia ou inválida |
| 401 | Não autenticado |
| 429 | Limite de buscas do plano atingido |

---

### `GET /api/search/[id]`

Consulta resultados de uma busca. Verifica cache Redis (TTL 30 min) antes do banco.

**Response (200 OK):**
```json
{
  "searchId": "search_1708900000_abc123",
  "query": "iPhone 15 128GB",
  "status": "completed",
  "totalResults": 24,
  "bestPrice": {
    "title": "Apple iPhone 15 128GB Preto",
    "cashPrice": 4299.00,
    "shippingCost": 0,
    "totalPrice": 4299.00,
    "store": { "name": "KaBuM", "domain": "kabum.com.br" },
    "url": "https://www.kabum.com.br/produto/..."
  },
  "results": [ /* NormalizedResult[] */ ],
  "sources": {
    "serpapi": { "count": 8, "errors": [] },
    "mercadolivre": { "count": 12, "errors": [] },
    "scraped": { "count": 4, "errors": [] }
  },
  "duration": 12450,
  "createdAt": "2026-02-26T19:30:00Z"
}
```

**Erros:**
| Status | Descrição |
|--------|-----------|
| 404 | Busca não encontrada |
| 401 | Não autenticado |

---

## Reputação de Lojas

### `POST /api/reputation`

Verifica a reputação de uma loja. Resultado é cacheado na tabela `stores` por 24h.

**Request:**
```json
{
  "domain": "kabum.com.br",
  "storeName": "KaBuM",
  "productPrice": 4299.00,
  "averagePrice": 4500.00
}
```

**Response (200 OK):**
```json
{
  "domain": "kabum.com.br",
  "storeName": "KaBuM",
  "score": 85,
  "classification": "excelente",
  "breakdown": {
    "cnpjScore": 25,
    "domainAgeScore": 20,
    "sslScore": 15,
    "reclameAquiScore": 25,
    "googleScore": 15,
    "priceBonus": 0
  },
  "alerts": [],
  "details": {
    "cnpj": {
      "cnpj": "05.570.714/0001-59",
      "razaoSocial": "KABUM COMERCIO ELETRONICO S.A.",
      "status": "ATIVA",
      "dataAbertura": "18/07/2003"
    },
    "domain": {
      "ageInYears": 22.6,
      "sslValid": true,
      "sslIssuer": "Cloudflare Inc"
    },
    "reclameAqui": {
      "found": true,
      "score": 8.2,
      "resolvidas": 85,
      "reputation": "Ótimo"
    },
    "googlePlaces": {
      "found": true,
      "rating": 4.3,
      "totalReviews": 18500
    }
  },
  "verifiedAt": "2026-02-26T19:30:00Z",
  "duration": 8200
}
```

---

## Alertas de Preço

### `GET /api/alerts`

Lista todos os alertas de preço do usuário autenticado.

**Response (200 OK):**
```json
{
  "alerts": [
    {
      "id": "alert_001",
      "productName": "iPhone 15 128GB",
      "targetPrice": 3999.00,
      "currentPrice": 4299.00,
      "status": "active",
      "notifyEmail": true,
      "notifyPush": true,
      "createdAt": "2026-02-20T10:00:00Z",
      "lastChecked": "2026-02-26T19:00:00Z"
    }
  ],
  "total": 1
}
```

---

### `POST /api/alerts`

Cria um novo alerta de preço.

**Request:**
```json
{
  "productName": "iPhone 15 128GB",
  "searchTerm": "iPhone 15 128GB",
  "targetPrice": 3999.00
}
```

**Response (201 Created):**
```json
{
  "id": "alert_002",
  "status": "active",
  "message": "Alerta criado. Você será notificado quando o preço atingir R$ 3.999,00"
}
```

**Limites por plano:**
| Plano | Alertas |
|-------|---------|
| Free | 3 |
| Pro | 20 |
| Enterprise | 100 |

---

### `PATCH /api/alerts/[id]`

Atualiza um alerta existente.

**Request:**
```json
{
  "status": "paused"
}
```

---

### `DELETE /api/alerts/[id]`

Remove um alerta.

**Response (200 OK):**
```json
{ "success": true }
```

---

## Dashboard

### `GET /api/dashboard`

Retorna estatísticas e dados recentes do usuário.

**Response (200 OK):**
```json
{
  "user": { "name": "...", "plan": "pro", "searchesToday": 3, "searchesLimit": 999 },
  "stats": { "totalSavings": 1250.00, "totalPurchases": 5, "activeAlerts": 2 },
  "recentPurchases": [/* ultimas 10 */],
  "alerts": [/* ultimos 20 */],
  "recentSearches": [/* ultimas 5 */]
}
```

---

## Histórico de Preços

### `GET /api/price-history?term=iPhone+15`

Retorna histórico de preços de um produto, agrupado por dia.

**Query params:**
- `term` (obrigatório) — termo de busca do produto

**Response (200 OK):**
```json
{
  "term": "iPhone 15",
  "history": [
    { "date": "2026-02-25", "minPrice": 4199.00, "maxPrice": 5500.00, "avgPrice": 4600.00, "count": 8 }
  ],
  "totalDataPoints": 42
}
```

---

## Perfil do Usuário

### `GET /api/user`

Retorna perfil, endereços e cartões salvos.

**Response (200 OK):**
```json
{
  "profile": { "name": "...", "email": "...", "plan": "pro" },
  "addresses": [/* UserAddress[] */],
  "cards": [/* { last_four, brand, holder_name, is_default }[] */]
}
```

---

### `PATCH /api/user`

Atualiza dados do perfil.

**Request:**
```json
{
  "name": "João Silva",
  "cpf": "123.456.789-00",
  "phone": "+5511999999999"
}
```

**Campos permitidos:** `name`, `cpf`, `phone`, `avatar_url`

---

## Códigos de Erro Comuns

| Status | Código | Descrição |
|--------|--------|-----------|
| 400 | `INVALID_INPUT` | Payload inválido ou campos obrigatórios faltando |
| 401 | `UNAUTHORIZED` | Sessão expirada ou não autenticado |
| 403 | `PLAN_LIMIT` | Funcionalidade não disponível no plano atual |
| 404 | `NOT_FOUND` | Recurso não encontrado |
| 429 | `RATE_LIMITED` | Limite de requisições excedido |
| 500 | `INTERNAL_ERROR` | Erro interno do servidor |

**Formato de erro:**
```json
{
  "error": {
    "code": "PLAN_LIMIT",
    "message": "Seu plano Free permite no máximo 5 buscas/dia. Upgrade para Pro.",
    "details": { "currentUsage": 5, "limit": 5 }
  }
}
```
