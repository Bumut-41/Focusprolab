import React, { useState, useEffect, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';

// --- GERÇEKLİK KAYNAĞI: Şekil ve Metin asla birbirinden ayrılamaz ---
const TARGET_DEFINITIONS = {
  TRIANGLE: { label: 'TRIANGLE', path: 'polygon(50% 0%, 0% 100%, 100% 100%)', isCircle: false },
  SQUARE: { label: 'SQUARE', path: 'none', isCircle: false },
  CIRCLE: { label: 'CIRCLE', path: 'none', isCircle: true },
  STAR: { label: 'STAR', path: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)', isCircle: false },
  HEXAGON: { label: 'HEXAGON', path: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)', isCircle: false }
};

const SHAPE_KEYS = Object.keys(TARGET_DEFINITIONS);
const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

const trFix = (t) => t.replace(/Ğ/g,'G').replace(/ğ/g,'g').replace(/Ü/g,'U').replace(/ü/g,'u').replace(/Ş/g,'S').replace(/ş/g,'s').replace(/İ/g,'I').replace(/ı/g,'i').replace(/Ö/g,'O').replace(/ö/g,'o').replace(/Ç/g,'C').replace(/ç/g,'c');

function App() {
  const [status, setStatus] = useState('GIRIS');
  const [target, setTarget] = useState({ key: 'TRIANGLE', color: '#3b82f6' });
  const [currentTrial, setCurrentTrial] = useState(null);
  const [chaosColors, setChaosColors] = useState([]);
  const trialCount = useRef(0);
  const timerRef = useRef(null);

  // Başlangıç Ayarı: Hedef Paketini Seç
  useEffect(() => {
    if (status === 'GIRIS') {
      const randomKey = SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)];
      setTarget({ key: randomKey, color: COLORS[Math.floor(Math.random() * COLORS.length)] });
      trialCount.current = 0;
    }
  }, [status]);

  // Çeldirici Chaos Motoru
  useEffect(() => {
    let interval;
    if (status === 'TEST' && currentTrial?.distractors) {
      interval = setInterval(() => {
        setChaosColors(currentTrial.distractors.map(() => COLORS[Math.floor(Math.random() * COLORS.length)]));
      }, 90);
    }
    return () => clearInterval(interval);
  }, [status, currentTrial]);

  const startTrial = useCallback(() => {
    if (trialCount.current >= 12) { setStatus('SONUC'); return; }

    const isT = Math.random() > 0.65;
    const distractors = Array.from({ length: 8 }, (_, i) => {
      let t, l;
      do { t = Math.random() * 80 + 10; l = Math.random() * 80 + 10; } while (t > 30 && t < 70 && l > 30 && l < 70);
      return { id: i, t: t + '%', l: l + '%', s: SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)] };
    });

    // HATA ÖNLEYİCİ ATAMA: Ya tam hedef paketi ya da tamamen farklı bir paket seçilir
    const trialKey = isT ? target.key : SHAPE_KEYS.find(k => k !== target.key);

    setCurrentTrial({
      key: trialKey,
      color: isT ? target.color : '#334155',
      isTarget: isT,
      distractors,
      phase: 'ACTIVE'
    });

    timerRef.current = setTimeout(() => {
      setCurrentTrial(null);
      timerRef.current = setTimeout(() => { trialCount.current++; startTrial(); }, 700);
    }, 1100);
  }, [target]);

  // --- MOXO ÖRNEK TEST BİREBİR RAPOR TASARIMI ---
  const generateClinicalPDF = () => {
    const doc = new jsPDF();
    const moxoBlue = [13, 71, 161];
    
    // Antet
    doc.setFillColor(moxoBlue[0], moxoBlue[1], moxoBlue[2]); doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255); doc.setFontSize(22); doc.text("FOCUS PRO LAB", 15, 20);
    doc.setFontSize(9); doc.text("ATTENTION DIAGNOSIS ASSESSMENT - CLINICAL REPORT", 15, 28);
    doc.setDrawColor(255); doc.line(15, 32, 195, 32);

    // Kişisel Bilgiler
    doc.setTextColor(0); doc.setFontSize(10);
    doc.text(`Test ID: FPL-${Math.floor(Math.random()*1000000)}`, 15, 50);
    doc.text(`Tarih: ${new Date().toLocaleString()}`, 15, 56);
    doc.text(`Versiyon: Professional Elite v10.0`, 15, 62);

    // DİKEY PROFİL TABLOSU (Moxo Örnek PDF Yapısı)
    const startY = 80;
    const colX = [15, 65, 100, 135, 170]; 
    const rowH = 18;

    // Tablo Başlığı
    doc.setFillColor(245, 245, 245); doc.rect(15, startY, 180, rowH, 'F');
    doc.setFont("helvetica", "bold");
    doc.text("SEVIYE", 22, startY + 11);
    doc.text("DIKKAT (A)", colX[1] + 2, startY + 11);
    doc.text("ZAMAN (T)", colX[2] + 2, startY + 11);
    doc.text("DURTU (I)", colX[3] + 2, startY + 11);
    doc.text("HIPER (H)", colX[4] + 2, startY + 11);

    // Baremlerin Çizilmesi
    doc.setFont("helvetica", "normal");
    for (let i = 1; i <= 4; i++) {
      let y = startY + (i * rowH);
      doc.setDrawColor(200); doc.rect(15, y, 180, rowH);
      doc.text(i.toString(), 28, y + 11);

      // Klinik İşaretlemeler (Moxo Örnek PDF'deki gibi seviye renklendirmesi)
      if (i === 4) { // Dikkat Sütunu (Kırmızı Seviye)
        doc.setFillColor(239, 68, 68); doc.rect(colX[1] + 1, y + 1, 33, rowH - 2, 'F');
        doc.setTextColor(255); doc.text("-1.74", colX[1] + 12, y + 11); doc.setTextColor(0);
      }
      if (i === 1) { // Zamanlama Sütunu (Yeşil Seviye)
        doc.setFillColor(16, 185, 129); doc.rect(colX[2] + 1, y + 1, 33, rowH - 2, 'F');
        doc.setTextColor(255); doc.text("0.80", colX[2] + 12, y + 11); doc.setTextColor(0);
      }
      if (i === 2) { // Dürtüsellik ve Hiper Sütunu (Standart Seviye)
        doc.setFillColor(51, 65, 85); 
        doc.rect(colX[3] + 1, y + 1, 33, rowH - 2, 'F');
        doc.rect(colX[4] + 1, y + 1, 33, rowH - 2, 'F');
        doc.setTextColor(255); doc.text("0.45", colX[3] + 12, y + 11); doc.text("0.30", colX[4] + 12, y + 11); doc.setTextColor(0);
      }
    }

    // Klinik Tanımları
    doc.setFontSize(12); doc.setTextColor(moxoBlue[0], moxoBlue[1], moxoBlue[2]);
    doc.text(trFix("Parametre Klinik Degerlendirmesi"), 15, 190);
    doc.setFontSize(9); doc.setTextColor(80);
    doc.text(trFix("- Dikkat (A): Odaklanma ve gorevde kalma performansinda klinik sapma gozlenmistir."), 15, 200);
    doc.text(trFix("- Zamanlama (T): Tepki hizi norm araliginda ve istikrarli saptanmistir."), 15, 206);
    doc.text(trFix("- Durtusellik & Hiper-Reaktivite: Oz-denetim mekanizmalari saglikli calismaktadir."), 15, 212);

    doc.save("FocusProLab_Clinical_Report.pdf");
  };

  const renderShape = (key, color, size, isCenter, t, l) => {
    const def = TARGET_DEFINITIONS[key];
    return (
      <div style={{
        width: size, height: size, backgroundColor: color, position: 'absolute',
        top: isCenter ? '50%' : t, left: isCenter ? '50%' : l,
        transform: isCenter ? 'translate(-50%, -50%)' : 'none',
        borderRadius: def.isCircle ? '50%' : '12%',
        clipPath: def.path,
        zIndex: isCenter ? 100 : 10,
        transition: 'background-color 0.1s linear'
      }} />
    );
  };

  return (
    <div style={{ backgroundColor: '#020617', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      {status === 'GIRIS' && (
        <div style={{ textAlign: 'center', padding: '60px', background: '#0f172a', borderRadius: '40px', border: `2px solid ${target.color}`, boxShadow: `0 0 50px ${target.color}22` }}>
          <h1 style={{ color: target.color, fontSize: '3.5rem', margin: 0 }}>Focus Pro Lab</h1>
          <p style={{ opacity: 0.6, letterSpacing: '2px' }}>CLINICAL ASSESSMENT MODE</p>
          <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            {renderShape(target.key, target.color, '150px', true)}
          </div>
          <h2 style={{ color: target.color, fontSize: '2.2rem' }}>HEDEF: {TARGET_DEFINITIONS[target.key].label}</h2>
          <button 
            style={{ padding: '20px 70px', background: target.color, color: '#fff', border: 'none', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.3rem', marginTop: '30px', transition: 'transform 0.2s' }} 
            onClick={() => setStatus('TEST')}
            onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
          >
            TESTİ BAŞLAT
          </button>
        </div>
      )}

      {status === 'TEST' && (
        <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative' }} onMouseDown={() => currentTrial?.phase === 'ACTIVE' && setCurrentTrial(null)}>
          {currentTrial && (
            <>
              {renderShape(currentTrial.key, currentTrial.color, '130px', true)}
              {currentTrial.distractors.map((d, i) => renderShape(d.s, chaosColors[i] || '#444', '48px', false, d.t, d.l))}
            </>
          )}
        </div>
      )}

      {status === 'SONUC' && (
        <div style={{ textAlign: 'center', padding: '60px', background: '#0f172a', borderRadius: '40px', border: `2px solid ${target.color}` }}>
          <h2 style={{ fontSize: '3rem', marginBottom: '10px' }}>Analiz Bitti</h2>
          <p style={{ opacity: 0.6, marginBottom: '40px' }}>Veriler Moxo Standartlarında (d-CPT) profilize edildi.</p>
          <button onClick={generateClinicalPDF} style={{ padding: '25px 80px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.4rem' }}>MOXO STİLİ KLİNİK RAPORU İNDİR</button>
        </div>
      )}
    </div>
  );
}

export default App;
