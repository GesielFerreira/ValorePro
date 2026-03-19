// ============================================================
// ValorePro — Purchase Audit Logger
// ============================================================
// Immutable audit trail for every action during automated
// purchases. Each entry is timestamped and sequentially
// numbered for forensic review.
// ============================================================

import { createLogger } from '@/lib/logger';
import type { AuditEntry, AuditAction } from '@/types/purchase';

const log = createLogger('purchase-audit');

export class PurchaseAuditLog {
    private entries: AuditEntry[] = [];
    private step = 0;

    constructor(
        private readonly purchaseId: string,
        private readonly userId: string,
    ) { }

    record(action: AuditAction, details: Record<string, unknown> = {}, screenshot?: string): AuditEntry {
        this.step++;

        const entry: AuditEntry = {
            id: `audit_${this.purchaseId}_${this.step}`,
            purchaseId: this.purchaseId,
            userId: this.userId,
            action,
            details,
            screenshot,
            timestamp: new Date(),
            step: this.step,
        };

        this.entries.push(entry);

        // Also log to stdout for real-time monitoring
        const level = action.includes('ERROR') || action.includes('FAILED') ? 'error' : 'info';
        log[level](`[Step ${this.step}] ${action}`, {
            purchaseId: this.purchaseId,
            ...details,
        });

        return entry;
    }

    getEntries(): ReadonlyArray<AuditEntry> {
        return [...this.entries];
    }

    getLastEntry(): AuditEntry | undefined {
        return this.entries[this.entries.length - 1];
    }

    getSummary(): {
        purchaseId: string;
        userId: string;
        totalSteps: number;
        startedAt: Date | null;
        endedAt: Date | null;
        actions: AuditAction[];
        hadErrors: boolean;
    } {
        return {
            purchaseId: this.purchaseId,
            userId: this.userId,
            totalSteps: this.entries.length,
            startedAt: this.entries[0]?.timestamp ?? null,
            endedAt: this.entries[this.entries.length - 1]?.timestamp ?? null,
            actions: this.entries.map((e) => e.action),
            hadErrors: this.entries.some(
                (e) => e.action === 'ERROR_OCCURRED' || e.action === 'PURCHASE_FAILED',
            ),
        };
    }

    toJSON(): AuditEntry[] {
        return [...this.entries];
    }
}
