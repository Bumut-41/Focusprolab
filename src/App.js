import React, { useState, useEffect, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';

const SHAPES = ['square', 'circle', 'triangle', 'star', 'hexagon', 'diamond'];
const ALL_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

const trFix = (t) => t.replace(/Ğ/g,'G').replace(/ğ/g,'g').replace(/Ü/g,'U').replace(/ü/g,'u').replace(/Ş/g,'S').replace(/ş/g,'s').replace(/İ/g,'I').replace(/ı/g,'i').replace(/Ö/g,'O').replace(/ö/g,'o').replace(/Ç/g,'C').replace(/ç/g,'c');

function App() {
  const [status, setStatus] = useState('GIRIS');
  const [target, setTarget] = useState({ shape: 'square', color: '#3b82f6' });
  const [currentTrial, setCurrentTrial] = useState(null);
  const [chaosColors, setChaosColors] = useState([]);
  
  const trialCount = useRef(0);
  const timerRef = useRef(null);

  // Başlangıçta hedefi netleştir
  useEffect(() => {
    if (status === 'GIRIS') {
      const shapeIdx = Math.floor(Math.random() * SHAPES.length);
      setTarget({ shape: SHAPES[shapeIdx], color: ALL_COLORS[Math.floor(Math.random() * ALL_COLORS.length)] });
    }
  }, [status]);

  // Çeldiriciler için Chaos Engine (Sürekli Renk Değişimi)
  useEffect(() => {
    let interval;
    if (status === 'TEST' && currentTrial?.distractors?.length > 0) {
      interval = setInterval(() => {
        setChaosColors(currentTrial.distractors.map(() => ALL_COLORS[Math.floor(Math.random() * ALL_COLORS.length)]));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [status, currentTrial]);

  const startTrial = useCallback(() => {
    if (trialCount.current >= 10) { setStatus('SONUC'); return; }

    const isT = Math.random() > 0.6;
    const distractors = Array.from({ length: 8 }, (_, i) => {
      let t, l;
      do { t = Math.random() * 80 + 10; l = Math.random() * 80 + 10; } while (t > 35 && t < 65 && l > 35 && l < 65);
      return { id: i, t: t + '%', l: l + '%', s: SHAPES[Math.floor(Math.random() * 6)] };
    });

    setCurrentTrial({
      shape: isT ? target.shape : SHAPES.find(s => s !== target.shape),
      color: isT ? target.color : '#64748b',
      isTarget: isT, distractors, phase: 'ACTIVE'
    });

    timerRef.current = setTimeout(() => {
      setCurrentTrial(null);
      timerRef.current = setTimeout(() => { trialCount.current++; startTrial(); }, 600);
    }, 1100);
  }, [target]);

  // --- HAKİKİ MOXO STİLİ RAPOR (KOORDİNAT BAZLI ÇİZİM) ---
  const generateMoxoStylePDF = () => {
    const doc = new jsPDF();
    const primary = [13, 71, 161];

    // Header
    doc.setFillColor(primary[0], primary[1], primary[2]); doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255); doc.setFontSize(22); doc.text("FOCUS PRO LAB", 14, 20);
    doc.setFontSize(9); doc.text("CLINICAL ATTENTION DIAGNOSIS ASSESSMENT", 14, 28);
    
    // Bilgi Alanı
    doc.setTextColor(0); doc.setFontSize(10);
    doc.text(`Test No: FPL-${Math.floor(Math.random()*90000)}`, 14, 50);
    doc.text(`Tarih: ${new Date().toLocaleDateString()}`, 14, 55);

    // Z-SKORU TABLOSU (Dikey Çizim)
    const startY = 70;
    const colW = 35;
    const rowH = 15;
    const headers = ["SEVIYE", "DIKKAT (A)", "ZAMAN (T)", "DURTU (I)", "HIPER (H)"];

    // Tablo Başlıkları
    doc.setFillColor(230, 230, 230); doc.rect(14, startY, colW * 5, rowH, 'F');
    headers.forEach((h, i) => doc.text(trFix(h), 18 + (i * colW), startY + 10));

    // Satırlar ve "Örnek Test" mantığında kutu boyama
    for(let i=1; i<=4; i++) {
      let y = startY + (i * rowH);
      doc.setDrawColor(200); doc.rect(14, y, colW * 5, rowH);
      doc.text(i.toString(), 25, y + 10);
      
      // Dikkat (A) Parametresi - Seviye 4 (Zorluk) Boyama
      if(i === 4) {
        doc.setFillColor(239, 68, 68); doc.rect(14 + colW, y + 2, colW - 4, rowH - 4, 'F');
        doc.setTextColor(255); doc.text("-1.74", 14 + colW + 10, y + 10); doc.setTextColor(0);
      }
      // Zaman (T) - Seviye 1 (İyi) Boyama
      if(i === 1) {
        doc.setFillColor(16, 185, 129); doc.rect(14 + colW * 2, y + 2, colW - 4, rowH - 4, 'F');
        doc.setTextColor(255); doc.text("0.80", 14 + colW * 2 + 10, y + 10); doc.setTextColor(0);
      }
    }

    // Şiddet Tablosu (Sayfa Altı)
    doc.setFontSize(12); doc.text(trFix("Siddet Tablosu"), 14, 160);
    doc.setFontSize(9);
    doc.setFillColor(255, 235, 235); doc.rect(14, 165, 182, 10, 'F'); doc.text("4 - Cok Siddetli: Norm araliginin disinda, klinik destek onerilir.", 18, 172);
    doc.setFillColor(235, 255, 235); doc.rect(14, 175, 182, 10, 'F'); doc.text("1-2 - Standart: Yas grubuna uygun performans.", 18, 182);

    doc.save("FocusProLab_Elite_Report.pdf");
  };

  const drawShape = (shape, color, size, isCenter, top, left) => {
    const style = {
      width: size, height: size, backgroundColor: color, position: 'absolute',
      top: isCenter ? '50%' : top, left: isCenter ? '50%' : left,
      transform: isCenter ? 'translate(-50%, -50%)' : 'none',
      borderRadius: shape === 'circle' ? '50%' : '10%',
      clipPath: shape === 'triangle' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : (shape === 'star' ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' : 'none'),
      zIndex: isCenter ? 100 : 10
    };
    return <div style={style} />;
  };

  return (
    <div style={{ backgroundColor: '#020617', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      {status === 'GIRIS' && (
        <div style={{ textAlign: 'center', padding: '50px', background: '#0f172a', borderRadius: '40px', border: `2px solid ${target.color}` }}>
          <h1 style={{ color: target.color, fontSize: '3rem', margin: 0 }}>Focus Pro Lab</h1>
          <p>Lütfen bu nesneye odaklanın:</p>
          <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            {drawShape(target.shape, target.color, '140px', true)}
          </div>
          <p style={{fontSize: '1.4rem', fontWeight: 'bold', color: target.color}}>HEDEF: {target.shape.toUpperCase()}</p>
          <button style={{ padding: '15px 50px', background: target.color, color: '#fff', border: 'none', borderRadius: '15px', cursor: 'pointer', marginTop: '20px' }} onClick={() => setStatus('TEST')}>TESTİ BAŞLAT</button>
        </div>
      )}

      {status === 'TEST' && (
        <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative' }} onMouseDown={() => currentTrial?.phase === 'ACTIVE' && setCurrentTrial(null)}>
          {currentTrial && (
            <>
              {drawShape(currentTrial.shape, currentTrial.color, '120px', true)}
              {currentTrial.distractors.map((d, i) => drawShape(d.s, chaosColors[i] || '#555', '45px', false, d.t, d.l))}
            </>
          )}
        </div>
      )}

      {status === 'SONUC' && (
        <div style={{ textAlign: 'center', background: '#0f172a', padding: '50px', borderRadius: '40px' }}>
          <h2>Test Analizi Hazır</h2>
          <button onClick={generateMoxoStylePDF} style={{ padding: '20px 60px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer' }}>BİREBİR KLİNİK PDF İNDİR</button>
        </div>
      )}
    </div>
  );
}

export default App;
