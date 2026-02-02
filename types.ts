
export interface AppSettings {
  companyName: string;
  allowedLocations: string[]; // Liste de codes autorisés
  strictLocationMode: boolean; // Si vrai, oblige à choisir dans la liste
}

export interface VehicleInfo {
  vin: string;
  make: string;
  model: string;
  year: string;
  timestamp: string; // Heure (HH:mm)
  fullDate: string;  // Date (YYYY-MM-DD)
  location: string;
  remarks?: string;  // Nouveau champ facultatif
}

export type ScanType = 'vin' | 'location';

export interface GeminiResponse {
  vin?: string;
  make?: string;
  model?: string;
  year?: string;
  locationCode?: string;
  error?: string;
}
