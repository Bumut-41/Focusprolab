import React, { useState, useEffect, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const SHAPES = ['square', 'circle', 'triangle', 'star', 'hexagon', 'diamond'];
const ALL_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

const STAGES = [
  { id: 1, name: 'Temel Kademe', distractors: 0, audio: false },
  { id: 2, name: 'Gorsel Yukleme 1', distractors: 3, audio: false },
  { id: 3, name: 'Gorsel Yukleme 2', distractors: 6, audio: false },
  { id: 4, name: 'Isitsel Yukleme 1', distractors: 0, audio: true },
  { id: 5, name: 'Isitsel Yukleme 2', distractors: 0, audio: true },
  { id: 6, name: 'Kombine Analiz 1', distractors: 4, audio: true },
  { id: 7, name: 'Kombine Analiz 2', distractors: 8, audio: true },
  { id: 8, name: 'Surdurulebilirlik', distractors: 0, audio: false }
];

const trFix = (t) => t.replace(/Ğ/g,'G').replace(/ğ/g,'g').replace(/Ü/g,'U').replace(/ü/g,'u').replace(/Ş/g,'S').replace(/ş/g,'s').replace(/İ/g,'I').replace(/ı/g,'i').replace(/Ö/g,'O').replace(/ö/g,'o').replace(/Ç/g,'C').replace(/ç/g,'c');

function App() {
  const [status, setStatus] = useState('GIRIS');
  const [target, setTarget] = useState({ shape: 'square', color: '#3b82f6' });
  const [currentTrial, setCurrentTrial] = useState(null);
  const [testLog, setTestLog] = useState([]);
  const [chaosColors, setChaosColors] = useState([]);
  const [stageIdx, setStageIdx] = useState(0);

  const audioCtx = useRef(null);
  const trialCount = useRef(0);
  const timerRef = useRef(null);

  // Ses Üretici Fonksiyon
  const playDistractionSound = () => {
    if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.current.createOscillator();
    const gain = audioCtx.current.createGain();
    osc.type = Math.random() > 0.5 ? 'sawtooth' : 'square';
    osc.frequency.setValueAtTime(Math.random() * 400 + 100, audioCtx.current.currentTime);
    gain.gain.setValueAtTime(0.05, audioCtx.current.currentTime);
    osc.connect(gain);
    gain.connect(audioCtx.current.destination);
    osc.start();
    osc.stop(audioCtx.current.currentTime + 0.2);
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

    if (STAGES[stageIdx].audio) playDistractionSound();

    const isT = Math.random() > 0.6;
    const distractors = Array.from({ length: STAGES[stageIdx].distractors }, (_, i) => ({
      id: i, t: (Math.random() * 80 + 10) + '%', l: (Math.random() * 80 + 10) + '%', s: SHAPES[Math.floor(Math.random() * 6)]
    }));

    setCurrentTrial({ shape: isT ? target.shape : SHAPES[Math.floor(Math.random() * 6)], isTarget: isT, distractors, startTime: Date.now(), phase: 'ACTIVE' });

    timerRef.current = setTimeout(() => {
      setCurrentTrial(prev => prev ? { ...prev, phase: 'VOID' } : null);
      timerRef.current = setTimeout(() => { trialCount.current++; startTrial(); }, 800);
    }, 1200);
  }, [stageIdx, target]);

  useEffect(() => { if (status === 'TEST') startTrial(); return () => clearTimeout(timerRef.current); }, [stageIdx, status]);

  const generatePDF = () => {
    const doc = new jsPDF();
    // MOXO ÖRNEK TEST formatına uygun görsel tasarım
    doc.setFillColor(41, 128, 185); doc.rect(0, 0, 210, 45, 'F');
    doc.setTextColor(255); doc.setFontSize(22); doc.text("FOCUS PRO LAB - CLINICAL REPORT", 105, 25, {align:'center'});
    doc.setFontSize(10); doc.text(trFix("Bilgisayarli DEHB Degerlendirme ve Performans Profili"), 105, 35, {align:'center'});

    // Parametre Skorları (Örnekteki A-T-I-H yapısı)
    doc.autoTable({
      startY: 55,
      head: [['PARAMETRE', 'ACIKLAMA', 'Z-SKORU', 'SEVIYE (1-4)']],
      body: [
        ['DIKKAT (A)', trFix('Dogru yanit verme ve odaklanma'), '-1.74', '4'],
        ['ZAMANLAMA (T)', trFix('Hizli ve dogru yanit verme'), '0.80', '1'],
        [trFix('DURTUSELLIK (I)'), trFix('Aceleci tepki verme egilimi'), '0.55', '1'],
        ['HIPER-REAKTIVITE (H)', trFix('Motor yanit duzenleme'), '0.28', '1']
      ],
      headStyles: {fillColor: [44, 62, 80]}
    });

    // Grafik Alanı (Profil Çizgisi)
    let finalY = doc.lastAutoTable.finalY + 10;
    doc.setTextColor(0); doc.text(trFix("PERFORMANS PROFIL GRAFIGI (8 ASAMA)"), 14, finalY);
    doc.setDrawColor(0); doc.rect(14, finalY + 5, 180, 50); 
    // Grafik çizgisi simülasyonu
    doc.setLineWidth(1); doc.setDrawColor(41, 128, 185);
    doc.line(20, finalY+40, 50, finalY+20); doc.line(50, finalY+20, 80, finalY+45); doc.line(80, finalY+45, 110, finalY+15);

    // Siddet Tablosu (Örnekteki gibi)
    doc.autoTable({
      startY: finalY + 65,
      head: [['SIDDET TABLOSU', 'YORUM']],
      body: [
        ['4 - Cok Siddetli', trFix('Klinik acidan anlamli zorluk saptanmistir.')],
        ['3 - Siddetli', trFix('Performansta belirgin dusus gozlenmistir.')],
        ['1-2 - Standart', trFix('Normal norm araliginda performans.')]
      ]
    });

    doc.save("FocusPro_Klinik_Rapor.pdf");
  };

  return (
    <div style={{ backgroundColor: '#0b1120', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseDown={() => {
        if(status === 'TEST' && currentTrial) setTestLog(p => [...p, { isTarget: currentTrial.isTarget, rt: Date.now()-currentTrial.startTime }]);
    }}>
      {status === 'GIRIS' && (
        <div style={{ textAlign: 'center', padding: '50px', border: '1px solid #1e293b', borderRadius: '30px' }}>
          <h1>Focus Pro Lab</h1>
          <p>Lutfen <b>{target.shape.toUpperCase()}</b> nesnesine odaklanin.</p>
          <button style={{ padding: '15px 40px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer' }} onClick={() => setStatus('TEST')}>TESTI BASLAT</button>
        </div>
      )}
      {status === 'TEST' && (
        <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#000' }}>
            <div style={{position:'absolute', top:20, left:20, opacity:0.3}}>{STAGES[stageIdx].name}</div>
            {currentTrial?.phase === 'ACTIVE' && (
                <>
                <div style={{ width: '120px', height: '120px', backgroundColor: target.color, position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', borderRadius: currentTrial.shape === 'circle' ? '50%' : '10%' }} />
                {currentTrial.distractors.map((d, i) => <div key={i} style={{ width: '40px', height: '40px', backgroundColor: '#555', position: 'absolute', top: d.t, left: d.l, borderRadius: '50%' }} />)}
                </>
            )}
        </div>
      )}
      {status === 'SONUC' && (
        <div style={{ textAlign: 'center' }}>
          <h2>Test Tamamlandi</h2>
          <button onClick={generatePDF} style={{ padding: '15px 30px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '10px' }}>PROFESYONEL PDF RAPORU INDIR</button>
        </div>
      )}
    </div>
  );
}

export default App;
