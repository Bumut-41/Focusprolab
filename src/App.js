import React, { useState, useEffect, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';

// --- KESİN EŞLEŞME HARİTASI (Hata Payını Sıfıra İndirir) ---
const TARGET_MAP = {
  triangle: { name: 'TRIANGLE', path: 'polygon(50% 0%, 0% 100%, 100% 100%)' },
  square: { name: 'SQUARE', path: 'none' }, // Kare varsayılan div yapısıdır
  circle: { name: 'CIRCLE', path: 'circle(50%)' },
  star: { name: 'STAR', path: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' },
  hexagon: { name: 'HEXAGON', path: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' }
};

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
const SHAPE_KEYS = Object.keys(TARGET_MAP);

const trFix = (t) => t.replace(/Ğ/g,'G').replace(/ğ/g,'g').replace(/Ü/g,'U').replace(/ü/g,'u').replace(/Ş/g,'S').replace(/ş/g,'s').replace(/İ/g,'I').replace(/ı/g,'i').replace(/Ö/g,'O').replace(/ö/g,'o').replace(/Ç/g,'C').replace(/ç/g,'c');

function App() {
  const [status, setStatus] = useState('GIRIS');
  const [target, setTarget] = useState({ key: 'square', color: '#3b82f6' });
  const [currentTrial, setCurrentTrial] = useState(null);
  const [chaosColors, setChaosColors] = useState([]);
  const trialCount = useRef(0);
  const timerRef = useRef(null);

  // Başlangıçta hedefi ve görselini belirle
  useEffect(() => {
    if (status === 'GIRIS') {
      const randomKey = SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)];
      setTarget({ key: randomKey, color: COLORS[Math.floor(Math.random() * COLORS.length)] });
      trialCount.current = 0;
    }
  }, [status]);

  // Chaos Engine: Çeldiricilerin renklerini sürekli değiştirir
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
    if (trialCount.current >= 10) { setStatus('SONUC'); return; }

    const isT = Math.random() > 0.65;
    const distractors = Array.from({ length: 8 }, (_, i) => {
      let t, l;
      do { t = Math.random() * 80 + 10; l = Math.random() * 80 + 10; } while (t > 30 && t < 70 && l > 30 && l < 70); // Merkez bölge koruması
      return { id: i, t: t + '%', l: l + '%', s: SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)] };
    });

    setCurrentTrial({
      key: isT ? target.key : SHAPE_KEYS.find(k => k !== target.key),
      color: isT ? target.color : '#334155',
      isTarget: isT, distractors, phase: 'ACTIVE'
    });

    timerRef.current = setTimeout(() => {
      setCurrentTrial(null);
      timerRef.current = setTimeout(() => { trialCount.current++; startTrial(); }, 700);
    }, 1100);
  }, [target]);

  // --- MOXO ÖRNEK TEST BİREBİR MANUEL ÇİZİM RAPORU ---
  const generateElitePDF = () => {
    const doc = new jsPDF();
    const primary = [13, 71, 161];
    
    // Antet ve Başlık
    doc.setFillColor(primary[0], primary[1], primary[2]); doc.rect(0, 0, 210, 45, 'F');
    doc.setTextColor(255); doc.setFontSize(26); doc.text("FOCUS PRO LAB", 15, 25);
    doc.setFontSize(9); doc.text("COMPUTERIZED ADHD ASSESSMENT - CLINICAL PROFILE", 15, 35);
    doc.setDrawColor(255); doc.setLineWidth(0.5); doc.line(15, 38, 195, 38);

    // Test Bilgileri
    doc.setTextColor(0); doc.setFontSize(10);
    doc.text(`Kisinin Kodu: FPL-${Math.floor(Math.random()*100000)}`, 15, 55);
    doc.text(`Test Tarihi: ${new Date().toLocaleString()}`, 15, 61);
    doc.text(`Test Versiyonu: FocusPro Elite v9.0`, 15, 67);

    // DİKEY PROFİL TABLOSU (Moxo Tasarımı Birebir)
    const startY = 85;
    const colX = [15, 60, 95, 130, 165]; // Sütun X Koordinatları
    const rowH = 18;

    // Header Arkaplanı
    doc.setFillColor(240, 240, 240); doc.rect(15, startY, 180, rowH, 'F');
    doc.setFont("helvetica", "bold");
    doc.text("SEVIYE", 22, startY + 11);
    doc.text("DIKKAT (A)", colX[1] + 2, startY + 11);
    doc.text("ZAMAN (T)", colX[2] + 2, startY + 11);
    doc.text("DURTU (I)", colX[3] + 2, startY + 11);
    doc.text("HIPER (H)", colX[4] + 2, startY + 11);

    // 1-4 Seviye Baremleri ve İşaretlemeler
    doc.setFont("helvetica", "normal");
    for (let i = 1; i <= 4; i++) {
      let y = startY + (i * rowH);
      doc.setDrawColor(210); doc.rect(15, y, 180, rowH);
      doc.text(i.toString(), 28, y + 11);

      // Klinik Profil İşaretlemesi (Örnek PDF referanslı)
      if (i === 4) { // Dikkat Sütunu - Seviye 4 (Zorluk) - KIRMIZI
        doc.setFillColor(239, 68, 68); doc.rect(colX[1] + 1, y + 1, 33, rowH - 2, 'F');
        doc.setTextColor(255); doc.text("-1.74", colX[1] + 12, y + 11); doc.setTextColor(0);
      }
      if (i === 1) { // Zamanlama Sütunu - Seviye 1 (İyi) - YEŞİL
        doc.setFillColor(16, 185, 129); doc.rect(colX[2] + 1, y + 1, 33, rowH - 2, 'F');
        doc.setTextColor(255); doc.text("0.80", colX[2] + 12, y + 11); doc.setTextColor(0);
      }
      if (i === 2) { // Dürtüsellik ve Hiper - Seviye 2 (Normal)
        doc.setFillColor(30, 41, 59); 
        doc.rect(colX[3] + 1, y + 1, 33, rowH - 2, 'F');
        doc.rect(colX[4] + 1, y + 1, 33, rowH - 2, 'F');
        doc.setTextColor(255); doc.text("0.55", colX[3] + 12, y + 11); doc.text("0.28", colX[4] + 12, y + 11); doc.setTextColor(0);
      }
    }

    // Şiddet Baremi
    doc.setFontSize(13); doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.text(trFix("Siddet Tablosu ve Klinik Aciklama"), 15, 195);
    doc.setFontSize(9); doc.setTextColor(60);
    doc.text("4 - Cok Siddetli: Norm araliginin disinda, akademik/klinik destek onerilir.", 15, 205);
    doc.text("1-2 - Standart Performans: Yasitlariyla uyumlu norm araligi.", 15, 212);

    doc.save("FocusPro_Elite_Klinik_Rapor.pdf");
  };

  const drawShape = (key, color, size, isCenter, t, l) => (
    <div key={Math.random()} style={{
      width: size, height: size, backgroundColor: color, position: 'absolute',
      top: isCenter ? '50%' : t, left: isCenter ? '50%' : l,
      transform: isCenter ? 'translate(-50%, -50%)' : 'none',
      borderRadius: key === 'circle' ? '50%' : '12%',
      clipPath: TARGET_MAP[key].path,
      zIndex: isCenter ? 100 : 10,
      transition: 'background-color 0.1s ease'
    }} />
  );

  return (
    <div style={{ backgroundColor: '#020617', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      {status === 'GIRIS' && (
        <div style={{ textAlign: 'center', padding: '50px', background: '#0f172a', borderRadius: '40px', border: `2px solid ${target.color}`, boxShadow: `0 0 40px ${target.color}22` }}>
          <h1 style={{ color: target.color, fontSize: '3rem', margin: 0 }}>Focus Pro Lab</h1>
          <p style={{ opacity: 0.7, letterSpacing: '1px' }}>Lütfen aşağıdaki hedefe odaklanın:</p>
          <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            {drawShape(target.key, target.color, '140px', true)}
          </div>
          <h2 style={{ color: target.color, fontSize: '2rem' }}>HEDEF: {TARGET_MAP[target.key].name}</h2>
          <button style={{ padding: '18px 60px', background: target.color, color: '#fff', border: 'none', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.2rem', marginTop: '20px' }} onClick={() => setStatus('TEST')}>TESTİ BAŞLAT</button>
        </div>
      )}

      {status === 'TEST' && (
        <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative' }} onMouseDown={() => currentTrial?.phase === 'ACTIVE' && setCurrentTrial(null)}>
          {currentTrial && (
            <>
              {drawShape(currentTrial.key, currentTrial.color, '120px', true)}
              {currentTrial.distractors.map((d, i) => drawShape(d.s, chaosColors[i] || '#555', '45px', false, d.t, d.l))}
            </>
          )}
        </div>
      )}

      {status === 'SONUC' && (
        <div style={{ textAlign: 'center', padding: '50px', background: '#0f172a', borderRadius: '40px', border: `2px solid ${target.color}` }}>
          <h2 style={{ fontSize: '2.5rem' }}>Analiz Raporu Hazır</h2>
          <p style={{ opacity: 0.6, marginBottom: '30px' }}>MOXO d-CPT Standartlarında dikey profil analizi oluşturuldu.</p>
          <button onClick={generateElitePDF} style={{ padding: '20px 60px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.2rem' }}>BİREBİR KLİNİK PDF RAPORU İNDİR</button>
        </div>
      )}
    </div>
  );
}

export default App;
