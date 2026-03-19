# 🏷️ ValorePro

> Plataforma brasileira de busca inteligente de preços com IA — encontre o melhor preço, verifique a loja, e compre com segurança.

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.x-38bdf8?logo=tailwindcss)](https://tailwindcss.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169e1?logo=postgresql)](https://postgresql.org)
[![License](https://img.shields.io/badge/License-Proprietary-red)]()

---

## 📋 Índice

- [Sobre o Projeto](#-sobre-o-projeto)
- [Funcionalidades](#-funcionalidades)
- [Stack Técnica](#-stack-técnica)
- [Arquitetura](#-arquitetura)
- [Estrutura de Pastas](#-estrutura-de-pastas)
- [Instalação](#-instalação)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)
- [Módulos](#-módulos)
- [API Reference](#-api-reference)
- [Monetização](#-monetização)
- [Roadmap](#-roadmap)
- [Licença](#-licença)

---

## 🎯 Sobre o Projeto

**ValorePro** é um SaaS PWA brasileiro que utiliza inteligência artificial para:

1. **Varrer a web** buscando o melhor preço de qualquer produto
2. **Verificar a reputação** de cada loja encontrada (CNPJ, Reclame Aqui, SSL, etc.)
3. **Finalizar a compra automaticamente** via agente de IA em nome do usuário

### Problema que Resolve

O consumidor brasileiro gasta em média 2-4 horas comparando preços em múltiplos sites e ainda corre o risco de cair em golpes. ValorePro reduz isso para **30 segundos** com verificação de segurança integrada.

---

## ✨ Funcionalidades

| Funcionalidade | Descrição | Status |
|----------------|-----------|--------|
| 🔍 Busca Multi-Fonte | SerpAPI + Mercado Livre API + scraping direto | ✅ Implementado |
| 🛡️ Score de Confiança | CNPJ + Reclame Aqui + SSL + Google Places | ✅ Implementado |
| 🤖 Compra Automática | Agente IA finaliza a compra (Claude API) | 🔜 Planejado |
| 🔔 Alertas de Preço | Monitore produtos e receba quando atingir o preço-alvo | 🔜 Planejado |
| 💳 Pagamento Seguro | Tokenização PCI-DSS via Pagar.me | 🔜 Planejado |
| 📱 PWA | Instale como app no celular | 🔜 Planejado |

---

## 🏗️ Stack Técnica

```
┌─────────────────────────────────────────────────┐
│                    FRONTEND                      │
│  Next.js 14 · TypeScript · Tailwind · shadcn/ui │
│                     (PWA)                        │
├─────────────────────────────────────────────────┤
│                     BACKEND                      │
│       Next.js API Routes · BullMQ · Redis       │
├─────────────────────────────────────────────────┤
│                   SERVIÇOS                       │
│  Claude API · SerpAPI · Playwright · Pagar.me   │
├─────────────────────────────────────────────────┤
│                INFRAESTRUTURA                    │
│  Supabase (PostgreSQL + Auth) · Redis · FCM     │
├─────────────────────────────────────────────────┤
│                    DEPLOY                        │
│              Vercel (full-stack)                 │
└─────────────────────────────────────────────────┘
```

### Detalhamento

| Camada | Tecnologia | Uso |
|--------|------------|-----|
| Framework | Next.js 14 (App Router) | SSR, routing, API routes |
| Linguagem | TypeScript 5.x | Tipagem estática em todo o código |
| UI | Tailwind CSS + shadcn/ui | Design system consistente |
| IA | Claude API (Anthropic) | Identificação de produto + análise |
| Scraping | Playwright (headless) | Extração de preços de lojas |
| Busca Web | SerpAPI | Google Shopping + Organic results |
| APIs | Mercado Livre API | Busca em marketplaces oficiais |
| Reputação | Reclame Aqui + ReceitaWS + Google Places | Verificação de confiança |
| Banco | Supabase (PostgreSQL) | Persistência de dados + Auth |
| Cache | Redis (ioredis) | Cache de resultados (TTL 30 min) |
| Filas | BullMQ | Jobs assíncronos de busca |
| Pagamentos | Pagar.me | Tokenização PCI-DSS (🔜 planejado) |
| Auth | Supabase Auth | Autenticação de usuários |
| Notificações | Firebase FCM + SendGrid | Push + email (🔜 planejado) |
| Deploy | Vercel | Full-stack deployment |

---

## 🏛️ Arquitetura

```mermaid
graph TB
  subgraph Cliente ["📱 Cliente (PWA)"]
    UI["Next.js App Router"]
  end

  subgraph API ["🔌 API Layer"]
    Routes["API Routes / Server Actions"]
  end

  subgraph Core ["⚙️ Core Services"]
    Search["Search Module"]
    Reputation["Reputation Module"]
    Purchase["Purchase Agent (IA)"]
  end

  subgraph External ["🌐 APIs Externas"]
    SerpAPI
    MeLi["Mercado Livre API"]
    ReceitaWS
    GooglePlaces["Google Places"]
    ReclameAqui["Reclame Aqui"]
    ClaudeAPI["Claude API"]
    Pagarme["Pagar.me"]
  end

  subgraph Infra ["🗄️ Infraestrutura"]
    DB["PostgreSQL"]
    Cache["Redis"]
    Queue["BullMQ"]
  end

  UI --> Routes
  Routes --> Search
  Routes --> Reputation
  Routes --> Purchase
  Search --> SerpAPI
  Search --> MeLi
  Search --> Cache
  Reputation --> ReceitaWS
  Reputation --> GooglePlaces
  Reputation --> ReclameAqui
  Purchase --> ClaudeAPI
  Purchase --> Pagarme
  Routes --> DB
  Queue --> Search
```

---

## 📁 Estrutura de Pastas

```
ValorePro/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root layout (PWA + SEO)
│   │   ├── page.tsx                  # Landing page
│   │   ├── globals.css               # Tailwind + tokens
│   │   ├── login/                    # Página de login
│   │   ├── signup/                   # Página de cadastro
│   │   ├── forgot-password/          # Recuperação de senha
│   │   ├── confirm/                  # Confirmação de email
│   │   ├── results/                  # Resultados de busca
│   │   ├── dashboard/                # Dashboard protegido
│   │   │   ├── page.tsx              # Visão geral
│   │   │   ├── alerts/               # Alertas de preço
│   │   │   ├── purchases/            # Histórico de compras
│   │   │   └── settings/             # Configurações & perfil
│   │   └── api/                      # API Routes
│   │       ├── search/               # Busca de produtos
│   │       ├── reputation/           # Score de confiança
│   │       ├── alerts/               # CRUD de alertas
│   │       ├── dashboard/            # Stats do dashboard
│   │       ├── price-history/        # Histórico de preços
│   │       └── user/                 # Perfil do usuário
│   │
│   ├── types/                        # TypeScript types
│   │   ├── search.ts                 # Tipos de busca
│   │   ├── store.ts                  # Tipos de reputação
│   │   ├── ai.ts                     # Tipos do módulo IA
│   │   ├── purchase.ts              # Tipos de compra
│   │   └── database.ts              # Tipos Supabase (auto-gen)
│   │
│   ├── lib/                          # Utilitários compartilhados
│   │   ├── logger.ts                 # Logger estruturado
│   │   ├── utils.ts                  # Helpers (cn, formatCurrency)
│   │   ├── redis.ts                  # Redis client + cache
│   │   ├── queue.ts                  # BullMQ job queues
│   │   └── supabase/                 # Supabase clients
│   │       ├── client.ts             # Browser client
│   │       ├── server.ts             # Server client (admin)
│   │       └── middleware.ts         # Auth middleware
│   │
│   ├── hooks/                        # React hooks
│   │   └── useAuth.ts               # Auth hook
│   │
│   ├── components/                   # Componentes UI
│   │   ├── Navbar.tsx               # Navegação
│   │   ├── Logo.tsx                 # Logo SVG
│   │   ├── ProductCard.tsx          # Card de produto
│   │   ├── PriceChart.tsx           # Gráfico de preço
│   │   ├── TrustBadge.tsx           # Badge de confiança
│   │   └── Skeletons.tsx            # Loading states
│   │
│   └── server/                       # Código server-only
│       ├── services/                 # Serviços de negócio
│       │   ├── search/               # 🔍 Módulo de Busca
│       │   ├── reputation/           # 🛡️ Módulo de Reputação
│       │   ├── purchase/             # 🛒 Agente de Compra
│       │   └── ai/                   # 🤖 Módulo Claude AI
│       └── workers/                  # BullMQ workers
│
├── public/                           # Arquivos estáticos
│
├── docs/                             # 📚 Documentação
│   ├── search-module.md
│   ├── reputation-module.md
│   ├── ai-module.md
│   ├── purchase-module.md
│   └── api-reference.md
│
├── .env.example                      # Template de variáveis
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.mjs
└── README.md                         # ← Você está aqui
```

---

## 🚀 Instalação

### Pré-requisitos

- **Node.js** ≥ 18.17
- **PostgreSQL** ≥ 14
- **Redis** ≥ 7
- **pnpm** (recomendado) ou npm

### Setup

```bash
# Clonar o repositório
git clone https://github.com/seu-usuario/valorepro.git
cd valorepro

# Instalar dependências
pnpm install

# Configurar variáveis de ambiente
cp .env.example .env.local

# Gerar Prisma Client
npx prisma generate

# Executar migrations
npx prisma db push

# Iniciar em desenvolvimento
pnpm dev
```

---

## 🔐 Variáveis de Ambiente

Copie `.env.example` para `.env.local` e preencha:

```env
# ── Database ──────────────────────────────────────
DATABASE_URL="postgresql://user:pass@localhost:5432/valorepro"

# ── Redis ─────────────────────────────────────────
REDIS_URL="redis://localhost:6379"

# ── Auth ──────────────────────────────────────────
NEXTAUTH_SECRET="gerar-com-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

# ── SerpAPI (Busca Web) ──────────────────────────
SERPAPI_KEY="sua-chave-serpapi"

# ── Mercado Livre ─────────────────────────────────
MERCADOLIVRE_APP_ID=""
MERCADOLIVRE_SECRET=""
MERCADOLIVRE_ACCESS_TOKEN=""

# ── Amazon Product Advertising API ────────────────
AMAZON_ACCESS_KEY=""
AMAZON_SECRET_KEY=""
AMAZON_PARTNER_TAG=""

# ── IA (Anthropic Claude) ────────────────────────
ANTHROPIC_API_KEY=""

# ── Reputação ────────────────────────────────────
WHOIS_API_KEY=""                    # opcional (RDAP é fallback grátis)
GOOGLE_PLACES_API_KEY=""

# ── Pagamentos (Pagar.me) ────────────────────────
PAGARME_API_KEY=""
PAGARME_ENCRYPTION_KEY=""

# ── Notificações ─────────────────────────────────
FIREBASE_PROJECT_ID=""
FIREBASE_PRIVATE_KEY=""
FIREBASE_CLIENT_EMAIL=""
SENDGRID_API_KEY=""
SENDGRID_FROM_EMAIL="noreply@valorepro.com.br"

# ── Geral ─────────────────────────────────────────
DEFAULT_CEP="01001000"
LOG_LEVEL="info"                    # debug | info | warn | error
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## 📦 Módulos

### 🔍 Módulo de Busca (`src/server/services/search/`)

Varredura multi-fonte com normalização e deduplicação de resultados.

**Pipeline de 3 fases:**
1. **Fase 1** — SerpAPI (Shopping + Organic) + Mercado Livre API em paralelo
2. **Fase 2** — Playwright scraping das URLs orgânicas do SerpAPI
3. **Fase 3** — Normalização, deduplicação por domínio+preço, ranking por preço total

👉 Documentação completa: [docs/search-module.md](docs/search-module.md)

---

### 🛡️ Módulo de Reputação (`src/server/services/reputation/`)

Verificação de procedência com score de confiança 0-100.

**Checks executados em paralelo:**
- **CNPJ** — Extração do footer via Playwright + validação na ReceitaWS
- **Domínio** — Idade via RDAP + certificado SSL via TLS
- **Reclame Aqui** — Score, % resolvidas, reputação via scraping
- **Google Places** — Rating e total de avaliações via API

**Score (0-100):**

| Critério | Pontos |
|----------|--------|
| CNPJ ativo | +25 |
| Domínio > 2 anos | +20 |
| SSL válido | +15 |
| Reclame Aqui ≥ 7/10 | +25 |
| Google ≥ 4★ | +15 |
| Preço dentro da média | +10 (bônus) |
| Preço 40%+ abaixo | -30 (alerta golpe) |

**Classificações:** 🟢 Excelente (80+) · 🔵 Confiável (60-79) · 🟡 Regular (40-59) · 🟠 Duvidosa (20-39) · 🔴 Perigosa (0-19)

👉 Documentação completa: [docs/reputation-module.md](docs/reputation-module.md)

---

## 📡 API Reference

Documentação detalhada: [docs/api-reference.md](docs/api-reference.md)

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/search` | POST | Criar nova busca de produtos |
| `/api/search/[id]` | GET | Consultar resultados da busca |
| `/api/stores/[domain]/reputation` | GET | Score de confiança da loja |
| `/api/alerts` | GET / POST | Listar / criar alertas de preço |
| `/api/alerts/[id]` | PATCH / DELETE | Atualizar / remover alerta |
| `/api/auth/[...nextauth]` | * | Endpoints de autenticação |

---

## 💰 Monetização

| Plano | Preço | Limites |
|-------|-------|---------|
| **Free** | R$ 0 | 5 buscas/dia, sem alertas |
| **Pro** | R$ 29,90/mês | Buscas ilimitadas, 10 alertas, score de lojas |
| **Premium** | R$ 59,90/mês | Tudo do Pro + compra automática IA + suporte prioritário |

Receita adicional via **programas de afiliados** (links Mercado Livre, Amazon, etc.)

---

## 🗺️ Roadmap

- [x] Módulo de Busca Multi-Fonte
- [x] Módulo de Reputação de Lojas
- [ ] Inicialização do Projeto (Next.js + PWA)
- [ ] Schema Prisma + Banco de Dados
- [ ] Redis Cache + BullMQ Filas
- [ ] Autenticação (NextAuth)
- [ ] Interface Dashboard
- [ ] Agente de Compra Automática (Claude)
- [ ] Integração Pagar.me
- [ ] Alertas de Preço (FCM + SendGrid)
- [ ] Testes E2E
- [ ] Deploy (Vercel + Railway)

---

## 📄 Licença

Proprietário. © 2026 ValorePro. Todos os direitos reservados.
