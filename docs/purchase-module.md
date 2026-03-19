# 🤖 Módulo de Compra Automatizada

> `src/server/services/purchase/`

Agente Playwright headless que executa compras de e-commerce automaticamente em nome do usuário.

---

## ⚠️ Segurança

> [!CAUTION]
> A compra **NUNCA** é executada sem `confirmacao === true`. Duas camadas de validação protegem contra execução acidental.

**Gate 1:** Confirmação explícita (`confirmacao` booleano)
**Gate 2:** Validação completa de input (CPF, CEP, token, e-mail, endereço)
**Audit:** Cada ação é logada em trail imutável com screenshots

---

## Arquitetura

```
executePurchase(input)
  │
  ├─ Gate 1: confirmacao === true? ──── NÃO → retorna falha imediata
  ├─ Gate 2: validateInput() ────────── ERROS → retorna lista de erros
  │
  └─ executePurchaseFlow()
       │
       ├─ Step 1:  Navegar para URL do produto
       ├─ Step 2:  Verificar preço atual (tolerância 5%)
       ├─ Step 3:  Verificar estoque
       ├─ Step 4:  Adicionar ao carrinho
       ├─ Step 5:  Ir para checkout
       ├─ Step 6:  Preencher endereço
       ├─ Step 7:  Selecionar frete
       ├─ Step 8:  Preencher pagamento (token)
       ├─ Step 9:  Confirmar pedido
       └─ Step 10: Capturar número + valor + prazo
```

---

## Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `index.ts` | API pública + Gate 1 (confirmação) + Gate 2 (validação) |
| `purchase-agent.ts` | Fluxo Playwright de 10 steps + screenshots + error handling |
| `store-strategies.ts` | Seletores CSS por loja (KaBuM, Magalu, Amazon, Americanas, Casas Bahia, Shopee) |
| `audit-logger.ts` | Trail imutável com step sequence + screenshots base64 |

---

## Uso

```typescript
import { executePurchase } from '@/server/services/purchase';

const { result, audit } = await executePurchase({
  productUrl: 'https://www.kabum.com.br/produto/12345',
  expectedPrice: 1299.90,
  storeDomain: 'kabum.com.br',
  storeName: 'KaBuM',
  userData: {
    nome: 'João Silva',
    cpf: '123.456.789-09',
    telefone: '+5511999999999',
    email: 'joao@email.com',
    endereco: {
      rua: 'Rua das Flores',
      numero: '123',
      complemento: 'Apto 42',
      bairro: 'Centro',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01001-000',
    },
  },
  paymentToken: {
    tokenId: 'tok_abc123xyz',    // Token Pagar.me (NUNCA o número real)
    lastFourDigits: '4242',
    brand: 'visa',
  },
  confirmacao: true,              // OBRIGATÓRIO
  userId: 'user_123',
  searchId: 'search_456',
});

if (result.sucesso) {
  console.log(result.numeroPedido);     // "ABC-12345"
  console.log(result.valorTotal);       // 1299.90
  console.log(result.previsaoEntrega);  // "3 a 5 dias úteis"
} else {
  console.log(result.motivo);           // "PRICE_CHANGED"
  console.log(result.mensagem);         // "O preço mudou de R$ 1299.90 para..."
  console.log(result.urlManual);        // URL para compra manual
}

// Audit trail completo
console.log(audit.getSummary());
console.log(audit.getEntries());
```

---

## Tratamento de Erros

| Cenário | Código | Comportamento |
|---------|--------|---------------|
| Sem confirmação | `NO_CONFIRMATION` | Rejeita imediatamente, não abre browser |
| Preço mudou >5% | `PRICE_CHANGED` | Para, informa preço novo, sugere manual |
| Sem estoque | `OUT_OF_STOCK` | Notifica, sugere alternativas |
| Pagamento falhou | `PAYMENT_FAILED` | Notifica, NÃO tenta novamente |
| Timeout (15s/step) | `TIMEOUT` | Notifica para comprar manualmente |
| Anti-bot/captcha | `BLOCKED_BY_STORE` | Notifica com link manual |
| Botão não encontrado | `CHECKOUT_ERROR` | Screenshot + link manual |

---

## Lojas Suportadas

| Loja | Domínio | Seletores Customizados |
|------|---------|----------------------|
| KaBuM | `kabum.com.br` | Botão comprar, preço |
| Magazine Luiza | `magazineluiza.com.br` | Botão bag, preço |
| Magalu | `magalu.com.br` | Botão bag, preço |
| Amazon BR | `amazon.com.br` | Add to cart, checkout, order ID |
| Americanas | `americanas.com.br` | Add cart, preço |
| Casas Bahia | `casasbahia.com.br` | Comprar, preço |
| Shopee | `shopee.com.br` | Carrinho, preço |
| **Outras** | `*` | **Seletores genéricos** (10+ fallbacks) |

---

## Audit Trail

Cada compra gera um log imutável com todos os passos:

```json
[
  { "step": 1, "action": "PURCHASE_REQUESTED", "timestamp": "..." },
  { "step": 2, "action": "CONFIRMATION_VALIDATED", "timestamp": "..." },
  { "step": 3, "action": "BROWSER_OPENED", "timestamp": "..." },
  { "step": 4, "action": "PAGE_LOADED", "screenshot": "base64...", "timestamp": "..." },
  { "step": 5, "action": "PRICE_VERIFIED", "details": { "expected": 1299.90, "actual": 1299.90 } },
  { "step": 6, "action": "ADD_TO_CART_CLICKED", "screenshot": "base64..." },
  { "step": 7, "action": "CHECKOUT_STARTED", "screenshot": "base64..." },
  { "step": 8, "action": "ADDRESS_FILLED", "screenshot": "base64..." },
  { "step": 9, "action": "SHIPPING_SELECTED", "screenshot": "base64..." },
  { "step": 10, "action": "PAYMENT_FILLED", "timestamp": "..." },
  { "step": 11, "action": "ORDER_CONFIRMED", "screenshot": "base64..." },
  { "step": 12, "action": "ORDER_NUMBER_CAPTURED", "details": { "orderNumber": "ABC-123" } },
  { "step": 13, "action": "PURCHASE_COMPLETED", "details": { "duration": "45200ms" } }
]
```
