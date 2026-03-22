export interface Business {
  id: string;
  name: string;
  category: string;
  description: string;
  address: string;
  lat: number;
  lng: number;
  confidence: number; // 0-1
  source: 'street_view' | 'social_media' | 'both';
  onGoogle: boolean; // whether this business appears on Google
  imageUrl?: string;
  tags: string[];
  discoveredAt: string; // ISO date
}

export type Category = 'restaurant' | 'cafe' | 'bakery' | 'retail' | 'grocery' | 'salon' | 'repair' | 'art' | 'all';
