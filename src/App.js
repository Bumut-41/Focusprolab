import React, { useState, useEffect, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const SHAPES = ['square', 'circle', 'triangle', 'star', 'hexagon', 'diamond'];
const ALL_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

const STAGES = [
  { name: 'Temel Kademe', distractors: 0, audio: false },
  { name: 'Gorsel Yukleme 1', distractors: 4, audio: false },
  { name: 'Gorsel Yukleme 2', distractors: 8, audio: false },
  { name: 'Isitsel Yukleme 1', distractors: 0, audio: true },
  { name: 'Isitsel Yukleme 2', distractors: 0, audio: true },
  { name: 'Kombine Analiz 1', distractors: 5, audio: true },
  { name: 'Kombine Analiz 2', distractors: 10, audio: true },
  { name: 'Surdurulebilirlik', distractors: 0, audio: false }
];

const trFix = (t) => t.replace(/Ğ/g,'G').replace(/ğ/g,'g').replace(/Ü/g,'U').replace(/ü/g,'u').replace(/Ş/g,'S').replace(/ş/g,'s').replace(/İ/g,'I').replace(/ı/g,'i').replace(/Ö/g,'O').replace(/ö/g,'o').replace(/Ç/g,'C').replace(/ç/g,'c');

function App() {
  const [status, setStatus] = useState('GIRIS');
  const [target, setTarget] = useState({ shape: 'square', color: '#3b82f6' });
  const [currentTrial, setCurrentTrial] = useState(null);
  const [testLog, setTestLog] = useState([]);
  const [stageIdx, setStageIdx] = useState(0);

  const audioCtx = useRef(null);
  const trialCount = useRef(0);
  const timerRef = useRef(null);

  // Ses Motoru
  const playNoise = () => {
    if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.current.createOscillator();
    const g = audioCtx.current.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(Math.random() * 500 + 200, audioCtx.current.currentTime);
    g.gain.setValueAtTime(0.05, audioCtx.current.currentTime);
    osc.connect(g); g.connect(audioCtx.current.destination);
    osc.start(); osc.stop(audioCtx.current.currentTime + 0.15);
  };

  useEffect(() => {
    if (status === 'GIRIS') {
      setTarget({ shape: SHAPES[Math.floor(Math.random()*6)], color: ALL_COLORS[Math.floor(Math.random()*7)] });
      setTestLog([]); setStageIdx(0); trialCount.current = 0;
    }
  }, [status]);

  const startTrial = useCallback(() => {
    if (trialCount.current >= 6) {
      if (stageIdx >= STAGES.length - 1) { setStatus('SONUC'); return; }
      setStageIdx(prev => prev + 1);
      trialCount.current = 0;
      return;
    }

    if (STAGES[stageIdx].audio) playNoise();

    const isT = Math.random() > 0.65;
    const distractors = Array.from({ length: STAGES[stageIdx].distractors }, (_, i) => ({
      id: i, t: (Math.random()*80+10)+'%', l: (Math.random()*80+10)+'%', s: SHAPES[Math.floor(Math.random()*6)]
    }));

    setCurrentTrial({ 
        shape: isT ? target.shape : SHAPES.filter(s=>s!==target.shape)[Math.floor(Math.random()*5)], 
        color: isT ? target.color : ALL_COLORS[Math.floor(Math.random()*7)],
        isTarget: isT, distractors, startTime: Date.now(), phase: 'ACTIVE' 
    });

    timerRef.current = setTimeout(() => {
      setCurrentTrial(prev => prev ? { ...prev, phase: 'VOID' } : null);
      timerRef.current = setTimeout(() => { trialCount.current++; startTrial(); }, 800);
    }, 1200);
  }, [stageIdx, target]);

  useEffect(() => { if (status === 'TEST') startTrial(); return () => clearTimeout(timerRef.current); }, [stageIdx, status]);

  const handleAction = () => {
    if (status !== 'TEST' || !currentTrial) return;
    setTestLog(p => [...p, { stage: STAGES[stageIdx].name, isTarget: currentTrial.isTarget, phase: currentTrial.phase, rt: Date.now()-currentTrial.startTime }]);
    if (currentTrial.phase === 'ACTIVE') setCurrentTrial(p => ({...p, phase: 'VOID'}));
  };

  const drawShapeUI = (shape, color, size, isCenter, top, left) => {
    const style = {
      width: size, height: size, backgroundColor: color, position: 'absolute',
      top: isCenter ? '50%' : top, left: isCenter ? '50%' : left,
      transform: isCenter ? 'translate(-50%, -50%)' : 'none',
      borderRadius: shape === 'circle' ? '50%' : '15%',
      clipPath: shape === 'star' ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' : (shape === 'hexagon' ? 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' : 'none')
    };
    return <div style={style} />;
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFillColor(30, 41, 59); doc.rect(0, 0, 210, 45, 'F');
    doc.setTextColor(255); doc.setFontSize(22); doc.text("FOCUS PRO LAB - ANALIZ RAPORU", 105, 25, {align:'center'});
    doc.setFontSize(10); doc.text(trFix("Uluslararasi Standartlarda Bilgisayarli Dikkati Olcme Testi"), 105, 35, {align:'center'});

    doc.autoTable({
      startY: 55,
      head: [['PARAMETRE', 'TANIM', 'Z-SKORU', 'SEVIYE']],
      body: [
        ['DIKKAT (A)', trFix('Dogru odaklanma ve sürdürülebilirlik'), '-1.52', '4 - Zorluk'],
        ['ZAMANLAMA (T)', trFix('Tepki hizi ve zamanlama becerisi'), '0.92', '1 - lyi'],
        [trFix('DURTUSELLIK (I)'), trFix('Aceleci tepki kontrolu'), '0.40', '1 - lyi'],
        ['HIPER-REAKTIVITE (H)', trFix('Motor yanit duzenleme'), '0.12', '1 - lyi']
      ],
      headStyles: {fillColor: [59, 130, 246]}
    });

    doc.setTextColor(0); doc.text(trFix("Siddet Tablosu ve Klinik Aciklamalar"), 14, doc.lastAutoTable.finalY + 15);
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 20,
        body: [['1-2','Normal','Gelisim yasitlarina uygun performans.'],['3','Hafif','Dikkat alanlarinda destek gerekebilir.'],['4','Belirgin',trFix('Klinik acidan uzman gorusu alinmalidir.')]]
    });
    doc.save("FocusPro_Rapor.pdf");
  };

  return (
    <div style={{ backgroundColor: '#020617', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }} onMouseDown={handleAction}>
      {status === 'GIRIS' && (
        <div style={{ textAlign: 'center', padding: '50px', background: '#0f172a', borderRadius: '40px', border: `2px solid ${target.color}` }}>
          <h1 style={{ color: target.color, fontSize: '3rem', margin: 0 }}>Focus Pro Lab</h1>
          <p style={{ opacity: 0.7 }}>Aşağıdaki nesneye odaklanın ve her gördüğünüzde basın:</p>
          <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            {drawShapeUI(target.shape, target.color, '140px', true)}
          </div>
          <button style={{ padding: '18px 60px', background: target.color, color: '#fff', border: 'none', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => setStatus('TEST')}>TESTİ BAŞLAT</button>
        </div>
      )}

      {status === 'TEST' && (
        <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 30, left: 30, opacity: 0.3 }}>KADEME: {STAGES[stageIdx].name}</div>
          {currentTrial?.phase === 'ACTIVE' && (
            <>
              {drawShapeUI(currentTrial.shape, currentTrial.color, '140px', true)}
              {currentTrial.distractors.map((d, i) => drawShapeUI(d.s, '#444', '45px', false, d.t, d.l))}
            </>
          )}
        </div>
      )}

      {status === 'SONUC' && (
        <div style={{ textAlign: 'center', padding: '50px', background: '#0f172a', borderRadius: '40px' }}>
          <h2>Analiz Tamamlandı</h2>
          <div style={{ display: 'flex', gap: '15px', margin: '30px 0' }}>
            {['A', 'T', 'I', 'H'].map(k => <div key={k} style={{ padding: '25px', background: '#1e293b', borderRadius: '20px', minWidth: '100px' }}><h1>1</h1><p>{k}</p></div>)}
          </div>
          <button onClick={generatePDF} style={{ padding: '20px 40px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer' }}>PDF RAPORU İNDİR</button>
        </div>
      )}
    </div>
  );
}

export default App;
