export interface AppCoordinates {
  latitude: number;
  longitude: number;
}

export interface ParsedReLoopQr {
  type:
  | 'lot'
  | 'handover'
  | 'unknown';

  lotId?: string;

  reference?: string;

  raw: string;
}

export interface RecyclerMapPoint {
  id: string;

  title: string;

  description?: string;

  latitude: number;

  longitude: number;

  type:
  | 'recycler'
  | 'lot'
  | 'current';
}