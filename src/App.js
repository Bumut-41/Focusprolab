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

    doc.setFontSize(18);
    doc.text("Dikkat Performans Raporu", 20, 20);

    doc.setFontSize(12);

    doc.text(`Dikkat (A): ${s.attention}`, 20, 50);
    doc.text(`Zamanlama (T): ${s.timing}`, 20, 60);
    doc.text(`Dürtüsellik (I): ${s.impulsivity}`, 20, 70);
    doc.text(`Hiperaktivite (H): ${s.hyperactivity}`, 20, 80);

    doc.text("Seviyeler:", 20, 100);

    doc.text(`A: ${getLevel(s.attention)}`, 20, 110);
    doc.text(`T: ${getLevel(s.timing)}`, 20, 120);
    doc.text(`I: ${getLevel(s.impulsivity)}`, 20, 130);
    doc.text(`H: ${getLevel(s.hyperactivity)}`, 20, 140);

    doc.setFontSize(10);
    doc.text(
      "Bu test tanı koymaz. Sadece dikkat performansı hakkında bilgi verir.",
      20,
      170
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
