import React, { useState, useEffect, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const SHAPE_POOL = [
  { id: '1', type: 'SQUARE', color: '#3b82f6', shape: 'square', label: 'Mavi Kare' },
  { id: '2', type: 'CIRCLE', color: '#ef4444', shape: 'circle', label: 'Kırmızı Daire' },
  { id: '3', type: 'TRIANGLE', color: '#10b981', shape: 'triangle', label: 'Yeşil Üçgen' },
  { id: '4', type: 'STAR', color: '#f59e0b', shape: 'star', label: 'Sarı Yıldız' },
  { id: '5', type: 'HEXAGON', color: '#8b5cf6', shape: 'hexagon', label: 'Mor Altıgen' },
  { id: '6', type: 'DIAMOND', color: '#ec4899', shape: 'diamond', label: 'Pembe Elmas' }
];

const CHAOS_COLORS = ['#ff0055', '#00ffcc', '#ffff00', '#ff8800', '#ff00ff', '#ffffff', '#00ff00', '#7c3aed', '#db2777'];

const trFix = (t) => t.replace(/Ğ/g,'G').replace(/ğ/g,'g').replace(/Ü/g,'U').replace(/ü/g,'u').replace(/Ş/g,'S').replace(/ş/g,'s').replace(/İ/g,'I').replace(/ı/g,'i').replace(/Ö/g,'O').replace(/ö/g,'o').replace(/Ç/g,'C').replace(/ç/g,'c');

function App() {
  const [status, setStatus] = useState('GIRIS');
  const [target, setTarget] = useState(SHAPE_POOL[0]);
  const [currentTrial, setCurrentTrial] = useState(null);
  const [testLog, setTestLog] = useState([]);
  const [distractorColors, setDistractorColors] = useState([]);
  const trialCountRef = useRef(0);
  const TOTAL_TRIALS = 40;

  useEffect(() => {
    if (status === 'GIRIS') {
      setTarget(SHAPE_POOL[Math.floor(Math.random() * SHAPE_POOL.length)]);
      setTestLog([]);
      trialCountRef.current = 0;
    }
  }, [status]);

  // Sadece çeldiriciler için renk döngüsü
  useEffect(() => {
    let interval;
    if (status === 'TEST' && currentTrial) {
      interval = setInterval(() => {
        setDistractorColors(currentTrial.distractors.map(() => 
          CHAOS_COLORS[Math.floor(Math.random() * CHAOS_COLORS.length)]
        ));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [status, currentTrial]);

  const generateDistractors = () => {
    const count = Math.floor(Math.random() * 6) + 4;
    const list = [];
    for (let i = 0; i < count; i++) {
      let top, left;
      do { 
        top = Math.random() * 80 + 10; 
        left = Math.random() * 80 + 10; 
      } while (top > 30 && top < 70 && left > 30 && left < 70); // Merkeze çeldirici koyma

      list.push({ 
        id: i, top: top + '%', left: left + '%', 
        size: Math.random() * 20 + 30 + 'px', 
        shape: ['circle', 'rect', 'triangle', 'diamond'][Math.floor(Math.random() * 4)] 
      });
    }
    return list;
  };

  const nextTrial = useCallback((count) => {
    if (count >= TOTAL_TRIALS) { setStatus('SONUC'); return; }
    const isTargetTrial = Math.random() > 0.65;
    let selected = isTargetTrial ? target : SHAPE_POOL.filter(s => s.id !== target.id)[Math.floor(Math.random() * (SHAPE_POOL.length - 1))];
    
    setCurrentTrial({ shape: selected, distractors: generateDistractors(), startTime: Date.now(), isTarget: isTargetTrial });
    
    setTimeout(() => {
      setCurrentTrial(null);
      setTimeout(() => { trialCountRef.current++; nextTrial(count + 1); }, 450);
    }, 800);
  }, [target]);

  const handleInteraction = useCallback((e) => {
    if (status !== 'TEST' || !currentTrial) return;
    if (e.type === 'keydown' && e.code !== 'Space') return;
    const rt = Date.now() - currentTrial.startTime;
    setTestLog(prev => [...prev, { isTarget: currentTrial.isTarget, rt, type: currentTrial.isTarget ? 'HIT' : 'ERROR' }]);
    setCurrentTrial(null);
  }, [status, currentTrial]);

  useEffect(() => {
    window.addEventListener('keydown', handleInteraction);
    return () => window.removeEventListener('keydown', handleInteraction);
  }, [handleInteraction]);

  const renderShape = (s, isCenter = false, chaosColor = null) => {
    if (!s) return null;
    const size = isCenter ? '150px' : s.size;
    const finalColor = isCenter ? s.color : chaosColor;
    
    const style = { 
      width: size, height: size, backgroundColor: finalColor, 
      position: 'absolute', 
      top: isCenter ? '50%' : s.top, 
      left: isCenter ? '50%' : s.left, 
      transform: isCenter ? 'translate(-50%, -50%)' : 'none',
      zIndex: isCenter ? 100 : 10,
      borderRadius: s.shape === 'circle' ? '50%' : (s.shape === 'square' ? '15%' : '0'),
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    };

    if (s.shape === 'triangle') return <div style={{ ...style, width: 0, height: 0, backgroundColor: 'transparent', borderLeft: `${parseInt(size)/2}px solid transparent`, borderRight: `${parseInt(size)/2}px solid transparent`, borderBottom: `${size} solid ${finalColor}` }} />;
    if (s.shape === 'diamond') return <div style={{ ...style, clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />;
    return <div style={style} />;
  };

  const getStats = () => {
    const hits = testLog.filter(l => l.isTarget);
    const errors = testLog.filter(l => !l.isTarget);
    const avgRt = hits.length > 0 ? Math.round(hits.reduce((a,b)=>a+b.rt,0)/hits.length) : 0;
    return { attention: hits.length, timing: avgRt, impulsivity: errors.length };
  };

  const generatePDF = () => {
    const s = getStats();
    const doc = new jsPDF();
    doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(22); doc.text("MOXO-STYLE PERFORMANCE REPORT", 105, 25, {align:'center'});
    doc.autoTable({
      startY: 50,
      head: [[trFix('PARAMETRE'), 'SKOR', trFix('DURUM')]],
      body: [
        [trFix('A - DIKKAT'), s.attention, s.attention > 10 ? 'Normal' : 'Dusuk'],
        [trFix('T - ZAMANLAMA'), `${s.timing} ms`, s.timing < 500 ? 'Hizli' : 'Yavas'],
        [trFix('I - DURTUSELLIK'), s.impulsivity, s.impulsivity < 3 ? 'Iyi' : 'Yuksek']
      ]
    });
    doc.save("FocusPro_Moxo_Analiz.pdf");
  };

  const stats = getStats();

  return (
    <div style={{ backgroundColor: '#020617', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      {status === 'GIRIS' && (
        <div style={{ textAlign: 'center', padding: '50px', border: `2px solid ${target.color}`, borderRadius: '40px', background: '#0f172a' }}>
          <h1 style={{ color: target.color, fontSize: '3.5rem' }}>Focus Pro Lab</h1>
          <p>Lütfen sadece ortada çıkan <b style={{color:target.color}}>{target.label.toUpperCase()}</b> nesnesine odaklanın.</p>
          <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>{renderShape(target, true)}</div>
          <button style={{ padding: '20px 60px', background: target.color, color: '#fff', border: 'none', borderRadius: '15px', cursor: 'pointer', fontWeight:'bold' }} onClick={() => { setStatus('TEST'); nextTrial(0); }}>BAŞLA</button>
        </div>
      )}

      {status === 'TEST' && (
        <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative' }} onMouseDown={handleInteraction}>
          {currentTrial && (
            <>
              {currentTrial.distractors.map((d, i) => renderShape(d, false, distractorColors[i]))}
              {renderShape(currentTrial.shape, true, currentTrial.shape.color)}
            </>
          )}
        </div>
      )}

      {status === 'SONUC' && (
        <div style={{ textAlign: 'center', padding: '50px', background: '#0f172a', borderRadius: '30px', border: `2px solid ${target.color}` }}>
          <h1 style={{ color: target.color }}>Test Tamamlandı</h1>
          <div style={{ display: 'flex', gap: '20px', margin: '30px 0' }}>
            <div style={{ background: '#1e293b', padding: '20px', borderRadius: '15px' }}><h2>{stats.attention}</h2><p>Dikkat (A)</p></div>
            <div style={{ background: '#1e293b', padding: '20px', borderRadius: '15px' }}><h2>{stats.timing}ms</h2><p>Hız (T)</p></div>
            <div style={{ background: '#1e293b', padding: '20px', borderRadius: '15px' }}><h2>{stats.impulsivity}</h2><p>Hata (I)</p></div>
          </div>
          <button style={{ background: target.color, color:'#fff', padding:'15px 40px', border:'none', borderRadius:'10px', cursor:'pointer' }} onClick={generatePDF}>PDF RAPORU İNDİR</button>
        </div>
      )}
    </div>
  );
}

export default App;
