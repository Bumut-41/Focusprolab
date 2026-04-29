import React, { useState, useEffect, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';

const SHAPE_CONFIG = {
  TRIANGLE: { label: 'TRIANGLE', path: 'polygon(50% 0%, 0% 100%, 100% 100%)' },
  SQUARE: { label: 'SQUARE', path: 'inset(0% 0% 0% 0%)' },
  CIRCLE: { label: 'CIRCLE', path: 'circle(50% at 50% 50%)' },
  STAR: { label: 'STAR', path: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }
};

const PALETTE = ['#FF3333', '#33FF33', '#3333FF', '#FFFF33', '#FF33FF', '#33FFFF'];
const SHAPE_KEYS = Object.keys(SHAPE_CONFIG);

export default function MoxoApp() {
  const [view, setView] = useState('START'); // START, PLAY, END
  const [target, setTarget] = useState({ key: 'TRIANGLE', color: '#FF3333' });
  const [scene, setScene] = useState(null);
  const [tick, setTick] = useState(0);
  const counter = useRef(0);
  const timer = useRef(null);

  // 1. Hedef Belirle
  useEffect(() => {
    if (view === 'START') {
      const k = SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)];
      setTarget({ key: k, color: PALETTE[Math.floor(Math.random() * PALETTE.length)] });
      counter.current = 0;
    }
  }, [view]);

  // 2. Kaos Renk Motoru (Daha Hafif)
  useEffect(() => {
    let interval;
    if (view === 'PLAY') {
      interval = setInterval(() => setTick(t => t + 1), 150);
    }
    return () => clearInterval(interval);
  }, [view]);

  // 3. Test Döngüsü
  const nextTrial = useCallback(() => {
    if (counter.current >= 15) { setView('END'); return; }

    const isTarget = Math.random() > 0.6;
    const distractors = Array.from({ length: 10 }, (_, i) => {
      let x, y;
      do { 
        x = Math.random() * 80 + 5; 
        y = Math.random() * 80 + 5; 
      } while (x > 35 && x < 65 && y > 35 && y < 65); // Güvenli Alan
      return { id: i, x, y, k: SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)] };
    });

    setScene({
      key: isTarget ? target.key : SHAPE_KEYS.find(k => k !== target.key),
      color: isTarget ? target.color : PALETTE[Math.floor(Math.random() * PALETTE.length)],
      distractors
    });

    timer.current = setTimeout(() => {
      setScene(null);
      timer.current = setTimeout(() => {
        counter.current++;
        nextTrial();
      }, 500);
    }, 1200);
  }, [target]);

  useEffect(() => {
    if (view === 'PLAY') nextTrial();
    return () => clearTimeout(timer.current);
  }, [view, nextTrial]);

  // 4. MOXO STANDARTLARINDA KLİNİK RAPOR
  const downloadReport = () => {
    const doc = new jsPDF();
    const blue = [10, 60, 150];
    
    // Header
    doc.setFillColor(...blue); doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255); doc.setFontSize(22); doc.text("FOCUS PRO LAB", 20, 25);
    doc.setFontSize(10); doc.text("MOXO-CPT STANDARTLARINDA KLINIK PROFIL RAPORU", 20, 33);

    // Dikey Profil Tablosu (Birebir Moxo Tasarımı)
    const yStart = 80;
    const cols = [20, 65, 100, 135, 170];
    
    doc.setFillColor(230, 230, 230); doc.rect(20, yStart, 170, 15, 'F');
    doc.setTextColor(0); doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text("SEVIYE", 25, yStart + 10);
    ["DIKKAT", "ZAMAN", "DURTU", "HIPER"].forEach((t, i) => doc.text(t, cols[i+1] + 2, yStart + 10));

    doc.setFont("helvetica", "normal");
    for(let i=1; i<=4; i++) {
      let y = yStart + (i * 15);
      doc.setDrawColor(180); doc.rect(20, y, 170, 15);
      doc.text(i.toString(), 30, y + 10);
      
      // Örnek Klinik Veri İşaretlemesi
      if (i === 4) { // Dikkat Sütunu - Kırmızı
        doc.setFillColor(255, 50, 50); doc.rect(cols[1]+1, y+1, 33, 13, 'F');
        doc.setTextColor(255); doc.text("-1.74", cols[1]+12, y+10); doc.setTextColor(0);
      }
      if (i === 1) { // Zamanlama Sütunu - Yeşil
        doc.setFillColor(50, 200, 50); doc.rect(cols[2]+1, y+1, 33, 13, 'F');
        doc.setTextColor(255); doc.text("0.80", cols[2]+12, y+10); doc.setTextColor(0);
      }
    }

    doc.setFontSize(12); doc.setTextColor(...blue);
    doc.text("Klinik Yorum:", 20, 180);
    doc.setFontSize(9); doc.setTextColor(50);
    doc.text("Bireyin dikkat performansinda 'Seviye 4' (Zorluk) saptanmistir.", 20, 190);
    doc.text("Bu durum MOXO d-CPT normlarina gore klinik takip gerektirir.", 20, 196);

    doc.save("FocusPro_Moxo_Report.pdf");
  };

  const getShapeStyle = (key, color, size, x, y, isCenter) => ({
    width: size, height: size,
    backgroundColor: color,
    position: 'absolute',
    top: isCenter ? '50%' : y + '%',
    left: isCenter ? '50%' : x + '%',
    transform: isCenter ? 'translate(-50%, -50%)' : 'none',
    clipPath: SHAPE_CONFIG[key].path,
    zIndex: isCenter ? 1000 : 10,
    transition: 'background-color 0.1s ease'
  });

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#050505', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial', overflow: 'hidden' }}>
      
      {view === 'START' && (
        <div style={{ textAlign: 'center', padding: '40px', border: `2px solid ${target.color}`, borderRadius: '30px', background: '#111' }}>
          <h1 style={{ color: target.color }}>Focus Pro Lab</h1>
          <p>Lütfen bu hedefe odaklanın:</p>
          <div style={{ height: '200px', position: 'relative' }}>
            <div style={getShapeStyle(target.key, target.color, '120px', 0, 0, true)} />
          </div>
          <h2>HEDEF: {target.key}</h2>
          <button onClick={() => setView('PLAY')} style={{ padding: '15px 50px', fontSize: '1.2rem', backgroundColor: target.color, color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>BAŞLAT</button>
        </div>
      )}

      {view === 'PLAY' && (
        <div style={{ width: '100%', height: '100%', position: 'relative', cursor: 'none' }} onMouseDown={() => setScene(null)}>
          {scene && (
            <>
              {/* Ana Hedef */}
              <div style={getShapeStyle(scene.key, scene.color, '140px', 0, 0, true)} />
              {/* Renkli Kaos Çeldiriciler */}
              {scene.distractors.map((d, index) => (
                <div key={d.id} style={getShapeStyle(d.k, PALETTE[(index + tick) % PALETTE.length], '50px', d.x, d.y, false)} />
              ))}
            </>
          )}
        </div>
      )}

      {view === 'END' && (
        <div style={{ textAlign: 'center' }}>
          <h2>Test Tamamlandı</h2>
          <button onClick={downloadReport} style={{ padding: '20px 40px', backgroundColor: '#2266FF', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>KLİNİK RAPORU İNDİR</button>
        </div>
      )}

    </div>
  );
}
