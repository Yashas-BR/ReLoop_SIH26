export type RecyclerActivityStatus =
  | 'quoted'
  | 'matched'
  | 'accepted'
  | 'confirmed'
  | 'handed_over'
  | 'completed'
  | 'rejected'
  | string;

export interface RecyclerActivityLot {
  lot_id: string;

  category?: string | null;

  approx_weight_kg?: number | null;

  estimated_value?: number | null;

  transaction_status?: RecyclerActivityStatus | null;

  location?: string | null;

  collection_location?: string | null;

  collector_id?: number | null;

  created_at?: string | null;

  updated_at?: string | null;

  handover_reference_number?: string | null;

  traceability_status?: string | null;

  description?: string | null;

  notes?: string | null;
}

export type ActivityActionType =
  | 'quote_submitted'
  | 'quote_accepted'
  | 'quote_rejected'
  | 'lot_matched'
  | 'handover_initiated'
  | 'handover_confirmed'
  | 'payment_completed'
  | 'payment_pending'
  | 'lot_created'
  | 'lot_verified'
  | 'lot_cancelled'
  | string;

export type ActivityCategory =
  | 'quote'
  | 'handover'
  | 'payment'
  | 'match'
  | 'verification'
  | 'system'
  | string;

export interface RecyclerActivityItem {
  id: string;
  lot_id?: string | null;
  display_lot_id?: string | null;
  activity_type: ActivityActionType;
  category: ActivityCategory;
  title: string;
  description?: string | null;
  timestamp: string;
  status?: RecyclerActivityStatus | null;
  amount?: number | null;
  weight_kg?: number | null;
  material_category?: string | null;
  collector_id?: number | string | null;
  collector_name?: string | null;
  collector_phone?: string | null;
  location?: string | null;
  reference_number?: string | null;
  badge_variant?: 'positive' | 'warning' | 'danger' | 'neutral';
  metadata?: Record<string, unknown>;
}

export interface RecyclerActivityStats {
  total_activities: number;
  total_handovers: number;
  total_quotes: number;
  total_confirmed: number;
  total_weight_kg: number;
  total_value: number;
}

export type ActivityFilterType = 'all' | 'handover' | 'quote' | 'payment' | 'confirmed';

export interface RecyclerActivityFilter {
  type?: ActivityFilterType;
  material_category?: string | null;
  searchQuery?: string;
}