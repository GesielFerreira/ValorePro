# 🔍 Módulo de Busca de Produtos

> `src/server/services/search/`

Varredura multi-fonte que busca produtos em paralelo via SerpAPI, Mercado Livre API, e scraping direto com Playwright.

---

## Arquitetura

```
executeProductSearch(input)
  │
  ├─ Fase 1: Promise.allSettled([
  │     searchSerpApi()         → products[] + scrapableUrls[]
  │     searchMercadoLivre()    → products[]
  │  ])
  │
  ├─ Fase 2: scrapeProductPages(scrapableUrls)
  │     → scraped products[] (max 10 URLs, 3 simultâneos)
  │
  └─ Fase 3: normalizeResults(allProducts)
        → deduplicate → sort by totalPrice → SearchResult
```

---

## Arquivos

| Arquivo | Linhas | Descrição |
|---------|--------|-----------|
| `index.ts` | Orquestrador | Entry point — coordena as 3 fases |
| `serp-search.ts` | SerpAPI | Google Shopping + Organic results |
| `mercadolivre-search.ts` | MeLi API | API oficial do Mercado Livre |
| `playwright-scraper.ts` | Scraper | Extração headless com anti-bot |
| `normalizer.ts` | Normalização | Dedup + ranking + formatação |

---

## Uso

```typescript
import { executeProductSearch } from '@/server/services/search';

const result = await executeProductSearch({
  query: 'iPhone 15 128GB',
  userId: 'user_123',
  cep: '01001000',
  maxResults: 30,
});

// result.results         → NormalizedResult[] ordenado por preço total
// result.bestPrice       → O mais barato (produto + frete)
// result.sources         → Contagem e erros por fonte
// result.totalResults    → Total após dedup
// result.duration        → Tempo total em ms
```

---

## Detalhes por Fonte

### SerpAPI (`serp-search.ts`)

**O que faz:**
- Busca `"[produto] comprar menor preço"` no Google BR
- Roda Google Shopping + Organic em paralelo
- Filtra 30+ domínios irrelevantes (blogs, fóruns, comparadores)
- Shopping → `RawProductResult[]` com preço
- Organic → URLs para o Playwright scraper

**Domínios bloqueados:**
```
youtube, facebook, instagram, twitter, reddit, wikipedia,
buscape, zoom, pelando, promobit, hardmob,
tecmundo, olhardigital, canaltech, tecnoblog, tudocelular
```

**Config:**
- `SERPAPI_KEY` — obrigatório
- Retry automático (2 tentativas com backoff)

---

### Mercado Livre API (`mercadolivre-search.ts`)

**O que faz:**
- Busca na API oficial (`api.mercadolibre.com/sites/MLB/search`)
- Ordena por `price_asc` por padrão
- Busca custo de frete em lotes (5 itens por vez) para não bater rate limit
- Suporta autenticação opcional (aumenta limites)

**Config:**
- `MERCADOLIVRE_ACCESS_TOKEN` — opcional, aumenta rate limits
- `DEFAULT_CEP` — usado para estimar frete

**Taxa de requisições:**
- Sem token: ~30 req/min
- Com token: ~100 req/min
- Rate limit 429 → backoff automático 2s

---

### Playwright Scraper (`playwright-scraper.ts`)

**O que faz:**
- Acessa cada URL em browser headless (Chromium)
- Extrai preço usando 15+ seletores CSS cobrindo lojas BR:
  - KaBuM, Magazine Luiza, Amazon BR, Shopee, Americanas/Submarino
  - Fallbacks: `[itemprop="price"]`, `meta[property="product:price:amount"]`
- Detecta preço parcelado via regex (`12x de R$ 99,90`)
- Verifica disponibilidade (textos "indisponível", "esgotado")

**Anti-bot:**
- Rotação de 4 User-Agents diferentes
- Delays aleatórios entre requisições (800-2500ms)
- Delay entre lotes (1500-3000ms)
- Bloqueio de imagens/fonts/CSS (3-5x mais rápido)
- Retry com backoff exponencial + jitter

**Limites:**
- Máximo 10 URLs por busca
- Máximo 3 browsers simultâneos
- Timeout: 15s por página
- 2 retries por URL

**Parse de preço R$:**
```
"R$ 1.299,90" → 1299.90
"1299.90"     → 1299.90
"R$ 999"      → 999.00
```

---

### Normalizer (`normalizer.ts`)

**O que faz:**
- Valida resultados (preço > 0, URL presente, disponível)
- Remove parâmetros de tracking das URLs (utm_*, gclid, fbclid)
- Deduplica por: `domínio + bucket de preço (R$2) + 5 primeiras palavras do título`
  - Mantém o resultado com menor preço total
- Calcula `totalPrice = cashPrice + shippingCost`
- Ordena por `totalPrice` crescente
- Gera ID determinístico por resultado

---

## Tipos Principais

```typescript
interface SearchInput {
  query: string;          // "iPhone 15 128GB"
  userId: string;         // ID do usuário logado
  cep?: string;           // CEP para cálculo de frete
  maxResults?: number;    // default: 30
}

interface NormalizedResult {
  id: string;
  source: 'serpapi' | 'mercadolivre' | 'scraped';
  title: string;
  cashPrice: number;
  installment?: { count: number; value: number; total: number };
  shippingCost: number;
  shippingDays?: number;
  totalPrice: number;     // cashPrice + shippingCost
  url: string;
  imageUrl?: string;
  store: { name: string; url: string; domain: string };
  available: boolean;
  condition: 'new' | 'used' | 'refurbished';
  scrapedAt: Date;
}

interface SearchResult {
  searchId: string;
  query: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  results: NormalizedResult[];
  bestPrice?: NormalizedResult;
  sources: Record<string, { count: number; errors: string[] }>;
  totalResults: number;
  duration: number;       // ms
  createdAt: Date;
}
```

---

## Fluxo de Erros

| Cenário | Comportamento |
|---------|---------------|
| SerpAPI falha | MeLi + scraper continuam normalmente |
| MeLi falha | SerpAPI + scraper continuam normalmente |
| Playwright URL bloqueada | Skip, conta como warning |
| Todas as fontes falham | `status: 'failed'`, `results: []` |
| Rate limit (429) | Backoff automático + retry |
| Timeout de página | Skip após 15s, próxima URL |

Todas as chamadas usam `Promise.allSettled` — **uma fonte nunca bloqueia as outras**.
