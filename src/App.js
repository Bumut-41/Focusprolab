import React, { useState, useEffect, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Nesne havuzu ve her nesneye özel renk temaları
const SHAPE_POOL = [
  { id: '1', type: 'SQUARE', color: '#3b82f6', shape: 'square', label: 'Mavi Kare' },
  { id: '2', type: 'CIRCLE', color: '#ef4444', shape: 'circle', label: 'Kırmızı Daire' },
  { id: '3', type: 'TRIANGLE', color: '#10b981', shape: 'triangle', label: 'Yeşil Üçgen' },
  { id: '4', type: 'STAR', color: '#f59e0b', shape: 'star', label: 'Altın Yıldız' },
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

  // Dinamik Stiller (Seçilen hedefin rengine göre değişir)
  const themeStyles = {
    page: { backgroundColor: '#0a0f1e', color: '#fff', minHeight: '100vh', fontFamily: "'Segoe UI', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    testArea: { width: '90vw', height: '80vh', backgroundColor: '#000', borderRadius: '20px', border: `2px solid ${target.color}33`, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    centerTarget: { width: '120px', height: '120px', zIndex: 10 },
    btnPrimary: { padding: '15px 40px', fontSize: '1.2rem', cursor: 'pointer', background: target.color, color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', boxShadow: `0 4px 15px ${target.color}44` },
    resultBox: { background: '#161e2e', padding: '40px', borderRadius: '24px', border: `1px solid ${target.color}66`, textAlign: 'center', maxWidth: '700px' }
  };

  useEffect(() => {
    if (status === 'GIRIS') {
      const randomTarget = SHAPE_POOL[Math.floor(Math.random() * SHAPE_POOL.length)];
      setTarget(randomTarget);
      setTestLog([]);
      trialCountRef.current = 0;
    }
  }, [status]);

  const generateDistractors = () => {
    const count = Math.floor(Math.random() * 4);
    const colors = ['#ff0055', '#00ffcc', '#ffff00', '#ff8800', '#ff00ff', '#ffffff'];
    const list = [];
    for (let i = 0; i < count; i++) {
      list.push({
        id: i,
        top: Math.random() * 75 + 10 + '%',
        left: Math.random() * 75 + 10 + '%',
        size: Math.random() * 40 + 30 + 'px',
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
    let selected;
    if (isTarget) {
      selected = target;
    } else {
      const others = SHAPE_POOL.filter(s => s.id !== target.id);
      selected = others[Math.floor(Math.random() * others.length)];
    }

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
    setTestLog(prev => [...prev, { type: isCorrect ? 'TARGET' : 'DIST', rt }]);
    setCurrentTrial(null);
  }, [status, currentTrial, target]);

  useEffect(() => {
    window.addEventListener('keydown', handleInteraction);
    return () => window.removeEventListener('keydown', handleInteraction);
  }, [handleInteraction]);

  const renderShape = (s, isCenter = false) => {
    if (!s) return null;
    const size = isCenter ? '120px' : s.size;
    const common = {
      width: size, height: size, backgroundColor: s.color, position: isCenter ? 'relative' : 'absolute',
      top: isCenter ? 'auto' : s.top, left: isCenter ? 'auto' : s.left, zIndex: isCenter ? 10 : 5
    };

    if (s.shape === 'circle') return <div style={{ ...common, borderRadius: '50%' }} />;
    if (s.shape === 'triangle') return <div style={{ width: 0, height: 0, borderLeft: `${parseInt(size)/2}px solid transparent', borderRight: '${parseInt(size)/2}px solid transparent', borderBottom: '${size} solid ${s.color}', position: common.position, top: common.top, left: common.left }} />;
    if (s.shape === 'star') return <div style={{ ...common, clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }} />;
    if (s.shape === 'hexagon') return <div style={{ ...common, clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' }} />;
    if (s.shape === 'diamond') return <div style={{ ...common, clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />;
    return <div style={{ ...common, borderRadius: s.shape === 'square' ? '15%' : '0' }} />;
  };

  const generatePDF = () => {
    const corrects = testLog.filter(l => l.type === 'TARGET');
    const errors = testLog.filter(l => l.type === 'DIST');
    const attention = Math.round((corrects.length / (TOTAL_TRIALS * 0.35)) * 100);
    const avgRt = corrects.length > 0 ? Math.round(corrects.reduce((a,b)=>a+b.rt,0)/corrects.length) : 0;

    const doc = new jsPDF();
    doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255); doc.text("FOCUS PRO LAB ANALIZ", 105, 25, {align:'center'});
    
    doc.autoTable({
      startY: 50,
      head: [[trFix('İNDEX'), 'SKOR', 'DURUM']],
      body: [
        [trFix('DİKKAT'), `%${attention}`, attention > 80 ? 'Normal' : 'Zorluk'],
        ['ZAMANLAMA', `${avgRt} ms`, avgRt < 550 ? 'Hizli' : 'Yavas'],
        [trFix('DÜRTÜSELLİK'), errors.length, errors.length < 3 ? 'İyi' : 'Yüksek']
      ],
      headStyles: { fillColor: [target.color.replace('#','')] }
    });
    doc.save(`FocusPro_${target.label}.pdf`);
  };

  return (
    <div style={themeStyles.page}>
      {status === 'GIRIS' && (
        <div style={themeStyles.resultBox}>
          <h1 style={{ color: target.color, fontSize: '3.5rem', marginBottom: '10px' }}>Focus Pro Lab</h1>
          <p style={{ fontSize: '1.4rem' }}>Lütfen sadece merkeze çıkan <b style={{color: target.color}}>{target.label.toUpperCase()}</b> uyarısına tepki veriniz.</p>
          <div style={{ margin: '40px auto', display: 'flex', justifyContent: 'center' }}>
            {renderShape(target, true)}
          </div>
          <button style={themeStyles.btnPrimary} onClick={() => { setStatus('TEST'); nextTrial(0); }}>TESTİ BAŞLAT</button>
        </div>
      )}

      {status === 'TEST' && (
        <div style={themeStyles.testArea} onMouseDown={handleInteraction} onTouchStart={handleInteraction}>
          {currentTrial && (
            <>
              {currentTrial.distractors.map(d => renderShape(d, false))}
              {renderShape(currentTrial.shape, true)}
            </>
          )}
        </div>
      )}

      {status === 'SONUC' && (
        <div style={themeStyles.resultBox}>
          <h1 style={{ color: target.color }}>Test Tamamlandı</h1>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', margin: '30px 0' }}>
            <div style={{padding:'20px', background:'#1e293b', borderRadius:'15px'}}>
              <h2 style={{color:target.color}}>%{Math.round((testLog.filter(l=>l.type==='TARGET').length/14)*100)}</h2>
              <p>Dikkat</p>
            </div>
            <div style={{padding:'20px', background:'#1e293b', borderRadius:'15px'}}>
              <h2 style={{color:target.color}}>{testLog.length > 0 ? Math.round(testLog[0].rt) : 0}ms</h2>
              <p>Hız</p>
            </div>
            <div style={{padding:'20px', background:'#1e293b', borderRadius:'15px'}}>
              <h2 style={{color:target.color}}>{testLog.filter(l=>l.type==='DIST').length}</h2>
              <p>Hata</p>
            </div>
          </div>
          <button style={themeStyles.btnPrimary} onClick={generatePDF}>PROFESYONEL PDF RAPORU İNDİR</button>
          <button style={{...themeStyles.btnPrimary, background:'transparent', border:`1px solid ${target.color}`, color:target.color, marginLeft:'10px'}} onClick={() => setStatus('GIRIS')}>TEKRARLA</button>
        </div>
      )}
    </div>
  );
}

export default App;
