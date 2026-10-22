import { Attendant, PanelData } from './types.ts';

const STORAGE_KEY = 'prevent_medi_attendants_v1';
const ROTATION_KEY = 'prevent_medi_rotation_idx';
const SESSION_KEY = 'prevent_medi_auth_session';

const DEFAULT_ATTENDANTS: Attendant[] = [
  {
    id: 'att-1',
    name: 'Atendimento Geral',
    phone: '5511966604328',
    active: true,
  },

];

export function getStoredData(): PanelData {
  if (typeof window === 'undefined') {
    return {
      attendants: DEFAULT_ATTENDANTS,
      version: 1,
      updatedAt: new Date().toISOString(),
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.attendants) && parsed.attendants.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore json error
  }

  const initial: PanelData = {
    attendants: DEFAULT_ATTENDANTS,
    version: 1,
    updatedAt: new Date().toISOString(),
  };
  saveStoredData(initial);
  return initial;
}

export function saveStoredData(data: PanelData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage may be unavailable in strict sandbox
  }
}

export function getNextActivePhone(): string | null {
  const data = getStoredData();
  const activeAttendants = data.attendants.filter((a) => a.active);
  if (activeAttendants.length === 0) return null;

  let idx = 0;
  try {
    const raw = localStorage.getItem(ROTATION_KEY);
    if (raw !== null) {
      idx = (parseInt(raw, 10) + 1) % activeAttendants.length;
    }
    localStorage.setItem(ROTATION_KEY, String(idx));
  } catch {
    idx = Math.floor(Math.random() * activeAttendants.length);
  }

  return activeAttendants[idx]?.phone || activeAttendants[0]?.phone || null;
}

export function checkIsAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(SESSION_KEY) === 'true';
}

export function setAuthenticated(val: boolean): void {
  if (typeof window === 'undefined') return;
  if (val) {
    sessionStorage.setItem(SESSION_KEY, 'true');
  } else {
    sessionStorage.removeItem(SESSION_KEY);
  }
}
