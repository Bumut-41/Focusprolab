import React, { useState, useEffect, useRef } from "react";
import { jsPDF } from "jspdf";

export default function App() {
  const [view, setView] = useState("START");
  const [scene, setScene] = useState(null);

  const trialLog = useRef([]);
  const currentTrial = useRef(null);
  const counter = useRef(0);
  const timer = useRef(null);

  // 🎯 SPACE TUŞU İLE CEVAP
  useEffect(() => {
    const handleKey = (e) => {
      if (e.code === "Space") {
        handleResponse();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // 🎯 CEVAP YAKALAMA
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

  // 🧠 TEST DÖNGÜSÜ
  const nextTrial = () => {
    if (counter.current >= 20) {
      setView("END");
      return;
    }

    const isTarget = Math.random() > 0.5;

    const startTime = performance.now();

    currentTrial.current = {
      isTarget,
      startTime,
      responded: false,
      responses: []
    };

    setScene(isTarget ? "TARGET" : "OTHER");

    timer.current = setTimeout(() => {
      setScene(null);

      const t = currentTrial.current;

      trialLog.current.push({
        isTarget: t.isTarget,
        responded: t.responded,
        reactionTime: t.reactionTime || 0,
        responseCount: t.responses.length
      });

      counter.current++;
      setTimeout(nextTrial, 500);
    }, 1000);
  };

  useEffect(() => {
    if (view === "PLAY") nextTrial();
    return () => clearTimeout(timer.current);
  }, [view]);

  // 📊 SKOR HESAPLAMA
  const calculateScores = () => {
    let attention = 0;
    let timing = 0;
    let impulsivity = 0;
    let hyperactivity = 0;

    trialLog.current.forEach((t) => {
      // DİKKAT (hedefi kaçırdı)
      if (t.isTarget && !t.responded) attention++;

      // ZAMANLAMA (geç bastı)
      if (t.isTarget && t.responded && t.reactionTime > 800) timing++;

      // DÜRTÜSELLİK (yanlış bastı)
      if (!t.isTarget && t.responded) impulsivity++;

      // HİPERAKTİVİTE (çok bastı)
      if (t.responseCount > 1) hyperactivity++;
    });

    return { attention, timing, impulsivity, hyperactivity };
  };

  // 📊 SEVİYE
  const getLevel = (v) => {
    if (v === 0) return 1;
    if (v < 3) return 2;
    if (v < 6) return 3;
    return 4;
  };

  // 📄 PDF RAPOR
const downloadReport = () => {
  const s = calculateScores();

  const doc = new jsPDF();

  // 🧠 BAŞLIK
  doc.setFontSize(20);
  doc.text("Attention Performance Report", 20, 20);

  doc.setFontSize(12);
  doc.text("Computerized Attention Assessment", 20, 28);

  // 👤 KİŞİ BİLGİ
  doc.setFontSize(10);
  doc.text("Ad: Kullanıcı", 20, 40);
  doc.text("Tarih: " + new Date().toLocaleDateString(), 20, 45);

  // 📊 TABLO
  const getLevelText = (v) => {
    const lvl = getLevel(v);
    if (lvl === 1) return "İyi";
    if (lvl === 2) return "Orta";
    if (lvl === 3) return "Düşük";
    return "Zayıf";
  };

  const data = [
    ["Parametre", "Skor", "Seviye"],
    ["Dikkat (A)", s.attention, getLevelText(s.attention)],
    ["Zamanlama (T)", s.timing, getLevelText(s.timing)],
    ["Dürtüsellik (I)", s.impulsivity, getLevelText(s.impulsivity)],
    ["Hiperaktivite (H)", s.hyperactivity, getLevelText(s.hyperactivity)],
  ];

  let y = 60;

  data.forEach((row, i) => {
    row.forEach((col, j) => {
      doc.text(String(col), 20 + j * 60, y);
    });
    y += 10;
  });

  // 📊 ŞİDDET AÇIKLAMA
  doc.setFontSize(10);
  doc.text("1: İyi  |  2: Orta  |  3: Düşük  |  4: Zayıf", 20, y + 10);

  // 🧠 OTOMATİK YORUM
  let yorum = "";

  if (s.attention > 5)
    yorum += "Dikkat performansında belirgin zorluk gözlemlendi. ";

  if (s.timing > 5)
    yorum += "Zamanlama becerisi düşük olabilir. ";

  if (s.impulsivity > 5)
    yorum += "Dürtüsel tepki eğilimi yüksek. ";

  if (s.hyperactivity > 5)
    yorum += "Hiperaktivite belirtileri mevcut. ";

  if (yorum === "") yorum = "Performans genel olarak normal aralıktadır.";

  doc.setFontSize(12);
  doc.text("Yorum:", 20, y + 25);
  doc.setFontSize(10);
  doc.text(yorum, 20, y + 35, { maxWidth: 170 });

  // ⚠️ UYARI
  doc.setFontSize(8);
  doc.text(
    "Bu test klinik tanı koymaz. Yalnızca performans değerlendirmesi sağlar.",
    20,
    270
  );

  doc.save("rapor.pdf");
};
  // 🎨 UI
  return (
    <div
      style={{
        textAlign: "center",
        marginTop: "100px",
        fontFamily: "Arial"
      }}
    >
      {view === "START" && (
        <>
          <h1>Dikkat Testi</h1>
          <p>🟢 Yeşil görünce SPACE bas</p>
          <p>🔴 Kırmızıda basma</p>
          <button onClick={() => setView("PLAY")}>Başla</button>
        </>
      )}

      {view === "PLAY" && (
        <div>
          {scene === "TARGET" && (
            <h1 style={{ color: "green", fontSize: "80px" }}>●</h1>
          )}
          {scene === "OTHER" && (
            <h1 style={{ color: "red", fontSize: "80px" }}>■</h1>
          )}
        </div>
      )}

      {view === "END" && (
        <>
          <h2>Test tamamlandı</h2>
          <button onClick={downloadReport}>📄 Rapor indir</button>
        </>
      )}
    </div>
  );
}
