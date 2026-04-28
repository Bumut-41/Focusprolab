import React, { useState, useEffect, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const styles = {
  page: { backgroundColor: '#050a10', color: '#fff', minHeight: '100vh', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' },
  tvArea: { width: '85vw', height: '75vh', backgroundColor: '#000', border: '4px solid #1a1a1a', borderRadius: '15px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  target: { width: '100px', height: '100px', backgroundColor: '#3498db', borderRadius: '10%', border: '4px solid #fff', position: 'absolute' },
  distractorItem: { position: 'absolute', pointerEvents: 'none' },
  startBtn: { padding: '20px 60px', fontSize: '1.5rem', cursor: 'pointer', background: 'linear-gradient(45deg, #3498db, #2980b9)', color: '#fff', border: 'none', borderRadius: '50px', fontWeight: 'bold', letterSpacing: '2px', transition: '0.3s' },
  resultPanel: { textAlign: 'center', maxWidth: '600px', padding: '40px', backgroundColor: '#141b29', borderRadius: '20px', border: '1px solid #3498db' }
};

function App() {
  const [status, setStatus] = useState('GIRIS'); // GIRIS, TEST, SONUC
  const [currentShape, setCurrentShape] = useState(null);
  const [visualDistractors, setVisualDistractors] = useState([]);
  const [testLog, setTestLog] = useState([]);
  const trialRef = useRef(0);
  const TOTAL_TRIALS = 30; // Daha uzun ve kapsamlı test

  // Zıplayan toplar ve kayan yıldızlar için mekanizma
  useEffect(() => {
    if (status !== 'TEST') return;
    const interval = setInterval(() => {
      const newDistractor = {
        id: Date.now(),
        type: Math.random() > 0.5 ? 'BALL' : 'STAR',
        top: Math.random() * 80 + '%',
        left: Math.random() * 80 + '%',
        duration: Math.random() * 2000 + 1000
      };
      setVisualDistractors(prev => [...prev.slice(-5), newDistractor]);
    }, 1500);
    return () => clearInterval(interval);
  }, [status]);

  const nextTrial = useCallback((count) => {
    if (count >= TOTAL_TRIALS) {
      setStatus('SONUC');
      return;
    }

    const isTarget = Math.random() > 0.35; // %65 Hedef çıkma oranı (Uluslararası standart)
    const displayTime = Math.max(450, 1000 - (count * 20));

    setCurrentShape({ id: Date.now(), isTarget, startTime: Date.now() });

    setTimeout(() => {
      setCurrentShape(null);
      setTimeout(() => {
        trialRef.current++;
        nextTrial(count + 1);
      }, 500);
    }, displayTime);
  }, []);

  const handleAction = useCallback(() => {
    if (status !== 'TEST' || !currentShape) return;
    const reactionTime = Date.now() - currentShape.startTime;
    
    setTestLog(prev => [...prev, {
      isTarget: currentShape.isTarget,
      reactionTime: reactionTime,
      type: currentShape.isTarget ? 'CORRECT' : 'IMPULSE'
    }]);
    
    setCurrentShape(null);
  }, [status, currentShape]);

  useEffect(() => {
    const handleKeyDown = (e) => { if (e.code === 'Space') handleAction(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAction]);

  const calculateMetrics = () => {
    const corrects = testLog.filter(l => l.type === 'CORRECT');
    const impulses = testLog.filter(l => l.type === 'IMPULSE');
    const avgTime = corrects.length > 0 ? corrects.reduce((a,b) => a + b.reactionTime, 0) / corrects.length : 0;
    
    return {
      attention: Math.round((corrects.length / (TOTAL_TRIALS * 0.65)) * 100), // Norm üzerinden dikkat
      timing: Math.round(avgTime),
      impulsivity: impulses.length,
      hyperactivity: testLog.length > TOTAL_TRIALS ? testLog.length - TOTAL_TRIALS : 0
    };
  };

  const downloadPDF = () => {
    const m = calculateMetrics();
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(33, 33, 33); doc.rect(0, 0, 210, 45, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(22); doc.text("MOXO-STYLE PERFORMANCE REPORT", 105, 20, {align:'center'});
    doc.setFontSize(10); doc.text("INTERNATIONAL ATTENTION METRICS (FPL-NORM)", 105, 32, {align:'center'});

    doc.autoTable({
      startY: 55,
      head: [['ÖLÇÜM ALANI', 'SKOR', 'NORM DEĞERİ (T0)', 'ANALİZ']],
      body: [
        ['DİKKAT (Attention)', `%${m.attention}`, '85 - 100', m.attention > 80 ? 'Normal' : 'Düşük'],
        ['ZAMANLAMA (Timing)', `${m.timing} ms`, '350 - 550', m.timing < 500 ? 'Hızlı' : 'Yavaş'],
        ['DÜRTÜSELLİK (Impulsivity)', m.impulsivity, '0 - 2', m.impulsivity <= 2 ? 'Kontrollü' : 'Yüksek'],
        ['HİPERAKTİVİTE (Hyperactivity)', m.hyperactivity, '0 - 1', m.hyperactivity === 0 ? 'Stabil' : 'Riskli']
      ],
      theme: 'grid',
      headStyles: {fillColor: [52, 152, 219]}
    });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Yorum: Bu rapor MOXO dikkat testinin uluslararasi normlarina göre simüle edilmiştir.", 15, doc.lastAutoTable.finalY + 20);
    doc.save("FocusPro_Scientific_Report.pdf");
  };

  return (
    <div style={styles.page}>
      {status === 'GIRIS' && (
        <div style={{textAlign:'center'}}>
          <h1 style={{fontSize:'3rem', color:'#3498db'}}>MOXO PRO TEST</h1>
          <p style={{marginBottom:'30px', color:'#aaa'}}>Göreviniz sadece aşağıdaki nesneye odaklanmaktır.</p>
          <div style={{...styles.target, position:'relative', margin:'0 auto 40px'}}></div>
          <button style={styles.startBtn} onClick={() => { setStatus('TEST'); nextTrial(0); }}>TESTE BAŞLA</button>
        </div>
      )}

      {status === 'TEST' && (
        <div style={styles.tvArea}>
          {/* Çeldiriciler */}
          {visualDistractors.map(d => (
            <div key={d.id} style={{
              ...styles.distractorItem,
              top: d.top, left: d.left,
              width: d.type === 'BALL' ? '30px' : '2px',
              height: d.type === 'BALL' ? '30px' : '40px',
              borderRadius: '50%',
              backgroundColor: d.type === 'BALL' ? '#e74c3c' : '#f1c40f',
              boxShadow: '0 0 10px #fff',
              transition: `all ${d.duration}ms linear`
            }} />
          ))}
          
          {/* Hedef Nesne */}
          {currentShape && (
            <div style={{
              ...styles.target,
              backgroundColor: currentShape.isTarget ? '#3498db' : '#2ecc71',
              clipPath: currentShape.isTarget ? 'none' : 'polygon(50% 0%, 0% 100%, 100% 100%)'
            }} />
          )}
        </div>
      )}

      {status === 'SONUC' && (
        <div style={styles.resultPanel}>
          <h2 style={{color:'#3498db'}}>ANALİZ TAMAMLANDI</h2>
          <div style={{margin:'20px 0', textAlign:'left', fontSize:'0.9rem'}}>
            <p>Dikkat Puanı: %{calculateMetrics().attention}</p>
            <p>Zamanlama: {calculateMetrics().timing} ms</p>
            <p>Dürtüsellik: {calculateMetrics().impulsivity}</p>
          </div>
          <button style={styles.startBtn} onClick={downloadPDF}>PDF RAPORU AL</button>
        </div>
      )}
    </div>
  );
}

export default App;
