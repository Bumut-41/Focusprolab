import React, { useState, useEffect, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Şekil ve Renk Havuzu
const SHAPES = ['square', 'circle', 'triangle', 'star', 'hexagon', 'diamond'];
const CHAOS_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

const STAGES = [
  { name: 'Temel Kademe', distractors: 0 },
  { name: 'Gorsel Yukleme 1', distractors: 3 },
  { name: 'Gorsel Yukleme 2', distractors: 6 },
  { name: 'Dikkat Dagiti 1', distractors: 4 },
  { name: 'Dikkat Dagiti 2', distractors: 8 },
  { name: 'Kombine Analiz', distractors: 5 },
  { name: 'Yuksek Basinc', distractors: 10 },
  { name: 'Surdurulebilirlik', distractors: 0 }
];

const trFix = (t) => t.replace(/Ğ/g,'G').replace(/ğ/g,'g').replace(/Ü/g,'U').replace(/ü/g,'u').replace(/Ş/g,'S').replace(/ş/g,'s').replace(/İ/g,'I').replace(/ı/g,'i').replace(/Ö/g,'O').replace(/ö/g,'o').replace(/Ç/g,'C').replace(/ç/c,'c');

function App() {
  const [status, setStatus] = useState('GIRIS');
  const [target, setTarget] = useState({ shape: 'square', color: '#3b82f6' });
  const [currentTrial, setCurrentTrial] = useState(null);
  const [testLog, setTestLog] = useState([]);
  const [distColors, setDistColors] = useState([]);
  const [stageIdx, setStageIdx] = useState(0);

  const trialCount = useRef(0);
  const pressRef = useRef(0);
  const timerRef = useRef(null);

  // Test her başladığında rastgele hedef oluştur
  useEffect(() => {
    if (status === 'GIRIS') {
      const randomShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      const randomColor = CHAOS_COLORS[Math.floor(Math.random() * CHAOS_COLORS.length)];
      setTarget({ shape: randomShape, color: randomColor });
      setTestLog([]);
      setStageIdx(0);
      trialCount.current = 0;
    }
  }, [status]);

  // Çeldirici Renk Patlamaları
  useEffect(() => {
    let interval;
    if (status === 'TEST' && currentTrial?.phase === 'ACTIVE') {
      interval = setInterval(() => {
        setDistColors(currentTrial.distractors.map(() => CHAOS_COLORS[Math.floor(Math.random() * CHAOS_COLORS.length)]));
      }, 120);
    }
    return () => clearInterval(interval);
  }, [status, currentTrial]);

  const startTrial = useCallback(() => {
    if (trialCount.current >= 6) { // Her aşama 6 döngü
      if (stageIdx >= STAGES.length - 1) { setStatus('SONUC'); return; }
      setStageIdx(prev => prev + 1);
      trialCount.current = 0;
      return;
    }

    const isTarget = Math.random() > 0.6;
    const trialShape = isTarget ? target.shape : SHAPES.filter(s => s !== target.shape)[Math.floor(Math.random() * 5)];
    const trialColor = isTarget ? target.color : CHAOS_COLORS[Math.floor(Math.random() * CHAOS_COLORS.length)];

    // Çeldiricileri merkezden uzak alanlara yerleştir
    const distractors = Array.from({ length: STAGES[stageIdx].distractors }, (_, i) => {
      let top, left;
      do {
        top = Math.random() * 80 + 10;
        left = Math.random() * 80 + 10;
      } while (top > 35 && top < 65 && left > 35 && left < 65); // Merkez boş bölge
      return { id: i, top: top + '%', left: left + '%', shape: SHAPES[Math.floor(Math.random() * SHAPES.length)] };
    });

    pressRef.current = 0;
    setCurrentTrial({ shape: trialShape, color: trialColor, isTarget, distractors, startTime: Date.now(), phase: 'ACTIVE' });

    timerRef.current = setTimeout(() => {
      setCurrentTrial(prev => prev ? { ...prev, phase: 'VOID' } : null);
      timerRef.current = setTimeout(() => {
        trialCount.current++;
        startTrial();
      }, 800);
    }, 1200);
  }, [stageIdx, target]);

  useEffect(() => {
    if (status === 'TEST') startTrial();
    return () => clearTimeout(timerRef.current);
  }, [stageIdx, status]);

  const handlePress = useCallback(() => {
    if (!currentTrial || status !== 'TEST') return;
    pressRef.current++;
    setTestLog(prev => [...prev, {
      stage: STAGES[stageIdx].name,
      isTarget: currentTrial.isTarget,
      phase: currentTrial.phase,
      rt: Date.now() - currentTrial.startTime,
      isExtra: pressRef.current > 1
    }]);
    if (currentTrial.phase === 'ACTIVE') setCurrentTrial(p => ({ ...p, phase: 'VOID' }));
  }, [currentTrial, stageIdx, status]);

  const getReportData = () => {
    const validHits = testLog.filter(l => l.isTarget && l.phase === 'ACTIVE');
    const lateHits = testLog.filter(l => l.isTarget && l.phase === 'VOID');
    const wrongPress = testLog.filter(l => !l.isTarget);
    const multiPress = testLog.filter(l => l.isExtra).length;

    return {
      A: Math.max(1, 4 - Math.floor(validHits.length / 10)),
      T: Math.max(1, 4 - Math.floor(lateHits.length / 3)),
      I: Math.min(4, Math.max(1, Math.floor(wrongPress.length / 2))),
      H: Math.min(4, Math.max(1, multiPress + 1))
    };
  };

  const generatePDF = () => {
    const data = getReportData();
    const doc = new jsPDF();
    doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(22);
    doc.text("FOCUS PRO LAB - PERFORMANS ANALIZI", 105, 25, { align: 'center' });
    
    doc.autoTable({
      startY: 50,
      head: [[trFix('INDIKATÖR'), 'SKOR (1-4)', 'KLINIK DURUM']],
      body: [
        [trFix('DIKKAT (Attention)'), data.A, data.A > 2 ? 'Zorluk' : 'Standart'],
        [trFix('ZAMANLAMA (Timing)'), data.T, data.T > 2 ? 'Yavas Yanit' : 'Hizli'],
        [trFix('DÜRTÜSELLIK (Impulsivity)'), data.I, data.I > 2 ? 'Yuksek' : 'Kontrollu'],
        [trFix('HIPER-REAKTIVITE'), data.H, data.H > 2 ? 'Asiri Tepki' : 'Normal']
      ],
      headStyles: { fillColor: [59, 130, 246] }
    });
    doc.save(`FocusPro_Rapor_${Date.now()}.pdf`);
  };

  const renderShapeUI = (shape, color, size, isCenter, top, left) => {
    const style = {
      width: size, height: size, backgroundColor: color, position: 'absolute',
      top: isCenter ? '50%' : top, left: isCenter ? '50%' : left,
      transform: isCenter ? 'translate(-50%, -50%)' : 'none',
      zIndex: isCenter ? 100 : 10, borderRadius: shape === 'circle' ? '50%' : '12%'
    };
    if (shape === 'triangle') return <div key={Math.random()} style={{ ...style, backgroundColor: 'transparent', width: 0, height: 0, borderLeft: `${parseInt(size)/2}px solid transparent`, borderRight: `${parseInt(size)/2}px solid transparent`, borderBottom: `${size} solid ${color}` }} />;
    if (shape === 'star') return <div key={Math.random()} style={{ ...style, clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }} />;
    return <div key={Math.random()} style={style} />;
  };

  const stats = getReportData();

  return (
    <div style={{ backgroundColor: '#020617', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }} onMouseDown={handlePress}>
      {status === 'GIRIS' && (
        <div style={{ textAlign: 'center', padding: '50px', background: '#0f172a', borderRadius: '30px', border: `2px solid ${target.color}` }}>
          <h1 style={{ color: target.color }}>Focus Pro Lab</h1>
          <p>Hedef Nesne: <b>{target.shape.toUpperCase()}</b></p>
          <div style={{ height: '180px', position: 'relative' }}>{renderShapeUI(target.shape, target.color, '140px', true)}</div>
          <button style={{ padding: '15px 50px', background: target.color, border: 'none', color: '#fff', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setStatus('TEST')}>TESTI BASLAT</button>
        </div>
      )}

      {status === 'TEST' && (
        <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 20, left: 20, opacity: 0.4 }}>{STAGES[stageIdx].name}</div>
          {currentTrial?.phase === 'ACTIVE' && (
            <>
              {renderShapeUI(currentTrial.shape, currentTrial.color, '140px', true)}
              {currentTrial.distractors.map((d, i) => renderShapeUI(d.shape, distColors[i], '50px', false, d.top, d.left))}
            </>
          )}
        </div>
      )}

      {status === 'SONUC' && (
        <div style={{ textAlign: 'center', padding: '40px', background: '#0f172a', borderRadius: '25px', border: `2px solid ${target.color}` }}>
          <h2>Analiz Raporu</h2>
          <div style={{ display: 'flex', gap: '15px', margin: '30px 0' }}>
            {Object.entries(stats).map(([k, v]) => (
              <div key={k} style={{ background: '#1e293b', padding: '20px', borderRadius: '15px', borderBottom: `4px solid ${v > 2 ? '#ef4444' : '#10b981'}` }}>
                <h1 style={{ margin: 0 }}>{v}</h1><small>{k}</small>
              </div>
            ))}
          </div>
          <button onClick={generatePDF} style={{ padding: '15px 30px', background: '#3b82f6', border: 'none', color: '#fff', borderRadius: '10px', cursor: 'pointer' }}>PDF RAPORU INDIR</button>
        </div>
      )}
    </div>
  );
}

export default App;
