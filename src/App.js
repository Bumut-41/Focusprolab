import React, { useState, useEffect, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const SHAPES = ['square', 'circle', 'triangle', 'star', 'hexagon', 'diamond'];
const ALL_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

const STAGES = [
  { name: 'Temel Kademe', distractors: 0 },
  { name: 'Görsel Yükleme 1', distractors: 4 },
  { name: 'Görsel Yükleme 2', distractors: 8 },
  { name: 'Dikkat Dağıtıcı 1', distractors: 5 },
  { name: 'Dikkat Dağıtıcı 2', distractors: 10 },
  { name: 'Kombine Analiz', distractors: 6 },
  { name: 'Yüksek Basınç', distractors: 12 },
  { name: 'Sürdürülebilirlik', distractors: 0 }
];

const trFix = (t) => t.replace(/Ğ/g,'G').replace(/ğ/g,'g').replace(/Ü/g,'U').replace(/ü/g,'u').replace(/Ş/g,'S').replace(/ş/g,'s').replace(/İ/g,'I').replace(/ı/g,'i').replace(/Ö/g,'O').replace(/ö/g,'o').replace(/Ç/g,'C').replace(/ç/g,'c');

function App() {
  const [status, setStatus] = useState('GIRIS');
  const [target, setTarget] = useState({ shape: 'square', color: '#3b82f6' });
  const [currentTrial, setCurrentTrial] = useState(null);
  const [testLog, setTestLog] = useState([]);
  const [chaosColors, setChaosColors] = useState([]); // Hata buradaydı, isim düzeltildi
  const [stageIdx, setStageIdx] = useState(0);

  const trialCount = useRef(0);
  const pressRef = useRef(0);
  const timerRef = useRef(null);

  // Yeni Test Hazırlığı
  useEffect(() => {
    if (status === 'GIRIS') {
      const randShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      const randColor = ALL_COLORS[Math.floor(Math.random() * ALL_COLORS.length)];
      setTarget({ shape: randShape, color: randColor });
      setTestLog([]);
      setStageIdx(0);
      trialCount.current = 0;
    }
  }, [status]);

  // Çeldirici Renk Patlamaları Effect
  useEffect(() => {
    let interval;
    if (status === 'TEST' && currentTrial?.phase === 'ACTIVE' && currentTrial.distractors.length > 0) {
      interval = setInterval(() => {
        setChaosColors(currentTrial.distractors.map(() => ALL_COLORS[Math.floor(Math.random() * ALL_COLORS.length)]));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [status, currentTrial]);

  const startTrial = useCallback(() => {
    if (trialCount.current >= 6) {
      if (stageIdx >= STAGES.length - 1) { setStatus('SONUC'); return; }
      setStageIdx(prev => prev + 1);
      trialCount.current = 0;
      return;
    }

    const isTarget = Math.random() > 0.65;
    const trialShape = isTarget ? target.shape : SHAPES.filter(s => s !== target.shape)[Math.floor(Math.random() * (SHAPES.length - 1))];
    const trialColor = isTarget ? target.color : ALL_COLORS[Math.floor(Math.random() * ALL_COLORS.length)];

    // Çeldiricileri Merkezden Uzak Tutma (Güvenli Alan Protokolü)
    const distractors = Array.from({ length: STAGES[stageIdx].distractors }, (_, i) => {
      let t, l;
      do {
        t = Math.random() * 85 + 5;
        l = Math.random() * 85 + 5;
      } while (t > 25 && t < 75 && l > 25 && l < 75); // %25-75 arası (merkez) yasak bölge
      return { id: i, t: t + '%', l: l + '%', s: SHAPES[Math.floor(Math.random() * SHAPES.length)] };
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

  const handleAction = useCallback(() => {
    if (!currentTrial || status !== 'TEST') return;
    pressRef.current++;
    setTestLog(prev => [...prev, {
      stage: STAGES[stageIdx].name,
      isTarget: currentTrial.isTarget,
      phase: currentTrial.phase,
      rt: Date.now() - currentTrial.startTime,
      multi: pressRef.current > 1
    }]);
    if (currentTrial.phase === 'ACTIVE') setCurrentTrial(p => ({ ...p, phase: 'VOID' }));
  }, [currentTrial, stageIdx, status]);

  const getStats = () => {
    const hits = testLog.filter(l => l.isTarget && l.phase === 'ACTIVE');
    const late = testLog.filter(l => l.isTarget && l.phase === 'VOID');
    const errors = testLog.filter(l => !l.isTarget);
    const hyper = testLog.filter(l => l.multi).length;
    return {
      A: Math.max(1, 4 - Math.floor(hits.length / 10)),
      T: Math.max(1, 4 - Math.floor(late.length / 3)),
      I: Math.min(4, Math.max(1, Math.floor(errors.length / 2))),
      H: Math.min(4, Math.max(1, hyper + 1))
    };
  };

  const generatePDF = () => {
    const s = getStats();
    const doc = new jsPDF();
    doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(22);
    doc.text("FOCUS PRO LAB - KLINIK RAPOR", 105, 25, { align: 'center' });
    doc.autoTable({
      startY: 50,
      head: [['INDIKATOR', 'SKOR (1-4)', 'KLINIK YORUM']],
      body: [
        ['Dikkat (A)', s.A, s.A > 2 ? 'Odaklanma Zorlugu' : 'Normal'],
        ['Zamanlama (T)', s.T, s.T > 2 ? 'Yavas Tepki' : 'Iyi'],
        ['Durtusellik (I)', s.I, s.I > 2 ? 'Aceleci Yanit' : 'Kontrollu'],
        ['Hiper-Reaktivite (H)', s.H, s.H > 2 ? 'Asiri Motor Tepki' : 'Sakin']
      ]
    });
    doc.save("FocusPro_Analiz.pdf");
  };

  const drawShape = (shape, color, size, isCenter, top, left) => {
    const style = {
      width: size, height: size, backgroundColor: color, position: 'absolute',
      top: isCenter ? '50%' : top, left: isCenter ? '50%' : left,
      transform: isCenter ? 'translate(-50%, -50%)' : 'none',
      zIndex: isCenter ? 100 : 10, borderRadius: shape === 'circle' ? '50%' : '12%'
    };
    if (shape === 'triangle') return <div key={Math.random()} style={{ ...style, backgroundColor: 'transparent', width: 0, height: 0, borderLeft: `${parseInt(size)/2}px solid transparent`, borderRight: `${parseInt(size)/2}px solid transparent`, borderBottom: `${size} solid ${color}` }} />;
    if (shape === 'star') return <div key={Math.random()} style={{ ...style, clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }} />;
    if (shape === 'hexagon') return <div key={Math.random()} style={{ ...style, clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' }} />;
    return <div key={Math.random()} style={style} />;
  };

  const results = getStats();

  return (
    <div style={{ backgroundColor: '#020617', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }} onMouseDown={handleAction}>
      {status === 'GIRIS' && (
        <div style={{ textAlign: 'center', padding: '50px', background: '#0f172a', borderRadius: '40px', border: `2px solid ${target.color}`, boxShadow: `0 0 30px ${target.color}33` }}>
          <h1 style={{ color: target.color, fontSize: '3rem', margin: 0 }}>Focus Pro Lab</h1>
          <p style={{ opacity: 0.8 }}>Sadece bu nesneye odaklanın:</p>
          <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            {drawShape(target.shape, target.color, '140px', true)}
          </div>
          <button style={{ padding: '18px 60px', background: target.color, border: 'none', color: '#fff', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem' }} onClick={() => setStatus('TEST')}>TESTİ BAŞLAT</button>
        </div>
      )}

      {status === 'TEST' && (
        <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 20, left: 20, opacity: 0.3 }}>KADEME: {STAGES[stageIdx].name}</div>
          {currentTrial?.phase === 'ACTIVE' && (
            <>
              {drawShape(currentTrial.shape, currentTrial.color, '140px', true)}
              {currentTrial.distractors.map((d, i) => drawShape(d.s, chaosColors[i] || '#fff', '45px', false, d.t, d.l))}
            </>
          )}
        </div>
      )}

      {status === 'SONUC' && (
        <div style={{ textAlign: 'center', padding: '50px', background: '#0f172a', borderRadius: '35px', border: `2px solid ${target.color}` }}>
          <h2 style={{ color: target.color, marginBottom: '30px' }}>Test Analiz Özeti</h2>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
            {Object.entries(results).map(([k, v]) => (
              <div key={k} style={{ background: '#1e293b', padding: '25px', borderRadius: '20px', borderBottom: `5px solid ${v > 2 ? '#ef4444' : '#10b981'}`, minWidth: '120px' }}>
                <h1 style={{ margin: 0 }}>{v}</h1><p style={{ margin: 0, opacity: 0.6 }}>{k === 'A' ? 'Dikkat' : k === 'T' ? 'Zaman' : k === 'I' ? 'Dürtü' : 'Hiper'}</p>
              </div>
            ))}
          </div>
          <button onClick={generatePDF} style={{ padding: '18px 40px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>DETAYLI PDF RAPORU</button>
        </div>
      )}
    </div>
  );
}

export default App;
