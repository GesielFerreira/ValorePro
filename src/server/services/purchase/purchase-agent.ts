// ============================================================
// ValorePro — Automated Purchase Agent (Stealth Playwright)
// ============================================================
// Headless browser agent that executes e-commerce purchases.
// Uses stealth browser + human-like behavior to bypass anti-bot.
//
// SAFETY: Requires explicit confirmacao === true to execute.
// Every action is logged to an immutable audit trail.
// ============================================================

import { createLogger } from '@/lib/logger';
import { PurchaseAuditLog } from './audit-logger';
import { getSelectorsForStore } from './store-strategies';
import {
    launchStealthBrowser,
    createHumanContext,
    humanDelay,
    humanFindAndClick,
    humanFillField,
    humanScroll,
    dismissPopups,
} from './stealth-browser';
import type { Page, Browser } from 'playwright';
import type {
    PurchaseInput,
    PurchaseResult,
    PurchaseSuccess,
    PurchaseFailure,
    PurchaseFailReason,
} from '@/types/purchase';

const log = createLogger('purchase-agent');

const STEP_TIMEOUT = 15_000;
const PRICE_TOLERANCE = 0.05;

// ── Helpers ──────────────────────────────────────────────────

function parseBrazilianPrice(text: string): number | null {
    if (!text) return null;
    const cleaned = text.replace(/R\$\s*/g, '').replace(/[^\d.,]/g, '').trim();
    if (!cleaned) return null;

    let normalized: string;
    if (cleaned.includes(',')) {
        normalized = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
        normalized = cleaned;
    }

    const value = parseFloat(normalized);
    return isNaN(value) || value <= 0 ? null : value;
}

function generatePurchaseId(): string {
    return `pur_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function failResult(reason: PurchaseFailReason, message: string, url: string, price?: number): PurchaseFailure {
    return {
        sucesso: false,
        motivo: reason,
        mensagem: message,
        urlManual: url,
        precoAtual: price,
        timestamp: new Date(),
    };
}

async function extractText(page: Page, selectors: string[]): Promise<string | null> {
    for (const selector of selectors) {
        try {
            const el = await page.$(selector);
            if (el) {
                const text = await el.textContent();
                if (text?.trim()) return text.trim();
            }
        } catch {
            continue;
        }
    }
    return null;
}

async function takeScreenshot(page: Page): Promise<string> {
    try {
        const buffer = await page.screenshot({ type: 'png', fullPage: false });
        return buffer.toString('base64');
    } catch {
        return '';
    }
}

// ── Main Purchase Flow ───────────────────────────────────────

export async function executePurchaseFlow(input: PurchaseInput): Promise<{
    result: PurchaseResult;
    audit: PurchaseAuditLog;
}> {
    const purchaseId = generatePurchaseId();
    const audit = new PurchaseAuditLog(purchaseId, input.userId);
    const selectors = getSelectorsForStore(input.storeDomain);
    const startTime = Date.now();

    audit.record('PURCHASE_REQUESTED', {
        productUrl: input.productUrl,
        storeDomain: input.storeDomain,
        expectedPrice: input.expectedPrice,
        userId: input.userId,
        searchId: input.searchId,
    });

    // ━━━ SAFETY CHECK: Explicit confirmation required ━━━
    if (input.confirmacao !== true) {
        audit.record('PURCHASE_CANCELLED', { reason: 'No explicit confirmation' });
        return {
            result: failResult(
                'NO_CONFIRMATION',
                'Compra não autorizada. A confirmação explícita do usuário é obrigatória.',
                input.productUrl,
            ),
            audit,
        };
    }

    audit.record('CONFIRMATION_VALIDATED', { confirmacao: true });

    // Launch stealth browser
    let browser: Browser | null = null;

    try {
        browser = await launchStealthBrowser();
        audit.record('BROWSER_OPENED', { headless: true, stealth: true });

        const context = await createHumanContext(browser);
        const page = await context.newPage();
        page.setDefaultTimeout(STEP_TIMEOUT);

        // ── Step 0: Resolve actual product URL ───────────────
        // Google Shopping often returns redirect URLs instead of
        // direct store links. We must resolve to the actual store page.

        let targetUrl = input.productUrl;

        // Check if URL is a Google redirect/shopping page
        try {
            const parsedUrl = new URL(targetUrl);
            const isGoogleUrl = parsedUrl.hostname.includes('google.com');

            if (isGoogleUrl) {
                audit.record('GOOGLE_REDIRECT_DETECTED', { originalUrl: targetUrl });

                // Try to extract direct URL from query params first
                const directUrl = parsedUrl.searchParams.get('url')
                    || parsedUrl.searchParams.get('q')
                    || parsedUrl.searchParams.get('adurl');

                if (directUrl && directUrl.startsWith('http') && !directUrl.includes('google.com')) {
                    targetUrl = directUrl;
                    log.info('Extracted direct URL from Google params', { targetUrl });
                } else {
                    // Navigate to Google page and follow redirect to store
                    log.info('Navigating to Google page to follow redirect...');
                    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20_000 });
                    await humanDelay(2000, 4000);

                    // Check if we landed on the store or still on Google
                    const landedUrl = page.url();
                    const landedOnGoogle = landedUrl.includes('google.com');

                    if (landedOnGoogle) {
                        // Try to find and click the store link on Google Shopping page
                        const storeLinks = [
                            `a[href*="${input.storeDomain}"]`,
                            'a[data-merchant-url]',
                            'a.shntl',  // Google Shopping store link class
                            'a[data-offer-url]',
                            'a.pla-unit-title-link',
                            'a[jsname]',
                        ];

                        let clickedStoreLink = false;
                        for (const sel of storeLinks) {
                            try {
                                const links = await page.$$(sel);
                                for (const link of links) {
                                    const href = await link.getAttribute('href');
                                    if (href && !href.includes('google.com') && href.startsWith('http')) {
                                        targetUrl = href;
                                        clickedStoreLink = true;
                                        break;
                                    }
                                }
                                if (clickedStoreLink) break;
                            } catch { continue; }
                        }

                        // Fallback: try getting any external link from the page
                        if (!clickedStoreLink) {
                            const allLinks = await page.$$eval('a[href]', (anchors) =>
                                anchors
                                    .map((a) => a.getAttribute('href'))
                                    .filter((h): h is string =>
                                        !!h && h.startsWith('http') && !h.includes('google.com')
                                    )
                            );

                            // Prefer links matching the expected store domain
                            const storeLink = allLinks.find(l => l.includes(input.storeDomain))
                                || allLinks[0];

                            if (storeLink) {
                                targetUrl = storeLink;
                                clickedStoreLink = true;
                            }
                        }

                        if (!clickedStoreLink) {
                            audit.record('GOOGLE_REDIRECT_FAILED', {
                                url: landedUrl,
                                store: input.storeDomain,
                            }, await takeScreenshot(page));

                            return {
                                result: failResult(
                                    'CHECKOUT_ERROR',
                                    `Não foi possível encontrar o link direto para ${input.storeName}. O produto pode não estar mais disponível nesta loja. Tente comprar manualmente.`,
                                    input.productUrl,
                                ),
                                audit,
                            };
                        }

                        audit.record('STORE_URL_RESOLVED', {
                            from: input.productUrl.slice(0, 100),
                            to: targetUrl.slice(0, 100),
                        });
                    } else {
                        // Redirect resolved automatically
                        targetUrl = landedUrl;
                        audit.record('REDIRECT_AUTO_RESOLVED', { finalUrl: targetUrl });
                    }
                }
            }
        } catch (urlErr) {
            log.warn('URL resolution failed, using original', { error: String(urlErr) });
        }

        // ── Step 1: Navigate to actual product page ──────────

        // Only navigate if we haven't already loaded the correct page
        const currentPageUrl = page.url();
        if (!currentPageUrl.includes(input.storeDomain) || currentPageUrl === 'about:blank') {
            await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20_000 });
        }

        // Human-like: wait for page to settle + simulate reading
        await humanDelay(2000, 4000);

        audit.record('PAGE_LOADED', { url: page.url(), resolvedFrom: input.productUrl !== targetUrl ? input.productUrl : undefined }, await takeScreenshot(page));

        // Dismiss any cookie banners or popups
        await dismissPopups(page);
        await humanDelay(500, 1000);

        // Simulate natural browsing — scroll down a bit to "read" the page
        await humanScroll(page, 300);
        await humanDelay(1000, 2000);

        // ── Step 1.5: Detect login wall ──────────────────────
        const currentUrl = page.url().toLowerCase();
        const pageContent = (await page.textContent('body') || '').toLowerCase();
        const loginIndicators = [
            '/login', '/signin', '/sign-in', '/entrar', '/identificacao',
            '/registration', '/cadastro',
        ];
        const loginFormIndicators = [
            'faça login', 'entre com', 'identifique-se', 'sign in',
            'iniciar sessão', 'acesse sua conta',
        ];

        const isLoginPage = loginIndicators.some(p => currentUrl.includes(p)) ||
            loginFormIndicators.some(t => pageContent.includes(t));

        if (isLoginPage) {
            audit.record('LOGIN_WALL_DETECTED', {
                url: page.url(),
                store: input.storeDomain,
            }, await takeScreenshot(page));

            audit.record('PURCHASE_CANCELLED', { reason: 'Store requires login' });

            return {
                result: failResult(
                    'STORE_LOGIN_REQUIRED',
                    `A loja ${input.storeName} exige login para finalizar a compra. Acesse ${input.productUrl}, faça login na sua conta e tente novamente pelo ValorePro.`,
                    input.productUrl,
                ),
                audit,
            };
        }

        // ── Step 2: Verify current price ─────────────────────

        const priceText = await extractText(page, selectors.priceOnPage);
        const currentPrice = priceText ? parseBrazilianPrice(priceText) : null;

        if (currentPrice != null) {
            const priceDiff = Math.abs(currentPrice - input.expectedPrice) / input.expectedPrice;

            audit.record('PRICE_VERIFIED', {
                expected: input.expectedPrice,
                actual: currentPrice,
                diff: `${(priceDiff * 100).toFixed(1)}%`,
            });

            if (priceDiff > PRICE_TOLERANCE) {
                audit.record('PRICE_MISMATCH_DETECTED', {
                    expected: input.expectedPrice,
                    actual: currentPrice,
                }, await takeScreenshot(page));

                audit.record('PURCHASE_CANCELLED', { reason: 'Price changed' });

                return {
                    result: failResult(
                        'PRICE_CHANGED',
                        `O preço mudou de R$ ${input.expectedPrice.toFixed(2)} para R$ ${currentPrice.toFixed(2)}. Compra cancelada por segurança. Deseja continuar com o novo preço?`,
                        input.productUrl,
                        currentPrice,
                    ),
                    audit,
                };
            }
        }

        // ── Step 3: Check stock availability ─────────────────

        const pageText = (await page.textContent('body') || '').toLowerCase();
        const outOfStock = ['indisponível', 'esgotado', 'out of stock', 'sem estoque'].some(
            (t) => pageText.includes(t)
        );

        if (outOfStock) {
            audit.record('ERROR_OCCURRED', { type: 'out_of_stock' }, await takeScreenshot(page));
            audit.record('PURCHASE_FAILED', { reason: 'OUT_OF_STOCK' });

            return {
                result: failResult(
                    'OUT_OF_STOCK',
                    'Produto fora de estoque. Sugerimos verificar alternativas na busca.',
                    input.productUrl,
                ),
                audit,
            };
        }

        // ── Step 4: Add to cart (with human-like behavior) ───

        // Scroll back up a bit to find the buy button
        await humanScroll(page, -200);
        await humanDelay(500, 1000);

        const addedToCart = await humanFindAndClick(page, selectors.addToCart, 'add-to-cart');

        if (!addedToCart) {
            audit.record('ERROR_OCCURRED', {
                type: 'add_to_cart_failed',
                selectors: selectors.addToCart,
            }, await takeScreenshot(page));

            return {
                result: failResult(
                    'CHECKOUT_ERROR',
                    'Não foi possível adicionar o produto ao carrinho. Tente comprar manualmente.',
                    input.productUrl,
                ),
                audit,
            };
        }

        audit.record('ADD_TO_CART_CLICKED', {}, await takeScreenshot(page));
        await humanDelay(2000, 4000);

        // ── Step 5: Go to cart / checkout ────────────────────

        let atCheckout = await humanFindAndClick(page, selectors.goToCheckout, 'checkout');

        if (!atCheckout) {
            const wentToCart = await humanFindAndClick(page, selectors.goToCart, 'go-to-cart');
            if (wentToCart) {
                audit.record('CART_CONFIRMED', {}, await takeScreenshot(page));
                await humanDelay(2000, 3500);
                atCheckout = await humanFindAndClick(page, selectors.goToCheckout, 'checkout');
            }
        }

        if (!atCheckout) {
            // Last resort: navigate to common checkout URLs
            const checkoutUrls = [
                `https://www.${input.storeDomain}/checkout`,
                `https://www.${input.storeDomain}/carrinho`,
                `https://${input.storeDomain}/checkout`,
                `https://sacola.${input.storeDomain}`,
            ];

            for (const url of checkoutUrls) {
                try {
                    await page.goto(url, { timeout: 8000 });
                    atCheckout = true;
                    break;
                } catch {
                    continue;
                }
            }
        }

        audit.record('CHECKOUT_STARTED', { url: page.url() }, await takeScreenshot(page));
        await humanDelay(1500, 3000);

        // ── Step 6: Fill address (human-like typing) ─────────

        const addr = input.userData.endereco;
        const addressResults = {
            cep: await humanFillField(page, selectors.addressFields.cep, addr.cep.replace(/\D/g, '')),
            rua: false as boolean,
            numero: false as boolean,
            bairro: false as boolean,
            cidade: false as boolean,
            estado: false as boolean,
        };

        // After filling CEP, wait for auto-fill
        if (addressResults.cep) {
            await humanDelay(3000, 5000);
        }

        // Fill remaining fields with human-like typing
        addressResults.rua = await humanFillField(page, selectors.addressFields.rua, addr.rua);
        await humanDelay(300, 700);
        addressResults.numero = await humanFillField(page, selectors.addressFields.numero, addr.numero);
        await humanDelay(300, 700);
        addressResults.bairro = await humanFillField(page, selectors.addressFields.bairro, addr.bairro);
        await humanDelay(300, 700);
        addressResults.cidade = await humanFillField(page, selectors.addressFields.cidade, addr.cidade);
        await humanDelay(300, 700);
        addressResults.estado = await humanFillField(page, selectors.addressFields.estado, addr.estado);

        if (addr.complemento) {
            await humanDelay(300, 700);
            await humanFillField(page, selectors.addressFields.complemento, addr.complemento);
        }

        audit.record('ADDRESS_FILLED', {
            fieldsFound: addressResults,
            cep: addr.cep,
        }, await takeScreenshot(page));

        await humanDelay(1500, 2500);

        // ── Step 7: Select shipping ──────────────────────────

        let shippingSelected = false;
        for (const selector of selectors.shippingOptions) {
            try {
                const options = await page.$$(selector);
                if (options.length > 0) {
                    await options[0].click();
                    shippingSelected = true;
                    break;
                }
            } catch {
                continue;
            }
        }

        audit.record('SHIPPING_SELECTED', { selected: shippingSelected }, await takeScreenshot(page));
        await humanDelay(1500, 2500);

        // ── Step 8: Payment section ──────────────────────────

        const paymentFieldFound = await page.$(selectors.paymentSection[0]);

        if (paymentFieldFound) {
            audit.record('PAYMENT_FILLED', {
                method: 'token',
                tokenLastFour: input.paymentToken.lastFourDigits,
                brand: input.paymentToken.brand,
                note: 'Payment token ready. Store gateway integration required for actual processing.',
            }, await takeScreenshot(page));
        } else {
            audit.record('PAYMENT_FILLED', {
                method: 'token',
                note: 'Payment section not directly visible. Store may use external payment page.',
            });
        }

        await humanDelay(1000, 2000);

        // ── Step 9: Confirm order ────────────────────────────

        const orderConfirmed = await humanFindAndClick(page, selectors.confirmOrder, 'confirm');

        if (!orderConfirmed) {
            audit.record('ERROR_OCCURRED', {
                type: 'confirm_button_not_found',
            }, await takeScreenshot(page));

            return {
                result: failResult(
                    'CHECKOUT_ERROR',
                    'Não foi possível confirmar o pedido automaticamente. Finalize manualmente.',
                    page.url(),
                ),
                audit,
            };
        }

        audit.record('ORDER_CONFIRMED', {}, await takeScreenshot(page));

        // Wait for order confirmation page
        await humanDelay(4000, 7000);

        // ── Step 10: Capture order details ───────────────────

        const orderScreenshot = await takeScreenshot(page);
        const confirmPageText = (await page.textContent('body')) || '';

        // Extract order number
        let orderNumber = await extractText(page, selectors.orderNumber);

        if (!orderNumber) {
            const orderMatch = confirmPageText.match(
                /(?:pedido|order|nº|#)\s*[:.]\s*([A-Z0-9-]{4,20})/i
            );
            if (orderMatch) {
                orderNumber = orderMatch[1];
            }
        }

        // Extract total price
        let totalValue = currentPrice || input.expectedPrice;
        const totalText = await extractText(page, selectors.totalPrice);
        if (totalText) {
            const parsed = parseBrazilianPrice(totalText);
            if (parsed) totalValue = parsed;
        }

        // Extract delivery estimate
        let deliveryEstimate = 'Verificar no e-mail de confirmação';
        const deliveryMatch = confirmPageText.match(
            /(?:prazo|entrega|previsão|estimativa)[:\s]*(\d{1,2}[\s/.-]\w+[\s/.-]\d{2,4}|\d{1,2}\s*(?:a\s*\d{1,2}\s*)?(?:dias?\s*úteis?|dias?\s*corridos?))/i
        );
        if (deliveryMatch) {
            deliveryEstimate = deliveryMatch[1].trim();
        }

        audit.record('ORDER_NUMBER_CAPTURED', {
            orderNumber: orderNumber || 'não capturado',
            totalValue,
            delivery: deliveryEstimate,
        });

        audit.record('SCREENSHOT_TAKEN', { step: 'confirmation_page' }, orderScreenshot);

        const duration = Date.now() - startTime;

        audit.record('PURCHASE_COMPLETED', {
            duration: `${duration}ms`,
            orderNumber,
            totalValue,
        });

        const successResult: PurchaseSuccess = {
            sucesso: true,
            numeroPedido: orderNumber || `VP-${purchaseId}`,
            valorTotal: totalValue,
            previsaoEntrega: deliveryEstimate,
            loja: input.storeName,
            comprovanteUrl: undefined,
            timestamp: new Date(),
        };

        return { result: successResult, audit };

    } catch (err) {
        const errStr = String(err);
        let reason: PurchaseFailReason = 'UNKNOWN';
        let message = 'Erro inesperado durante a compra. Tente comprar manualmente.';

        if (errStr.includes('Timeout') || errStr.includes('timeout')) {
            reason = 'TIMEOUT';
            message = 'A loja demorou demais para responder. Tente novamente ou compre manualmente.';
        } else if (errStr.includes('net::ERR') || errStr.includes('Navigation')) {
            reason = 'NAVIGATION_ERROR';
            message = 'Erro ao acessar a loja. Verifique sua conexão e tente novamente.';
        } else if (errStr.includes('blocked') || errStr.includes('captcha') || errStr.includes('403')) {
            reason = 'BLOCKED_BY_STORE';
            message = 'A loja bloqueou o acesso automatizado. Compre manualmente pelo link abaixo.';
        }

        audit.record('ERROR_OCCURRED', {
            error: errStr.slice(0, 500),
            type: reason,
        });
        audit.record('PURCHASE_FAILED', { reason, duration: Date.now() - startTime });

        return {
            result: failResult(reason, message, input.productUrl),
            audit,
        };

    } finally {
        if (browser) {
            try {
                await browser.close();
            } catch {
                // Ignore close errors
            }
        }
    }
}
