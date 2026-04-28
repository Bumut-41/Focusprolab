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

const CHAOS_COLORS = ['#ff0055', '#00ffcc', '#ffff00', '#ff8800', '#ff00ff', '#ffffff', '#00ff00', '#7c3aed', '#db2777'];

const trFix = (text) => {
  return text.replace(/Ğ/g, 'G').replace(/ğ/g, 'g').replace(/Ü/g, 'U').replace(/ü/g, 'u')
    .replace(/Ş/g, 'S').replace(/ş/g, 's').replace(/İ/g, 'I').replace(/ı/g, 'i')
    .replace(/Ö/g, 'O').replace(/ö/g, 'o').replace(/Ç/g, 'C').replace(/ç/g, 'c');
};

function App() {
  const [status, setStatus] = useState('GIRIS');
  const [target, setTarget] = useState(SHAPE_POOL[0]);
  const [currentTrial, setCurrentTrial] = useState(null);
  const [testLog, setTestLog] = useState([]);
  const [distractorColors, setDistractorColors] = useState([]);
  const trialCountRef = useRef(0);
  const TOTAL_TRIALS = 40;

  // Başlangıçta rastgele hedef seçimi
  useEffect(() => {
    if (status === 'GIRIS') {
      setTarget(SHAPE_POOL[Math.floor(Math.random() * SHAPE_POOL.length)]);
      setTestLog([]);
      trialCountRef.current = 0;
    }
  }, [status]);

  // ÇELDİRİCİ RENKLERİNİ DEĞİŞTİREN DÖNGÜ (Sadece Hedef Olmayanlar İçin)
  useEffect(() => {
    let interval;
    if (status === 'TEST' && currentTrial) {
      interval = setInterval(() => {
        setDistractorColors(currentTrial.distractors.map(() => 
          CHAOS_COLORS[Math.floor(Math.random() * CHAOS_COLORS.length)]
        ));
      }, 100); // 100ms hızında renk değişimi
    }
    return () => clearInterval(interval);
  }, [status, currentTrial]);

  const generateDistractors = () => {
    const count = Math.floor(Math.random() * 5) + 3;
    const list = [];
    for (let i = 0; i < count; i++) {
      let top, left;
      do {
        top = Math.random() * 75 + 10;
        left = Math.random() * 75 + 10;
      } while (top > 30 && top < 70 && left > 30 && left < 70); // Merkezden uzak tut

      list.push({ 
        id: i, 
        top: top + '%', 
        left: left + '%', 
        size: Math.random() * 30 + 30 + 'px', 
        shape: ['circle', 'rect', 'triangle', 'diamond'][Math.floor(Math.random() * 4)] 
      });
    }
    return list;
  };

  const nextTrial = useCallback((count) => {
    if (count >= TOTAL_TRIALS) { setStatus('SONUC'); return; }
    
    const isTargetTrial = Math.random() > 0.65;
    let selectedShape = isTargetTrial ? target : SHAPE_POOL.filter(s => s.id !== target.id)[Math.floor(Math.random() * (SHAPE_POOL.length - 1))];
    
    setCurrentTrial({
      shape: selectedShape,
      distractors: generateDistractors(),
      startTime: Date.now(),
      isTarget: isTargetTrial
    });

    setTimeout(() => {
      setCurrentTrial(null);
      setTimeout(() => { 
        trialCountRef.current++; 
        nextTrial(count + 1); 
      }, 400);
    }, Math.max(600, 1000 - (count * 10)));
  }, [target]);

  const handleInteraction = useCallback((e) => {
    if (status !== 'TEST' || !currentTrial) return;
    if (e.type === 'keydown' && e.code !== 'Space') return;

    const rt = Date.now() - currentTrial.startTime;
    const isCorrect = currentTrial.isTarget;
    setTestLog(prev => [...prev, { type: isCorrect ? 'TARGET' : 'DIST', rt }]);
    setCurrentTrial(null);
  }, [status, currentTrial]);

  useEffect(() => {
    window.addEventListener('keydown', handleInteraction);
    return () => window.removeEventListener('keydown', handleInteraction);
  }, [handleInteraction]);

  const renderShape = (s, isMain = false, colorOverride = null) => {
    if (!s) return null;
    const size = isMain ? '140px' : s.size;
    const finalColor = colorOverride || s.color;
    
    const style = { 
      width: size, height: size, backgroundColor: finalColor, 
      position: isMain ? 'relative' : 'absolute', 
      top: isMain ? 'auto' : s.top, left: isMain ? 'auto' : s.left, 
      zIndex: isMain ? 50 : 10,
      transition: 'background-color 0.1s ease'
    };

    if (s.shape === 'circle') return <div style={{ ...style, borderRadius: '50%' }} />;
    if (s.shape === 'triangle') return <div style={{ width: 0, height: 0, borderLeft: `${parseInt(size)/2}px solid transparent`, borderRight: `${parseInt(size)/2}px solid transparent`, borderBottom: `${size} solid ${finalColor}`, position: style.position, top: style.top, left: style.left }} />;
    if (s.shape === 'star') return <div style={{ ...style, clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }} />;
    if (s.shape === 'hexagon') return <div style={{ ...style, clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' }} />;
    if (s.shape === 'diamond') return <div style={{ ...style, clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />;
    return <div style={{ ...style, borderRadius: s.shape === 'square' ? '18%' : '0' }} />;
  };

  const calculateStats = () => {
    const corrects = testLog.filter(l => l.type === 'TARGET');
    const errors = testLog.filter(l => l.type === 'DIST');
    const attention = Math.round((corrects.length / 14) * 100); // 14 beklenen hedef ortalaması
    const avgRt = corrects.length > 0 ? Math.round(corrects.reduce((a,b)=>a+b.rt,0)/corrects.length) : 0;
    return { attention, avgRt, impulsivity: errors.length };
  };

  const generatePDF = () => {
    const res = calculateStats();
    const doc = new jsPDF();
    doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(22);
    doc.text("FOCUS PRO LAB - ANALIZ", 105, 25, {align:'center'});
    doc.autoTable({
      startY: 50,
      head: [['PARAMETRE', 'SKOR', 'DURUM']],
      body: [
        [trFix('DIKKAT'), `%${res.attention}`, res.attention > 80 ? 'Iyi' : 'Dusuk'],
        ['HIZ', `${res.avgRt} ms`, res.avgRt < 550 ? 'Normal' : 'Yavas'],
        [trFix('DURTUSELLIK'), res.impulsivity, res.impulsivity < 3 ? 'Iyi' : 'Yuksek']
      ]
    });
    doc.save("FocusPro_Rapor.pdf");
  };

  const stats = calculateStats();

  return (
    <div style={{ backgroundColor: '#050a15', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      {status === 'GIRIS' && (
        <div style={{ textAlign: 'center', padding: '50px', border: `2px solid ${target.color}`, borderRadius: '35px', background: '#0f172a', maxWidth: '600px' }}>
          <h1 style={{ color: target.color, fontSize: '3.5rem', margin: '0' }}>Focus Pro Lab</h1>
          <p style={{ fontSize: '1.2rem' }}>Hedefiniz: <b style={{color: target.color}}>{target.label.toUpperCase()}</b></p>
          <div style={{ margin: '30px 0', display: 'flex', justifyContent: 'center' }}>{renderShape(target, true)}</div>
          <p style={{ opacity: 0.6 }}>Diğer nesneler renk değiştirerek dikkatinizi dağıtabilir. Sadece hedefe odaklanın.</p>
          <button style={{ padding: '18px 50px', background: target.color, color: '#fff', border: 'none', borderRadius: '15px', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => { setStatus('TEST'); nextTrial(0); }}>BAŞLA</button>
        </div>
      )}

      {status === 'TEST' && (
        <div style={{ width: '96vw', height: '92vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', borderRadius: '20px', border: '1px solid #1e293b' }} onMouseDown={handleInteraction} onTouchStart={handleInteraction}>
          {currentTrial && (
            <>
              {currentTrial.distractors.map((d, i) => renderShape(d, false, distractorColors[i]))}
              {renderShape(currentTrial.shape, true, currentTrial.shape.id === target.id ? target.color : distractorColors[0])}
            </>
          )}
        </div>
      )}

      {status === 'SONUC' && (
        <div style={{ textAlign: 'center', background: '#161e2e', padding: '50px', borderRadius: '30px', border: `2px solid ${target.color}` }}>
          <h1 style={{ color: target.color }}>Analiz Sonuçları</h1>
          <div style={{ display: 'flex', gap: '20px', margin: '30px 0' }}>
            <div style={{ background: '#1e293b', padding: '20px', borderRadius: '15px', minWidth: '130px' }}>
              <h2 style={{color:target.color, margin:0}}>%{stats.attention}</h2><p>Dikkat</p>
            </div>
            <div style={{ background: '#1e293b', padding: '20px', borderRadius: '15px', minWidth: '130px' }}>
              <h2 style={{color:target.color, margin:0}}>{stats.avgRt}ms</h2><p>Hız</p>
            </div>
            <div style={{ background: '#1e293b', padding: '20px', borderRadius: '15px', minWidth: '130px' }}>
              <h2 style={{color:target.color, margin:0}}>{stats.impulsivity}</h2><p>Hata</p>
            </div>
          </div>
          <button style={{ background: target.color, color:'#fff', padding:'15px 40px', border:'none', borderRadius:'12px', fontWeight:'bold', cursor:'pointer' }} onClick={generatePDF}>PDF RAPORU İNDİR</button>
          <button style={{ marginLeft:'10px', background:'transparent', border:`1px solid ${target.color}`, color:target.color, padding:'15px 30px', borderRadius:'12px', cursor:'pointer' }} onClick={() => setStatus('GIRIS')}>YENİDEN DENE</button>
        </div>
      )}
    </div>
  );
}

export default App;
