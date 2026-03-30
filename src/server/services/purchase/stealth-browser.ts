// ============================================================
// ValorePro — Stealth Browser Module
// ============================================================
// Launches browser with anti-detection measures and provides
// human-like interaction helpers (typing, clicking, scrolling).
//
// Strategy layers:
//   1. playwright-extra + stealth plugin (fingerprint masking)
//   2. Real Chrome channel (not bundled Chromium)
//   3. navigator.webdriver removal via initScript
//   4. Human-like behavior simulation (random delays, gradual
//      typing, natural scrolling, offset clicking)
// ============================================================

import { createLogger } from '@/lib/logger';
import type { Page, Browser, BrowserContext } from 'playwright';

const log = createLogger('stealth-browser');

// ── Random Helpers ───────────────────────────────────────────

function randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
    return Math.random() * (max - min) + min;
}

// ── Stealth Browser Launch ───────────────────────────────────

export async function launchStealthBrowser(): Promise<Browser> {
    let chromium: any;

    try {
        // Try playwright-extra with stealth plugin first
        const pwExtra = await import('playwright-extra');
        const stealthModule = await import('puppeteer-extra-plugin-stealth');
        const stealth = stealthModule.default();

        chromium = pwExtra.chromium;
        chromium.use(stealth);

        log.info('Stealth plugin loaded via playwright-extra');
    } catch (err) {
        // Fallback to regular playwright
        log.warn('playwright-extra not available, falling back to standard playwright', {
            error: String(err),
        });
        const pw = await import('playwright');
        chromium = pw.chromium;
    }

    const browser = await chromium.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled',
            '--disable-infobars',
            '--window-size=1366,768',
        ],
    });

    log.info('Stealth browser launched');
    return browser;
}

// ── Human-Like Context ───────────────────────────────────────

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
];

export async function createHumanContext(browser: Browser): Promise<BrowserContext> {
    const userAgent = USER_AGENTS[randomBetween(0, USER_AGENTS.length - 1)];

    const context = await browser.newContext({
        userAgent,
        viewport: { width: 1366, height: 768 },
        locale: 'pt-BR',
        timezoneId: 'America/Sao_Paulo',
        geolocation: { latitude: -23.5505, longitude: -46.6333 },
        permissions: ['geolocation'],
        colorScheme: 'light',
        deviceScaleFactor: 1,
    });

    // Remove automation traces
    await context.addInitScript(() => {
        // Remove webdriver flag
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
        });

        // Override plugins to look real
        Object.defineProperty(navigator, 'plugins', {
            get: () => [
                { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
                { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
                { name: 'Native Client', filename: 'internal-nacl-plugin' },
            ],
        });

        // Override languages
        Object.defineProperty(navigator, 'languages', {
            get: () => ['pt-BR', 'pt', 'en-US', 'en'],
        });

        // Override permissions query
        const originalQuery = window.navigator.permissions.query;
        // @ts-ignore
        window.navigator.permissions.query = (parameters: any) =>
            parameters.name === 'notifications'
                ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
                : originalQuery(parameters);

        // Chrome runtime mock
        // @ts-ignore
        window.chrome = {
            runtime: {
                onConnect: { addListener: () => {} },
                onMessage: { addListener: () => {} },
            },
        };
    });

    log.info('Human-like context created', { userAgent: userAgent.slice(0, 50) + '...' });
    return context;
}

// ── Human Delay ──────────────────────────────────────────────

export function humanDelay(minMs = 500, maxMs = 2000): Promise<void> {
    const ms = randomBetween(minMs, maxMs);
    return new Promise((r) => setTimeout(r, ms));
}

// ── Human-Like Typing ────────────────────────────────────────

export async function humanType(
    page: Page,
    selector: string,
    text: string,
    options?: { minDelay?: number; maxDelay?: number },
): Promise<boolean> {
    const minDelay = options?.minDelay ?? 50;
    const maxDelay = options?.maxDelay ?? 180;

    try {
        const el = await page.$(selector);
        if (!el || !(await el.isVisible())) return false;

        await el.scrollIntoViewIfNeeded();
        await humanDelay(300, 600);
        await el.click();
        await humanDelay(200, 400);

        // Clear existing text
        await el.fill('');
        await humanDelay(100, 200);

        // Type character by character with random delays
        for (const char of text) {
            await page.keyboard.type(char, { delay: randomBetween(minDelay, maxDelay) });

            // Occasional pause (simulates thinking)
            if (Math.random() < 0.08) {
                await humanDelay(300, 800);
            }
        }

        return true;
    } catch {
        return false;
    }
}

// ── Human-Like Clicking ──────────────────────────────────────

export async function humanClick(
    page: Page,
    selector: string,
): Promise<boolean> {
    try {
        const el = await page.$(selector);
        if (!el || !(await el.isVisible())) return false;

        await el.scrollIntoViewIfNeeded();
        await humanDelay(400, 1200);

        // Get element bounding box for offset click
        const box = await el.boundingBox();
        if (box) {
            // Click at a random position within the element (not dead center)
            const offsetX = randomFloat(box.width * 0.2, box.width * 0.8);
            const offsetY = randomFloat(box.height * 0.2, box.height * 0.8);
            await el.click({ position: { x: offsetX, y: offsetY } });
        } else {
            await el.click();
        }

        return true;
    } catch {
        return false;
    }
}

// ── Human-Like Scrolling ─────────────────────────────────────

export async function humanScroll(page: Page, amount = 400): Promise<void> {
    const steps = randomBetween(3, 6);
    const perStep = amount / steps;

    for (let i = 0; i < steps; i++) {
        const scrollAmount = perStep + randomFloat(-30, 30);
        await page.mouse.wheel(0, scrollAmount);
        await humanDelay(200, 600);
    }
}

// ── Enhanced Find & Click with Human Behavior ────────────────

export async function humanFindAndClick(
    page: Page,
    selectors: string[],
    description: string,
): Promise<boolean> {
    // First, scroll around a bit to simulate reading (for add-to-cart and checkout buttons)
    if (description === 'add-to-cart' || description === 'checkout') {
        await humanScroll(page, randomBetween(200, 400));
        await humanDelay(800, 1500);
    }

    // Try each selector
    for (const selector of selectors) {
        try {
            const el = await page.$(selector);
            if (el && await el.isVisible()) {
                const clicked = await humanClick(page, selector);
                if (clicked) {
                    log.info(`Clicked element: ${description}`, { selector });
                    return true;
                }
            }
        } catch {
            continue;
        }
    }

    // Fallback: text-based search with human-like interaction
    const textFallbacks = description === 'add-to-cart'
        ? ['Adicionar à sacola', 'Comprar', 'Adicionar ao carrinho', 'Adicionar', 'Compre agora']
        : description === 'checkout'
            ? ['Finalizar compra', 'Fechar pedido', 'Ir para pagamento', 'Finalizar', 'Continuar']
            : description === 'confirm'
                ? ['Finalizar pedido', 'Confirmar compra', 'Pagar', 'Concluir pedido']
                : description === 'go-to-cart'
                    ? ['Ver carrinho', 'Ir para o carrinho', 'Sacola', 'Carrinho']
                    : [];

    for (const text of textFallbacks) {
        try {
            const btn = page.getByRole('button', { name: text, exact: false });
            if (await btn.isVisible({ timeout: 2000 })) {
                await humanDelay(500, 1000);
                await btn.click();
                log.info(`Clicked button by text: "${text}" (${description})`);
                return true;
            }
        } catch {
            // try as link
        }

        try {
            const link = page.getByRole('link', { name: text, exact: false });
            if (await link.isVisible({ timeout: 1000 })) {
                await humanDelay(400, 900);
                await link.click();
                log.info(`Clicked link by text: "${text}" (${description})`);
                return true;
            }
        } catch {
            continue;
        }
    }

    return false;
}

// ── Enhanced Fill Field with Human Typing ─────────────────────

export async function humanFillField(
    page: Page,
    selectors: string[],
    value: string,
): Promise<boolean> {
    for (const selector of selectors) {
        const success = await humanType(page, selector, value);
        if (success) return true;
    }
    return false;
}

// ── Dismiss Cookie / Popup Banners ───────────────────────────

export async function dismissPopups(page: Page): Promise<void> {
    const popupSelectors = [
        // Cookie consent
        'button:has-text("Aceitar")',
        'button:has-text("Aceito")',
        'button:has-text("Aceitar cookies")',
        'button:has-text("OK")',
        'button:has-text("Entendi")',
        'button:has-text("Concordo")',
        '[data-testid="cookie-accept"]',
        '#onetrust-accept-btn-handler',
        '.cookie-consent-accept',
        // Close popups
        'button[aria-label="Fechar"]',
        'button[aria-label="Close"]',
        '.modal-close',
        '.popup-close',
    ];

    for (const selector of popupSelectors) {
        try {
            const el = await page.$(selector);
            if (el && await el.isVisible()) {
                await el.click();
                await humanDelay(300, 600);
                log.info('Dismissed popup', { selector });
            }
        } catch {
            continue;
        }
    }
}
