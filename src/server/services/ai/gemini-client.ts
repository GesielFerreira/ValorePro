// ============================================================
// ValorePro — Google Gemini API Client
// ============================================================
// Low-level wrapper around the Gemini REST API. Handles auth,
// retries, rate limiting, and structured JSON responses.
// ============================================================

import { createLogger } from '@/lib/logger';
import type { AIConfig } from '@/types/ai';

const log = createLogger('gemini-client');

const DEFAULT_CONFIG: AIConfig = {
    model: 'gemini-2.5-flash',
    maxTokens: 2048,
    temperature: 0.3,
};

const SYSTEM_PROMPT = `Você é o ValorePro AI, um assistente especializado em compras online no Brasil.

REGRAS OBRIGATÓRIAS:
1. Sempre responda em português brasileiro.
2. Seja direto e objetivo — nada de rodeios.
3. NUNCA recomende lojas com Score de Confiança abaixo de 50/100.
4. Preços sempre em Reais (R$) formatados corretamente (ex: R$ 1.299,90).
5. Priorize segurança do consumidor acima de preço.
6. Quando analisar lojas, mencione fatos concretos (CNPJ ativo, nota no Reclame Aqui, etc).
7. Se um preço estiver 40% ou mais abaixo da média, alerte sobre possível golpe.
8. Use linguagem simples e acessível — o usuário pode não ser técnico.
9. Quando gerar JSON, retorne APENAS o JSON sem markdown, sem explicações.`;

// ── Types ────────────────────────────────────────────────────

interface GeminiPart {
    text?: string;
    inlineData?: {
        mimeType: string;
        data: string;
    };
}

interface GeminiContent {
    role: 'user' | 'model';
    parts: GeminiPart[];
}

interface GeminiResponse {
    candidates: Array<{
        content: {
            parts: Array<{ text: string }>;
            role: string;
        };
        finishReason: string;
    }>;
    usageMetadata: {
        promptTokenCount: number;
        candidatesTokenCount: number;
        totalTokenCount: number;
    };
    modelVersion: string;
}

// ── Client ───────────────────────────────────────────────────

export class GeminiClient {
    private apiKey: string;
    private config: AIConfig;
    private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

    constructor(config?: Partial<AIConfig>) {
        const key = process.env.GEMINI_API_KEY;
        if (!key) throw new Error('GEMINI_API_KEY not configured');
        this.apiKey = key;
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    async sendMessage(
        userContent: string | GeminiPart[],
        options?: {
            systemPrompt?: string;
            temperature?: number;
            maxTokens?: number;
            jsonMode?: boolean;
        },
    ): Promise<string> {
        const start = Date.now();

        const parts: GeminiPart[] = typeof userContent === 'string'
            ? [{ text: userContent }]
            : userContent;

        const body: Record<string, unknown> = {
            contents: [
                { role: 'user', parts },
            ] as GeminiContent[],
            systemInstruction: {
                parts: [{ text: options?.systemPrompt ?? SYSTEM_PROMPT }],
            },
            generationConfig: {
                temperature: options?.temperature ?? this.config.temperature,
                maxOutputTokens: options?.maxTokens ?? this.config.maxTokens,
                ...(options?.jsonMode && {
                    responseMimeType: 'application/json',
                }),
            },
        };

        log.info('Sending request to Gemini', {
            model: this.config.model,
            contentLength: typeof userContent === 'string' ? userContent.length : 'multimodal',
        });

        const response = await this.fetchWithRetry(body);

        const text = response.candidates?.[0]?.content?.parts
            ?.map((p) => p.text)
            ?.join('') ?? '';

        log.info('Gemini response received', {
            model: response.modelVersion ?? this.config.model,
            inputTokens: response.usageMetadata?.promptTokenCount,
            outputTokens: response.usageMetadata?.candidatesTokenCount,
            duration: `${Date.now() - start}ms`,
        });

        return text;
    }

    async sendJsonMessage<T>(
        userContent: string | GeminiPart[],
        options?: {
            systemPrompt?: string;
            temperature?: number;
            maxTokens?: number;
        },
    ): Promise<T> {
        const raw = await this.sendMessage(userContent, {
            ...options,
            jsonMode: true,
        });

        // Clean potential markdown wrapping (fallback safety)
        let cleaned = raw.trim();
        if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }

        try {
            return JSON.parse(cleaned) as T;
        } catch (err) {
            log.error('Failed to parse Gemini JSON response', {
                raw: cleaned.slice(0, 200),
                error: String(err),
            });
            throw new Error(`Gemini returned invalid JSON: ${String(err)}`);
        }
    }

    // ── Multimodal (Image) ─────────────────────────────────────

    buildImageContent(text: string, imageBase64: string, mediaType = 'image/jpeg'): GeminiPart[] {
        return [
            {
                inlineData: {
                    mimeType: mediaType,
                    data: imageBase64,
                },
            },
            { text },
        ];
    }

    // ── HTTP with Retry ────────────────────────────────────────

    private async fetchWithRetry(body: Record<string, unknown>, retries = 2): Promise<GeminiResponse> {
        const url = `${this.baseUrl}/models/${this.config.model}:generateContent?key=${this.apiKey}`;

        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });

                if (res.status === 429) {
                    const wait = Math.pow(2, attempt + 1) * 1000;
                    log.warn(`Rate limited (429), waiting ${wait}ms before retry ${attempt + 1}/${retries}`);
                    await new Promise((r) => setTimeout(r, wait));
                    continue;
                }

                if (res.status === 503) {
                    const wait = 5000;
                    log.warn(`API overloaded (503), waiting ${wait}ms`);
                    await new Promise((r) => setTimeout(r, wait));
                    continue;
                }

                if (!res.ok) {
                    const errorBody = await res.text();
                    throw new Error(`Gemini API error ${res.status}: ${errorBody.slice(0, 300)}`);
                }

                return (await res.json()) as GeminiResponse;
            } catch (err) {
                if (attempt === retries) throw err;
                const wait = Math.pow(2, attempt + 1) * 1000;
                log.warn(`Request failed, retry ${attempt + 1}/${retries} in ${wait}ms`, { error: String(err) });
                await new Promise((r) => setTimeout(r, wait));
            }
        }

        throw new Error('All retries exhausted');
    }
}

// Singleton instance
let _client: GeminiClient | null = null;

export function getGeminiClient(config?: Partial<AIConfig>): GeminiClient {
    if (!_client) _client = new GeminiClient(config);
    return _client;
}
