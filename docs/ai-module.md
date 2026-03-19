# 🧠 Módulo de IA — Claude API

> `src/server/services/ai/`

Integração com Claude (Anthropic) como cérebro do ValorePro — identificação de produtos, análise de resultados, geração de mensagens e detecção de alertas.

---

## Arquitetura

```
aiProcessQuery("quero iphone novo preto 256")
  │
  └─ identifyProduct()
       └─ Claude claude-sonnet-4-6 → { nome, termoBusca, confianca }

analyzeBestOption(results[])
  └─ Claude → { selectedId, justificativa, alternativas, alertas }

generateConfirmationMessage(product, store, price)
  └─ Claude → { mensagem, destaque }

analyzeStoreAlerts(storeData)
  └─ Claude → { resumo, nivel, pontosFavoraveis, pontosDeAtencao }
```

---

## Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `claude-client.ts` | Wrapper HTTP com retry, rate limit, JSON mode, multimodal |
| `index.ts` | 4 funções de alto nível + pipeline convenience |

---

## Uso

### 1. Identificação de Produto

```typescript
import { identifyProduct } from '@/server/services/ai';

const product = await identifyProduct({
  userQuery: 'quero aquele iphone novo preto 256',
});
// → { nome: "iPhone 17 Pro 256GB Preto Titanium", termoBusca: "iPhone 17 Pro 256GB Preto", confianca: 0.92 }

// Com imagem da câmera:
const product2 = await identifyProduct({
  userQuery: 'quanto tá esse?',
  imageBase64: 'iVBORw0KGgo...',
});
```

### 2. Análise de Melhor Opção

```typescript
import { analyzeBestOption } from '@/server/services/ai';

const analysis = await analyzeBestOption({
  productName: 'iPhone 17 Pro 256GB',
  results: normalizedResults, // array da busca
});

// analysis.justificativa →
// "A KaBuM oferece o melhor preço (R$ 6.499) com Score 88/100 e frete grátis.
//  Apesar da PreçoMania ter preço 15% menor, seu Score de 28/100 indica alto risco."
```

### 3. Mensagem de Confirmação

```typescript
import { generateConfirmationMessage } from '@/server/services/ai';

const msg = await generateConfirmationMessage({
  productName: 'iPhone 17 Pro 256GB',
  price: 6499,
  shipping: 0,
  shippingDays: 2,
  storeName: 'Amazon BR',
  trustScore: 94,
  savings: 350,
});

// msg.mensagem →
// "Encontrei o iPhone 17 Pro 256GB por R$ 6.499,00 na Amazon BR 🎯
//  Frete grátis com entrega em 2 dias úteis.
//  Score de Confiança 94/100 — loja altamente verificada.
//  Quer que eu finalize a compra por você?"
```

### 4. Análise de Alertas de Loja

```typescript
import { analyzeStoreAlerts } from '@/server/services/ai';

const alert = await analyzeStoreAlerts({
  storeName: 'PreçoMania',
  domain: 'precomania.com',
  trustScore: 28,
  cnpjStatus: undefined,
  domainAgeYears: 0.3,
  sslValid: true,
  reclameAquiScore: undefined,
  priceVsAverage: -0.45,
});

// alert.resumo →
// "A PreçoMania apresenta sinais preocupantes. O domínio tem apenas 4 meses,
//  não possui CNPJ visível e o preço está 45% abaixo da média do mercado.
//  Embora tenha SSL válido, a ausência de histórico no Reclame Aqui e o
//  preço muito baixo são indicadores clássicos de loja fraudulenta."
//
// alert.nivel → "risco"
// alert.recomendacao → "Evite esta loja. O conjunto de alertas indica alto risco de golpe."
```

---

## System Prompt

O Claude opera sob estas regras obrigatórias:

1. ✅ Sempre responde em **português brasileiro**
2. ✅ Direto e objetivo — sem rodeios
3. 🚫 **NUNCA** recomenda lojas com Score < 50
4. 💰 Preços sempre em R$ formatados
5. 🛡️ Segurança > preço
6. 📊 Menciona fatos concretos (CNPJ, Reclame Aqui, etc.)
7. ⚠️ Preço 40%+ abaixo da média = alerta de golpe
8. 🗣️ Linguagem simples e acessível

---

## Config

| Variável | Valor |
|----------|-------|
| `ANTHROPIC_API_KEY` | Obrigatória |
| Modelo | `claude-sonnet-4-6` |
| Temperature | 0.3 (identificação/análise) · 0.5 (mensagens) |
| Max Tokens | 512-2048 por capability |
| Retry | 2 tentativas com backoff exponencial |
| Rate Limit | Backoff em 429 / 529 |
