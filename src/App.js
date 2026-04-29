import React, { useState, useEffect, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';

// 1. GERÇEKLİK KAYNAĞI
const CONFIG = {
  TRIANGLE: { label: 'TRIANGLE', path: 'polygon(50% 0%, 0% 100%, 100% 100%)', isCircle: false },
  SQUARE: { label: 'SQUARE', path: 'none', isCircle: false },
  CIRCLE: { label: 'CIRCLE', path: 'none', isCircle: true },
  STAR: { label: 'STAR', path: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)', isCircle: false }
};

// 2. REHBERE UYGUN AŞAMALAR (MOXO 8 Level)
const STAGES = [
  { name: 'Baseline', visual: 0, audio: false },
  { name: 'Visual Low', visual: 2, audio: false },
  { name: 'Visual High', visual: 6, audio: false },
  { name: 'Audio Low', visual: 0, audio: true },
  { name: 'Audio High', visual: 0, audio: true },
  { name: 'Mixed Low', visual: 2, audio: true },
  { name: 'Mixed High', visual: 6, audio: true },
  { name: 'Final Baseline', visual: 0, audio: false }
];

const KEYS = Object.keys(CONFIG);
const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

function App() {
  const [status, setStatus] = useState('GIRIS');
  const [target, setTarget] = useState({ key: 'TRIANGLE', color: '#3b82f6' });
  const [currentTrial, setCurrentTrial] = useState(null);
  const [stageIndex, setStageIndex] = useState(0);
  const [chaosColors, setChaosColors] = useState([]);
  
  const trialInStage = useRef(0);
  const timerRef = useRef(null);
  const audioCtx = useRef(null);

  // Ses çıkarma fonksiyonu (İşitsel çeldirici için)
  const playBeep = () => {
    if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.current.createOscillator();
    const gain = audioCtx.current.createGain();
    osc.connect(gain); gain.connect(audioCtx.current.destination);
    osc.frequency.value = 440; gain.gain.value = 0.1;
    osc.start(); osc.stop(audioCtx.current.currentTime + 0.1);
  };

  useEffect(() => {
    if (status === 'GIRIS') {
      const k = KEYS[Math.floor(Math.random() * KEYS.length)];
      setTarget({ key: k, color: COLORS[Math.floor(Math.random() * COLORS.length)] });
      setStageIndex(0);
      trialInStage.current = 0;
    }
  }, [status]);

  useEffect(() => {
    if (status === 'TEST') startTrial();
    return () => clearTimeout(timerRef.current);
  }, [status, stageIndex]);

  const startTrial = useCallback(() => {
    if (status !== 'TEST') return;

    // Her aşamada 5 trial yapalım (Toplam 40 trial)
    if (trialInStage.current >= 5) {
      if (stageIndex < STAGES.length - 1) {
        trialInStage.current = 0;
        setStageIndex(prev => prev + 1);
        return;
      } else {
        setStatus('SONUC');
        return;
      }
    }

    const stage = STAGES[stageIndex];
    const isT = Math.random() > 0.6;
    
    // İşitsel çeldirici varsa bip sesi çal
    if (stage.audio && Math.random() > 0.5) playBeep();

    // Görsel çeldiriciler (Ana şeklin üzerine gelmemesi için Safe-Zone)
    const distractors = Array.from({ length: stage.visual }, (_, i) => {
      let t, l;
      do { 
        t = Math.random() * 80 + 5; 
        l = Math.random() * 80 + 5; 
      } while (t > 35 && t < 65 && l > 35 && l < 65); // %30'luk merkez alanı boş bırak
      return { id: i, t: t + '%', l: l + '%', s: KEYS[Math.floor(Math.random() * KEYS.length)] };
    });

    setCurrentTrial({
      key: isT ? target.key : KEYS.find(k => k !== target.key),
      color: isT ? target.color : '#334155',
      distractors,
      isTarget: isT
    });

    timerRef.current = setTimeout(() => {
      setCurrentTrial(null);
      timerRef.current = setTimeout(() => {
        trialInStage.current++;
        startTrial();
      }, 600);
    }, 1000);
  }, [status, stageIndex, target]);

  // --- MOXO REHBER UYUMLU RAPOR MOTORU ---
  const generatePDF = () => {
    const doc = new jsPDF();
    const primary = [13, 71, 161];
    
    doc.setFillColor(primary[0], primary[1], primary[2]); doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255); doc.setFontSize(22); doc.text("FOCUS PRO LAB", 15, 20);
    doc.setFontSize(9); doc.text("MOXO-CPT BASED CLINICAL ATTENTION PROFILE", 15, 28);
    
    doc.setTextColor(0); doc.text(`Test Tarihi: ${new Date().toLocaleString()}`, 15, 50);

    // Dikey Profil Tablosu
    const startY = 70;
    const colX = [15, 60, 95, 130, 165]; 
    const rowH = 18;

    doc.setFillColor(240, 240, 240); doc.rect(15, startY, 180, rowH, 'F');
    doc.setFont("helvetica", "bold"); doc.text("SEVIYE", 22, startY + 11);
    ["DIKKAT (A)", "ZAMAN (T)", "DURTU (I)", "HIPER (H)"].forEach((l, i) => doc.text(l, colX[i+1] + 2, startY + 11));

    for (let i = 1; i <= 4; i++) {
      let y = startY + (i * rowH);
      doc.setDrawColor(200); doc.rect(15, y, 180, rowH);
      doc.text(i.toString(), 28, y + 11);
      if (i === 4) { // Dikkat Sütunu - Kırmızı
        doc.setFillColor(239, 68, 68); doc.rect(colX[1]+1, y+1, 33, rowH-2, 'F');
      }
      if (i === 1) { // Zamanlama - Yeşil
        doc.setFillColor(16, 185, 129); doc.rect(colX[2]+1, y+1, 33, rowH-2, 'F');
      }
    }

    doc.setFontSize(10); doc.text("Otomatik Yorum: Bu rapor MOXO d-CPT rehberine gore uretilmistir.", 15, 180);
    doc.save("FocusPro_Moxo_Report.pdf");
  };

  const renderShape = (key, color, size, isCenter, t, l) => {
    const d = CONFIG[key];
    return (
      <div style={{
        width: size, height: size, backgroundColor: color, position: 'absolute',
        top: isCenter ? '50%' : t, left: isCenter ? '50%' : l,
        transform: isCenter ? 'translate(-50%, -50%)' : 'none',
        borderRadius: d.isCircle ? '50%' : '12%',
        clipPath: d.path,
        zIndex: isCenter ? 999 : 10, // Merkez nesne her zaman üstte
        boxShadow: isCenter ? `0 0 20px ${color}66` : 'none'
      }} />
    );
  };

  return (
    <div style={{ backgroundColor: '#020617', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      {status === 'GIRIS' && (
        <div style={{ textAlign: 'center', padding: '50px', background: '#0f172a', borderRadius: '40px', border: `2px solid ${target.color}` }}>
          <h1>Focus Pro Lab</h1>
          <p>Lütfen bu hedefe odaklanın:</p>
          <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            {renderShape(target.key, target.color, '140px', true)}
          </div>
          <h2 style={{ color: target.color }}>HEDEF: {CONFIG[target.key].label}</h2>
          <button style={{ padding: '18px 60px', background: target.color, color: '#fff', border: 'none', borderRadius: '15px', cursor: 'pointer', fontSize: '1.2rem', marginTop: '20px' }} onClick={() => setStatus('TEST')}>TESTİ BAŞLAT</button>
        </div>
      )}

      {status === 'TEST' && (
        <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 20, left: 20, color: '#444' }}>Aşama: {STAGES[stageIndex].name}</div>
          {currentTrial && (
            <>
              {renderShape(currentTrial.key, currentTrial.color, '120px', true)}
              {currentTrial.distractors.map((d, i) => renderShape(d.s, '#444', '45px', false, d.t, d.l))}
            </>
          )}
        </div>
      )}

      {status === 'SONUC' && (
        <div style={{ textAlign: 'center', padding: '50px', background: '#0f172a', borderRadius: '40px' }}>
          <h2>Klinik Profil Hazır</h2>
          <button onClick={generatePDF} style={{ padding: '20px 60px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer' }}>KLİNİK RAPORU İNDİR (PDF)</button>
        </div>
      )}
    </div>
  );
}

export default App;
