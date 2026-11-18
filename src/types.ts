export interface ModelOption {
  id: string;
  label: string;
  tier: string;
  dailyFreeEstimate: string;
  description: string;
}

export interface CompanyProfile {
  company_name: string;
  tagline: string;
  working_hours: string;
  contact_info: string;
  about_details: string;
  ai_model: string;
  has_pin: boolean;
}

export interface ServiceItem {
  id: number;
  name: string;
  price: string;
  duration: string;
  description: string;
}

export interface BookingItem {
  id: number;
  client_id: string;
  client_name: string;
  client_contact: string;
  service_name: string;
  project_title: string;
  project_notes: string;
  booking_date: string;
  booking_time: string;
  status: "pending" | "confirmed" | "completed";
  created_at: string;
}

export interface ClientMemory {
  client_id: string;
  name: string;
  contact: string;
  project_summary: string;
  preferred_service: string;
  preferred_slot: string;
}

export interface WorkspaceState {
  profile: CompanyProfile;
  services: ServiceItem[];
  bookings: BookingItem[];
  availableModels: ModelOption[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}