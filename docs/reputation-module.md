# 🛡️ Módulo de Reputação de Lojas

> `src/server/services/reputation/`

Verificação de procedência e cálculo de score de confiança (0-100) para cada loja encontrada na busca.

---

## Arquitetura

```
verifyStoreReputation(input)
  │
  └─ Promise.allSettled([
        verifyCnpj(storeUrl)            → CnpjData | null
        verifyDomain(domain)            → DomainData
        checkReclameAqui(storeName)     → ReclameAquiData
        checkGooglePlaces(storeName)    → GooglePlacesData
     ])
        │
        ├─ calculateBreakdown()  → ScoreBreakdown
        ├─ sumScore()            → number (0-100)
        ├─ classify()            → StoreClassification
        └─ generateAlerts()      → StoreAlert[]
```

---

## Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `index.ts` | Orquestrador + calculadora de score + gerador de alertas |
| `cnpj-verifier.ts` | Playwright (extração) + ReceitaWS API (validação) |
| `domain-verifier.ts` | RDAP/WHOIS (idade) + TLS handshake (SSL) |
| `reclame-aqui.ts` | Scraper com slug direto + busca como fallback |
| `google-places.ts` | findPlaceFromText + details |

---

## Uso

```typescript
import { verifyStoreReputation } from '@/server/services/reputation';

const result = await verifyStoreReputation({
  domain: 'kabum.com.br',
  storeName: 'KaBuM',
  storeUrl: 'https://www.kabum.com.br',
  productPrice: 1299.90,         // preço deste produto
  averagePrice: 1499.00,         // preço médio do mercado
});

// result.score            → 85
// result.classification   → 'excelente'
// result.breakdown        → { cnpjScore: 25, domainAgeScore: 20, ... }
// result.alerts           → [] (nenhum alerta para lojas confiáveis)
// result.details.cnpj     → { razaoSocial: "...", status: "ATIVA" }
// result.details.reclameAqui → { score: 8.2, resolvidas: 85 }
```

---

## Detalhes por Check

### 1. CNPJ (`cnpj-verifier.ts`)

**Extração (Playwright):**
1. Acessa a URL da loja em headless
2. Scroll até o footer (triggers lazy load)
3. Tenta 5 seletores: `footer`, `#footer`, `.footer`, `[role="contentinfo"]`, `.rodape`
4. Aplica regex: `/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/`
5. Valida check digits (algoritmo oficial da Receita Federal)
6. Fallback: busca no texto completo da página

**Validação (ReceitaWS):**
- Endpoint: `https://www.receitaws.com.br/v1/cnpj/{cnpj}`
- Retorna: razão social, nome fantasia, situação cadastral, data de abertura, UF
- Rate limit: ~3 req/minuto (grátis) → backoff automático 3s no 429

**Pontuação:**
| Situação | Pontos |
|----------|--------|
| ATIVA | +25 |
| INATIVA / SUSPENSA / INAPTA / BAIXADA | 0 |
| Não encontrado | 0 |

---

### 2. Domínio (`domain-verifier.ts`)

**Idade do domínio:**
- Primeiro tenta WHOIS API (`whoisjson.com`) se `WHOIS_API_KEY` configurada
- Fallback **gratuito**: RDAP protocol
  - `.br` → `rdap.registro.br` (🇧🇷 registry)
  - Outros → `rdap.org`
- Extrai data de `registration` event

**Certificado SSL:**
- Usa `node:tls` para TLS handshake real
  - Extrai: issuer (CA), data de expiração, authorized
- Fallback: HTTPS HEAD request (qualquer conexão bem-sucedida = válido)

**Pontuação:**
| Critério | Pontos |
|----------|--------|
| Domínio ≥ 2 anos | +20 |
| Domínio 1-2 anos | +10 |
| Domínio < 1 ano | 0 |
| SSL válido | +15 |
| SSL inválido/ausente | 0 |

---

### 3. Reclame Aqui (`reclame-aqui.ts`)

**Estratégias de busca:**
1. **URL direta**: `reclameaqui.com.br/empresa/{slug}/` (slugify do nome)
2. **Fallback**: busca `reclameaqui.com.br/busca/?q={nome}` → clica primeiro resultado

**Dados extraídos:**
- Nota geral (0-10) via seletores `[data-testid="company-rate"]`, `.score b`, etc.
- Reputação ("Ótimo", "Bom", "Regular", "Ruim", "Não recomendada")
- % respondidas e % resolvidas via regex no texto da página
- Nota do consumidor
- Total de reclamações

**Pontuação:**
| Nota RA | Pontos |
|---------|--------|
| ≥ 7.0/10 | +25 |
| 5.0-6.9 | +10 |
| < 5.0 | 0 |
| Não encontrada | 0 |

---

### 4. Google Places (`google-places.ts`)

**API Calls:**
1. `findPlaceFromText` — busca `"{nome} loja online Brasil"`
2. `details` — se rating não veio no step 1 (raro)

**Dados extraídos:**
- Rating (1-5 estrelas)
- Total de avaliações
- Place ID

**Pontuação:**
| Rating | Pontos |
|--------|--------|
| ≥ 4.0★ | +15 |
| 3.0-3.9★ | +7 |
| < 3.0★ | 0 |
| Não encontrada | 0 |

---

### 5. Análise de Preço (no orchestrator)

Compara `productPrice` com `averagePrice` do mesmo produto em outras lojas.

| Situação | Pontos | Significado |
|----------|--------|-------------|
| Preço dentro de ±30% | +10 | Normal, preço competitivo |
| Preço > 30% acima | 0 | Caro mas não suspeito |
| Preço > 40% abaixo | **-30** | ⚠️ Possível golpe |

---

## Sistema de Alertas

Os alertas são gerados em português, prontos para exibição no frontend.

| Código | Tipo | Condição | Mensagem |
|--------|------|----------|----------|
| `CNPJ_NOT_FOUND` | warning | CNPJ não encontrado no site | "CNPJ não encontrado..." |
| `CNPJ_INACTIVE` | danger | Status ≠ ATIVA | "CNPJ com situação X..." |
| `DOMAIN_NEW` | warning | Idade < 1 ano | "Domínio registrado há menos de 1 ano..." |
| `SSL_INVALID` | danger | TLS falhou | "Certificado SSL inválido..." |
| `RA_NOT_FOUND` | info | Loja não no RA | "Sem histórico no Reclame Aqui..." |
| `RA_BAD_SCORE` | danger | Score < 5 | "Nota X/10 no Reclame Aqui..." |
| `RA_LOW_RESOLUTION` | warning | Resolvidas < 50% | "Apenas X% resolvidas..." |
| `GOOGLE_LOW_RATING` | warning | Rating < 3★ | "Nota X/5 no Google..." |
| `PRICE_TOO_LOW` | danger | 40%+ abaixo | "Possível golpe ou falsificado..." |

---

## Tipos Principais

```typescript
interface StoreVerificationInput {
  domain: string;           // "kabum.com.br"
  storeName: string;        // "KaBuM"
  storeUrl: string;         // "https://www.kabum.com.br"
  productPrice?: number;    // para análise de preço
  averagePrice?: number;    // média do mercado
}

interface StoreReputationResult {
  domain: string;
  storeName: string;
  score: number;                        // 0-100
  classification: StoreClassification;  // 'excelente' | 'confiavel' | ... | 'perigosa'
  breakdown: ScoreBreakdown;            // pontuação por critério
  alerts: StoreAlert[];                 // alertas em PT-BR
  details: {
    cnpj: CnpjData | null;
    domain: DomainData;
    reclameAqui: ReclameAquiData;
    googlePlaces: GooglePlacesData;
  };
  verifiedAt: Date;
  duration: number;                     // ms
}
```

---

## Fluxo de Erros

| Cenário | Comportamento |
|---------|---------------|
| CNPJ não encontrado | Score 0 para CNPJ, alerta info |
| ReceitaWS rate limit | Retry com 3s backoff |
| Reclame Aqui bloqueou | Score 0 para RA, segue normal |
| Google Places sem key | Score 0 para Google, warning no log |
| Todos os checks falham | Score = 0, `classification: 'perigosa'` |

Todos os checks usam `Promise.allSettled` — um check nunca bloqueia os outros.

---

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `WHOIS_API_KEY` | Não | RDAP é fallback grátis |
| `GOOGLE_PLACES_API_KEY` | Sim* | Necessária para score Google |

\* Se não configurada, o check Google Places retorna `found: false` e contribui 0 pontos.
