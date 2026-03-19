// ============================================================
// ValorePro — AI Service (Public API)
// ============================================================
// Orchestrates all 4 Gemini AI capabilities:
// 1. Product identification from text/image
// 2. Best option analysis from search results
// 3. Purchase confirmation message generation
// 4. Store trust alert analysis
// ============================================================

import { createLogger } from '@/lib/logger';
import { getGeminiClient } from './gemini-client';
import { formatCurrency } from '@/lib/utils';
import type {
    ProductIdentificationInput, IdentifiedProduct,
    AnalysisInput, BestOptionAnalysis,
    ConfirmationInput, ConfirmationMessage,
    StoreAlertInput, StoreAlertAnalysis,
} from '@/types/ai';

const log = createLogger('ai-service');

// Re-export client for advanced usage
export { getGeminiClient } from './gemini-client';

// ── 1. Product Identification ────────────────────────────────

export async function identifyProduct(input: ProductIdentificationInput): Promise<IdentifiedProduct> {
    const client = getGeminiClient();

    const prompt = `Identifique o produto que o usuário quer comprar.

ENTRADA DO USUÁRIO: "${input.userQuery}"

Analise a entrada e retorne um JSON com:
- nome: nome completo e oficial do produto (marca + modelo + specs)
- categoria: categoria do produto (smartphone, notebook, eletrodoméstico, etc)
- marca: marca do fabricante
- modelo: modelo específico
- especificacoes: array com especificações mencionadas (capacidade, cor, etc)
- termoBusca: consulta otimizada para buscar o produto (sem palavras genéricas)
- confianca: de 0 a 1, quão certo você está da identificação

REGRAS:
- Se a entrada for vaga, use o modelo mais popular/recente da categoria.
- Para "iphone novo", considere o iPhone mais recente lançado no Brasil.
- Sempre inclua capacidade de armazenamento quando for eletrônico.
- O termoBusca deve ser objetivo: "iPhone 17 Pro 256GB Preto" e não "comprar celular apple".

Retorne APENAS o JSON.`;

    if (input.imageBase64) {
        const content = client.buildImageContent(prompt, input.imageBase64);
        return client.sendJsonMessage<IdentifiedProduct>(content);
    }

    return client.sendJsonMessage<IdentifiedProduct>(prompt);
}

// ── 2. Best Option Analysis ──────────────────────────────────

export async function analyzeBestOption(input: AnalysisInput): Promise<BestOptionAnalysis> {
    const client = getGeminiClient();

    const resultsTable = input.results.map((r, i) => (
        `${i + 1}. [${r.id}] ${r.title} — ${formatCurrency(r.totalPrice)} (Frete: ${r.shippingCost === 0 ? 'GRÁTIS' : formatCurrency(r.shippingCost)}) — ${r.storeName} (Score: ${r.trustScore}/100) — ${r.shippingDays ? `${r.shippingDays} dias` : 'prazo não informado'} — ${r.available ? 'Disponível' : 'INDISPONÍVEL'}`
    )).join('\n');

    const prompt = `Analise os resultados de busca para "${input.productName}" e escolha a melhor opção para o consumidor.

RESULTADOS:
${resultsTable}

CRITÉRIOS DE DECISÃO (em ordem de prioridade):
1. Score de Confiança ≥ 50 (OBRIGATÓRIO — nunca recomendar abaixo)
2. Produto disponível
3. Melhor preço total (produto + frete)
4. Prazo de entrega mais curto
5. Confiabilidade da loja

Retorne um JSON com:
- selectedId: ID da opção escolhida
- selectedTitle: título do produto escolhido
- storeName: nome da loja
- totalPrice: preço total
- justificativa: explicação em português simples (2-3 frases) de por que escolheu esta opção
- alternativas: array com até 2 alternativas, cada uma com { id, motivo } explicando o trade-off
- alertas: array de strings alertando sobre opções com Score < 50 ou preço suspeito

REGRAS:
- Se a opção mais barata tiver Score < 50, NÃO a selecione. Escolha a próxima mais barata com Score ≥ 50.
- Se o preço mais baixo for 40%+ abaixo da média, alerte sobre possível golpe.
- Na justificativa, mencione dados concretos (preço, score, prazo).

Retorne APENAS o JSON.`;

    return client.sendJsonMessage<BestOptionAnalysis>(prompt, { maxTokens: 1024 });
}

// ── 3. Confirmation Message ──────────────────────────────────

export async function generateConfirmationMessage(input: ConfirmationInput): Promise<ConfirmationMessage> {
    const client = getGeminiClient();

    const prompt = `Gere uma mensagem de confirmação de compra para o usuário.

DADOS:
- Produto: ${input.productName}
- Preço: ${formatCurrency(input.price)}
- Frete: ${input.shipping === 0 ? 'Grátis' : formatCurrency(input.shipping)}
- Prazo: ${input.shippingDays ? `${input.shippingDays} dias úteis` : 'não informado'}
- Loja: ${input.storeName}
- Score de Confiança: ${input.trustScore}/100
${input.savings ? `- Economia comparada: ${formatCurrency(input.savings)}` : ''}

Retorne um JSON com:
- mensagem: mensagem completa (3-4 linhas) em português natural e amigável, incluindo:
  * nome do produto e preço
  * informação de frete
  * score de confiança da loja
  * pergunta se quer finalizar a compra
- destaque: frase curta de destaque para o card de confirmação (ex: "Menor preço verificado!")

ESTILO:
- Tom amigável mas profissional
- Use emojis com moderação (máx 2)
- Mencione dados que transmitam segurança
- Se o score for alto (≥80), enfatize a confiabilidade
- Se o score for entre 50-79, seja neutro
- Nunca gere mensagem para lojas com score < 50

Retorne APENAS o JSON.`;

    return client.sendJsonMessage<ConfirmationMessage>(prompt, {
        temperature: 0.5,
        maxTokens: 512,
    });
}

// ── 4. Store Alert Analysis ──────────────────────────────────

export async function analyzeStoreAlerts(input: StoreAlertInput): Promise<StoreAlertAnalysis> {
    const client = getGeminiClient();

    const facts = [
        `Loja: ${input.storeName} (${input.domain})`,
        `Score de Confiança: ${input.trustScore}/100`,
        input.cnpjStatus ? `CNPJ: ${input.cnpjStatus}` : 'CNPJ: não encontrado',
        input.domainAgeYears != null ? `Idade do domínio: ${input.domainAgeYears.toFixed(1)} anos` : 'Idade do domínio: desconhecida',
        input.sslValid != null ? `SSL: ${input.sslValid ? 'válido' : 'INVÁLIDO'}` : 'SSL: não verificado',
        input.reclameAquiScore != null ? `Reclame Aqui: ${input.reclameAquiScore}/10 (${input.reclameAquiResolvidas ?? '?'}% resolvidas)` : 'Reclame Aqui: não encontrada',
        input.googleRating != null ? `Google: ${input.googleRating}/5 (${input.googleReviews ?? 0} avaliações)` : 'Google: sem avaliações',
        input.priceVsAverage != null ? `Preço vs média: ${(input.priceVsAverage * 100).toFixed(0)}%` : '',
    ].filter(Boolean).join('\n');

    const prompt = `Analise a reputação desta loja online e gere um resumo para o consumidor brasileiro.

DADOS DA LOJA:
${facts}

Retorne um JSON com:
- resumo: análise em linguagem natural (3-4 frases), mencionando fatos concretos. Escreva como se estivesse explicando para um amigo se deve ou não comprar nessa loja.
- nivel: "segura" | "atencao" | "risco"
- pontosFavoraveis: array de strings com pontos positivos (máx 4)
- pontosDeAtencao: array de strings com pontos negativos/alertas (máx 4)
- recomendacao: uma frase direta de recomendação final

REGRAS:
- Se CNPJ inativo/não encontrado + domínio < 1 ano + sem Reclame Aqui: provavelmente golpe.
- Se preço 40%+ abaixo da média: alertar explicitamente.
- Mencione fatos, não opiniões vagas.
- Use linguagem simples e acessível.

Retorne APENAS o JSON.`;

    return client.sendJsonMessage<StoreAlertAnalysis>(prompt, { maxTokens: 768 });
}

// ── Convenience: Full Pipeline ───────────────────────────────

export async function aiProcessQuery(userQuery: string, imageBase64?: string): Promise<{
    product: IdentifiedProduct;
    searchTerm: string;
}> {
    log.info('AI processing user query', { query: userQuery, hasImage: !!imageBase64 });

    const product = await identifyProduct({ userQuery, imageBase64 });

    log.info('Product identified', {
        nome: product.nome,
        termoBusca: product.termoBusca,
        confianca: product.confianca,
    });

    return { product, searchTerm: product.termoBusca };
}
