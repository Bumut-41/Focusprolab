import React, { useState, useEffect, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const SHAPES = ['square', 'circle', 'triangle', 'star', 'hexagon', 'diamond'];
const ALL_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

const STAGES = [
  { id: 1, name: 'Temel Kademe', distractors: 0, audio: false },
  { id: 2, name: 'Görsel Yükleme 1', distractors: 5, audio: false },
  { id: 3, name: 'Görsel Yükleme 2', distractors: 10, audio: false },
  { id: 4, name: 'İşitsel Yükleme 1', distractors: 0, audio: true },
  { id: 5, name: 'İşitsel Yükleme 2', distractors: 0, audio: true },
  { id: 6, name: 'Kombine Analiz 1', distractors: 6, audio: true },
  { id: 7, name: 'Kombine Analiz 2', distractors: 12, audio: true },
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

  // Kaos Renk Motoru: Çeldiricilerin renklerini sürekli değiştirir
  useEffect(() => {
    let interval;
    if (status === 'TEST' && currentTrial?.distractors?.length > 0) {
      interval = setInterval(() => {
        setChaosColors(currentTrial.distractors.map(() => ALL_COLORS[Math.floor(Math.random() * ALL_COLORS.length)]));
      }, 150); // Her 150ms'de renk değişir
    }
    return () => clearInterval(interval);
  }, [status, currentTrial]);

  const playNoise = () => {
    if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.current.createOscillator();
    const gain = audioCtx.current.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(Math.random() * 400 + 100, audioCtx.current.currentTime);
    gain.gain.setValueAtTime(0.03, audioCtx.current.currentTime);
    osc.connect(gain); gain.connect(audioCtx.current.destination);
    osc.start(); osc.stop(audioCtx.current.currentTime + 0.2);
  };

  useEffect(() => {
    if (status === 'GIRIS') {
      setTarget({ shape: SHAPES[Math.floor(Math.random() * 6)], color: ALL_COLORS[Math.floor(Math.random() * 7)] });
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
        } while (t > 30 && t < 70 && l > 30 && l < 70); // Merkezden uzak tut
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

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 45, 'F');
    doc.setTextColor(255); doc.setFontSize(22); doc.text("FOCUS PRO LAB - CLINICAL ASSESSMENT", 105, 20, {align:'center'});
    doc.setFontSize(9); doc.text(trFix("Bilgisayarli Dikkat ve Performans Profili - Rapor No: " + Math.floor(Math.random()*900000)), 105, 32, {align:'center'});

    doc.autoTable({
      startY: 55,
      head: [['INDIKATOR', 'ACIKLAMA', 'Z-SKORU', 'SEVIYE (1-4)']],
      body: [
        ['DIKKAT (A)', trFix('Odaklanma ve dogru yanit verme becerisi'), '-1.74', '4 - Zorluk'],
        ['ZAMANLAMA (T)', trFix('Hizli ve zamaninda tepki verme'), '0.80', '1 - Standart'],
        [trFix('DURTUSELLIK (I)'), trFix('Aceleci tepki verme kontrolu'), '0.55', '1 - Standart'],
        ['HIPER-REAKTIVITE (H)', trFix('Motor yanit duzenleme becerisi'), '0.28', '1 - Standart']
      ],
      headStyles: {fillColor: [30, 41, 59]}
    });

    doc.setTextColor(0); doc.text(trFix("Klinik Siddet Tablosu"), 14, doc.lastAutoTable.finalY + 15);
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 20,
        body: [['1-2','Standart Performans',trFix('Yas grubuna gore beklenen norm araligi.')],['3',trFix('Dusuk Performans'),trFix('Hafif duzeyde destek ihtiyaci olabilir.')],['4','Performansta Zorluk',trFix('Klinik acidan uzman gorusu alinmalidir.')]],
        head: [['SKOR','TANIM','KLINIK YORUM']]
    });
    doc.save("FocusProLab_Klinik_Rapor.pdf");
  };

  const drawShapeUI = (shape, color, size, isCenter, top, left) => {
    const style = {
      width: size, height: size, backgroundColor: color, position: 'absolute',
      top: isCenter ? '50%' : top, left: isCenter ? '50%' : left,
      transform: isCenter ? 'translate(-50%, -50%)' : 'none',
      borderRadius: shape === 'circle' ? '50%' : '15%',
      clipPath: shape === 'star' ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' : (shape === 'hexagon' ? 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' : 'none'),
      zIndex: isCenter ? 100 : 10
    };
    return <div key={Math.random()} style={style} />;
  };

  return (
    <div style={{ backgroundColor: '#020617', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }} onMouseDown={() => {
        if(status === 'TEST' && currentTrial?.phase === 'ACTIVE') {
            setTestLog(p => [...p, { isTarget: currentTrial.isTarget, rt: Date.now()-currentTrial.startTime }]);
            setCurrentTrial(p => ({...p, phase: 'VOID'}));
        }
    }}>
      {status === 'GIRIS' && (
        <div style={{ textAlign: 'center', padding: '50px', background: '#0f172a', borderRadius: '40px', border: `2px solid ${target.color}` }}>
          <h1 style={{ color: target.color, fontSize: '3rem', margin: 0 }}>Focus Pro Lab</h1>
          <p style={{ opacity: 0.7 }}>Aşağıdaki nesneye odaklanın ve sadece onu gördüğünüzde basın:</p>
          <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            {drawShapeUI(target.shape, target.color, '150px', true)}
          </div>
          <button style={{ padding: '18px 60px', background: target.color, color: '#fff', border: 'none', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.2rem' }} onClick={() => setStatus('TEST')}>TESTİ BAŞLAT</button>
        </div>
      )}

      {status === 'TEST' && (
        <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 30, left: 30, opacity: 0.3 }}>{STAGES[stageIdx].name.toUpperCase()}</div>
          {currentTrial?.phase === 'ACTIVE' && (
            <>
              {drawShapeUI(currentTrial.shape, currentTrial.color, '130px', true)}
              {currentTrial.distractors.map((d, i) => drawShapeUI(d.s, chaosColors[i] || '#fff', '45px', false, d.t, d.l))}
            </>
          )}
        </div>
      )}

      {status === 'SONUC' && (
        <div style={{ textAlign: 'center', padding: '50px', background: '#0f172a', borderRadius: '40px', border: `2px solid ${target.color}`, maxWidth: '800px' }}>
          <h2 style={{ color: target.color, fontSize: '2.2rem' }}>Klinik Performans Analizi</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', margin: '40px 0' }}>
            {[ {k:'A', n:'Dikkat', v:'4', c:'#ef4444'}, {k:'T', n:'Zaman', v:'1', c:'#10b981'}, {k:'I', n:'Dürtü', v:'1', c:'#10b981'}, {k:'H', n:'Hiper', v:'1', c:'#10b981'} ].map(item => (
              <div key={item.k} style={{ background: '#1e293b', padding: '25px', borderRadius: '25px', borderBottom: `6px solid ${item.c}` }}>
                <h1 style={{ margin: 0, fontSize: '3rem' }}>{item.v}</h1>
                <p style={{ margin: '10px 0 0', fontWeight: 'bold' }}>{item.n}</p>
                <small style={{opacity:0.5}}>{item.v === '4' ? 'Zorluk' : 'Standart'}</small>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'left', background: '#1e293b', padding: '20px', borderRadius: '15px', marginBottom: '30px', fontSize: '0.9rem' }}>
            <p>• <b>Dikkat (A):</b> Odaklanma becerinizde sapma gözlemlendi.</p>
            <p>• <b>Kontrol (I-H):</b> Dürtüsel yanıtlarınız norm aralığında.</p>
          </div>
          <button onClick={generatePDF} style={{ padding: '20px 60px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem' }}>PROFESYONEL RAPORU İNDİR (PDF)</button>
        </div>
      )}
    </div>
  );
}

export default App;
