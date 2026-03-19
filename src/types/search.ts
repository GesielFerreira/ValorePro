// ============================================================
// ValorePro — Product Search Types
// ============================================================

export type SearchSource = 'serpapi' | 'mercadolivre' | 'amazon' | 'scraped';

export type SearchStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface SearchInput {
  query: string;
  cep?: string;
  userId: string;
  maxResults?: number;
}

export interface InstallmentInfo {
  count: number;
  value: number;
  total: number;
}

export interface RawProductResult {
  source: SearchSource;
  title: string;
  price: number;
  installment?: InstallmentInfo;
  shippingCost: number;
  shippingDays?: number;
  url: string;
  imageUrl?: string;
  storeName: string;
  storeUrl?: string;
  seller?: string;
  available: boolean;
  condition?: 'new' | 'used' | 'refurbished';
  raw?: Record<string, unknown>;
}

export interface NormalizedResult {
  id: string;
  source: SearchSource;
  title: string;
  cashPrice: number;
  installment?: InstallmentInfo;
  shippingCost: number;
  shippingDays?: number;
  totalPrice: number;
  url: string;
  imageUrl?: string;
  store: {
    name: string;
    url: string;
    domain: string;
  };
  available: boolean;
  condition: 'new' | 'used' | 'refurbished';
  scrapedAt: Date;
}

export interface SearchResult {
  searchId: string;
  query: string;
  status: SearchStatus;
  results: NormalizedResult[];
  sources: {
    serpapi: { count: number; errors: string[] };
    mercadolivre: { count: number; errors: string[] };
    scraped: { count: number; errors: string[] };
  };
  totalResults: number;
  bestPrice?: NormalizedResult;
  duration: number;
  createdAt: Date;
  isCached?: boolean;
}

export interface SerpApiResponse {
  shopping_results?: SerpApiShoppingItem[];
  organic_results?: SerpApiOrganicItem[];
}

export interface SerpApiShoppingItem {
  title: string;
  price: number;
  extracted_price: number;
  link: string;
  product_link?: string;
  source: string;
  thumbnail?: string;
  delivery?: string;
}

export interface SerpApiOrganicItem {
  title: string;
  link: string;
  snippet?: string;
  displayed_link?: string;
}

export interface MercadoLivreSearchResponse {
  results: MercadoLivreItem[];
  paging: { total: number; offset: number; limit: number };
}

export interface MercadoLivreItem {
  id: string;
  title: string;
  price: number;
  currency_id: string;
  available_quantity: number;
  sold_quantity: number;
  condition: 'new' | 'used';
  permalink: string;
  thumbnail: string;
  seller: { id: number; nickname: string };
  shipping: { free_shipping: boolean };
  installments?: { quantity: number; amount: number };
  address?: { state_name: string; city_name: string };
}

export interface ScrapedPriceData {
  cashPrice?: number;
  installmentPrice?: InstallmentInfo;
  shippingCost?: number;
  shippingDays?: number;
  title?: string;
  imageUrl?: string;
  available: boolean;
}

export const BLOCKED_DOMAINS = [
  'youtube.com', 'facebook.com', 'instagram.com', 'twitter.com', 'x.com',
  'reddit.com', 'wikipedia.org', 'tiktok.com',
  'buscape.com.br', 'zoom.com.br', 'joacaba.com.br', 'pelando.com.br',
  'reclameaqui.com.br', 'promobit.com.br', 'hardmob.com.br',
  'tecmundo.com.br', 'olhardigital.com.br', 'canaltech.com.br',
  'tecnoblog.net', 'tudocelular.com',
  'mercadolivre.com.br', // handled via official API
] as const;

export const TRUSTED_ECOMMERCE_DOMAINS = [
  'amazon.com.br', 'magazineluiza.com.br', 'magalu.com.br',
  'americanas.com.br', 'casasbahia.com.br', 'pontofrio.com.br',
  'extra.com.br', 'submarino.com.br', 'shopee.com.br', 'mercadolivre.com.br',
  'kabum.com.br', 'pichau.com.br', 'terabyteshop.com.br', 'aliexpress.com',
  'fastshop.com.br', 'girafa.com.br', 'carrefour.com.br', 'kalunga.com.br',
  'netshoes.com.br', 'dafiti.com.br', 'centauro.com.br',
  'nike.com.br', 'adidas.com.br', 'samsung.com.br',
  'dell.com.br', 'lenovo.com.br', 'apple.com.br',
] as const;
