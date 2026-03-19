// ============================================================
// ValorePro — Domain Verification Service
// ============================================================
// Checks domain age via WHOIS-style lookup and validates
// SSL certificate status.
// ============================================================

import { createLogger } from '@/lib/logger';
import type { DomainData } from '@/types/store';

const log = createLogger('domain-verifier');

// ── Domain Age ───────────────────────────────────────────────

async function fetchDomainAge(domain: string): Promise<{ createdAt: string | null; ageInYears: number }> {
    // Use a free WHOIS API (whoisjson.com or similar)
    const apiKey = process.env.WHOIS_API_KEY;
    const fallbackResult = { createdAt: null, ageInYears: 0 };

    if (!apiKey) {
        log.debug('WHOIS_API_KEY not set — using RDAP fallback');
        return fetchDomainAgeRdap(domain);
    }

    try {
        const res = await fetch(`https://whoisjson.com/api/v1/whois?domain=${domain}`, {
            headers: { 'Authorization': `Token ${apiKey}` },
        });

        if (!res.ok) {
            log.warn(`WHOIS API returned ${res.status}`, { domain });
            return fetchDomainAgeRdap(domain);
        }

        const data = await res.json() as {
            created?: string;
            creation_date?: string;
            created_date?: string;
        };

        const createdStr = data.created || data.creation_date || data.created_date;

        if (!createdStr) return fallbackResult;

        const createdAt = new Date(createdStr);
        if (isNaN(createdAt.getTime())) return fallbackResult;

        const ageInYears = (Date.now() - createdAt.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

        return {
            createdAt: createdAt.toISOString(),
            ageInYears: Math.round(ageInYears * 10) / 10,
        };
    } catch (err) {
        log.warn('WHOIS lookup failed', { domain, error: String(err) });
        return fetchDomainAgeRdap(domain);
    }
}

async function fetchDomainAgeRdap(domain: string): Promise<{ createdAt: string | null; ageInYears: number }> {
    // RDAP is a free, standard protocol for domain info (no API key needed)
    try {
        // Try .br TLD via registro.br RDAP
        const rdapUrl = domain.endsWith('.br')
            ? `https://rdap.registro.br/domain/${domain}`
            : `https://rdap.org/domain/${domain}`;

        const res = await fetch(rdapUrl, {
            headers: { 'Accept': 'application/rdap+json' },
            signal: AbortSignal.timeout(5000),
        });

        if (!res.ok) return { createdAt: null, ageInYears: 0 };

        const data = await res.json() as {
            events?: { eventAction: string; eventDate: string }[];
        };

        const regEvent = data.events?.find(
            (e) => e.eventAction === 'registration'
        );

        if (!regEvent?.eventDate) return { createdAt: null, ageInYears: 0 };

        const createdAt = new Date(regEvent.eventDate);
        const ageInYears = (Date.now() - createdAt.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

        return {
            createdAt: createdAt.toISOString(),
            ageInYears: Math.round(ageInYears * 10) / 10,
        };
    } catch {
        return { createdAt: null, ageInYears: 0 };
    }
}

// ── SSL Check ────────────────────────────────────────────────

interface SslCheckResult {
    valid: boolean;
    issuer: string | null;
    expiresAt: string | null;
}

async function checkSsl(domain: string): Promise<SslCheckResult> {
    // Use a TLS check by making an HTTPS request and inspecting the response
    try {
        const res = await fetch(`https://${domain}`, {
            method: 'HEAD',
            redirect: 'follow',
            signal: AbortSignal.timeout(8000),
        });

        // If we got here without an SSL error, the cert is valid
        // Node.js will reject invalid/expired certs by default
        return {
            valid: res.ok || res.status < 500,
            issuer: null, // Would need node:tls for detailed cert info
            expiresAt: null,
        };
    } catch (err) {
        const errStr = String(err);
        const isSslError =
            errStr.includes('CERT') ||
            errStr.includes('SSL') ||
            errStr.includes('certificate');

        if (isSslError) {
            log.warn('SSL certificate invalid', { domain, error: errStr });
            return { valid: false, issuer: null, expiresAt: null };
        }

        // Network error (not SSL-related) — we can't determine SSL status
        log.debug('SSL check inconclusive (network error)', { domain });
        return { valid: true, issuer: null, expiresAt: null };
    }
}

// Try to get detailed SSL info via node:tls (server-side only)
async function checkSslDetailed(domain: string): Promise<SslCheckResult> {
    try {
        const tls = await import('node:tls');

        return new Promise((resolve) => {
            const socket = tls.connect(
                { host: domain, port: 443, servername: domain, timeout: 5000 },
                () => {
                    const cert = socket.getPeerCertificate();
                    const authorized = socket.authorized;

                    socket.destroy();

                    resolve({
                        valid: authorized,
                        issuer: (typeof cert?.issuer?.O === 'string' ? cert.issuer.O : cert?.issuer?.O?.[0]) ||
                            (typeof cert?.issuer?.CN === 'string' ? cert.issuer.CN : cert?.issuer?.CN?.[0]) || null,
                        expiresAt: cert?.valid_to
                            ? new Date(cert.valid_to).toISOString()
                            : null,
                    });
                }
            );

            socket.on('error', () => {
                socket.destroy();
                resolve({ valid: false, issuer: null, expiresAt: null });
            });

            socket.setTimeout(5000, () => {
                socket.destroy();
                resolve({ valid: true, issuer: null, expiresAt: null });
            });
        });
    } catch {
        // Fallback to simple HTTPS check
        return checkSsl(domain);
    }
}

// ── Public API ───────────────────────────────────────────────

export async function verifyDomain(domain: string): Promise<DomainData> {
    const start = Date.now();
    log.info('Starting domain verification', { domain });

    // Extract root domain (e.g. from www.olx.com.br to olx.com.br)
    const parts = domain.split('.');
    const rootDomain = parts.length > 2 && (parts[parts.length - 2] === 'com' || parts[parts.length - 2] === 'net')
        ? parts.slice(-3).join('.')
        : parts.slice(-2).join('.');

    const [ageResult, sslResult] = await Promise.allSettled([
        fetchDomainAge(rootDomain),
        checkSslDetailed(domain), // SSL check should still hit the exact subdomain passed
    ]);

    const age = ageResult.status === 'fulfilled'
        ? ageResult.value
        : { createdAt: null, ageInYears: 0 };

    const ssl = sslResult.status === 'fulfilled'
        ? sslResult.value
        : { valid: false, issuer: null, expiresAt: null };

    const result: DomainData = {
        ageInYears: age.ageInYears,
        createdAt: age.createdAt,
        sslValid: ssl.valid,
        sslIssuer: ssl.issuer,
        sslExpiresAt: ssl.expiresAt,
    };

    log.timed('Domain verification completed', start, {
        domain,
        ageYears: result.ageInYears,
        ssl: result.sslValid,
    });

    return result;
}
