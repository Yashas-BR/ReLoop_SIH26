export type UserRole = 'recycler';

export type AuthorizationStatus =
  | 'authorized'
  | 'pending'
  | 'unauthorized';

export type PickupAvailability =
  | 'daily'
  | 'weekly'
  | 'on_request';

export type MaterialCategory =
  | 'CRT'
  | 'LCD'
  | 'PCB'
  | 'Cable'
  | 'Battery'
  | 'Motor'
  | 'Plastic';

export interface Recycler {
  id: number;
  name: string;

  facility_location?: string | null;

  latitude?: number | null;
  longitude?: number | null;

  contact_details?: string | null;

  materials_accepted: MaterialCategory[];

  pickup_availability?: PickupAvailability | null;

  service_area?: string | null;

  authorization_status: AuthorizationStatus;

  authorization_number?: string | null;

  authorization_issue_date?: string | null;

  authorization_valid_until?: string | null;

  authorization_document_url?: string | null;

  authorization_details?: string | null;

  /** Account status returned by some API endpoints (e.g., 'active', 'suspended') */
  account_status?: string | null;
}

export interface RecyclerSession {
  role: 'recycler';

  userId: number;

  name: string;

  facility_location?: string | null;

  materials_accepted: MaterialCategory[];

  token: string;

  preferred_language?: string;
}

export type UserSession = RecyclerSession;

export interface RecyclerLoginResponse {
  success: true;

  data: {
    recycler: Recycler;
    token: string;
  };
}

export interface RecyclerApplication {
  name: string;

  facility_location?: string;

  contact_details?: string;

  materials_accepted: MaterialCategory[];

  pickup_availability?: PickupAvailability;

  service_area?: string;

  authorization_number?: string;

  authorization_issue_date?: string;

  authorization_valid_until?: string;

  authorization_document_url?: string;

  authorization_details?: string;
}

export interface RecyclerApplicationResponse {
  success: true;
  data: Recycler;
}