import React, { useState, useEffect, useRef } from "react";
import { jsPDF } from "jspdf";
import {
  Line
} from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Legend,
  Tooltip
} from "chart.js";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Legend,
  Tooltip
);

export default function App() {
  const [view, setView] = useState("START");
  const [scene, setScene] = useState(null);

  const trialLog = useRef([]);
  const currentTrial = useRef(null);
  const counter = useRef(0);
  const timer = useRef(null);

  const TOTAL_TRIALS = 20;

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.code === "Space") {
        event.preventDefault();
        handleResponse();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const startTest = () => {
    trialLog.current = [];
    currentTrial.current = null;
    counter.current = 0;
    setScene(null);
    setView("PLAY");
  };

  const handleResponse = () => {
    if (!currentTrial.current) return;

    const now = performance.now();

    currentTrial.current.responses.push(now);

    if (!currentTrial.current.responded) {
      currentTrial.current.responded = true;
      currentTrial.current.reactionTime =
        now - currentTrial.current.startTime;
    }
  };

  const nextTrial = () => {
    if (counter.current >= TOTAL_TRIALS) {
      currentTrial.current = null;
      setScene(null);
      setView("END");
      return;
    }

    const isTarget = Math.random() > 0.5;
    const startTime = performance.now();

    currentTrial.current = {
      trialNumber: counter.current + 1,
      isTarget,
      startTime,
      responded: false,
      reactionTime: 0,
      responses: []
    };

    setScene(isTarget ? "TARGET" : "OTHER");

    timer.current = setTimeout(() => {
      setScene(null);

      const t = currentTrial.current;

      if (t) {
        trialLog.current.push({
          trialNumber: t.trialNumber,
          isTarget: t.isTarget,
          responded: t.responded,
          reactionTime: t.reactionTime || 0,
          responseCount: t.responses.length
        });
      }

      counter.current += 1;

      timer.current = setTimeout(() => {
        nextTrial();
      }, 500);
    }, 1000);
  };

  useEffect(() => {
    if (view === "PLAY") {
      nextTrial();
    }

    return () => {
      clearTimeout(timer.current);
    };
  }, [view]);

  const calculateScores = () => {
    let attention = 0;
    let timing = 0;
    let impulsivity = 0;
    let hyperactivity = 0;

    trialLog.current.forEach((trial) => {
      if (trial.isTarget && !trial.responded) {
        attention += 1;
      }

      if (
        trial.isTarget &&
        trial.responded &&
        trial.reactionTime > 800
      ) {
        timing += 1;
      }

      if (!trial.isTarget && trial.responded) {
        impulsivity += 1;
      }

      if (trial.responseCount > 1) {
        hyperactivity += 1;
      }
    });

    return {
      attention,
      timing,
      impulsivity,
      hyperactivity
    };
  };

  const getLevel = (score) => {
    if (score === 0) return 1;
    if (score < 3) return 2;
    if (score < 6) return 3;
    return 4;
  };

  const getLevelText = (score) => {
    const level = getLevel(score);

    if (level === 1) return "İyi Performans";
    if (level === 2) return "Standart Performans";
    if (level === 3) return "Düşük Performans";
    return "Performansta Zorluk";
  };

  const getScoreColor = (score) => {
    const level = getLevel(score);

    if (level === 1) return "#1E9E4A";
    if (level === 2) return "#73B72B";
    if (level === 3) return "#F0A000";
    return "#D93025";
  };

  const generateSmartComment = (scores) => {
    const comments = [];

    if (scores.attention >= 6) {
      comments.push(
        "Dikkat alanında belirgin zorluk gözlenmiştir. Hedef uyaranlara verilen yanıtlarda kaçırmalar artmıştır."
      );
    } else if (scores.attention >= 3) {
      comments.push(
        "Dikkat performansında dönemsel düşüşler gözlenmiştir. Hedef uyaranlara odaklanma bazı denemelerde zorlaşmıştır."
      );
    } else {
      comments.push(
        "Dikkat performansı genel olarak korunmuştur."
      );
    }

    if (scores.timing >= 6) {
      comments.push(
        "Zamanlama becerisinde belirgin zorlanma vardır. Doğru yanıtlar bazı durumlarda geç verilmiştir."
      );
    } else if (scores.timing >= 3) {
      comments.push(
        "Zamanlama performansında hafif-orta düzeyde gecikmeler gözlenmiştir."
      );
    } else {
      comments.push(
        "Zamanlama becerisi genel olarak yeterli görünmektedir."
      );
    }

    if (scores.impulsivity >= 6) {
      comments.push(
        "Dürtüsellik puanı yüksektir. Hedef olmayan uyaranlara yanıt verme eğilimi artmıştır."
      );
    } else if (scores.impulsivity >= 3) {
      comments.push(
        "Dürtüsel yanıtlar zaman zaman gözlenmiştir."
      );
    } else {
      comments.push(
        "Dürtü kontrolü genel olarak korunmuştur."
      );
    }

    if (scores.hyperactivity >= 6) {
      comments.push(
        "Hiperaktivite / motor kontrol alanında belirgin zorlanma vardır. Çoklu tuşlama davranışı artmıştır."
      );
    } else if (scores.hyperactivity >= 3) {
      comments.push(
        "Motor yanıt kontrolünde zaman zaman düzensizlik gözlenmiştir."
      );
    } else {
      comments.push(
        "Motor yanıt kontrolü genel olarak düzenlidir."
      );
    }

    if (scores.attention >= 6 && scores.timing >= 6) {
      comments.push(
        "Dikkat ve zamanlama alanlarının birlikte etkilenmesi, odaklanma ve işlem hızının birlikte değerlendirilmesi gerektiğini düşündürür."
      );
    }

    if (scores.impulsivity >= 6 && scores.hyperactivity >= 6) {
      comments.push(
        "Dürtüsellik ve hiperaktivite alanlarının birlikte yükselmesi davranışsal kontrolün ayrıca değerlendirilmesini gerektirebilir."
      );
    }

    return comments.join(" ");
  };

  const buildChartData = () => {
    const labels = trialLog.current.map((trial) => trial.trialNumber);

    let attentionScore = 100;
    let timingScore = 100;
    let impulsivityScore = 100;
    let hyperactivityScore = 100;

    const attentionData = [];
    const timingData = [];
    const impulsivityData = [];
    const hyperactivityData = [];

    trialLog.current.forEach((trial) => {
      if (trial.isTarget && !trial.responded) {
        attentionScore -= 8;
      }

      if (
        trial.isTarget &&
        trial.responded &&
        trial.reactionTime > 800
      ) {
        timingScore -= 4;
      }

      if (!trial.isTarget && trial.responded) {
        impulsivityScore -= 10;
      }

      if (trial.responseCount > 1) {
        hyperactivityScore -= 10;
      }

      attentionData.push(Math.max(attentionScore, 0));
      timingData.push(Math.max(timingScore, 0));
      impulsivityData.push(Math.max(impulsivityScore, 0));
      hyperactivityData.push(Math.max(hyperactivityScore, 0));
    });

    return {
      labels,
      datasets: [
        {
          label: "Dikkat",
          data: attentionData,
          borderColor: "#1D4ED8",
          backgroundColor: "#1D4ED8",
          tension: 0.3
        },
        {
          label: "Zamanlama",
          data: timingData,
          borderColor: "#16A34A",
          backgroundColor: "#16A34A",
          tension: 0.3
        },
        {
          label: "Dürtüsellik",
          data: impulsivityData,
          borderColor: "#DC2626",
          backgroundColor: "#DC2626",
          tension: 0.3
        },
        {
          label: "Hiperaktivite",
          data: hyperactivityData,
          borderColor: "#F59E0B",
          backgroundColor: "#F59E0B",
          tension: 0.3
        }
      ]
    };
  };

  const buildChartOptions = () => {
    return {
      responsive: true,
      plugins: {
        legend: {
          display: true,
          position: "bottom"
        },
        tooltip: {
          enabled: true
        }
      },
      scales: {
        y: {
          min: 0,
          max: 100
        }
      }
    };
  };

  const drawScoreCard = (doc, title, score, x, y) => {
    const color = getScoreColor(score);

    doc.setDrawColor(color);
    doc.setFillColor(color);
    doc.roundedRect(x, y, 38, 24, 3, 3, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(title, x + 4, y + 8);

    doc.setFontSize(16);
    doc.text(String(score), x + 4, y + 18);

    doc.setTextColor(0, 0, 0);
  };

  const downloadReport = () => {
    const scores = calculateScores();
    const comment = generateSmartComment(scores);
    const doc = new jsPDF();

    doc.setFillColor(24, 54, 92);
    doc.rect(0, 0, 210, 32, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text("Dikkat Performans Raporu", 16, 18);

    doc.setFontSize(9);
    doc.text("Bilgisayarlı dikkat performansı değerlendirme çıktısı", 16, 25);

    doc.setTextColor(0, 0, 0);

    doc.setFontSize(10);
    doc.text("Rapor Tarihi: " + new Date().toLocaleDateString("tr-TR"), 16, 44);
    doc.text("Test Tipi: Görsel hedef / hedef dışı uyaran görevi", 16, 51);
    doc.text("Toplam Deneme: " + TOTAL_TRIALS, 16, 58);

    drawScoreCard(doc, "Dikkat", scores.attention, 16, 72);
    drawScoreCard(doc, "Zaman", scores.timing, 62, 72);
    drawScoreCard(doc, "Dürtü", scores.impulsivity, 108, 72);
    drawScoreCard(doc, "Hiper", scores.hyperactivity, 154, 72);

    doc.setFontSize(13);
    doc.text("Performans Seviyeleri", 16, 112);

    const rows = [
      ["A - Dikkat", scores.attention, getLevel(scores.attention), getLevelText(scores.attention)],
      ["T - Zamanlama", scores.timing, getLevel(scores.timing), getLevelText(scores.timing)],
      ["I - Dürtüsellik", scores.impulsivity, getLevel(scores.impulsivity), getLevelText(scores.impulsivity)],
      ["H - Hiperaktivite", scores.hyperactivity, getLevel(scores.hyperactivity), getLevelText(scores.hyperactivity)]
    ];

    let y = 124;

    doc.setFillColor(235, 238, 242);
    doc.rect(16, y - 7, 178, 9, "F");
    doc.setFontSize(9);
    doc.text("Alan", 20, y);
    doc.text("Skor", 78, y);
    doc.text("Seviye", 110, y);
    doc.text("Açıklama", 140, y);

    y += 10;

    rows.forEach((row) => {
      doc.setDrawColor(220, 220, 220);
      doc.rect(16, y - 7, 178, 9);

      doc.setTextColor(0, 0, 0);
      doc.text(String(row[0]), 20, y);

      doc.setTextColor(getScoreColor(row[1]));
      doc.text(String(row[1]), 80, y);
      doc.text(String(row[2]), 113, y);

      doc.setTextColor(0, 0, 0);
      doc.text(String(row[3]), 140, y);

      y += 10;
    });

    doc.setFontSize(13);
    doc.text("Otomatik Yorum", 16, 180);

    doc.setFontSize(10);
    doc.text(comment, 16, 190, { maxWidth: 178 });

    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      "Not: Bu uygulama klinik tanı koymaz. Sonuçlar yalnızca dikkat performansı hakkında ön bilgi sağlar.",
      16,
      276,
      { maxWidth: 178 }
    );

    doc.save("dikkat-performans-raporu.pdf");
  };

  const scores = calculateScores();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F3F6FA",
        fontFamily: "Arial, sans-serif",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 24
      }}
    >
      {view === "START" && (
        <div
          style={{
            width: "100%",
            maxWidth: 720,
            background: "white",
            borderRadius: 20,
            padding: 32,
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
            textAlign: "center"
          }}
        >
          <h1>Dikkat Performans Testi</h1>

          <p>
            Ekranda iki farklı uyaran göreceksiniz.
          </p>

          <div
            style={{
              display: "flex",
              gap: 20,
              justifyContent: "center",
              marginTop: 24,
              marginBottom: 24
            }}
          >
            <div
              style={{
                padding: 20,
                border: "2px solid #16A34A",
                borderRadius: 16,
                width: 180
              }}
            >
              <div style={{ fontSize: 70, color: "#16A34A" }}>●</div>
              <strong>Hedef</strong>
              <p>Yeşil daire görünce SPACE tuşuna bas.</p>
            </div>

            <div
              style={{
                padding: 20,
                border: "2px solid #DC2626",
                borderRadius: 16,
                width: 180
              }}
            >
              <div style={{ fontSize: 70, color: "#DC2626" }}>■</div>
              <strong>Hedef Değil</strong>
              <p>Kırmızı kare görünce basma.</p>
            </div>
          </div>

          <button
            onClick={startTest}
            style={{
              background: "#18365C",
              color: "white",
              border: "none",
              borderRadius: 12,
              padding: "14px 32px",
              fontSize: 16,
              cursor: "pointer"
            }}
          >
            Teste Başla
          </button>
        </div>
      )}

      {view === "PLAY" && (
        <div
          style={{
            width: "100%",
            maxWidth: 720,
            height: 420,
            background: "white",
            borderRadius: 20,
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative"
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 20,
              left: 20,
              color: "#555"
            }}
          >
            Deneme: {counter.current + 1} / {TOTAL_TRIALS}
          </div>

          {scene === "TARGET" && (
            <div style={{ fontSize: 120, color: "#16A34A" }}>●</div>
          )}

          {scene === "OTHER" && (
            <div style={{ fontSize: 120, color: "#DC2626" }}>■</div>
          )}

          {!scene && (
            <div style={{ fontSize: 20, color: "#999" }}>+</div>
          )}
        </div>
      )}

      {view === "END" && (
        <div
          style={{
            width: "100%",
            maxWidth: 900,
            background: "white",
            borderRadius: 20,
            padding: 32,
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)"
          }}
        >
          <h1 style={{ textAlign: "center" }}>Test Tamamlandı</h1>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
              marginTop: 24,
              marginBottom: 24
            }}
          >
            <div style={{ background: getScoreColor(scores.attention), color: "white", padding: 16, borderRadius: 12 }}>
              <strong>Dikkat</strong>
              <div style={{ fontSize: 28 }}>{scores.attention}</div>
            </div>

            <div style={{ background: getScoreColor(scores.timing), color: "white", padding: 16, borderRadius: 12 }}>
              <strong>Zamanlama</strong>
              <div style={{ fontSize: 28 }}>{scores.timing}</div>
            </div>

            <div style={{ background: getScoreColor(scores.impulsivity), color: "white", padding: 16, borderRadius: 12 }}>
              <strong>Dürtüsellik</strong>
              <div style={{ fontSize: 28 }}>{scores.impulsivity}</div>
            </div>

            <div style={{ background: getScoreColor(scores.hyperactivity), color: "white", padding: 16, borderRadius: 12 }}>
              <strong>Hiperaktivite</strong>
              <div style={{ fontSize: 28 }}>{scores.hyperactivity}</div>
            </div>
          </div>

          <h3>Performans Grafiği</h3>

          <div style={{ width: "100%", height: 360 }}>
            <Line data={buildChartData()} options={buildChartOptions()} />
          </div>

          <h3>Otomatik Yorum</h3>
          <p>{generateSmartComment(scores)}</p>

          <div style={{ textAlign: "center", marginTop: 24 }}>
            <button
              onClick={downloadReport}
              style={{
                background: "#18365C",
                color: "white",
                border: "none",
                borderRadius: 12,
                padding: "14px 32px",
                fontSize: 16,
                cursor: "pointer"
              }}
            >
              PDF Raporu İndir
            </button>

            <button
              onClick={() => setView("START")}
              style={{
                marginLeft: 12,
                background: "#E5E7EB",
                color: "#111827",
                border: "none",
                borderRadius: 12,
                padding: "14px 32px",
                fontSize: 16,
                cursor: "pointer"
              }}
            >
              Yeni Test Başlat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
