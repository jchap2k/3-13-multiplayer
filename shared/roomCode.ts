const WORDS = [
  "KITE",
  "LARK",
  "WOLF",
  "FERN",
  "JADE",
  "QUILL",
  "MAPLE",
  "CEDAR",
  "RIVER",
  "STONE",
  "EMBER",
  "FLINT",
  "HAZEL",
  "IVORY",
  "JASPER",
  "KOI",
  "LOTUS",
  "MOSS",
  "NORTH",
  "OPAL",
  "PEARL",
  "QUARTZ",
  "RIDGE",
  "SAGE",
  "THORN",
  "ULTRA",
  "VISTA",
  "WILLOW",
  "YARROW",
  "ZEPHYR",
  "ASPEN",
  "BIRCH",
  "CORAL",
  "DELTA",
  "EAGLE",
  "FROST",
  "GROVE",
  "HARBOR",
  "INDIGO",
  "JUNIPER",
];

const CODE_RE = /^[A-Z]{3,8}-[0-9]{1,2}$/;

export const ROOM_CODE_HINT =
  "Use WORD-NN like KITE-7 (letters, hyphen, 1–2 digits). PLAY-A won’t work.";

export function normalizeRoomCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function isValidRoomCode(raw: string): boolean {
  return CODE_RE.test(normalizeRoomCode(raw));
}

/** Non-null when a typed or `?room=` value is present but not WORD-NN. */
export function pendingInvalidRoom(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const code = normalizeRoomCode(raw);
  if (!code) return null;
  return isValidRoomCode(code) ? null : code;
}

export function randomRoomCode(exists: (code: string) => boolean): string {
  for (let attempt = 0; attempt < 40; attempt++) {
    const word = WORDS[Math.floor(Math.random() * WORDS.length)];
    const n = 1 + Math.floor(Math.random() * 99);
    const code = `${word}-${n}`;
    if (!exists(code)) return code;
  }
  return `ROOM-${Math.floor(Math.random() * 90 + 10)}`;
}
