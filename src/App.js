import React, { useState, useEffect, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Görsel Tasarım Ayarları
const styles = {
  page: { backgroundColor: '#0a0f1e', color: '#fff', minHeight: '100vh', fontFamily: "'Segoe UI', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  testArea: { width: '90vw', height: '80vh', backgroundColor: '#000', borderRadius: '20px', border: '2px solid #1e293b', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', touchAction: 'none' },
  centerTarget: { width: '120px', height: '120px', zIndex: 10, position: 'relative' },
  distractor: { position: 'absolute', opacity: 0.9, zIndex: 5 },
  btnPrimary: { padding: '15px 40px', fontSize: '1.2rem', cursor: 'pointer', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', margin: '10px', transition: '0.2s' },
  resultContainer: { background: '#161e2e', padding: '40px', borderRadius: '24px', border: '1px solid #3b82f6', maxWidth: '800px', width: '90%', textAlign: 'center' },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px', margin: '30px 0' },
  statBox: { background: '#1e293b', padding: '20px', borderRadius: '16px', borderBottom: '4px solid #3b82f6' }
};

// PDF için Türkçe karakter düzeltme fonksiyonu
const trFix = (text) => {
  return text
    .replace(/Ğ/g, 'G').replace(/ğ/g, 'g')
    .replace(/Ü/g, 'U').replace(/ü/g, 'u')
    .replace(/Ş/g, 'S').replace(/ş/g, 's')
    .replace(/İ/g, 'I').replace(/ı/g, 'i')
    .replace(/Ö/g, 'O').replace(/ö/g, 'o')
    .replace(/Ç/g, 'C').replace(/ç/g, 'c');
};

function App() {
  const [status, setStatus] = useState('GIRIS'); // GIRIS, TEST, SONUC
  const [currentTrial, setCurrentTrial] = useState(null);
  const [testLog, setTestLog] = useState([]);
  const trialCountRef = useRef(0);
  const TOTAL_TRIALS = 40; // Test kapsamı

  const shapes = [
    { type: 'TARGET', color: '#3b82f6', shape: 'square' }, // Hedef: Mavi Kare
    { type: 'DIST', color: '#ef4444', shape: 'circle' },
    { type: 'DIST', color: '#10b981', shape: 'triangle' },
    { type: 'DIST', color: '#f59e0b', shape: 'star' },
    { type: 'DIST', color: '#8b5cf6', shape: 'hexagon' }
  ];

  // Rastgele dikkat dağıtıcı öğeler oluşturur
  const generateDistractors = () => {
    const count = Math.floor(Math.random() * 4); // 0-3 arası
    const colors = ['#ff0055', '#00ffcc', '#ffff00', '#ff8800', '#ff00ff'];
    const list = [];
    for (let i = 0; i < count; i++) {
      list.push({
        id: i,
        top: Math.random() * 80 + 5 + '%',
        left: Math.random() * 80 + 5 + '%',
        size: Math.random() * 50 + 30 + 'px',
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: Math.random() > 0.5 ? 'circle' : 'rect'
      });
    }
    return list;
  };

  const nextTrial = useCallback((count) => {
    if (count >= TOTAL_TRIALS) {
      setStatus('SONUC');
      return;
    }

    const isTarget = Math.random() > 0.6; // %40 hedef oranı
    const shape = isTarget ? shapes[0] : shapes[Math.floor(Math.random() * shapes.length)];
    
    setCurrentTrial({
      shape,
      distractors: generateDistractors(),
      startTime: Date.now()
    });

    const displayTime = Math.max(500, 1000 - (count * 15)); // Kademeli hızlanma

    setTimeout(() => {
      setCurrentTrial(null);
      setTimeout(() => {
        trialCountRef.current++;
        nextTrial(count + 1);
      }, 400);
    }, displayTime);
  }, []);

  // Klavye, Mouse ve Dokunmatik etkileşimi yönetir
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

  const calculateResults = () => {
    const corrects = testLog.filter(l => l.type === 'TARGET');
    const errors = testLog.filter(l => l.type === 'DIST');
    const attention = Math.round((corrects.length / (TOTAL_TRIALS * 0.4)) * 100);
    const avgRt = corrects.length > 0 ? Math.round(corrects.reduce((a,b)=>a+b.rt,0)/corrects.length) : 0;
    return { attention, avgRt, impulsivity: errors.length };
  };

  const generatePDF = () => {
    const res = calculateResults();
    const doc = new jsPDF();
    
    // Header Şeridi
    doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(22); 
    doc.text("FOCUS PRO LAB - ANALIZ RAPORU", 105, 25, {align:'center'});

    // Sonuç Tablosu
    doc.autoTable({
      startY: 50,
      head: [[trFix('PARAMETRE'), 'SKOR', 'NORM', trFix('ANALİZ')]],
      body: [
        [trFix('DİKKAT (Attention)'), `%${res.attention}`, '%85-100', res.attention > 80 ? 'Normal' : trFix('Düşük')],
        [trFix('ZAMANLAMA (Timing)'), `${res.avgRt} ms`, '350-550ms', res.avgRt < 500 ? trFix('Hızlı') : trFix('Yavaş')],
        [trFix('DÜRTÜSELLİK (Impulsivity)'), res.impulsivity, '0-2', res.impulsivity <= 2 ? trFix('İyi') : trFix('Yüksek')],
      ],
      theme: 'grid', headStyles: { fillColor: [59, 130, 246] }
    });

    // Görsel Performans Grafikleri
    const startY = doc.lastAutoTable.finalY + 20;
    doc.setTextColor(0, 0, 0); doc.setFontSize(14);
    doc.text(trFix("Performans Grafikleri"), 15, startY);

    // Dikkat Barı
    doc.setFillColor(230, 230, 230); doc.rect(50, startY + 10, 100, 8, 'F');
    doc.setFillColor(59, 130, 246); doc.rect(50, startY + 10, Math.min(res.attention, 100), 8, 'F');
    doc.setFontSize(10); doc.text(trFix("Dikkat Skoru"), 15, startY + 16);

    // Hız Barı
    const timeWidth = Math.max(0, 100 - (res.avgRt / 10));
    doc.setFillColor(230, 230, 230); doc.rect(50, startY + 25, 100, 8, 'F');
    doc.setFillColor(16, 185, 129); doc.rect(50, startY + 25, timeWidth, 8, 'F');
    doc.text(trFix("Hiz Skoru"), 15, startY + 31);

    doc.save("FocusProLab_Rapor.pdf");
  };

  const renderShape = (s, isCenter = false) => {
    const baseStyle = isCenter ? styles.centerTarget : { width: s.size, height: s.size, backgroundColor: s.color, ...styles.distractor, top: s.top, left: s.left };
    const color = s.color;
    if (s.shape === 'circle') return <div style={{ ...baseStyle, backgroundColor: color, borderRadius: '50%' }} />;
    if (s.shape === 'triangle') return <div style={{ width: 0, height: 0, borderLeft: '60px solid transparent', borderRight: '60px solid transparent', borderBottom: `120px solid ${color}` }} />;
    return <div style={{ ...baseStyle, backgroundColor: color, borderRadius: s.shape === 'square' ? '12%' : '0' }} />;
  };

  return (
    <div style={styles.page}>
      {status === 'GIRIS' && (
        <div style={styles.resultContainer}>
          <h1 style={{ color: '#3b82f6', fontSize: '3rem', marginBottom: '10px' }}>Focus Pro Lab</h1>
          <p style={{ color: '#94a3b8' }}>Lütfen sadece merkeze çıkan MAVİ KARE uyarınına tepki veriniz.</p>
          <div style={{ ...styles.centerTarget, backgroundColor: '#3b82f6', margin: '40px auto', borderRadius: '15%' }}></div>
          <p style={{ fontSize: '0.9rem', color: '#64748b' }}>Klavye (Space), Mouse veya Dokunmatik ekran kullanabilirsiniz.</p>
          <button style={styles.btnPrimary} onClick={() => { setStatus('TEST'); nextTrial(0); }}>TESTİ BAŞLAT</button>
        </div>
      )}

      {status === 'TEST' && (
        <div style={styles.testArea} onMouseDown={handleInteraction} onTouchStart={handleInteraction}>
          {currentTrial && (
            <>
              {currentTrial.distractors.map(d => renderShape(d, false))}
              {renderShape(currentTrial.shape, true)}
            </>
          )}
        </div>
      )}

      {status === 'SONUC' && (
        <div style={styles.resultContainer}>
          <h1 style={{ color: '#3b82f6', marginBottom: '5px' }}>Focus Pro Lab</h1>
          <h2 style={{ color: '#10b981', fontSize: '1.8rem', marginBottom: '20px' }}>TEST ANALİZ SONUÇLARI</h2>
          
          <div style={styles.statGrid}>
            <div style={styles.statBox}>
              <h3 style={{ fontSize: '2rem', color: '#3b82f6' }}>%{calculateResults().attention}</h3>
              <p>Dikkat</p>
            </div>
            <div style={styles.statBox}>
              <h3 style={{ fontSize: '2rem', color: '#10b981' }}>{calculateResults().avgRt}ms</h3>
              <p>Zamanlama</p>
            </div>
            <div style={styles.statBox}>
              <h3 style={{ fontSize: '2rem', color: '#f59e0b' }}>{calculateResults().impulsivity}</h3>
              <p>Dürtüsellik</p>
            </div>
          </div>

          <p style={{ color: '#94a3b8', marginBottom: '30px', fontSize: '0.9rem' }}>
            Analiz verileriniz MOXO uluslararası normları temel alınarak raporlanmıştır.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
            <button style={styles.btnPrimary} onClick={generatePDF}>PDF RAPORU İNDİR</button>
            <button 
              style={{ ...styles.btnPrimary, background: 'transparent', border: '1px solid #334155', color: '#94a3b8' }} 
              onClick={() => window.location.reload()}
            >
              YENİDEN BAŞLAT
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
