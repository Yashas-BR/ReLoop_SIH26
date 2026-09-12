export type RecyclerLotStatus =
  | 'available'
  | 'quoted'
  | 'matched'
  | 'accepted'
  | 'rejected'
  | 'confirmed'
  | 'handed_over'
  | 'completed'
  | string;

export interface RecyclerIncomingLot {
  lot_id: string;

  category?: string | null;
  material_category?: string | null;

  approx_weight_kg?: number | null;

  estimated_value?: number | null;
  market_estimate?: number | null;

  location?: string | null;
  collection_location?: string | null;

  latitude?: number | null;
  longitude?: number | null;

  transaction_status?: RecyclerLotStatus | null;

  collector_id?: number | null;
  collector_name?: string | null;
  operating_location?: string | null;

  created_at?: string | null;

  description?: string | null;

  notes?: string | null;

  traceability_status?: string | null;

  handover_reference_number?: string | null;

  offer_id?: number | string | null;
  recycler_offer_status?: string | null;
}

export interface RecyclerQuote {
  quote_id?: number | string;

  lot_id: string;

  recycler_id: number;

  amount: number;

  notes?: string | null;

  status?: string | null;

  created_at?: string | null;
}

export interface RecyclerQuoteInput {
  lot_id: string;
  recycler_id: number;
  amount: number;
  notes?: string;
}

export interface ApiResponse<T> {
  success?: boolean;
  data: T;
  message?: string;
}