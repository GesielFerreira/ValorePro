// ============================================================
// ValorePro — Automated Purchase Module (Public API)
// ============================================================
// Entry point for the purchase module. Validates input,
// enforces confirmation gate, executes purchase flow,
// and returns structured result with full audit trail.
//
// ⚠️ SAFETY: Purchase NEVER executes without confirmacao === true
// ============================================================

import { createLogger } from '@/lib/logger';
import { executePurchaseFlow } from './purchase-agent';
import { PurchaseAuditLog } from './audit-logger';
import { getSelectorsForStore, getSupportedStores } from './store-strategies';
import type {
    PurchaseInput,
    PurchaseResult,
    PurchaseFailure,
} from '@/types/purchase';

const log = createLogger('purchase-module');

export { PurchaseAuditLog } from './audit-logger';
export { getSelectorsForStore, getSupportedStores } from './store-strategies';
export { executePurchaseFlow } from './purchase-agent';

// ── Input Validation ─────────────────────────────────────────

interface ValidationError {
    field: string;
    message: string;
}

function validateInput(input: PurchaseInput): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!input.productUrl || !input.productUrl.startsWith('http')) {
        errors.push({ field: 'productUrl', message: 'URL do produto é obrigatória e deve ser válida' });
    }

    if (!input.expectedPrice || input.expectedPrice <= 0) {
        errors.push({ field: 'expectedPrice', message: 'Preço esperado deve ser positivo' });
    }

    if (!input.storeDomain) {
        errors.push({ field: 'storeDomain', message: 'Domínio da loja é obrigatório' });
    }

    if (!input.userId) {
        errors.push({ field: 'userId', message: 'ID do usuário é obrigatório' });
    }

    // User data validation
    const u = input.userData;
    if (!u) {
        errors.push({ field: 'userData', message: 'Dados do usuário são obrigatórios' });
    } else {
        if (!u.nome || u.nome.trim().length < 3) {
            errors.push({ field: 'userData.nome', message: 'Nome completo é obrigatório (mín. 3 caracteres)' });
        }

        if (!u.cpf || !/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(u.cpf)) {
            errors.push({ field: 'userData.cpf', message: 'CPF inválido' });
        }

        if (!u.telefone || u.telefone.replace(/\D/g, '').length < 10) {
            errors.push({ field: 'userData.telefone', message: 'Telefone inválido (mín. 10 dígitos)' });
        }

        if (!u.email || !u.email.includes('@')) {
            errors.push({ field: 'userData.email', message: 'E-mail inválido' });
        }

        if (!u.endereco) {
            errors.push({ field: 'userData.endereco', message: 'Endereço completo é obrigatório' });
        } else {
            if (!u.endereco.cep || !/^\d{5}-?\d{3}$/.test(u.endereco.cep)) {
                errors.push({ field: 'userData.endereco.cep', message: 'CEP inválido' });
            }
            if (!u.endereco.rua) errors.push({ field: 'userData.endereco.rua', message: 'Rua é obrigatória' });
            if (!u.endereco.numero) errors.push({ field: 'userData.endereco.numero', message: 'Número é obrigatório' });
            if (!u.endereco.bairro) errors.push({ field: 'userData.endereco.bairro', message: 'Bairro é obrigatório' });
            if (!u.endereco.cidade) errors.push({ field: 'userData.endereco.cidade', message: 'Cidade é obrigatória' });
            if (!u.endereco.estado || u.endereco.estado.length !== 2) {
                errors.push({ field: 'userData.endereco.estado', message: 'Estado deve ser UF com 2 letras' });
            }
        }
    }

    // Payment token validation
    if (!input.paymentToken) {
        errors.push({ field: 'paymentToken', message: 'Token de pagamento é obrigatório' });
    } else {
        if (!input.paymentToken.tokenId) {
            errors.push({ field: 'paymentToken.tokenId', message: 'Token ID do Pagar.me é obrigatório' });
        }
        // Ensure we never receive raw card data
        if (input.paymentToken.tokenId.length > 100) {
            errors.push({ field: 'paymentToken.tokenId', message: 'Token parece inválido (muito longo)' });
        }
    }

    return errors;
}

// ── Public API ───────────────────────────────────────────────

/**
 * Execute an automated purchase. Requires explicit confirmation.
 *
 * @safety Purchase NEVER executes without `confirmacao === true`.
 * Every action is logged to an immutable audit trail.
 *
 * @example
 * ```typescript
 * const { result, audit } = await executePurchase({
 *   productUrl: 'https://www.kabum.com.br/produto/12345',
 *   expectedPrice: 1299.90,
 *   storeDomain: 'kabum.com.br',
 *   storeName: 'KaBuM',
 *   userData: { nome: 'João Silva', cpf: '...', ... },
 *   paymentToken: { tokenId: 'tok_...', lastFourDigits: '4242', brand: 'visa' },
 *   confirmacao: true,
 *   userId: 'user_123',
 * });
 * ```
 */
export async function executePurchase(input: PurchaseInput): Promise<{
    result: PurchaseResult;
    audit: PurchaseAuditLog;
    validationErrors?: ValidationError[];
}> {
    const start = Date.now();

    log.info('=== Purchase request received ===', {
        store: input.storeDomain,
        price: input.expectedPrice,
        userId: input.userId,
        confirmed: input.confirmacao,
    });

    // ━━━ Gate 1: Explicit confirmation ━━━
    if (input.confirmacao !== true) {
        log.warn('Purchase rejected: no explicit confirmation');

        const audit = new PurchaseAuditLog('blocked', input.userId);
        audit.record('PURCHASE_CANCELLED', { reason: 'confirmacao !== true' });

        return {
            result: {
                sucesso: false,
                motivo: 'NO_CONFIRMATION',
                mensagem: 'A compra automática requer confirmação explícita do usuário. Defina confirmacao: true para prosseguir.',
                urlManual: input.productUrl,
                timestamp: new Date(),
            } as PurchaseFailure,
            audit,
        };
    }

    // ━━━ Gate 2: Input validation ━━━
    const validationErrors = validateInput(input);

    if (validationErrors.length > 0) {
        log.warn('Purchase rejected: validation errors', {
            errors: validationErrors.map((e) => `${e.field}: ${e.message}`),
        });

        const audit = new PurchaseAuditLog('validation_failed', input.userId);
        audit.record('PURCHASE_CANCELLED', {
            reason: 'validation_failed',
            errors: validationErrors,
        });

        return {
            result: {
                sucesso: false,
                motivo: 'CHECKOUT_ERROR',
                mensagem: `Dados inválidos: ${validationErrors.map((e) => e.message).join('; ')}`,
                urlManual: input.productUrl,
                timestamp: new Date(),
            } as PurchaseFailure,
            audit,
            validationErrors,
        };
    }

    // ━━━ Execute purchase flow ━━━
    try {
        const { result, audit } = await executePurchaseFlow(input);

        const duration = Date.now() - start;

        log.info('=== Purchase flow completed ===', {
            success: result.sucesso,
            duration: `${duration}ms`,
            store: input.storeDomain,
            ...(result.sucesso
                ? { orderNumber: result.numeroPedido, total: result.valorTotal }
                : { reason: result.motivo }),
        });

        return { result, audit };

    } catch (err) {
        log.error('Unexpected purchase error', { error: String(err) });

        const audit = new PurchaseAuditLog('error', input.userId);
        audit.record('ERROR_OCCURRED', { error: String(err) });
        audit.record('PURCHASE_FAILED', { reason: 'UNKNOWN' });

        return {
            result: {
                sucesso: false,
                motivo: 'UNKNOWN',
                mensagem: 'Erro inesperado no módulo de compra. Tente comprar manualmente pelo link.',
                urlManual: input.productUrl,
                timestamp: new Date(),
            } as PurchaseFailure,
            audit,
        };
    }
}
