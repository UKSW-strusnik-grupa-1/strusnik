import { stripPolishDiacritics } from "./copy";

const BLOCKED_NAME_PARTS = ["kurwa", "chuj", "jebac", "jeba", "pizda"];

export interface GuestIdentity {
  id: string;
  name: string;
}

export const GUEST_STORAGE_KEY = "guestUser";

const RESERVED_NAMES = new Set(["admin", "administrator", "system", "moderator", "host"]);

function createGuestId() {
  const uuid = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return `guest_${uuid}`;
}

function createGuestName() {
  return `GOSC-${Math.floor(1000 + Math.random() * 9000)}`;
}

export function isValidGuestName(value: string) {
  const name = value.trim();
  if (name.length < 3 || name.length > 20) return false;
  if ([...name].some((character) => /\p{Cc}/u.test(character))) return false;
  if (RESERVED_NAMES.has(name.toLowerCase())) return false;
  const folded = stripPolishDiacritics(name).toLowerCase();
  return !BLOCKED_NAME_PARTS.some((part) => folded.includes(part));
}

export function createGuestIdentity(): GuestIdentity {
  return { id: createGuestId(), name: createGuestName() };
}

export function getOrCreateGuestIdentity(): GuestIdentity {
  try {
    const stored = window.localStorage.getItem(GUEST_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<GuestIdentity>;
      if (typeof parsed.id === "string" && typeof parsed.name === "string" && isValidGuestName(parsed.name)) {
        const legacyGeneratedName = /^gosc\d+$/i.test(stripPolishDiacritics(parsed.name));
        if (!legacyGeneratedName) {
          return { id: parsed.id, name: parsed.name.trim() };
        }
      }
    }
  } catch {
    // A blocked storage should not prevent a player from entering a game.
  }

  const identity = createGuestIdentity();
  saveGuestIdentity(identity);
  return identity;
}

export function saveGuestIdentity(identity: GuestIdentity) {
  try {
    window.localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(identity));
  } catch {
    // The in-memory context remains usable when storage is unavailable.
  }
}

export function removeGuestIdentity() {
  try {
    window.localStorage.removeItem(GUEST_STORAGE_KEY);
  } catch {
    // Ignore storage errors and let the provider create a fresh identity.
  }
}
