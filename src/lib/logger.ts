// ============================================================
// ValorePro — Structured Logger
// ============================================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
    level: LogLevel;
    module: string;
    message: string;
    data?: Record<string, unknown>;
    timestamp: string;
    duration?: number;
}

const LOG_COLORS: Record<LogLevel, string> = {
    debug: '\x1b[90m',
    info: '\x1b[36m',
    warn: '\x1b[33m',
    error: '\x1b[31m',
};

const RESET = '\x1b[0m';

function formatEntry(entry: LogEntry): string {
    const color = LOG_COLORS[entry.level];
    const dur = entry.duration != null ? ` (${entry.duration}ms)` : '';
    const data = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
    return `${color}[${entry.level.toUpperCase()}]${RESET} ${entry.timestamp} [${entry.module}] ${entry.message}${dur}${data}`;
}

function shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const minLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
    return levels.indexOf(level) >= levels.indexOf(minLevel);
}

export function createLogger(module: string) {
    function log(level: LogLevel, message: string, data?: Record<string, unknown>, duration?: number) {
        if (!shouldLog(level)) return;

        const entry: LogEntry = {
            level,
            module,
            message,
            data,
            timestamp: new Date().toISOString(),
            duration,
        };

        const formatted = formatEntry(entry);

        if (level === 'error') {
            console.error(formatted);
        } else if (level === 'warn') {
            console.warn(formatted);
        } else {
            console.log(formatted);
        }
    }

    return {
        debug: (msg: string, data?: Record<string, unknown>) => log('debug', msg, data),
        info: (msg: string, data?: Record<string, unknown>) => log('info', msg, data),
        warn: (msg: string, data?: Record<string, unknown>) => log('warn', msg, data),
        error: (msg: string, data?: Record<string, unknown>) => log('error', msg, data),
        timed: (msg: string, startMs: number, data?: Record<string, unknown>) =>
            log('info', msg, data, Date.now() - startMs),
    };
}
