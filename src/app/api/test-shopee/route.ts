import { NextResponse } from 'next/server';
import { searchSerpApi } from '@/server/services/search/serp-search';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || 'PlayStation 5 shopee';
    
    try {
        const results = await searchSerpApi({ query: q, maxResults: 50 });
        
        const shopeeProducts = results.products.filter(p => 
            p.storeName.toLowerCase().includes('shopee') || 
            p.storeUrl?.includes('shopee') ||
            p.url.includes('shopee')
        );

        return NextResponse.json({
            count: results.products.length,
            shopeeCount: shopeeProducts.length,
            shopeeProducts,
            firstThree: results.products.slice(0, 3),
            rawResults: results.products
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
