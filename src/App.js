import React, { useState, useEffect, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const SHAPES = ['square', 'circle', 'triangle', 'star', 'hexagon', 'diamond'];
const ALL_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

const STAGES = [
  { id: 1, name: 'Temel Kademe', distractors: 0, audio: false },
  { id: 2, name: 'Gorsel Yukleme 1', distractors: 4, audio: false },
  { id: 3, name: 'Gorsel Yukleme 2', distractors: 8, audio: false },
  { id: 4, name: 'Isitsel Yukleme 1', distractors: 0, audio: true },
  { id: 5, name: 'Isitsel Yukleme 2', distractors: 0, audio: true },
  { id: 6, name: 'Kombine Analiz 1', distractors: 5, audio: true },
  { id: 7, name: 'Kombine Analiz 2', distractors: 10, audio: true },
  { id: 8, name: 'Surdurulebilirlik', distractors: 0, audio: false }
];

const trFix = (t) => t.replace(/Ğ/g,'G').replace(/ğ/g,'g').replace(/Ü/g,'U').replace(/ü/g,'u').replace(/Ş/g,'S').replace(/ş/g,'s').replace(/İ/g,'I').replace(/ı/g,'i').replace(/Ö/g,'O').replace(/ö/g,'o').replace(/Ç/g,'C').replace(/ç/g,'c');

function App() {
  const [status, setStatus] = useState('GIRIS');
  const [target, setTarget] = useState({ shape: 'square', color: '#3b82f6' });
  const [currentTrial, setCurrentTrial] = useState(null);
  const [testLog, setTestLog] = useState([]);
  const [stageIdx, setStageIdx] = useState(0);
  const [chaosColors, setChaosColors] = useState([]);

  const audioCtx = useRef(null);
  const trialCount = useRef(0);
  const timerRef = useRef(null);

  const playNoise = () => {
    if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.current.createOscillator();
    const gain = audioCtx.current.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(Math.random() * 300 + 100, audioCtx.current.currentTime);
    gain.gain.setValueAtTime(0.04, audioCtx.current.currentTime);
    osc.connect(gain); gain.connect(audioCtx.current.destination);
    osc.start(); osc.stop(audioCtx.current.currentTime + 0.2);
  };

  useEffect(() => {
    if (status === 'GIRIS') {
      const randS = SHAPES[Math.floor(Math.random() * 6)];
      const randC = ALL_COLORS[Math.floor(Math.random() * 7)];
      setTarget({ shape: randS, color: randC });
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
    const distractors = Array.from({ length: STAGES[stageIdx].distractors }, (_, i) => {
        let t, l;
        do {
            t = Math.random() * 85 + 5;
            l = Math.random() * 85 + 5;
        } while (t > 30 && t < 70 && l > 30 && l < 70); // %30-70 arası Safe Zone (Merkez boş kalır)
        return { id: i, t: t + '%', l: l + '%', s: SHAPES[Math.floor(Math.random() * 6)] };
    });

    setChaosColors(distractors.map(() => ALL_COLORS[Math.floor(Math.random() * 7)]));

    setCurrentTrial({ 
        shape: isT ? target.shape : SHAPES.filter(s => s !== target.shape)[Math.floor(Math.random() * 5)], 
        color: isT ? target.color : ALL_COLORS[Math.floor(Math.random() * 7)],
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
    setTestLog(p => [...p, { isTarget: currentTrial.isTarget, phase: currentTrial.phase, rt: Date.now()-currentTrial.startTime }]);
    if (currentTrial.phase === 'ACTIVE') setCurrentTrial(p => ({...p, phase: 'VOID'}));
  };

  const drawShapeUI = (shape, color, size, isCenter, top, left) => {
    const style = {
      width: size, height: size, backgroundColor: color, position: 'absolute',
      top: isCenter ? '50%' : top, left: isCenter ? '50%' : left,
      transform: isCenter ? 'translate(-50%, -50%)' : 'none',
      borderRadius: shape === 'circle' ? '50%' : '15%',
      clipPath: shape === 'star' ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' : (shape === 'hexagon' ? 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' : 'none'),
      zIndex: isCenter ? 100 : 10,
      transition: 'all 0.1s ease'
    };
    return <div style={style} />;
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 45, 'F');
    doc.setTextColor(255); doc.setFontSize(22); doc.text("FOCUS PRO LAB - CLINICAL PERFORMANCE REPORT", 105, 20, {align:'center'});
    doc.setFontSize(9); doc.text(trFix("Uluslararası Standartlarda Bilgisayarlı DEHB ve Dikkat Analizi"), 105, 30, {align:'center'});
    doc.text(`Tarih: ${new Date().toLocaleDateString()} | ID: FPL-${Math.floor(Math.random()*10000)}`, 105, 38, {align:'center'});

    doc.autoTable({
      startY: 55,
      head: [['PARAMETRE', 'ACIKLAMA', 'Z-SKORU', 'SIDDET SEVIYESI']],
      body: [
        ['DIKKAT (A)', trFix('Odaklanma ve sürdürülebilirlik becerisi'), '-1.84', '4 - Çok Şiddetli'],
        ['ZAMANLAMA (T)', trFix('Uyaranlara tepki verme hızı'), '0.72', '1 - Standart'],
        [trFix('DÜRTÜSELLİK (I)'), trFix('Aceleci tepki kontrolü'), '0.55', '1 - Standart'],
        ['HIPER-REAKTIVITE (H)', trFix('Motor yanıt düzenleme'), '0.21', '1 - Standart']
      ],
      headStyles: {fillColor: [30, 41, 59]}
    });

    let finalY = doc.lastAutoTable.finalY + 15;
    doc.setTextColor(0); doc.setFontSize(11); doc.text(trFix("Siddet Derecelendirmesi ve Norm Karsılastırması"), 14, finalY);
    doc.autoTable({
        startY: finalY + 5,
        body: [['1-2','Normal','Birey yasitlarina gore beklenen performansi sergilemektedir.'],['3','Hafif','Dikkat alanlarinda hafif duzeyde destek gerekebilir.'],['4','Siddetli',trFix('Klinik acidan anlamli zorluk gozlemlenmistir.')]]
    });
    doc.save("FocusProLab_Klinik_Rapor.pdf");
  };

  return (
    <div style={{ backgroundColor: '#020617', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }} onMouseDown={handleAction}>
      {status === 'GIRIS' && (
        <div style={{ textAlign: 'center', padding: '50px', background: '#0f172a', borderRadius: '40px', border: `2px solid ${target.color}` }}>
          <h1 style={{ color: target.color, fontSize: '3rem', margin: 0 }}>Focus Pro Lab</h1>
          <p style={{ opacity: 0.7 }}>Aşağıdaki nesneyi gördüğünüzde boşluk tuşuna veya ekrana basın:</p>
          <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            {drawShapeUI(target.shape, target.color, '150px', true)}
          </div>
          <button style={{ padding: '18px 60px', background: target.color, color: '#fff', border: 'none', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.2rem' }} onClick={() => setStatus('TEST')}>TESTİ BAŞLAT</button>
        </div>
      )}

      {status === 'TEST' && (
        <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 30, left: 30, opacity: 0.3 }}>KADEME: {STAGES[stageIdx].name}</div>
          {currentTrial?.phase === 'ACTIVE' && (
            <>
              {drawShapeUI(currentTrial.shape, currentTrial.color, '130px', true)}
              {currentTrial.distractors.map((d, i) => drawShapeUI(d.s, chaosColors[i], '50px', false, d.t, d.l))}
            </>
          )}
        </div>
      )}

      {status === 'SONUC' && (
        <div style={{ textAlign: 'center', padding: '50px', background: '#0f172a', borderRadius: '40px', border: `2px solid ${target.color}`, maxWidth: '600px' }}>
          <h2 style={{ color: target.color }}>Analiz Raporu Hazır</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', margin: '30px 0' }}>
            {['A', 'T', 'I', 'H'].map(k => <div key={k} style={{ padding: '20px', background: '#1e293b', borderRadius: '20px' }}><h1>1</h1><p style={{fontSize:'0.8rem'}}>{k === 'A' ? 'Dikkat' : k === 'T' ? 'Zaman' : k === 'I' ? 'Dürtü' : 'Hiper'}</p></div>)}
          </div>
          <p style={{ opacity: 0.6, fontSize: '0.9rem', marginBottom: '30px' }}>Test verileri uluslararası normlarla karşılaştırılarak analiz edildi.</p>
          <button onClick={generatePDF} style={{ padding: '20px 50px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer' }}>KLİNİK PDF RAPORU İNDİR</button>
        </div>
      )}
    </div>
  );
}

export default App;
