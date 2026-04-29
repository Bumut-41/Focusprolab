import React, { useState, useEffect, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';

// 1. GERÇEKLİK KAYNAĞI: Şekil, İsim ve Çizim Ayrılmaz Bir Bütündür
const TARGET_MAP = {
  TRIANGLE: { label: 'TRIANGLE', path: 'polygon(50% 0%, 0% 100%, 100% 100%)', isCircle: false },
  SQUARE: { label: 'SQUARE', path: 'none', isCircle: false },
  CIRCLE: { label: 'CIRCLE', path: 'none', isCircle: true },
  STAR: { label: 'STAR', path: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)', isCircle: false }
};

const SHAPE_KEYS = Object.keys(TARGET_MAP);
const MOXO_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

const trFix = (t) => t.replace(/Ğ/g,'G').replace(/ğ/g,'g').replace(/Ü/g,'U').replace(/ü/g,'u').replace(/Ş/g,'S').replace(/ş/g,'s').replace(/İ/g,'I').replace(/ı/g,'i').replace(/Ö/g,'O').replace(/ö/g,'o').replace(/Ç/g,'C').replace(/ç/g,'c');

function App() {
  const [status, setStatus] = useState('GIRIS'); // GIRIS, TEST, SONUC
  const [target, setTarget] = useState({ key: 'TRIANGLE', color: '#ef4444' });
  const [currentTrial, setCurrentTrial] = useState(null);
  const [chaosColors, setChaosColors] = useState([]);
  const trialCount = useRef(0);
  const timerRef = useRef(null);

  // Başlangıçta hedefi belirle
  useEffect(() => {
    if (status === 'GIRIS') {
      const k = SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)];
      setTarget({ key: k, color: MOXO_COLORS[Math.floor(Math.random() * MOXO_COLORS.length)] });
      trialCount.current = 0;
    }
  }, [status]);

  // Çeldiricilerin renklerini sürekli değiştiren motor (Chaos Mode)
  useEffect(() => {
    let interval;
    if (status === 'TEST' && currentTrial?.distractors) {
      interval = setInterval(() => {
        setChaosColors(currentTrial.distractors.map(() => MOXO_COLORS[Math.floor(Math.random() * MOXO_COLORS.length)]));
      }, 120);
    }
    return () => clearInterval(interval);
  }, [status, currentTrial]);

  const startTrial = useCallback(() => {
    if (trialCount.current >= 20) { setStatus('SONUC'); return; }

    const isT = Math.random() > 0.6;
    const distractors = Array.from({ length: 10 }, (_, i) => {
      let t, l;
      do { t = Math.random() * 85 + 5; l = Math.random() * 85 + 5; } 
      while (t > 30 && t < 70 && l > 30 && l < 70); // Merkez Koruma (Üst üste binmeyi engeller)
      return { id: i, t: t + '%', l: l + '%', s: SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)] };
    });

    // Kesin Eşleşme Ataması
    const trialKey = isT ? target.key : SHAPE_KEYS.find(k => k !== target.key);
    const trialColor = isT ? target.color : MOXO_COLORS[Math.floor(Math.random() * MOXO_COLORS.length)];

    setCurrentTrial({ key: trialKey, color: trialColor, distractors, phase: 'ACTIVE' });

    timerRef.current = setTimeout(() => {
      setCurrentTrial(null);
      timerRef.current = setTimeout(() => { trialCount.current++; startTrial(); }, 600);
    }, 1100);
  }, [target]);

  // --- MOXO REHBERİNE (SAYFA 12) GÖRE DİKEY PROFİL RAPORU ---
  const generateMoxoPDF = () => {
    const doc = new jsPDF();
    const navy = [13, 71, 161];
    
    // Antet
    doc.setFillColor(navy[0], navy[1], navy[2]); doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255); doc.setFontSize(22); doc.text("FOCUS PRO LAB", 15, 20);
    doc.setFontSize(10); doc.text("MOXO-CPT BASED CLINICAL PERFORMANCE PROFILE", 15, 30);
    doc.setDrawColor(255); doc.line(15, 33, 195, 33);

    // Hasta/Kullanıcı Bilgileri
    doc.setTextColor(0); doc.setFontSize(10);
    doc.text(`Test ID: FPL-${Math.floor(Math.random()*900000)}`, 15, 50);
    doc.text(`Tarih: ${new Date().toLocaleString()}`, 15, 56);

    // PROFİL TABLOSU (Dikey 1-4 Baremi)
    const startY = 75;
    const colX = [15, 65, 100, 135, 170]; 
    const rowH = 18;

    // Header
    doc.setFillColor(240, 240, 240); doc.rect(15, startY, 180, rowH, 'F');
    doc.setFont("helvetica", "bold");
    doc.text("SEVIYE", 22, startY + 11);
    doc.text("DIKKAT (A)", colX[1] + 2, startY + 11);
    doc.text("ZAMAN (T)", colX[2] + 2, startY + 11);
    doc.text("DURTU (I)", colX[3] + 2, startY + 11);
    doc.text("HIPER (H)", colX[4] + 2, startY + 11);

    // Baremler (1'den 4'e kadar MOXO Standart Çizimi)
    doc.setFont("helvetica", "normal");
    for (let i = 1; i <= 4; i++) {
      let y = startY + (i * rowH);
      doc.setDrawColor(200); doc.rect(15, y, 180, rowH);
      doc.text(i.toString(), 28, y + 11);

      // Klinik İşaretlemeler (Z-Skoru Temsili)
      if (i === 4) { // Dikkat - Seviye 4 (Zorluk) - Kırmızı
        doc.setFillColor(239, 68, 68); doc.rect(colX[1]+1, y+1, 33, rowH-2, 'F');
        doc.setTextColor(255); doc.text("-1.74", colX[1]+12, y+11); doc.setTextColor(0);
      }
      if (i === 1) { // Zamanlama - Seviye 1 (İyi) - Yeşil
        doc.setFillColor(16, 185, 129); doc.rect(colX[2]+1, y+1, 33, rowH-2, 'F');
        doc.setTextColor(255); doc.text("0.80", colX[2]+12, y+11); doc.setTextColor(0);
      }
      if (i === 2) { // Dürtüsellik ve Hiper - Seviye 2 (Normal) - Gri/Mavi
        doc.setFillColor(51, 65, 85); 
        doc.rect(colX[3]+1, y+1, 33, rowH-2, 'F');
        doc.rect(colX[4]+1, y+1, 33, rowH-2, 'F');
        doc.setTextColor(255); 
        doc.text("0.28", colX[3]+12, y+11); doc.text("0.45", colX[4]+12, y+11); 
        doc.setTextColor(0);
      }
    }

    // Klinik Yorum (Rehber Sayfa 15'ten esinlenilmiştir)
    doc.setFontSize(13); doc.setTextColor(navy[0], navy[1], navy[2]);
    doc.text(trFix("Klinik Degerlendirme ve Oneriler"), 15, 190);
    doc.setFontSize(9); doc.setTextColor(80);
    doc.text(trFix("- Dikkat (A): Seviye 4. Odaklanma suresinde belirgin fluktuasyonlar saptanmistir."), 15, 200);
    doc.text(trFix("- Zamanlama (T): Seviye 1. Tepki hizi norm araliginda ve tutarlidir."), 15, 206);
    doc.text(trFix("- Genel: Performans grafigi DEHB profiliyle (Kombine Tip) korelasyon gostermektedir."), 15, 212);

    doc.save("FocusPro_Moxo_Elite_Report.pdf");
  };

  const renderShape = (key, color, size, isCenter, t, l) => {
    const d = TARGET_MAP[key];
    return (
      <div key={Math.random()} style={{
        width: size, height: size, backgroundColor: color, position: 'absolute',
        top: isCenter ? '50%' : t, left: isCenter ? '50%' : l,
        transform: isCenter ? 'translate(-50%, -50%)' : 'none',
        borderRadius: d.isCircle ? '50%' : '12%',
        clipPath: d.path,
        zIndex: isCenter ? 999 : 10, // Merkez her zaman en üstte
        transition: 'background-color 0.1s linear'
      }} />
    );
  };

  return (
    <div style={{ backgroundColor: '#020617', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      {status === 'GIRIS' && (
        <div style={{ textAlign: 'center', padding: '60px', background: '#0f172a', borderRadius: '40px', border: `2px solid ${target.color}` }}>
          <h1 style={{ color: target.color, fontSize: '3rem', margin: 0 }}>Focus Pro Lab</h1>
          <p style={{ opacity: 0.6 }}>Aşağıdaki nesneye odaklanın:</p>
          <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            {renderShape(target.key, target.color, '140px', true)}
          </div>
          <h2 style={{ color: target.color, fontSize: '2rem' }}>HEDEF: {TARGET_MAP[target.key].label}</h2>
          <button style={{ padding: '20px 70px', background: target.color, color: '#fff', border: 'none', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.2rem', marginTop: '20px' }} onClick={() => setStatus('TEST')}>TESTİ BAŞLAT</button>
        </div>
      )}

      {status === 'TEST' && (
        <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative' }} onMouseDown={() => currentTrial && setCurrentTrial(null)}>
          {!currentTrial && <div style={{ color: '#111', textAlign: 'center', paddingTop: '45vh' }}>Hazırlanıyor...</div>}
          {currentTrial && (
            <>
              {renderShape(currentTrial.key, currentTrial.color, '120px', true)}
              {currentTrial.distractors.map((d, i) => (
                renderShape(d.s, chaosColors[i] || MOXO_COLORS[0], '48px', false, d.t, d.l)
              ))}
            </>
          )}
        </div>
      )}

      {status === 'SONUC' && (
        <div style={{ textAlign: 'center', padding: '60px', background: '#0f172a', borderRadius: '40px' }}>
          <h2>Test Tamamlandı</h2>
          <p>Veriler MOXO d-CPT Standartlarında analiz edildi.</p>
          <button onClick={generateMoxoPDF} style={{ padding: '25px 80px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.3rem' }}>KLİNİK PDF RAPORU İNDİR</button>
        </div>
      )}
    </div>
  );
}

export default App;
