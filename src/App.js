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
    const count = Math.floor(Math.random() * 5) + 2; 
    const colors = ['#ff0055', '#00ffcc', '#ffff00', '#ff8800', '#ff00ff', '#ffffff'];
    const list = [];
    for (let i = 0; i < count; i++) {
      let top, left;
      // Hedef nesnenin (merkez %50-%50) üstüne binmemesi için güvenli alan kontrolü
      do {
        top = Math.random() * 80 + 10; // %10 - %90 arası
        left = Math.random() * 80 + 10;
      } while (top > 35 && top < 65 && left > 35 && left < 65); // Merkez bölge yasaklı

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

    const isTarget = Math.random() > 0.60;
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

    const displayTime = Math.max(500, 1000 - (count * 12));

    setTimeout(() => {
      setCurrentTrial(null);
      setTimeout(() => {
        trialCountRef.current++;
        nextTrial(count + 1);
      }, 400);
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
    const size = isCenter ? '140px' : s.size;
    const style = {
      width: size,
      height: size,
      backgroundColor: s.color,
      position: isCenter ? 'relative' : 'absolute',
      top: isCenter ? 'auto' : s.top,
      left: isCenter ? 'auto' : s.left,
      zIndex: isCenter ? 20 : 10,
      transition: 'none'
    };

    if (s.shape === 'circle') return <div style={{ ...style, borderRadius: '50%' }} />;
    if (s.shape === 'triangle') {
      return <div style={{ 
        width: 0, height: 0, 
        borderLeft: `${parseInt(size)/2}px solid transparent`, 
        borderRight: `${parseInt(size)/2}px solid transparent`, 
        borderBottom: `${size} solid ${s.color}`,
        backgroundColor: 'transparent',
        position: style.position, top: style.top, left: style.left, zIndex: style.zIndex
      }} />;
    }
    if (s.shape === 'star') return <div style={{ ...style, clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }} />;
    if (s.shape === 'hexagon') return <div style={{ ...style, clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' }} />;
    if (s.shape === 'diamond') return <div style={{ ...style, clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />;
    return <div style={{ ...style, borderRadius: s.shape === 'square' ? '15%' : '0' }} />;
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.text("Focus Pro Lab Sonuclari", 20, 20);
    doc.save("sonuc.pdf");
  };

  return (
    <div style={{ backgroundColor: '#050a15', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      {status === 'GIRIS' && (
        <div style={{ textAlign: 'center', padding: '40px', border: `2px solid ${target.color}`, borderRadius: '30px', background: '#0f172a' }}>
          <h1 style={{ color: target.color, fontSize: '3rem' }}>Focus Pro Lab</h1>
          <p style={{ fontSize: '1.2rem' }}>Hedef Nesne: <b style={{color: target.color}}>{target.label}</b></p>
          <div style={{ margin: '30px 0', display: 'flex', justifyContent: 'center' }}>
            {renderShape(target, true)}
          </div>
          <button 
            style={{ padding: '15px 40px', background: target.color, color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}
            onClick={() => { setStatus('TEST'); nextTrial(0); }}
          >
            TESTE BAŞLA
          </button>
        </div>
      )}

      {status === 'TEST' && (
        <div style={{ 
          width: '95vw', height: '90vh', backgroundColor: '#000', borderRadius: '24px', 
          border: `1px solid ${target.color}44`, position: 'relative', 
          display: 'flex', alignItems: 'center', justifyContent: 'center' // MERKEZLEME BURADA
        }}>
          {currentTrial && (
            <>
              {currentTrial.distractors.map(d => renderShape(d, false))}
              {renderShape(currentTrial.shape, true)} 
            </>
          )}
        </div>
      )}

      {status === 'SONUC' && (
        <div style={{ textAlign: 'center' }}>
          <h1 style={{color: target.color}}>Analiz Tamamlandı</h1>
          <button style={{ padding: '15px 30px', background: target.color, border: 'none', color: '#fff', borderRadius: '10px' }} onClick={generatePDF}>PDF RAPORU AL</button>
        </div>
      )}
    </div>
  );
}

export default App;
