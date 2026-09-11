export type RecyclerLotStatus =
    | 'quoted'
    | 'matched'
    | 'handed_over'
    | 'confirmed'
    | 'requested'
    | 'offered'
    | 'accepted'
    | 'rejected'
    | 'expired'
    | string;

export interface RecyclerLot {
    lot_id: string;

    category?: string | null;

    approx_weight_kg?: number | null;

    estimated_value?: number | null;

    transaction_status?: RecyclerLotStatus | null;

    location?: string | null;

    collection_location?: string | null;

    collector_id?: number | null;

    created_at?: string | null;

    handover_reference_number?: string | null;

    traceability_status?: string | null;
}

export interface ApiDataResponse<T> {
    data: T;
}