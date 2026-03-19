'use client';

export function SearchSkeleton() {
    return (
        <div className="space-y-4 px-4 max-w-2xl mx-auto pt-8">
            {/* Scan animation */}
            <div className="relative bg-white rounded-2xl border border-surface-200 p-6 overflow-hidden">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-brand-100 animate-pulse-soft" />
                    <div>
                        <div className="h-4 w-40 bg-surface-200 rounded animate-pulse-soft" />
                        <div className="h-3 w-56 bg-surface-100 rounded mt-1.5 animate-pulse-soft" />
                    </div>
                </div>
                <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                    <div className="h-full w-1/3 bg-brand-200 rounded-full scan-overlay animate-scan-line" />
                </div>
            </div>

            {/* Card skeletons */}
            {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-surface-200 p-4 animate-fade-in" style={{ animationDelay: `${i * 0.15}s` }}>
                    <div className="flex gap-4">
                        <div className="w-20 h-20 rounded-xl bg-surface-100 animate-pulse-soft" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 w-3/4 bg-surface-200 rounded animate-pulse-soft" />
                            <div className="h-3 w-1/3 bg-surface-100 rounded animate-pulse-soft" />
                            <div className="h-5 w-1/4 bg-brand-100 rounded animate-pulse-soft" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export function DashboardSkeleton() {
    return (
        <div className="space-y-4 p-4 max-w-4xl mx-auto">
            <div className="h-8 w-48 bg-surface-200 rounded animate-pulse-soft" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-2xl border border-surface-200 p-6 space-y-3">
                        <div className="h-4 w-20 bg-surface-100 rounded animate-pulse-soft" />
                        <div className="h-8 w-32 bg-surface-200 rounded animate-pulse-soft" />
                    </div>
                ))}
            </div>
        </div>
    );
}
