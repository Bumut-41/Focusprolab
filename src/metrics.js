function clamp(x, a = 0, b = 100) {
  return Math.max(a, Math.min(b, x));
}
function safeDiv(n, d) {
  return !d ? 0 : n / d;
}
function mean(a) {
  return a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
}
function median(a) {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function stdev(a) {
  if (a.length < 2) return 0;
  const u = mean(a);
  return Math.sqrt(mean(a.map((v) => (v - u) ** 2)));
}

/** Go/No-Go benzeri deneme logundan skorlar (lateMs = geç yanıt eşiği) */
export function computeMetrics(logs, lateMs) {
  const targets = logs.filter((t) => t.isTarget);
  const nonT = logs.filter((t) => !t.isTarget);
  const hits = targets.filter((t) => t.responded && t.reactionTime <= lateMs);
  const omissions = targets.filter((t) => !t.responded);
  const late = targets.filter((t) => t.responded && t.reactionTime > lateMs);
  const falseAlarms = nonT.filter((t) => t.responded);
  const correctRej = nonT.filter((t) => !t.responded);
  const multi = logs.filter((t) => t.responseCount > 1);
  const rts = targets.filter((t) => t.responded).map((t) => t.reactionTime).filter((r) => r > 0);

  const omissionR = safeDiv(omissions.length, targets.length);
  const faR = safeDiv(falseAlarms.length, nonT.length);
  const lateR = safeDiv(late.length, targets.length);
  const multiR = safeDiv(multi.length, logs.length);
  const acc = safeDiv(hits.length + correctRej.length, logs.length) * 100;

  const rtMed = median(rts);
  const rtStd = stdev(rts);

  const attention = clamp(100 - omissionR * 55 - lateR * 25 - faR * 20);
  const impulse = clamp(100 - faR * 70 - multiR * 30);
  const speed = clamp(100 - Math.max(0, rtMed - 450) * 0.08 - lateR * 30);
  const consistency = clamp(100 - Math.max(0, rtStd - 120) * 0.18 - lateR * 15);
  const overall = clamp(attention * 0.35 + impulse * 0.25 + speed * 0.2 + consistency * 0.2);

  const flags = [];
  if (omissionR >= 0.25) flags.push("Sürdürülebilir dikkatte zorlanma");
  if (faR >= 0.2) flags.push("Dürtüsel yanıtlar");
  if (lateR >= 0.2) flags.push("Geç tepkiler");
  if (multiR >= 0.1) flags.push("Çoklu basma");

  return {
    totalTrials: logs.length,
    accuracy: Math.round(acc),
    avgReaction: Math.round(mean(rts)),
    medianReaction: Math.round(rtMed),
    rtStd: Math.round(rtStd),
    omissionRate: omissionR * 100,
    falseAlarmRate: faR * 100,
    lateRate: lateR * 100,
    multiPressRate: multiR * 100,
    attentionScore: attention,
    impulseScore: impulse,
    speedScore: speed,
    consistencyScore: consistency,
    overallScore: overall,
    flags
  };
}

export function scoreSeries(logs, lateMs) {
  const att = [];
  const imp = [];
  const spd = [];
  const con = [];
  for (let i = 0; i < logs.length; i++) {
    const m = computeMetrics(logs.slice(0, i + 1), lateMs);
    att.push(Math.round(m.attentionScore));
    imp.push(Math.round(m.impulseScore));
    spd.push(Math.round(m.speedScore));
    con.push(Math.round(m.consistencyScore));
  }
  return { att, imp, spd, con };
}

export function riskLabel(m) {
  if (m.overallScore < 60 || m.omissionRate >= 25 || m.falseAlarmRate >= 20) return "Yüksek";
  if (m.overallScore < 75 || m.lateRate >= 20 || m.flags.length >= 2) return "Orta";
  return "Düşük";
}

export function summaryText(m, profileLabel) {
  return [
    `Test ${m.totalTrials} deneme ile tamamlandı. Profil: ${profileLabel}.`,
    `Genel skor ${Math.round(m.overallScore)}/100. Dikkat ${Math.round(m.attentionScore)}, dürtü kontrol ${Math.round(m.impulseScore)}, hız ${Math.round(m.speedScore)}, tutarlılık ${Math.round(m.consistencyScore)}.`,
    `Doğruluk %${m.accuracy}, median tepki ${m.medianReaction} ms.`,
    m.flags.length ? `Öne çıkanlar: ${m.flags.join("; ")}.` : "Belirgin uyarı yok.",
    "Bu yazılım tanı koymaz; yalnızca ön değerlendirme içindir."
  ].join(" ");
}
