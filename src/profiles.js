/**
 * Yaş → profil anahtarı (test süresi ve fazlar buradan gelir).
 * İstersen süreleri/fazları buradan değiştirerek geliştirirsin.
 */

const childPhases = [
  { end: 45_000, name: "Çocuk — Alışma", stimulus: 1400, gap: 700 },
  { end: 90_000, name: "Çocuk — Dikkat", stimulus: 1200, gap: 600 },
  { end: 135_000, name: "Çocuk — Hız", stimulus: 1000, gap: 500 },
  { end: 180_000, name: "Çocuk — Çeldirici", stimulus: 1100, gap: 550 },
  { end: 240_000, name: "Çocuk — Kapanış", stimulus: 1200, gap: 600 }
];

const teenPhases = [
  { end: 60_000, name: "Ergen — Alışma", stimulus: 1300, gap: 650 },
  { end: 120_000, name: "Ergen — Temel", stimulus: 1100, gap: 550 },
  { end: 180_000, name: "Ergen — Hız baskısı", stimulus: 950, gap: 480 },
  { end: 240_000, name: "Ergen — Görsel çeldirici", stimulus: 1000, gap: 500 },
  { end: 300_000, name: "Ergen — İşitsel çeldirici", stimulus: 950, gap: 480 },
  { end: 360_000, name: "Ergen — Kapanış", stimulus: 1150, gap: 580 }
];

const adultPhases = [
  { end: 90_000, name: "Yetişkin — Alışma", stimulus: 1200, gap: 600 },
  { end: 180_000, name: "Yetişkin — Temel performans", stimulus: 1000, gap: 500 },
  { end: 270_000, name: "Yetişkin — Hız baskısı", stimulus: 850, gap: 420 },
  { end: 360_000, name: "Yetişkin — Görsel çeldirici", stimulus: 950, gap: 480 },
  { end: 450_000, name: "Yetişkin — İşitsel çeldirici", stimulus: 900, gap: 450 },
  { end: 480_000, name: "Yetişkin — Kapanış", stimulus: 1100, gap: 550 }
];

/** Zaman (ms test başından), süre ms, çoklu GIF kuralları: max 2 GIF, max 1 sesli */
const childGif = [
  { at: 100_000, duration: 6000, items: [{ key: "kedi", area: "left", zone: "upper", silent: true }] },
  { at: 115_000, duration: 6000, items: [{ key: "top", area: "right", zone: "lower", silent: true }] }
];

const childSound = [{ at: 125_000, duration: 6000, key: "kussesi" }];

const teenGif = [
  { at: 200_000, duration: 7000, items: [{ key: "kedi", area: "left", zone: "middle", silent: true }] },
  { at: 215_000, duration: 7000, items: [{ key: "araba", area: "right", zone: "upper", silent: true }] },
  { at: 250_000, duration: 7500, items: [{ key: "top", area: "left", zone: "lower", silent: false }] }
];

const teenSound = [
  { at: 245_000, duration: 8000, key: "alarm" },
  { at: 280_000, duration: 8000, key: "tren" }
];

const adultGif = [
  { at: 280_000, duration: 8000, items: [{ key: "agac", area: "left", zone: "upper", silent: true }] },
  { at: 295_000, duration: 8000, items: [{ key: "kedi", area: "right", zone: "lower", silent: true }] },
  { at: 320_000, duration: 8000, items: [{ key: "araba", area: "left", zone: "middle", silent: false }] }
];

const adultSound = [
  { at: 375_000, duration: 9000, key: "insan" },
  { at: 400_000, duration: 9000, key: "alarm" }
];

export const PROFILES = {
  child: {
    key: "child",
    label: "Çocuk (6–12)",
    durationMs: 240_000,
    lateResponseMs: 1000,
    targetProbability: 0.45,
    phases: childPhases,
    gifEvents: childGif,
    soundEvents: childSound
  },
  teen: {
    key: "teen",
    label: "Ergen (13–17)",
    durationMs: 360_000,
    lateResponseMs: 900,
    targetProbability: 0.42,
    phases: teenPhases,
    gifEvents: teenGif,
    soundEvents: teenSound
  },
  adult: {
    key: "adult",
    label: "Yetişkin (18+)",
    durationMs: 480_000,
    lateResponseMs: 800,
    targetProbability: 0.4,
    phases: adultPhases,
    gifEvents: adultGif,
    soundEvents: adultSound
  }
};

export function ageFromBirthDate(isoDate) {
  if (!isoDate) return null;
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const t = new Date();
  let a = t.getFullYear() - d.getFullYear();
  const m = t.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) a -= 1;
  return a;
}

export function profileKeyFromAge(age) {
  const n = Number(age);
  if (!Number.isFinite(n)) return "adult";
  if (n >= 6 && n <= 12) return "child";
  if (n >= 13 && n <= 17) return "teen";
  return "adult";
}

export function getProfile(key) {
  return PROFILES[key] ?? PROFILES.adult;
}
