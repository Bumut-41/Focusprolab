import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { computeMetrics, riskLabel, summaryText } from "./metrics.js";
import { getShapeSvg } from "./shapeUtils.jsx";

pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;

function color(score) {
  if (score >= 85) return "#16A34A";
  if (score >= 70) return "#65A30D";
  if (score >= 55) return "#F59E0B";
  return "#DC2626";
}

export function buildDocDefinition({ participant, profile, logs, target, chartImage }) {
  const m = computeMetrics(logs, profile.lateResponseMs);
  const risk = riskLabel(m);
  const text = summaryText(m, profile.label);
  const a = Math.round(m.attentionScore);
  const i = Math.round(m.impulseScore);
  const s = Math.round(m.speedScore);
  const c = Math.round(m.consistencyScore);
  const o = Math.round(m.overallScore);

  return {
    pageSize: "A4",
    pageMargins: [40, 40, 40, 40],
    defaultStyle: { font: "Roboto", fontSize: 10 },
    content: [
      { text: "FocusProLab — Ön Değerlendirme Raporu", fontSize: 18, bold: true, color: "#0f172a", margin: [0, 0, 0, 8] },
      {
        columns: [
          {
            stack: [
              { text: `Katılımcı: ${participant.name}` },
              { text: `Yaş: ${participant.age}`, margin: [0, 4, 0, 0] },
              { text: `Profil: ${profile.label}`, margin: [0, 4, 0, 0] },
              { text: `Tarih: ${new Date().toLocaleString("tr-TR")}`, margin: [0, 4, 0, 0] },
              { text: `Risk (özet): ${risk}`, bold: true, margin: [0, 8, 0, 0] }
            ]
          },
          {
            width: 90,
            stack: [{ text: "Hedef", bold: true, alignment: "center" }, { svg: getShapeSvg(target.shape, target.color), width: 40, alignment: "center" }]
          }
        ],
        margin: [0, 0, 0, 16]
      },
      {
        columns: [
          { width: "*", text: `Genel\n${o}`, alignment: "center", fillColor: color(o), color: "#fff", margin: [4, 10, 4, 10] },
          { width: "*", text: `Dikkat\n${a}`, alignment: "center", fillColor: color(a), color: "#fff", margin: [4, 10, 4, 10] },
          { width: "*", text: `Dürtü\n${i}`, alignment: "center", fillColor: color(i), color: "#fff", margin: [4, 10, 4, 10] },
          { width: "*", text: `Hız\n${s}`, alignment: "center", fillColor: color(s), color: "#fff", margin: [4, 10, 4, 10] },
          { width: "*", text: `Tutarlılık\n${c}`, alignment: "center", fillColor: color(c), color: "#fff", margin: [4, 10, 4, 10] }
        ],
        columnGap: 4,
        margin: [0, 0, 0, 16]
      },
      {
        table: {
          widths: ["*", "auto"],
          body: [
            [{ text: "Ölçüm", bold: true }, { text: "Değer", bold: true }],
            ["Doğruluk %", String(m.accuracy)],
            ["Median RT (ms)", String(m.medianReaction)],
            ["Omission %", m.omissionRate.toFixed(1)],
            ["False alarm %", m.falseAlarmRate.toFixed(1)],
            ["Geç yanıt %", m.lateRate.toFixed(1)],
            ["Deneme sayısı", String(m.totalTrials)]
          ]
        },
        layout: {
          fillColor: (i) => (i === 0 ? "#334155" : i % 2 === 0 ? "#f8fafc" : null),
          hLineColor: () => "#e2e8f0",
          vLineColor: () => "#e2e8f0"
        },
        margin: [0, 0, 0, 16]
      },
      chartImage ? { text: "Performans grafiği", bold: true, margin: [0, 0, 0, 6] } : null,
      chartImage ? { image: chartImage, width: 500, margin: [0, 0, 0, 12] } : null,
      { text: "Metin özeti", bold: true, margin: [0, 8, 0, 6] },
      { text, alignment: "justify", lineHeight: 1.35 },
      {
        text: "Uyarı: Tanı koymaz; yalnızca ön değerlendirme amaçlıdır.",
        fontSize: 8,
        color: "#64748b",
        margin: [0, 20, 0, 0]
      }
    ].filter(Boolean)
  };
}

export function createPdfBlob(args) {
  const doc = buildDocDefinition(args);
  return new Promise((resolve, reject) => {
    try {
      pdfMake.createPdf(doc).getBlob((b) => resolve(b));
    } catch (e) {
      reject(e);
    }
  });
}

export function downloadPdf(args) {
  const doc = buildDocDefinition(args);
  const name = `FocusProLab_${args.participant.name.replace(/\s+/g, "_")}_${Date.now()}.pdf`;
  pdfMake.createPdf(doc).download(name);
}
