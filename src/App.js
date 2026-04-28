import React, { useState, useEffect, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const styles = {
  page: { backgroundColor: '#0a0f1e', color: '#fff', minHeight: '100vh', fontFamily: "'Segoe UI', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  testArea: { width: '90vw', height: '80vh', backgroundColor: '#000', borderRadius: '20px', border: '2px solid #1e293b', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', touchAction: 'none' },
  centerTarget: { width: '120px', height: '120px', zIndex: 10, position: 'relative' },
  distractor: { position: 'absolute', opacity: 0.8, zIndex: 5 },
  btnPrimary: { padding: '15px 40px', fontSize: '1.2rem', cursor: 'pointer', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold' },
};

function App() {
  const [status, setStatus] = useState('GIRIS');
  const [currentTrial, setCurrentTrial] = useState(null); // { shape, distractors }
  const [testLog, setTestLog] = useState([]);
  const trialCountRef = useRef(0);
  const TOTAL_TRIALS = 40;

  const shapes = [
    { type: 'TARGET', color: '#3b82f6', shape: 'square' },
    { type: 'DIST', color: '#ef4444', shape: 'circle' },
    { type: 'DIST', color: '#10b981', shape: 'triangle' },
    { type: 'DIST', color: '#f59e0b', shape: 'star' },
    { type: 'DIST', color: '#8b5cf6', shape: 'hexagon' }
  ];

  const generateDistractors = () => {
    const count = Math.floor(Math.random() * 4); // 0-3 arası
    const list = [];
    for (let i = 0; i < count; i++) {
      list.push({
        id: i,
        top: Math.random() * 80 + 5 + '%',
        left: Math.random() * 80 + 5 + '%',
        size: Math.random() * 40 + 20 + 'px',
        color: ['#444', '#222', '#333'][Math.floor(Math.random() * 3)],
        type: Math.random() > 0.5 ? 'rect' : 'circle'
      });
    }
    return list;
  };

  const nextTrial = useCallback((count) => {
    if (count >= TOTAL_TRIALS) {
      setStatus('SONUC');
      return;
    }

    const isTarget = Math.random() > 0.6;
    const shape = isTarget ? shapes[0] : shapes[Math.floor(Math.random() * shapes.length)];
    
    // Yeni turda hem simgeyi hem de yan öğeleri belirle
    setCurrentTrial({
      shape,
      distractors: generateDistractors(),
      startTime: Date.now()
    });

    const displayTime = Math.max(500, 1000 - (count * 15));

    setTimeout(() => {
      setCurrentTrial(null); // Her şey aynı anda kaybolur
      setTimeout(() => {
        trialCountRef.current++;
        nextTrial(count + 1);
      }, 400);
    }, displayTime);
  }, []);

  const handleInteraction = useCallback((e) => {
    if (status !== 'TEST' || !currentTrial) return;
    if (e.type === 'keydown' && e.code !== 'Space') return;

    const rt = Date.now() - currentTrial.startTime;
    setTestLog(prev => [...prev, { type: currentTrial.shape.type, rt }]);
    setCurrentTrial(null);
  }, [status, currentTrial]);

  useEffect(() => {
    window.addEventListener('keydown', handleInteraction);
    return () => window.removeEventListener('keydown', handleInteraction);
  }, [handleInteraction]);

  const renderShape = (s, isCenter = false) => {
    const baseStyle = isCenter ? styles.centerTarget : { width: s.size, height: s.size, backgroundColor: s.color, ...styles.distractor, top: s.top, left: s.left };
    const color = isCenter ? s.color : s.color;
    
    if (s.shape === 'circle' || s.type === 'circle') return <div style={{ ...baseStyle, backgroundColor: color, borderRadius: '50%' }} />;
    if (s.shape === 'triangle') return <div style={{ width: 0, height: 0, borderLeft: '60px solid transparent', borderRight: '60px solid transparent', borderBottom: `120px solid ${color}` }} />;
    return <div style={{ ...baseStyle, backgroundColor: color, borderRadius: s.shape === 'square' ? '12%' : '0' }} />;
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const corrects = testLog.filter(l => l.type === 'TARGET');
    const errors = testLog.filter(l => l.type === 'DIST');
    const attention = Math.round((corrects.length / (TOTAL_TRIALS * 0.4)) * 100);
    const avgRt = corrects.length > 0 ? Math.round(corrects.reduce((a,b)=>a+b.rt,0)/corrects.length) : 0;

    doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(20); doc.text("KLINIK DIKKAT ANALIZI (MOXO STANDART)", 105, 25, {align:'center'});

    doc.autoTable({
      startY: 50,
      head: [['INDEKS', 'SKOR', 'NORM', 'DURUM']],
      body: [
        ['DIKKAT (Attention)', `%${attention}`, '%85-100', attention > 80 ? 'Normal' : 'Zorluk'],
        ['ZAMANLAMA (Timing)', `${avgRt} ms`, '350-550ms', avgRt < 500 ? 'Hizli' : 'Yavas'],
        ['DÜRTÜSELLIK (Impulsivity)', errors.length, '0-2', errors.length <= 2 ? 'Iyi' : 'Yuksek'],
      ],
      theme: 'grid', headStyles: { fillColor: [59, 130, 246] }
    });
    doc.save("FocusPro_Rapor.pdf");
  };

  return (
    <div style={styles.page}>
      {status === 'GIRIS' && (
        <div style={{ textAlign: 'center', padding: '40px', background: '#161e2e', borderRadius: '20px' }}>
          <h1 style={{ color: '#3b82f6' }}>FOCUS PRO V4</h1>
          <p>Sadece merkeze çıkan MAVİ KARE'ye odaklanın.</p>
          <div style={{ ...styles.centerTarget, backgroundColor: '#3b82f6', margin: '20px auto', borderRadius: '15%' }}></div>
          <button style={styles.btnPrimary} onClick={() => { setStatus('TEST'); nextTrial(0); }}>TESTI BASLAT</button>
        </div>
      )}

      {status === 'TEST' && (
        <div style={styles.testArea} onMouseDown={handleInteraction} onTouchStart={handleInteraction}>
          {currentTrial && (
            <>
              {/* Dikkat Dağıtıcılar (Distractors) */}
              {currentTrial.distractors.map(d => renderShape(d, false))}
              
              {/* Ana Hedef/Simge (Merkezde) */}
              {renderShape(currentTrial.shape, true)}
            </>
          )}
        </div>
      )}

      {status === 'SONUC' && (
        <div style={{ textAlign: 'center' }}>
          <h2>TEST TAMAMLANDI</h2>
          <button style={styles.btnPrimary} onClick={generatePDF}>PDF RAPORU INDIR</button>
        </div>
      )}
    </div>
  );
}

export default App;
