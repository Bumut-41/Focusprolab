import { Line } from "react-chartjs-2";
import { computeMetrics, scoreSeries, summaryText } from "../metrics.js";
import { ShapeView } from "../shapeUtils.jsx";
import { createPdfBlob } from "../pdfReport.js";

export function ReportPanel({
  logs,
  profile,
  participant,
  target,
  chartRef,
  savedHint,
  extraActions,
  persistPdf
}) {
  const metrics = logs.length ? computeMetrics(logs, profile.lateResponseMs) : null;
  const series = logs.length ? scoreSeries(logs, profile.lateResponseMs) : null;

  const chartData = series
    ? {
        labels: logs.map((t) => t.trialNumber),
        datasets: [
          { label: "Dikkat", data: series.att, borderColor: "#2563eb", tension: 0.2, pointRadius: 0 },
          { label: "Dürtü", data: series.imp, borderColor: "#dc2626", tension: 0.2, pointRadius: 0 },
          { label: "Hız", data: series.spd, borderColor: "#16a34a", tension: 0.2, pointRadius: 0 },
          { label: "Tutarlılık", data: series.con, borderColor: "#d97706", tension: 0.2, pointRadius: 0 }
        ]
      }
    : null;

  if (!metrics || !target) return null;

  return (
    <div>
      {savedHint && (
        <p style={{ background: "#ecfdf5", border: "1px solid #86efac", color: "#166534", padding: 12, borderRadius: 12 }}>{savedHint}</p>
      )}
      <h2 style={{ marginTop: 8 }}>Rapor</h2>
      <p style={{ color: "#475569" }}>
        {participant.name} — yaş {participant.age} — {profile.label}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, margin: "20px 0" }}>
        {[
          ["Genel", Math.round(metrics.overallScore)],
          ["Dikkat", Math.round(metrics.attentionScore)],
          ["Dürtü", Math.round(metrics.impulseScore)],
          ["Hız", Math.round(metrics.speedScore)],
          ["Tutarlılık", Math.round(metrics.consistencyScore)]
        ].map(([t, v]) => (
          <div key={t} style={{ background: "#142440", color: "#fff", padding: 14, borderRadius: 14, textAlign: "center" }}>
            <div style={{ fontSize: 13 }}>{t}</div>
            <div style={{ fontSize: 26, fontWeight: 800 }}>{v}</div>
          </div>
        ))}
      </div>
      <p style={{ lineHeight: 1.6, color: "#334155" }}>{summaryText(metrics, profile.label)}</p>
      {chartData && (
        <div style={{ height: 300, marginTop: 24 }}>
          <Line
            ref={chartRef}
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              animation: false,
              scales: { y: { min: 0, max: 100 } },
              plugins: { legend: { position: "bottom" } }
            }}
          />
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 24, justifyContent: "center" }}>
        <button
          type="button"
          onClick={async () => {
            const url = chartRef?.current?.canvas?.toDataURL("image/png", 0.92);
            const blob = await createPdfBlob({ participant, profile, logs, target, chartImage: url });
            const href = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = href;
            a.download = `FocusProLab_${participant.name.replace(/\s+/g, "_")}_${Date.now()}.pdf`;
            a.click();
            URL.revokeObjectURL(href);
            try {
              await persistPdf?.(blob);
            } catch (e) {
              console.warn(e);
            }
          }}
          style={{
            padding: "12px 22px",
            border: "none",
            borderRadius: 12,
            background: "#142440",
            color: "#fff",
            fontWeight: 700,
            cursor: "pointer"
          }}
        >
          PDF indir
        </button>
        {extraActions}
      </div>
    </div>
  );
}
