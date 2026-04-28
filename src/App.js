import React, { useState, useEffect, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const styles = {
  page: { backgroundColor: '#0a0e17', color: '#e0e6ed', minHeight: '100vh', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  header: { color: '#00d2ff', textShadow: '0 0 15px rgba(0,210,255,0.5)', fontSize: '2.5rem', marginBottom: '20px', letterSpacing: '2px' },
  tvContainer: { width: '90%', maxWidth: '900px', minHeight: '550px', backgroundColor: '#141b29', border: '8px solid #2c3e50', borderRadius: '30px', boxShadow: '0 0 60px rgba(0,0,0,0.9), inset 0 0 30px rgba(0,210,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: '30px', transition: 'all 0.5s ease' },
  shapeBase: { position: 'absolute', transition: 'transform 0.1s ease', boxShadow: '0 0 25px rgba(255,255,255,0.1)' },
  startBtn: { padding: '18px 50px', fontSize: '1.3rem', cursor: 'pointer', backgroundColor: 'transparent', border: '2px solid #00d2ff', color: '#00d2ff', textTransform: 'uppercase', borderRadius: '50px', transition: 'all 0.3s', boxShadow: '0 0 20px rgba(0,210,255,0.2)', fontWeight: 'bold' },
  statCard: { backgroundColor: 'rgba(255,255,255,0.05)', padding: '15px 25px', borderRadius: '15px', margin: '10px', border: '1px solid rgba(0,210,255,0.2)', textAlign: 'center', flex: '1' }
};

function App() {
  const [status, setStatus] = useState('GIRIS'); 
  const [currentShape, setCurrentShape] = useState(null);
  const [trialCount, setTrialCount] = useState(0);
  const [stats, setStats] = useState({ correct: 0, wrong: 0, impulse: 0, timings: [] });

  const TOTAL_TRIALS = 15; 
  // Hızlanma mantığı: İlk başta 1200ms, her adımda azalıyor
  const getDisplayTime = (count) => Math.max(400, 1200 - (count * 60));

  const nextTrial = useCallback((count) => {
    if (count >= TOTAL_TRIALS) {
      setStatus('SONUC');
      return;
    }

    const types = ['TARGET', 'CIRCLE', 'TRIANGLE', 'STAR', 'HEXAGON'];
    const randomType = types[Math.floor(Math.random() * types.length)];
    
    setCurrentShape({
      type: randomType,
      startTime: Date.now(),
      id: Date.now()
    });

    const displayTime = getDisplayTime(count);

    setTimeout(() => {
      setCurrentShape(null);
      setTimeout(() => {
        setTrialCount(prev => prev + 1);
        nextTrial(count + 1);
      }, 400); 
    }, displayTime);
  }, []);

  const handleAction = useCallback(() => {
    if (status !== 'TEST' || !currentShape) return;

    const reactionTime = Date.now() - currentShape.startTime;
    
    if (currentShape.type === 'TARGET') {
      setStats(prev => ({
        ...prev,
        correct: prev.correct + 1,
        timings: [...prev.timings, reactionTime]
      }));
    } else {
      setStats(prev => ({
        ...prev,
        wrong: prev.wrong + 1,
        impulse: prev.impulse + 1
      }));
    }
    setCurrentShape(null); 
  }, [status, currentShape]);

  useEffect(() => {
    const handleKeyDown = (e) => { if (e.code === 'Space') handleAction(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAction]);

  const downloadPDF = () => {
    const doc = new jsPDF();
    const avgReaction = stats.timings.length > 0 ? Math.round(stats.timings.reduce((a,b) => a+b, 0) / stats.timings.length) : 0;
    
    doc.setFillColor(10, 14, 23); doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(0, 210, 255); doc.setFontSize(22); doc.text("FOCUS PRO LAB ANALIZI", 105, 25, { align: "center" });

    doc.autoTable({
      startY: 50,
      head: [['Kategori', 'Sonuç', 'Değerlendirme']],
      body: [
        ['Doğru Hedef Yakalama', stats.correct, stats.correct > 8 ? 'Başarılı' : 'Geliştirilmeli'],
        ['Ortalama Tepki Hızı', `${avgReaction} ms`, avgReaction < 500 ? 'Hızlı' : 'Normal'],
        ['Dürtüsellik (Hatalı Basım)', stats.impulse, stats.impulse < 2 ? 'Düşük' : 'Yüksek'],
        ['Toplam Test Uyaranı', TOTAL_TRIALS, '-']
      ],
      theme: 'striped',
      headStyles: { fillColor: [0, 210, 255] }
    });
    doc.save("FocusPro_Performans_Raporu.pdf");
  };

  const renderShape = () => {
    if (!currentShape) return null;
    const common = { ...styles.shapeBase, width: '140px', height: '140px' };
    
    switch(currentShape.type) {
      case 'TARGET': return <div style={{...common, backgroundColor: '#3498db', borderRadius: '15%', border: '5px solid #00d2ff'}} />;
      case 'CIRCLE': return <div style={{...common, backgroundColor: '#e74c3c', borderRadius: '50%'}} />;
      case 'TRIANGLE': return <div style={{...common, width: 0, height: 0, borderLeft: '70px solid transparent', borderRight: '70px solid transparent', borderBottom: '140px solid #f1c40f', backgroundColor:'transparent', boxShadow:'none'}} />;
      case 'STAR': return <div style={{...common, backgroundColor: '#9b59b6', clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'}} />;
      default: return <div style={{...common, backgroundColor: '#2ecc71', clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)'}} />;
    }
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.header}>FOCUS PRO LAB V2</h1>
      
      <div style={styles.tvContainer}>
        {status === 'GIRIS' && (
          <div style={{textAlign:'center'}}>
            <h2 style={{color: '#fff', marginBottom: '30px'}}>DİKKAT TESTİNE HAZIR MISIN?</h2>
            <div style={{display:'flex', gap:'20px', marginBottom:'40px'}}>
               <div style={{textAlign:'center'}}><div style={{width:'50px', height:'50px', backgroundColor:'#3498db', margin:'0 auto 10px', borderRadius:'5px'}}></div><small>Buna BAS</small></div>
               <div style={{textAlign:'center'}}><div style={{width:'50px', height:'50px', backgroundColor:'#e74c3c', margin:'0 auto 10px', borderRadius:'50%'}}></div><small>Basma!</small></div>
               <div style={{textAlign:'center'}}><div style={{width:'50px', height:'50px', backgroundColor:'#f1c40f', margin:'0 auto 10px', clipPath:'polygon(50% 0%, 0% 100%, 100% 100%)'}}></div><small>Basma!</small></div>
            </div>
            <button style={styles.startBtn} onClick={() => { setStatus('TEST'); nextTrial(0); }}>BAŞLAT</button>
          </div>
        )}

        {status === 'TEST' && (
          <>
            <div style={{position:'absolute', top:'20px', left:'30px', color:'#00d2ff'}}>İlerleme: {trialCount}/{TOTAL_TRIALS}</div>
            <div style={{position:'absolute', top:'20px', right:'30px', color:'#aaa'}}>Hız: {getDisplayTime(trialCount)}ms</div>
            {renderShape()}
          </>
        )}

        {status === 'SONUC' && (
          <div style={{width: '100%', textAlign:'center'}}>
            <h2 style={{color:'#00d2ff', marginBottom:'30px'}}>TEST SONUÇLARI</h2>
            <div style={{display:'flex', justifyContent:'around', flexWrap:'wrap', marginBottom:'30px'}}>
              <div style={styles.statCard}><h3>{stats.correct}</h3><p>Doğru</p></div>
              <div style={styles.statCard}><h3>{stats.impulse}</h3><p>Hatalı</p></div>
              <div style={styles.statCard}><h3>{stats.timings.length > 0 ? Math.round(stats.timings.reduce((a,b)=>a+b,0)/stats.timings.length) : 0}ms</h3><p>Ort. Hız</p></div>
            </div>
            <button style={styles.startBtn} onClick={downloadPDF}>PDF RAPORU İNDİR</button>
            <button style={{...styles.startBtn, marginLeft:'10px', borderColor:'#aaa', color:'#aaa'}} onClick={() => window.location.reload()}>YENİDEN DENE</button>
          </div>
        )}
      </div>
      <p style={{marginTop:'20px', color:'#555'}}>Mavi kareyi görünce SPACE tuşuna basın. Test ilerledikçe hızlanır!</p>
    </div>
  );
}

export default App;
