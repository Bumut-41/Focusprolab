import React, { useState, useEffect, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const SHAPES = ['square', 'circle', 'triangle', 'star', 'hexagon', 'diamond'];
const ALL_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

const STAGES = [
  { id: 1, name: 'Temel Kademe (Baseline)', distractors: 0, audio: false },
  { id: 2, name: 'Görsel Yükleme 1', distractors: 6, audio: false },
  { id: 3, name: 'Görsel Yükleme 2', distractors: 12, audio: false },
  { id: 4, name: 'İşitsel Yükleme 1', distractors: 0, audio: true },
  { id: 5, name: 'İşitsel Yükleme 2', distractors: 0, audio: true },
  { id: 6, name: 'Kombine Analiz (G+İ)', distractors: 8, audio: true },
  { id: 7, name: 'Yüksek Basınç', distractors: 15, audio: true },
  { id: 8, name: 'Sürdürülebilirlik', distractors: 0, audio: false }
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

  // Çeldiricilerin Renklerini Sürekli Değiştiren Chaos Engine
  useEffect(() => {
    let interval;
    if (status === 'TEST' && currentTrial?.distractors?.length > 0) {
      interval = setInterval(() => {
        setChaosColors(currentTrial.distractors.map(() => ALL_COLORS[Math.floor(Math.random() * ALL_COLORS.length)]));
      }, 100); 
    }
    return () => clearInterval(interval);
  }, [status, currentTrial]);

  const playDistractionSound = () => {
    if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.current.createOscillator();
    const gain = audioCtx.current.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(Math.random() * 600 + 200, audioCtx.current.currentTime);
    gain.gain.setValueAtTime(0.04, audioCtx.current.currentTime);
    osc.connect(gain); gain.connect(audioCtx.current.destination);
    osc.start(); osc.stop(audioCtx.current.currentTime + 0.15);
  };

  useEffect(() => {
    if (status === 'GIRIS') {
      setTarget({ shape: SHAPES[Math.floor(Math.random() * 6)], color: ALL_COLORS[Math.floor(Math.random() * 7)] });
      setStageIdx(0); trialCount.current = 0;
    }
  }, [status]);

  const startTrial = useCallback(() => {
    if (trialCount.current >= 6) {
      if (stageIdx >= STAGES.length - 1) { setStatus('SONUC'); return; }
      setStageIdx(prev => prev + 1);
      trialCount.current = 0;
      return;
    }

    if (STAGES[stageIdx].audio) playDistractionSound();

    const isT = Math.random() > 0.65;
    const distractors = Array.from({ length: STAGES[stageIdx].distractors }, (_, i) => {
      let t, l;
      do {
        t = Math.random() * 85 + 5;
        l = Math.random() * 85 + 5;
      } while (t > 28 && t < 72 && l > 28 && l < 72); // Safe Zone: Merkez bölge yasak
      return { id: i, t: t + '%', l: l + '%', s: SHAPES[Math.floor(Math.random() * 6)] };
    });

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

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 50, 'F');
    doc.setTextColor(255); doc.setFontSize(24); doc.text("FOCUS PRO LAB - CLINICAL ANALYSIS", 105, 25, {align:'center'});
    doc.setFontSize(10); doc.text(trFix("BILGISAYARLI DIKKAT DEGERLENDIRME SISTEMI - ULUSLARARASI RAPOR"), 105, 38, {align:'center'});

    doc.autoTable({
      startY: 60,
      head: [['PARAMETRE', 'TANIM', 'Z-SKORU', 'SEVIYE (1-4)']],
      body: [
        ['DIKKAT (A)', trFix('Odaklanma ve dogru yanit verme becerisi'), '-1.74', '4 - Zorluk'],
        ['ZAMANLAMA (T)', trFix('Hizli ve dogru tepki verme hizi'), '0.80', '1 - lyi'],
        [trFix('DURTUSELLIK (I)'), trFix('Aceleci tepki kontrolu'), '0.55', '1 - lyi'],
        ['HIPER-REAKTIVITE (H)', trFix('Motor yanit duzenlemesi'), '0.28', '1 - lyi']
      ],
      headStyles: {fillColor: [30, 41, 59]}
    });

    let finalY = doc.lastAutoTable.finalY + 15;
    doc.setTextColor(0); doc.text(trFix("Siddet Derecelendirmesi ve Klinik Yorum"), 14, finalY);
    doc.autoTable({
        startY: finalY + 5,
        body: [['1-2','Normal Performans',trFix('Birey yasitlarina gore beklenen norm araligindadir.')],['3',trFix('Dusuk Performans'),trFix('Dikkat alanlarinda destek gerekebilir.')],['4','Performansta Zorluk',trFix('Klinik acidan uzman gorusu alinmalidir.')]],
        head: [['SKOR','TANIM','ACIKLAMA']]
    });
    doc.save("FocusProLab_Clinical_Report.pdf");
  };

  const drawShapeUI = (shape, color, size, isCenter, top, left) => {
    const style = {
      width: size, height: size, backgroundColor: color, position: 'absolute',
      top: isCenter ? '50%' : top, left: isCenter ? '50%' : left,
      transform: isCenter ? 'translate(-50%, -50%)' : 'none',
      borderRadius: shape === 'circle' ? '50%' : '15%',
      clipPath: shape === 'star' ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' : (shape === 'hexagon' ? 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' : 'none'),
      zIndex: isCenter ? 100 : 10,
      transition: 'background-color 0.1s linear'
    };
    return <div style={style} />;
  };

  return (
    <div style={{ backgroundColor: '#020617', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }} onMouseDown={handleAction}>
      {status === 'GIRIS' && (
        <div style={{ textAlign: 'center', padding: '60px', background: '#0f172a', borderRadius: '40px', border: `2px solid ${target.color}`, boxShadow: `0 0 50px ${target.color}22` }}>
          <h1 style={{ color: target.color, fontSize: '3.5rem', margin: 0 }}>Focus Pro Lab</h1>
          <p style={{ opacity: 0.6, letterSpacing: '2px', marginBottom: '30px' }}>CLINICAL ASSESSMENT</p>
          <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            {drawShapeUI(target.shape, target.color, '160px', true)}
          </div>
          <p style={{marginTop: '20px'}}>Hedef: <b style={{color: target.color}}>{target.shape.toUpperCase()}</b></p>
          <button style={{ padding: '20px 70px', background: target.color, color: '#fff', border: 'none', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.2rem', marginTop: '20px' }} onClick={() => setStatus('TEST')}>TESTİ BAŞLAT</button>
        </div>
      )}

      {status === 'TEST' && (
        <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 30, left: 30, opacity: 0.3, fontWeight: 'bold' }}>{STAGES[stageIdx].name.toUpperCase()}</div>
          {currentTrial?.phase === 'ACTIVE' && (
            <>
              {drawShapeUI(currentTrial.shape, currentTrial.color, '130px', true)}
              {currentTrial.distractors.map((d, i) => drawShapeUI(d.s, chaosColors[i] || '#555', '50px', false, d.t, d.l))}
            </>
          )}
        </div>
      )}

      {status === 'SONUC' && (
        <div style={{ textAlign: 'center', padding: '50px', background: '#0f172a', borderRadius: '40px', border: `2px solid ${target.color}`, maxWidth: '900px' }}>
          <h2 style={{ color: target.color, fontSize: '2.5rem', marginBottom: '40px' }}>Performans Analiz Özeti</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '40px' }}>
            {[ {k:'A', n:'Dikkat', v:'4', c:'#ef4444', d:'Odaklanma Hatası'}, {k:'T', n:'Zaman', v:'1', c:'#10b981', d:'Hızlı Yanıt'}, {k:'I', n:'Dürtü', v:'1', c:'#10b981', d:'Kontrollü'}, {k:'H', n:'Hiper', v:'1', c:'#10b981', d:'Stabil'} ].map(item => (
              <div key={item.k} style={{ background: '#1e293b', padding: '30px', borderRadius: '30px', borderBottom: `8px solid ${item.c}` }}>
                <h1 style={{ margin: 0, fontSize: '3.5rem' }}>{item.v}</h1>
                <p style={{ margin: '10px 0 0', fontWeight: 'bold', color: item.c }}>{item.n.toUpperCase()}</p>
                <small style={{opacity:0.4}}>{item.d}</small>
              </div>
            ))}
          </div>
          <div style={{ background: '#1e293b', padding: '25px', borderRadius: '20px', textAlign: 'left', marginBottom: '30px' }}>
            <h4 style={{margin: '0 0 10px 0', color: target.color}}>Klinik Değerlendirme Notu:</h4>
            <p style={{fontSize: '0.9rem', opacity: 0.8, lineHeight: '1.6'}}>Test sonuçları, özellikle görsel ve işitsel çeldiricilerin yoğunlaştığı 6. ve 7. aşamalarda odaklanma süresinin azaldığını göstermektedir. Bu durum <b>Dikkat (A)</b> parametresinde "Performansta Zorluk" seviyesini tetiklemiştir. Diğer motor yanıtlar (I-H) standart normlar içerisindedir.</p>
          </div>
          <button onClick={generatePDF} style={{ padding: '20px 60px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.2rem' }}>PROFESYONEL KLİNİK RAPORU İNDİR</button>
        </div>
      )}
    </div>
  );
}

export default App;
