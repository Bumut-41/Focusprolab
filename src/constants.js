export const SHAPES = [
  "circle",
  "square",
  "triangle",
  "diamond",
  "pentagon",
  "hexagon",
  "vertical",
  "horizontal",
  "plus",
  "xshape"
];

export const COLORS = [
  "#2563EB",
  "#16A34A",
  "#DC2626",
  "#F59E0B",
  "#7C3AED",
  "#0891B2",
  "#DB2777",
  "#65A30D",
  "#EA580C",
  "#0F172A"
];

/** Dosyalar: public/distractors/ — yoksa img onError ile gizlenir */
export const GIF_FILES = {
  kedi: { name: "Kedi", gif: "/distractors/kedi.gif", sound: "/distractors/kedi.mp3", size: 220 },
  top: { name: "Top", gif: "/distractors/top.gif", sound: "/distractors/top.mp3", size: 220 },
  araba: { name: "Araba", gif: "/distractors/araba.gif", sound: "/distractors/araba.mp3", size: 230 },
  agac: { name: "Ağaç", gif: "/distractors/agac.gif", sound: "/distractors/agac.mp3", size: 220 }
};

export const INDEPENDENT_SOUNDS = {
  alarm: "/distractors/alarm.mp3",
  tren: "/distractors/tren.mp3",
  kussesi: "/distractors/kussesi.mp3",
  insan: "/distractors/insan.mp3"
};
