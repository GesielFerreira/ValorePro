import { Loader2 } from 'lucide-react';

export default function ResultsLoading() {
    return (
        <div className="max-w-2xl mx-auto px-4 pt-8 flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-brand-500" />
        </div>
    );
}
