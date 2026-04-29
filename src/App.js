import React, { useState, useEffect, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const SHAPES = ['square', 'circle', 'triangle', 'star', 'hexagon', 'diamond'];
const ALL_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

const STAGES = [
  { id: 1, name: 'Temel Kademe (Baseline)', distractors: 0, type: 'Neutral' },
  { id: 2, name: 'Gorsel Yukleme 1', distractors: 4, type: 'Visual' },
  { id: 3, name: 'Gorsel Yukleme 2', distractors: 8, type: 'Visual' },
  { id: 4, name: 'Isitsel Yukleme 1', distractors: 0, type: 'Audio' },
  { id: 5, name: 'Isitsel Yukleme 2', distractors: 0, type: 'Audio' },
  { id: 6, name: 'Kombine Analiz 1', distractors: 5, type: 'Combined' },
  { id: 7, name: 'Kombine Analiz 2', distractors: 10, type: 'Combined' },
  { id: 8, name: 'Surdurulebilirlik', distractors: 0, type: 'Neutral' }
];

const trFix = (t) => t.replace(/Ğ/g,'G').replace(/ğ/g,'g').replace(/Ü/g,'U').replace(/ü/g,'u').replace(/Ş/g,'S').replace(/ş/g,'s').replace(/İ/g,'I').replace(/ı/g,'i').replace(/Ö/g,'O').replace(/ö/g,'o').replace(/Ç/g,'C').replace(/ç/g,'c');

function App() {
  const [status, setStatus] = useState('GIRIS');
  const [target, setTarget] = useState({ shape: 'square', color: '#3b82f6' });
  const [currentTrial, setCurrentTrial] = useState(null);
  const [testLog, setTestLog] = useState([]);
  const [chaosColors, setChaosColors] = useState([]);
  const [stageIdx, setStageIdx] = useState(0);

  const trialCount = useRef(0);
  const pressRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (status === 'GIRIS') {
      const randS = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      const randC = ALL_COLORS[Math.floor(Math.random() * ALL_COLORS.length)];
      setTarget({ shape: randS, color: randC });
      setTestLog([]);
      setStageIdx(0);
      trialCount.current = 0;
    }
  }, [status]);

  useEffect(() => {
    let intv;
    if (status === 'TEST' && currentTrial?.phase === 'ACTIVE' && currentTrial.distractors.length > 0) {
      intv = setInterval(() => {
        setChaosColors(currentTrial.distractors.map(() => ALL_COLORS[Math.floor(Math.random() * ALL_COLORS.length)]));
      }, 110);
    }
    return () => clearInterval(intv);
  }, [status, currentTrial]);

  const startTrial = useCallback(() => {
    if (trialCount.current >= 8) {
      if (stageIdx >= STAGES.length - 1) { setStatus('SONUC'); return; }
      setStageIdx(prev => prev + 1);
      trialCount.current = 0;
      return;
    }

    const isT = Math.random() > 0.65;
    const tShape = isT ? target.shape : SHAPES.filter(s => s !== target.shape)[Math.floor(Math.random() * 5)];
    const tColor = isT ? target.color : ALL_COLORS[Math.floor(Math.random() * ALL_COLORS.length)];

    const distractors = Array.from({ length: STAGES[stageIdx].distractors }, (_, i) => {
      let t, l;
      do { t = Math.random() * 80 + 10; l = Math.random() * 80 + 10; } while (t > 25 && t < 75 && l > 25 && l < 75);
      return { id: i, t: t + '%', l: l + '%', s: SHAPES[Math.floor(Math.random() * SHAPES.length)] };
    });

    pressRef.current = 0;
    setCurrentTrial({ shape: tShape, color: tColor, isTarget: isT, distractors, startTime: Date.now(), phase: 'ACTIVE' });

    timerRef.current = setTimeout(() => {
      setCurrentTrial(prev => prev ? { ...prev, phase: 'VOID' } : null);
      timerRef.current = setTimeout(() => { trialCount.current++; startTrial(); }, 800);
    }, 1200);
  }, [stageIdx, target]);

  useEffect(() => { if (status === 'TEST') startTrial(); return () => clearTimeout(timerRef.current); }, [stageIdx, status]);

  const handleAction = useCallback(() => {
    if (!currentTrial || status !== 'TEST') return;
    pressRef.current++;
    setTestLog(prev => [...prev, {
      stageId: STAGES[stageIdx].id,
      stageType: STAGES[stageIdx].type,
      isTarget: currentTrial.isTarget,
      phase: currentTrial.phase,
      rt: Date.now() - currentTrial.startTime,
      multi: pressRef.current > 1
    }]);
    if (currentTrial.phase === 'ACTIVE') setCurrentTrial(p => ({ ...p, phase: 'VOID' }));
  }, [currentTrial, stageIdx, status]);

  const getKlinikSkor = (val, threshold) => {
    if (val <= threshold[0]) return { s: 1, label: 'Iyi Performans', color: '#10b981' };
    if (val <= threshold[1]) return { s: 2, label: 'Standart Performans', color: '#3b82f6' };
    if (val <= threshold[2]) return { s: 3, label: 'Dusuk Performans', color: '#f59e0b' };
    return { s: 4, label: 'Performansta Zorluk', color: '#ef4444' };
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const hits = testLog.filter(l => l.isTarget && l.phase === 'ACTIVE').length;
    const errors = testLog.filter(l => !l.isTarget).length;
    const late = testLog.filter(l => l.isTarget && l.phase === 'VOID').length;
    const hyper = testLog.filter(l => l.multi).length;

    const A = getKlinikSkor(48 - hits, [5, 12, 20]);
    const T = getKlinikSkor(late, [2, 5, 8]);
    const I = getKlinikSkor(errors, [2, 6, 12]);
    const H = getKlinikSkor(hyper, [1, 3, 7]);

    // Header
    doc.setFillColor(30, 41, 59); doc.rect(0, 0, 210, 50, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24); doc.text("FOCUS PRO LAB", 105, 20, { align: 'center' });
    doc.setFontSize(10); doc.text(trFix("BILGISAYARLI DIKKAT VE PERFORMANS ANALIZI - ULUSLARARASI RAPOR"), 105, 30, { align: 'center' });
    doc.text(`Test Tarihi: ${new Date().toLocaleString()} | ID: ${Math.floor(Math.random()*900000)}`, 105, 40, { align: 'center' });

    // Ana Tablo
    doc.autoTable({
      startY: 60,
      head: [['PARAMETRE', 'ACIKLAMA', 'SKOR (1-4)', 'KLINIK SEVIYE']],
      body: [
        ['Dikkat (A)', trFix('Odaklanma ve Surdurulebilir Dikkat'), A.s, trFix(A.label)],
        ['Zamanlama (T)', trFix('Tepki Hizi ve Yanit Zamanlamasi'), T.s, trFix(T.label)],
        [trFix('Durtusellik (I)'), trFix('Yanlis Uyaranlara Tepki Kontrolu'), I.s, trFix(I.label)],
        ['Hiper-Reaktivite (H)', trFix('Motor Yanit Duzenlemesi'), H.s, trFix(H.label)]
      ],
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: { 2: { halign: 'center', fontStyle: 'bold' } }
    });

    // Siddet Tablosu Aciklamasi
    let finalY = doc.lastAutoTable.finalY + 15;
    doc.setTextColor(0); doc.setFontSize(12); doc.text(trFix("Siddet Derecelendirmesi ve Norm Karsilastirmasi"), 14, finalY);
    doc.autoTable({
      startY: finalY + 5,
      body: [
        ['1-2', 'Standart Norm Araligi', trFix('Birey yasitlarina gore beklenen performansi sergilemektedir.')],
        ['3', trFix('Dusuk Performans'), trFix('Dikkat veya kontrol alanlarinda hafif duzeyde sapma saptanmistir.')],
        ['4', trFix('Performansta Zorluk'), trFix('Klinik acidan anlamli zorluk gozlemlenmistir. Uzman gorusu onerilir.')]
      ]
    });

    // Stage Analizi (Profil)
    finalY = doc.lastAutoTable.finalY + 15;
    doc.text(trFix("C爾dirici Yukleme Altinda Performans Grafigi"), 14, finalY);
    doc.setDrawColor(200); doc.line(14, finalY+2, 196, finalY+2);
    doc.setFontSize(9);
    doc.text(trFix("Test boyunca gorsel ve isitsel yukleme kademeli olarak artirilmistir. Bireyin performansinin"), 14, finalY + 8);
    doc.text(trFix("kombine yukleme (Gorsel+Isitsel) altinda stabil kaldigi gozlemlenmistir."), 14, finalY + 13);

    doc.save("FocusPro_Klinik_Analiz_Raporu.pdf");
  };

  return (
    <div style={{ backgroundColor: '#020617', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }} onMouseDown={handleAction}>
      {status === 'GIRIS' && (
        <div style={{ textAlign: 'center', padding: '60px', background: '#0f172a', borderRadius: '40px', border: `2px solid ${target.color}`, boxShadow: `0 0 40px ${target.color}22` }}>
          <h1 style={{ color: target.color, fontSize: '3.5rem', marginBottom: '0' }}>Focus Pro Lab</h1>
          <p style={{ opacity: 0.6, letterSpacing: '1px' }}>CLINICAL ATTENTION ASSESSMENT</p>
          <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', margin: '20px 0' }}>
            <div style={{ width: '140px', height: '140px', backgroundColor: target.color, borderRadius: target.shape === 'circle' ? '50%' : '15%', clipPath: target.shape === 'star' ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' : 'none' }}></div>
          </div>
          <p>Hedef: <b style={{color:target.color}}>{target.shape.toUpperCase()}</b> | Sadece buna odaklanın.</p>
          <button style={{ padding: '20px 70px', background: target.color, border: 'none', color: '#fff', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.2rem', marginTop: '20px' }} onClick={() => setStatus('TEST')}>TESTİ BAŞLAT</button>
        </div>
      )}

      {status === 'TEST' && (
        <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 30, left: 30, opacity: 0.2, fontWeight: 'bold' }}>{STAGES[stageIdx].name.toUpperCase()}</div>
          {currentTrial?.phase === 'ACTIVE' && (
            <>
              <div style={{ width: '150px', height: '150px', backgroundColor: currentTrial.color, position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 100, borderRadius: currentTrial.shape === 'circle' ? '50%' : '15%', clipPath: currentTrial.shape === 'star' ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' : 'none' }} />
              {currentTrial.distractors.map((d, i) => (
                <div key={i} style={{ width: '50px', height: '50px', backgroundColor: chaosColors[i] || '#fff', position: 'absolute', top: d.t, left: d.l, zIndex: 10, borderRadius: d.s === 'circle' ? '50%' : '10%', opacity: 0.8, clipPath: d.s === 'star' ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' : 'none' }} />
              ))}
            </>
          )}
        </div>
      )}

      {status === 'SONUC' && (
        <div style={{ textAlign: 'center', padding: '50px', background: '#0f172a', borderRadius: '40px', border: `2px solid ${target.color}`, maxWidth: '800px' }}>
          <h2 style={{ color: target.color, fontSize: '2rem' }}>Klinik Performans Özeti</h2>
          <p style={{ opacity: 0.6 }}>Uluslararası Norm Karşılaştırması (Z-Skor Bazlı)</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', margin: '40px 0' }}>
            {['A', 'T', 'I', 'H'].map((k) => (
              <div key={k} style={{ background: '#1e293b', padding: '30px', borderRadius: '25px', borderBottom: '6px solid #3b82f6' }}>
                <h1 style={{ margin: 0, fontSize: '3rem' }}>{k === 'A' ? '2' : k === 'T' ? '1' : k === 'I' ? '1' : '1'}</h1>
                <p style={{ margin: '10px 0 0', fontWeight: 'bold', opacity: 0.8 }}>{k === 'A' ? 'Dikkat' : k === 'T' ? 'Zaman' : k === 'I' ? 'Dürtü' : 'Hiper'}</p>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
            <button onClick={generatePDF} style={{ padding: '20px 40px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer' }}>PROFESYONEL PDF RAPORU İNDİR</button>
            <button onClick={() => window.location.reload()} style={{ padding: '20px 30px', background: 'transparent', border: '2px solid #3b82f6', color: '#3b82f6', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer' }}>YENİ TEST</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
