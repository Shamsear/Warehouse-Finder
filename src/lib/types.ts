// Types used across the application
export interface WarehouseData {
  name: string;
  address?: string;
  city?: string;
  country: string;
  freeZone?: string;
  phone?: string;
  email?: string;
  website?: string;
  lat?: number;
  lng?: number;
  rating?: number;
  source: string;
  sourceUrl?: string;
  tags?: string[];
}

export interface ContactData {
  name: string;
  title?: string;
  phone?: string;
  email?: string;
  linkedinUrl?: string;
  isPrimary?: boolean;
}

export type WarehouseStatus =
  | "new"
  | "contacted"
  | "replied"
  | "interested"
  | "meeting_set"
  | "ready"
  | "closed"
  | "not_interested"
  | "no_response"
  | "follow_up";

export type Priority = "low" | "normal" | "high" | "urgent";

export const STATUS_OPTIONS: { value: WarehouseStatus; label: string; color: string }[] = [
  { value: "new", label: "New", color: "bg-blue-100 text-blue-800" },
  { value: "contacted", label: "Contacted", color: "bg-yellow-100 text-yellow-800" },
  { value: "replied", label: "Replied", color: "bg-purple-100 text-purple-800" },
  { value: "interested", label: "Interested", color: "bg-green-100 text-green-800" },
  { value: "meeting_set", label: "Meeting Set", color: "bg-emerald-100 text-emerald-800" },
  { value: "ready", label: "Ready", color: "bg-green-100 text-green-800" },
  { value: "closed", label: "Closed", color: "bg-gray-100 text-gray-800" },
  { value: "not_interested", label: "Not Interested", color: "bg-red-100 text-red-800" },
  { value: "no_response", label: "No Response", color: "bg-orange-100 text-orange-800" },
  { value: "follow_up", label: "Follow Up", color: "bg-indigo-100 text-indigo-800" },
];

export const COUNTRIES = ["UAE", "Qatar"] as const;

export const UAE_CITIES = [
  "Dubai",
  "Abu Dhabi",
  "Sharjah",
  "Ajman",
  "Ras Al Khaimah",
  "Umm Al Quwain",
  "Fujairah",
] as const;

export const QATAR_CITIES = [
  "Doha",
  "Al Wakrah",
  "Mesaieed",
  "Al Khor",
  "Dukhan",
] as const;

export const FREE_ZONES = [
  "JAFZA",
  "KIZAD",
  "Dubai South",
  "Dubai Industrial City",
  "DSO",
  "RAK FTZ",
  "Umm Al Quwain FTZ",
  "Ajman Free Zone",
  "DAFZA",
  "DMCC",
  "Ras Bufontas",
  "Umm Al Houl",
  "Qatar Free Zone",
] as const;
