export interface Attendant {
  id: string;
  name: string;
  phone: string;
  active: boolean;
}

export interface PanelData {
  attendants: Attendant[];
  version: number;
  updatedAt: string;
}
