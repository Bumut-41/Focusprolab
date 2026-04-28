import React, { useState, useEffect, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const SHAPE_POOL = [
  { id: '1', type: 'SQUARE', color: '#3b82f6', shape: 'square', label: 'Mavi Kare' },
  { id: '2', type: 'CIRCLE', color: '#ef4444', shape: 'circle', label: 'Kırmızı Daire' },
  { id: '3', type: 'TRIANGLE', color: '#10b981', shape: 'triangle', label: 'Yeşil Üçgen' },
  { id: '4', type: 'STAR', color: '#f59e0b', shape: 'star', label: 'Sarı Yıldız' },
  { id: '5', type: 'HEXAGON', color: '#8b5cf6', shape: 'hexagon', label: 'Mor Altıgen' },
  { id: '6', type: 'DIAMOND', color: '#ec4899', shape: 'diamond', label: 'Pembe Elmas' },
  { id: '7', type: 'RECT', color: '#06b6d4', shape: 'rect', label: 'Turkuaz Dikdörtgen' }
];

const trFix = (text) => {
  return text
    .replace(/Ğ/g, 'G').replace(/ğ/g, 'g').replace(/Ü/g, 'U').replace(/ü/g, 'u')
    .replace(/Ş/g, 'S').replace(/ş/g, 's').replace(/İ/g, 'I').replace(/ı/g, 'i')
    .replace(/Ö/g, 'O').replace(/ö/g, 'o').replace(/Ç/g, 'C').replace(/ç/g, 'c');
};

function App() {
  const [status, setStatus] = useState('GIRIS');
  const [target, setTarget] = useState(SHAPE_POOL[0]);
  const [currentTrial, setCurrentTrial] = useState(null);
  const [testLog, setTestLog] = useState([]);
  const trialCountRef = useRef(0);
  const TOTAL_TRIALS = 40;

  useEffect(() => {
    if (status === 'GIRIS') {
      const randomTarget = SHAPE_POOL[Math.floor(Math.random() * SHAPE_POOL.length)];
      setTarget(randomTarget);
      setTestLog([]);
      trialCountRef.current = 0;
    }
  }, [status]);

  const generateDistractors = () => {
    const count = Math.floor(Math.random() * 4) + 2;
    const colors = ['#ff0055', '#00ffcc', '#ffff00', '#ff8800', '#ff00ff', '#ffffff'];
    const list = [];
    for (let i = 0; i < count; i++) {
      let top, left;
      do {
        top = Math.random() * 75 + 10;
        left = Math.random() * 75 + 10;
      } while (top > 30 && top < 70 && left > 30 && left < 70);

      list.push({
        id: i,
        top: top + '%',
        left: left + '%',
        size: Math.random() * 30 + 30 + 'px',
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: ['circle', 'rect', 'triangle'][Math.floor(Math.random() * 3)]
      });
    }
    return list;
  };

  const nextTrial = useCallback((count) => {
    if (count >= TOTAL_TRIALS) {
      setStatus('SONUC');
      return;
    }

    const isTarget = Math.random() > 0.65;
    let selected = isTarget ? target : SHAPE_POOL.filter(s => s.id !== target.id)[Math.floor(Math.random() * (SHAPE_POOL.length - 1))];

    setCurrentTrial({
      shape: selected,
      distractors: generateDistractors(),
      startTime: Date.now()
    });

    const displayTime = Math.max(600, 1000 - (count * 10));

    setTimeout(() => {
      setCurrentTrial(null);
      setTimeout(() => {
        trialCountRef.current++;
        nextTrial(count + 1);
      }, 450);
    }, displayTime);
  }, [target]);

  const handleInteraction = useCallback((e) => {
    if (status !== 'TEST' || !currentTrial) return;
    if (e.type === 'keydown' && e.code !== 'Space') return;

    const rt = Date.now() - currentTrial.startTime;
    const isCorrect = currentTrial.shape.id === target.id;
    setTestLog(prev => [...prev, { type: isCorrect ? 'TARGET' : 'DIST', rt: rt, isCorrect: isCorrect }]);
    setCurrentTrial(null);
  }, [status, currentTrial, target]);

  useEffect(() => {
    window.addEventListener('keydown', handleInteraction);
    return () => window.removeEventListener('keydown', handleInteraction);
  }, [handleInteraction]);

  const renderShape = (s, isCenter = false) => {
    if (!s) return null;
    const size = isCenter ? '130px' : s.size;
    const style = {
      width: size, height: size, backgroundColor: s.color,
      position: isCenter ? 'relative' : 'absolute',
      top: isCenter ? 'auto' : s.top, left: isCenter ? 'auto' : s.left,
      zIndex: isCenter ? 25 : 10
    };

    if (s.shape === 'circle') return <div style={{ ...style, borderRadius: '50%' }} />;
    if (s.shape === 'triangle') return <div style={{ width: 0, height: 0, borderLeft: `${parseInt(size)/2}px solid transparent`, borderRight: `${parseInt(size)/2}px solid transparent`, borderBottom: `${size} solid ${s.color}`, position: style.position, top: style.top, left: style.left, zIndex: style.zIndex }} />;
    if (s.shape === 'star') return <div style={{ ...style, clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }} />;
    if (s.shape === 'hexagon') return <div style={{ ...style, clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' }} />;
    if (s.shape === 'diamond') return <div style={{ ...style, clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />;
    return <div style={{ ...style, borderRadius: s.shape === 'square' ? '18%' : '0' }} />;
  };

  const getCalculatedData = () => {
    const corrects = testLog.filter(l => l.type === 'TARGET');
    const errors = testLog.filter(l => l.type === 'DIST');
    const totalPossibleTargets = Math.max(1, testLog.length * 0.35); // Tahmini hedef sayısı
    const attention = Math.round((corrects.length / totalPossibleTargets) * 100);
    const avgRt = corrects.length > 0 ? Math.round(corrects.reduce((a,b)=>a+b.rt,0)/corrects.length) : 0;
    return { attention, avgRt, impulsivity: errors.length };
  };

  const generatePDF = () => {
    const data = getCalculatedData();
    const doc = new jsPDF();
    doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(22);
    doc.text("FOCUS PRO LAB - PERFORMANS RAPORU", 105, 25, {align:'center'});

    doc.autoTable({
      startY: 55,
      head: [[trFix('PARAMETRE'), 'SKOR', 'NORM ARALIGI', 'DURUM']],
      body: [
        [trFix('DIKKAT'), `%${Math.min(data.attention, 100)}`, '%85 - %100', data.attention >= 85 ? 'Standart' : 'Dusuk'],
        [trFix('ZAMANLAMA'), `${data.avgRt} ms`, '350 - 550 ms', (data.avgRt > 350 && data.avgRt < 550) ? 'Normal' : 'Sapma'],
        [trFix('DURTUSELLIK'), data.impulsivity, '0 - 2', data.impulsivity <= 2 ? 'Iyi' : 'Yuksek'],
      ],
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.setFontSize(10); doc.setTextColor(100);
    doc.text(trFix(`Test Hedefi: ${target.label} | Veri Logu: ${testLog.length} kayit`), 14, doc.lastAutoTable.finalY + 10);
    doc.save(`FocusPro_Rapor_${Date.now()}.pdf`);
  };

  const resultData = getCalculatedData();

  return (
    <div style={{ backgroundColor: '#050a15', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      {status === 'GIRIS' && (
        <div style={{ textAlign: 'center', padding: '50px', border: `2px solid ${target.color}`, borderRadius: '35px', background: '#0f172a', maxWidth: '600px' }}>
          <h1 style={{ color: target.color, fontSize: '3.5rem', margin: '0 0 10px 0' }}>Focus Pro Lab</h1>
          <p style={{ fontSize: '1.2rem', opacity: 0.8 }}>Lütfen sadece merkeze çıkan <b style={{color: target.color}}>{target.label.toUpperCase()}</b> nesnesine tepki veriniz.</p>
          <div style={{ margin: '40px 0', display: 'flex', justifyContent: 'center' }}>{renderShape(target, true)}</div>
          <button style={{ padding: '18px 50px', background: target.color, color: '#fff', border: 'none', borderRadius: '15px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }} onClick={() => { setStatus('TEST'); nextTrial(0); }}>TESTE BAŞLA</button>
        </div>
      )}

      {status === 'TEST' && (
        <div style={{ width: '96vw', height: '92vh', backgroundColor: '#000', borderRadius: '25px', border: `1px solid ${target.color}33`, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }} onMouseDown={handleInteraction} onTouchStart={handleInteraction}>
          {currentTrial && (
            <>
              {currentTrial.distractors.map(d => renderShape(d, false))}
              {renderShape(currentTrial.shape, true)}
            </>
          )}
        </div>
      )}

      {status === 'SONUC' && (
        <div style={{ textAlign: 'center', background: '#161e2e', padding: '50px', borderRadius: '30px', border: `2px solid ${target.color}` }}>
          <h1 style={{ color: target.color }}>Test Tamamlandı</h1>
          <div style={{ display: 'flex', gap: '20px', margin: '30px 0' }}>
            <div style={{ padding: '25px', background: '#1e293b', borderRadius: '20px', minWidth: '120px' }}>
              <h2 style={{ color: target.color, margin: 0 }}>%{Math.min(100, resultData.attention)}</h2>
              <small>Dikkat</small>
            </div>
            <div style={{ padding: '25px', background: '#1e293b', borderRadius: '20px', minWidth: '120px' }}>
              <h2 style={{ color: target.color, margin: 0 }}>{resultData.avgRt}ms</h2>
              <small>Hız</small>
            </div>
            <div style={{ padding: '25px', background: '#1e293b', borderRadius: '20px', minWidth: '120px' }}>
              <h2 style={{ color: target.color, margin: 0 }}>{resultData.impulsivity}</h2>
              <small>Hata</small>
            </div>
          </div>
          <button style={{ padding: '15px 40px', background: target.color, border: 'none', color: '#fff', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }} onClick={generatePDF}>PROFESYONEL PDF RAPORU İNDİR</button>
          <button style={{ background: 'transparent', border: `1px solid ${target.color}`, color: target.color, marginLeft: '10px', padding: '15px 30px', borderRadius: '12px', cursor: 'pointer' }} onClick={() => setStatus('GIRIS')}>YENİDEN BAŞLA</button>
        </div>
      )}
    </div>
  );
}

export default App;
