// ============================================================
// ValorePro — Google Places API Service
// ============================================================
// Looks up the store on Google Places to get user rating
// and total number of reviews.
// ============================================================

import { createLogger } from '@/lib/logger';
import type { GooglePlacesData } from '@/types/store';

const log = createLogger('google-places');

const PLACES_API_BASE = 'https://maps.googleapis.com/maps/api/place';

interface PlaceFindResponse {
    candidates: {
        place_id: string;
        name: string;
        rating?: number;
        user_ratings_total?: number;
        formatted_address?: string;
    }[];
    status: string;
}

interface PlaceDetailsResponse {
    result: {
        place_id: string;
        name: string;
        rating?: number;
        user_ratings_total?: number;
        url?: string;
    };
    status: string;
}

function emptyResult(): GooglePlacesData {
    return {
        found: false,
        rating: null,
        totalReviews: null,
        placeId: null,
    };
}

export async function checkGooglePlaces(storeName: string): Promise<GooglePlacesData> {
    const start = Date.now();
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    log.info('Checking Google Places', { storeName });

    if (!apiKey) {
        log.warn('GOOGLE_PLACES_API_KEY not configured');
        return emptyResult();
    }

    try {
        // Step 1: Find the place by name
        const findParams = new URLSearchParams({
            input: `${storeName} loja online Brasil`,
            inputtype: 'textquery',
            fields: 'place_id,name,rating,user_ratings_total',
            language: 'pt-BR',
            key: apiKey,
        });

        const findRes = await fetch(`${PLACES_API_BASE}/findplacefromtext/json?${findParams}`, {
            signal: AbortSignal.timeout(8000),
        });

        if (!findRes.ok) {
            log.error(`Google Places API returned ${findRes.status}`);
            return emptyResult();
        }

        const findData = await findRes.json() as PlaceFindResponse;

        if (findData.status !== 'OK' || !findData.candidates?.length) {
            log.info('Store not found on Google Places', { storeName, status: findData.status });
            return emptyResult();
        }

        const candidate = findData.candidates[0];

        // If we already have rating from the find response, use it directly
        if (candidate.rating != null) {
            const result: GooglePlacesData = {
                found: true,
                rating: candidate.rating,
                totalReviews: candidate.user_ratings_total || null,
                placeId: candidate.place_id,
            };

            log.timed('Google Places check completed (from find)', start, {
                rating: result.rating,
                reviews: result.totalReviews,
            });

            return result;
        }

        // Step 2: Get detailed place info if rating wasn't in find response
        const detailParams = new URLSearchParams({
            place_id: candidate.place_id,
            fields: 'rating,user_ratings_total,name',
            language: 'pt-BR',
            key: apiKey,
        });

        const detailRes = await fetch(`${PLACES_API_BASE}/details/json?${detailParams}`, {
            signal: AbortSignal.timeout(8000),
        });

        if (!detailRes.ok) {
            log.warn('Google Places details request failed');
            return {
                found: true,
                rating: null,
                totalReviews: null,
                placeId: candidate.place_id,
            };
        }

        const detailData = await detailRes.json() as PlaceDetailsResponse;

        if (detailData.status !== 'OK') {
            return {
                found: true,
                rating: null,
                totalReviews: null,
                placeId: candidate.place_id,
            };
        }

        const result: GooglePlacesData = {
            found: true,
            rating: detailData.result.rating || null,
            totalReviews: detailData.result.user_ratings_total || null,
            placeId: candidate.place_id,
        };

        log.timed('Google Places check completed', start, {
            rating: result.rating,
            reviews: result.totalReviews,
        });

        return result;
    } catch (err) {
        log.error('Google Places check failed', { error: String(err) });
        return emptyResult();
    }
}
