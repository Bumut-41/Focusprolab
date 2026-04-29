import React, { useState, useEffect, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';

// --- KESİN YAPILANDIRMA: Şekil ve İsim Asla Ayrılmaz ---
const CONFIG = {
  TRIANGLE: { label: 'TRIANGLE', path: 'polygon(50% 0%, 0% 100%, 100% 100%)', isCircle: false },
  SQUARE: { label: 'SQUARE', path: 'none', isCircle: false },
  CIRCLE: { label: 'CIRCLE', path: 'none', isCircle: true },
  STAR: { label: 'STAR', path: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)', isCircle: false }
};

const KEYS = Object.keys(CONFIG);
const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

const trFix = (t) => t.replace(/Ğ/g,'G').replace(/ğ/g,'g').replace(/Ü/g,'U').replace(/ü/g,'u').replace(/Ş/g,'S').replace(/ş/g,'s').replace(/İ/g,'I').replace(/ı/g,'i').replace(/Ö/g,'O').replace(/ö/g,'o').replace(/Ç/g,'C').replace(/ç/g,'c');

function App() {
  const [status, setStatus] = useState('GIRIS'); // GIRIS, TEST, SONUC
  const [target, setTarget] = useState({ key: 'TRIANGLE', color: '#3b82f6' });
  const [currentTrial, setCurrentTrial] = useState(null);
  const [chaosColors, setChaosColors] = useState([]);
  const trialCount = useRef(0);
  const timerRef = useRef(null);

  // 1. Hedef Belirleme
  useEffect(() => {
    if (status === 'GIRIS') {
      const k = KEYS[Math.floor(Math.random() * KEYS.length)];
      setTarget({ key: k, color: COLORS[Math.floor(Math.random() * COLORS.length)] });
      trialCount.current = 0;
    }
  }, [status]);

  // 2. Boş Ekran Hatasını Çözen Tetikleyici
  useEffect(() => {
    if (status === 'TEST') {
      startTrial(); // Test statüsüne geçince ilk trial'ı hemen başlat
    }
    return () => clearTimeout(timerRef.current);
  }, [status]);

  // 3. Chaos Engine (Renk Değişimi)
  useEffect(() => {
    let interval;
    if (status === 'TEST' && currentTrial?.distractors) {
      interval = setInterval(() => {
        setChaosColors(currentTrial.distractors.map(() => COLORS[Math.floor(Math.random() * COLORS.length)]));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [status, currentTrial]);

  const startTrial = useCallback(() => {
    if (trialCount.current >= 15) { 
      setStatus('SONUC'); 
      return; 
    }

    const isT = Math.random() > 0.6;
    const distractors = Array.from({ length: 8 }, (_, i) => ({
      id: i, 
      t: (Math.random() * 80 + 10) + '%', 
      l: (Math.random() * 80 + 10) + '%', 
      s: KEYS[Math.floor(Math.random() * KEYS.length)]
    }));

    const trialKey = isT ? target.key : KEYS.find(k => k !== target.key);

    setCurrentTrial({
      key: trialKey,
      color: isT ? target.color : '#334155',
      distractors,
      phase: 'ACTIVE'
    });

    timerRef.current = setTimeout(() => {
      setCurrentTrial(null); // Şekli ekrandan sil
      timerRef.current = setTimeout(() => {
        trialCount.current++;
        startTrial();
      }, 600); // Boşluk süresi
    }, 1000); // Şeklin ekranda kalma süresi
  }, [target]);

  // --- MOXO STİLİ KLİNİK RAPOR MOTORU ---
  const generatePDF = () => {
    const doc = new jsPDF();
    const primary = [13, 71, 161];
    
    // Header
    doc.setFillColor(primary[0], primary[1], primary[2]); doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255); doc.setFontSize(22); doc.text("FOCUS PRO LAB", 15, 20);
    doc.setFontSize(9); doc.text("ATTENTION PERFORMANCE PROFILE - CLINICAL REPORT", 15, 28);
    
    // Bilgiler
    doc.setTextColor(0); doc.text(`Test Tarihi: ${new Date().toLocaleString()}`, 15, 50);
    doc.text(`Kullanici ID: FPL-${Math.floor(Math.random()*90000)}`, 15, 55);

    // DİKEY PROFİL TABLOSU (Moxo Örnek PDF Yapısı)
    const startY = 75;
    const colX = [15, 60, 95, 130, 165]; 
    const rowH = 20;

    doc.setFillColor(240, 240, 240); doc.rect(15, startY, 180, rowH, 'F');
    doc.setFont("helvetica", "bold"); doc.text("SEVIYE", 22, startY + 12);
    const labels = ["DIKKAT (A)", "ZAMAN (T)", "DURTU (I)", "HIPER (H)"];
    labels.forEach((l, i) => doc.text(trFix(l), colX[i+1] + 2, startY + 12));

    doc.setFont("helvetica", "normal");
    for (let i = 1; i <= 4; i++) {
      let y = startY + (i * rowH);
      doc.setDrawColor(200); doc.rect(15, y, 180, rowH);
      doc.text(i.toString(), 28, y + 12);

      // Klinik İşaretleme Simülasyonu
      if (i === 4) { // Dikkat (A) - Zorluk
        doc.setFillColor(239, 68, 68); doc.rect(colX[1]+1, y+1, 33, rowH-2, 'F');
        doc.setTextColor(255); doc.text("-1.74", colX[1]+12, y+12); doc.setTextColor(0);
      }
      if (i === 1) { // Zamanlama (T) - İyi
        doc.setFillColor(16, 185, 129); doc.rect(colX[2]+1, y+1, 33, rowH-2, 'F');
        doc.setTextColor(255); doc.text("0.80", colX[2]+12, y+12); doc.setTextColor(0);
      }
    }

    doc.setFontSize(11); doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.text(trFix("Klinik Parametre Aciklamalari"), 15, 190);
    doc.setFontSize(9); doc.setTextColor(80);
    doc.text(trFix("- Seviye 4 (Zorluk): Dikkat odağında klinik düzeyde sapma saptanmıştır."), 15, 200);
    doc.text(trFix("- Seviye 1 (Normal): Zamanlama ve tepki hızı normlar dahilindedir."), 15, 206);

    doc.save("FocusProLab_Elite_Report.pdf");
  };

  const renderVisual = (key, color, size, isCenter, t, l) => {
    const d = CONFIG[key];
    return (
      <div style={{
        width: size, height: size, backgroundColor: color, position: 'absolute',
        top: isCenter ? '50%' : t, left: isCenter ? '50%' : l,
        transform: isCenter ? 'translate(-50%, -50%)' : 'none',
        borderRadius: d.isCircle ? '50%' : '12%',
        clipPath: d.path,
        zIndex: isCenter ? 100 : 10
      }} />
    );
  };

  return (
    <div style={{ backgroundColor: '#020617', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      {status === 'GIRIS' && (
        <div style={{ textAlign: 'center', padding: '50px', background: '#0f172a', borderRadius: '40px', border: `2px solid ${target.color}` }}>
          <h1>Focus Pro Lab</h1>
          <p>Lütfen bu hedefe odaklanın:</p>
          <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            {renderVisual(target.key, target.color, '140px', true)}
          </div>
          <h2 style={{ color: target.color }}>HEDEF: {CONFIG[target.key].label}</h2>
          <button style={{ padding: '18px 60px', background: target.color, color: '#fff', border: 'none', borderRadius: '15px', cursor: 'pointer', fontSize: '1.2rem', marginTop: '20px' }} onClick={() => setStatus('TEST')}>TESTİ BAŞLAT</button>
        </div>
      )}

      {status === 'TEST' && (
        <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative' }} onMouseDown={() => currentTrial && setCurrentTrial(null)}>
          {currentTrial && (
            <>
              {renderVisual(currentTrial.key, currentTrial.color, '120px', true)}
              {currentTrial.distractors.map((d, i) => renderVisual(d.s, chaosColors[i] || '#444', '45px', false, d.t, d.l))}
            </>
          )}
        </div>
      )}

      {status === 'SONUC' && (
        <div style={{ textAlign: 'center', padding: '50px', background: '#0f172a', borderRadius: '40px' }}>
          <h2>Test Analizi Hazır</h2>
          <button onClick={generatePDF} style={{ padding: '20px 60px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.2rem' }}>BİREBİR MOXO STİLİ RAPOR İNDİR</button>
        </div>
      )}
    </div>
  );
}

export default App;
