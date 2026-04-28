import React, { useState, useEffect, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const SHAPE_POOL = [
  { id: '1', type: 'SQUARE', color: '#3b82f6', shape: 'square', label: 'Mavi Kare' },
  { id: '2', type: 'CIRCLE', color: '#ef4444', shape: 'circle', label: 'Kırmızı Daire' },
  { id: '3', type: 'TRIANGLE', color: '#10b981', shape: 'triangle', label: 'Yeşil Üçgen' },
  { id: '4', type: 'STAR', color: '#f59e0b', shape: 'star', label: 'Sarı Yıldız' },
  { id: '5', type: 'HEXAGON', color: '#8b5cf6', shape: 'hexagon', label: 'Mor Altıgen' },
  { id: '6', type: 'DIAMOND', color: '#ec4899', shape: 'diamond', label: 'Pembe Elmas' }
];

const CHAOS_COLORS = ['#ff0055', '#00ffcc', '#ffff00', '#ff8800', '#ff00ff', '#ffffff', '#00ff00', '#7c3aed', '#db2777'];

const trFix = (t) => t.replace(/Ğ/g,'G').replace(/ğ/g,'g').replace(/Ü/g,'U').replace(/ü/g,'u').replace(/Ş/g,'S').replace(/ş/g,'s').replace(/İ/g,'I').replace(/ı/g,'i').replace(/Ö/g,'O').replace(/ö/g,'o').replace(/Ç/g,'C').replace(/ç/g,'c');

function App() {
  const [status, setStatus] = useState('GIRIS');
  const [target, setTarget] = useState(SHAPE_POOL[0]);
  const [currentTrial, setCurrentTrial] = useState(null);
  const [testLog, setTestLog] = useState([]);
  const [chaosColors, setChaosColors] = useState([]);
  const trialCountRef = useRef(0);
  const TOTAL_TRIALS = 40;

  useEffect(() => {
    if (status === 'GIRIS') {
      setTarget(SHAPE_POOL[Math.floor(Math.random() * SHAPE_POOL.length)]);
      setTestLog([]);
      trialCountRef.current = 0;
    }
  }, [status]);

  useEffect(() => {
    let interval;
    if (status === 'TEST' && currentTrial) {
      interval = setInterval(() => {
        setChaosColors(currentTrial.distractors.map(() => CHAOS_COLORS[Math.floor(Math.random() * CHAOS_COLORS.length)]));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [status, currentTrial]);

  const generateDistractors = () => {
    const count = Math.floor(Math.random() * 5) + 3;
    const list = [];
    for (let i = 0; i < count; i++) {
      let top, left;
      do { top = Math.random() * 75 + 10; left = Math.random() * 75 + 10; } while (top > 35 && top < 65 && left > 35 && left < 65);
      list.push({ id: i, top: top + '%', left: left + '%', size: Math.random() * 25 + 35 + 'px', shape: ['circle', 'rect', 'triangle', 'diamond'][Math.floor(Math.random() * 4)] });
    }
    return list;
  };

  const nextTrial = useCallback((count) => {
    if (count >= TOTAL_TRIALS) { setStatus('SONUC'); return; }
    const isTargetTrial = Math.random() > 0.65;
    let selected = isTargetTrial ? target : SHAPE_POOL.filter(s => s.id !== target.id)[Math.floor(Math.random() * (SHAPE_POOL.length - 1))];
    setCurrentTrial({ shape: selected, distractors: generateDistractors(), startTime: Date.now(), isTarget: isTargetTrial });
    setTimeout(() => {
      setCurrentTrial(null);
      setTimeout(() => { trialCountRef.current++; nextTrial(count + 1); }, 400);
    }, Math.max(600, 1000 - (count * 10)));
  }, [target]);

  const handleInteraction = useCallback((e) => {
    if (status !== 'TEST' || !currentTrial) return;
    if (e.type === 'keydown' && e.code !== 'Space') return;
    const rt = Date.now() - currentTrial.startTime;
    setTestLog(prev => [...prev, { isTarget: currentTrial.isTarget, rt }]);
    setCurrentTrial(null);
  }, [status, currentTrial]);

  useEffect(() => {
    window.addEventListener('keydown', handleInteraction);
    return () => window.removeEventListener('keydown', handleInteraction);
  }, [handleInteraction]);

  const renderShape = (s, isMain = false, colorOverride = null) => {
    if (!s) return null;
    const size = isMain ? '140px' : s.size;
    const fColor = colorOverride || s.color;
    const style = { width: size, height: size, backgroundColor: fColor, position: isMain ? 'relative' : 'absolute', top: isMain ? 'auto' : s.top, left: isMain ? 'auto' : s.left, zIndex: isMain ? 50 : 10 };
    if (s.shape === 'circle') return <div style={{ ...style, borderRadius: '50%' }} />;
    if (s.shape === 'triangle') return <div style={{ width: 0, height: 0, borderLeft: `${parseInt(size)/2}px solid transparent`, borderRight: `${parseInt(size)/2}px solid transparent`, borderBottom: `${size} solid ${fColor}`, position: style.position, top: style.top, left: style.left }} />;
    if (s.shape === 'diamond') return <div style={{ ...style, clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />;
    return <div style={{ ...style, borderRadius: s.shape === 'square' ? '15%' : '0' }} />;
  };

  const getMoxoResults = () => {
    const hits = testLog.filter(l => l.isTarget);
    const commissions = testLog.filter(l => !l.isTarget); // Yanlış basım
    const omisssions = 14 - hits.length; // Kaçırılan hedef (14 ortalama hedef)
    
    const attentionScore = Math.max(1, Math.min(4, Math.ceil(omisssions / 3)));
    const timingScore = hits.length > 0 ? (hits.reduce((a,b)=>a+b.rt,0)/hits.length > 600 ? 3 : 1) : 4;
    const impulsivityScore = Math.max(1, Math.min(4, Math.ceil(commissions.length / 2)));

    return { attentionScore, timingScore, impulsivityScore, rawHits: hits.length, rawErrors: commissions.length };
  };

  const generatePDF = () => {
    const r = getMoxoResults();
    const doc = new jsPDF();
    doc.setFillColor(30, 41, 59); doc.rect(0, 0, 210, 45, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(24); doc.text("MOXO-STYLE PERFORMANCE REPORT", 105, 20, {align:'center'});
    doc.setFontSize(10); doc.text(trFix("Focus Pro Lab v5.5 | Uluslararası Norm Karsılastırması"), 105, 32, {align:'center'});

    doc.autoTable({
      startY: 55,
      head: [[trFix('MOXO INDEKSLERI'), 'SKOR (1-4)', trFix('PERFORMANS SEVIYESI')]],
      body: [
        [trFix('A - DIKKAT (Attention)'), r.attentionScore, r.attentionScore <= 2 ? 'Standart' : 'Zorluk'],
        [trFix('T - ZAMANLAMA (Timing)'), r.timingScore, r.timingScore <= 2 ? 'Hizli/Normal' : 'Yavas'],
        [trFix('I - DURTUSELLIK (Impulsivity)'), r.impulsivityScore, r.impulsivityScore <= 1 ? 'Iyi' : 'Yuksek'],
        [trFix('H - HIPER-REAKTIVITE'), Math.max(1, r.impulsivityScore-1), 'Standart']
      ],
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.setFontSize(12); doc.setTextColor(0); doc.text(trFix("Siddet Tablosu Analizi:"), 14, doc.lastAutoTable.finalY + 15);
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 20,
      body: [['4: Cok Siddetli Zorluk', '3: Siddetli Zorluk', '2: Orta Siddetli', '1: Standart Performans']],
      theme: 'grid'
    });
    doc.save("FocusPro_Moxo_Report.pdf");
  };

  const results = getMoxoResults();

  return (
    <div style={{ backgroundColor: '#020617', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      {status === 'GIRIS' && (
        <div style={{ textAlign: 'center', padding: '60px', border: `1px solid ${target.color}66`, borderRadius: '40px', background: 'radial-gradient(circle, #0f172a 0%, #020617 100%)', boxShadow: '0 0 50px rgba(0,0,0,0.5)' }}>
          <h1 style={{ color: target.color, fontSize: '3.5rem', marginBottom: '10px' }}>Focus Pro Lab</h1>
          <p style={{ fontSize: '1.2rem', opacity: 0.8 }}>Sadece bu nesneye odaklanın:</p>
          <div style={{ margin: '40px 0', display: 'flex', justifyContent: 'center' }}>{renderShape(target, true)}</div>
          <button style={{ padding: '20px 60px', background: target.color, border: 'none', color: '#fff', borderRadius: '15px', fontWeight: 'bold', fontSize: '1.2rem', cursor: 'pointer' }} onClick={() => { setStatus('TEST'); nextTrial(0); }}>TESTİ BAŞLAT</button>
        </div>
      )}

      {status === 'TEST' && (
        <div style={{ width: '98vw', height: '94vh', background: '#000', position: 'relative', overflow: 'hidden', cursor: 'none' }} onMouseDown={handleInteraction}>
          {currentTrial && (
            <>
              {currentTrial.distractors.map((d, i) => renderShape(d, false, chaosColors[i]))}
              {renderShape(currentTrial.shape, true, currentTrial.shape.id === target.id ? target.color : chaosColors[0])}
            </>
          )}
        </div>
      )}

      {status === 'SONUC' && (
        <div style={{ textAlign: 'center', background: '#0f172a', padding: '50px', borderRadius: '30px', border: `2px solid ${target.color}` }}>
          <h1 style={{ color: target.color }}>Test Analizi Tamamlandı</h1>
          <div style={{ display: 'flex', gap: '20px', margin: '40px 0' }}>
            {['Dikkat', 'Zamanlama', 'Dürtüsellik'].map((label, idx) => (
              <div key={label} style={{ background: '#1e293b', padding: '25px', borderRadius: '20px', minWidth: '140px' }}>
                <h2 style={{ color: target.color, margin: 0 }}>{idx === 0 ? results.attentionScore : idx === 1 ? results.timingScore : results.impulsivityScore}</h2>
                <small>{label} (Z-Skor)</small>
              </div>
            ))}
          </div>
          <button style={{ padding: '18px 45px', background: target.color, color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }} onClick={generatePDF}>PROFESYONEL RAPORU (PDF) İNDİR</button>
        </div>
      )}
    </div>
  );
}

export default App;
