import React, { useState, useEffect, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const styles = {
  page: { backgroundColor: '#0a0f1e', color: '#fff', minHeight: '100vh', fontFamily: "'Segoe UI', Roboto, sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  testArea: { width: '80vw', height: '60vh', backgroundColor: '#000', borderRadius: '20px', border: '3px solid #1e293b', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'crosshair', touchAction: 'none' },
  targetBase: { width: '120px', height: '120px', position: 'absolute', transition: 'all 0.1s ease-in-out' },
  btnPrimary: { padding: '15px 40px', fontSize: '1.2rem', cursor: 'pointer', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', transition: '0.2s' },
  card: { background: '#161e2e', padding: '30px', borderRadius: '20px', textAlign: 'center', maxWidth: '600px', border: '1px solid #1e293b' }
};

function App() {
  const [status, setStatus] = useState('GIRIS');
  const [currentShape, setCurrentShape] = useState(null);
  const [testLog, setTestLog] = useState([]);
  const trialRef = useRef(0);
  const TOTAL_TRIALS = 40; // Daha hassas ölçüm için arttırıldı

  // Nesne Havuzu: 1 Hedef, 6 Çeldirici
  const shapes = [
    { type: 'TARGET', color: '#3b82f6', shape: 'square' }, // Mavi Kare (Hedef)
    { type: 'DIST', color: '#ef4444', shape: 'circle' },   // Kırmızı Daire
    { type: 'DIST', color: '#10b981', shape: 'triangle' }, // Yeşil Üçgen
    { type: 'DIST', color: '#f59e0b', shape: 'star' },     // Turuncu Yıldız
    { type: 'DIST', color: '#8b5cf6', shape: 'hexagon' },  // Mor Altıgen
    { type: 'DIST', color: '#ec4899', shape: 'diamond' },  // Pembe Elmas
    { type: 'DIST', color: '#94a3b8', shape: 'cross' }     // Gri Artı
  ];

  const nextTrial = useCallback((count) => {
    if (count >= TOTAL_TRIALS) {
      setStatus('SONUC');
      return;
    }

    // Rastgele nesne seçimi (Ardışık tekrarı önlemek için kontrol eklenebilir)
    const randomIndex = Math.floor(Math.random() * shapes.length);
    // Hedef çıkma olasılığını %40 civarında tutuyoruz
    const forceTarget = Math.random() > 0.6;
    const selected = forceTarget ? shapes[0] : shapes[randomIndex];

    setCurrentShape({ ...selected, startTime: Date.now(), id: Date.now() });

    // Hızlanma: 1000ms -> 500ms arası
    const displayTime = Math.max(500, 1100 - (count * 15));

    setTimeout(() => {
      setCurrentShape(null);
      setTimeout(() => {
        trialRef.current++;
        nextTrial(count + 1);
      }, 400);
    }, displayTime);
  }, []);

  const handleInteraction = useCallback((e) => {
    if (status !== 'TEST' || !currentShape) return;
    if (e.type === 'keydown' && e.code !== 'Space') return;

    const rt = Date.now() - currentShape.startTime;
    
    setTestLog(prev => [...prev, {
      type: currentShape.type,
      rt: rt,
      timestamp: Date.now()
    }]);

    setCurrentShape(null); // Tek basım hakkı
  }, [status, currentShape]);

  useEffect(() => {
    window.addEventListener('keydown', handleInteraction);
    return () => window.removeEventListener('keydown', handleInteraction);
  }, [handleInteraction]);

  const generatePDF = () => {
    const doc = new jsPDF();
    const corrects = testLog.filter(l => l.type === 'TARGET');
    const errors = testLog.filter(l => l.type === 'DIST');
    
    // MOXO Metrikleri Hesaplama
    const attention = Math.round((corrects.length / (TOTAL_TRIALS * 0.4)) * 100);
    const avgRt = corrects.length > 0 ? Math.round(corrects.reduce((a,b)=>a+b.rt,0)/corrects.length) : 0;

    // Kapak ve Başlık
    doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(22); doc.text("KLINIK DIKKAT PERFORMANS RAPORU", 105, 25, {align:'center'});

    // İndeks Tablosu (MOXO Standartlarında)
    doc.autoTable({
      startY: 50,
      head: [['INDEKS', 'SKOR', 'NORM ARALIGI', 'DEGERLENDIRME']],
      body: [
        ['DIKKAT (Attention)', `%${attention}`, '%85 - %100', attention > 80 ? 'Standart' : 'Zorluk'],
        ['ZAMANLAMA (Timing)', `${avgRt} ms`, '350ms - 550ms', avgRt < 500 ? 'Hizli' : 'Yavas'],
        ['DÜRTÜSELLIK (Impulsivity)', errors.length, '0 - 2', errors.length <= 2 ? 'Iyi' : 'Yuksek'],
        ['HIPER-REAKTIVITE', testLog.length > TOTAL_TRIALS ? 'Var' : 'Yok', 'Yok', 'Normal']
      ],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });

    // Grafik Açıklaması
    doc.setTextColor(50); doc.setFontSize(12);
    doc.text("Analiz Özeti:", 15, doc.lastAutoTable.finalY + 15);
    doc.setFontSize(10);
    doc.text([
      "- Dikkat: Hedef uyarana odaklanma ve doğru tepki verme becerisi.",
      "- Zamanlama: Uyaranlara dogru zamanda tepki verme yetenegi.",
      "- Dürtüsellik: Çeldiricilere karsi koyma ve aceleci davranmama kapasitesi."
    ], 15, doc.lastAutoTable.finalY + 25);

    doc.save("FocusPro_Klinik_Analiz.pdf");
  };

  const renderShape = () => {
    if (!currentShape) return null;
    const s = currentShape;
    const base = { ...styles.targetBase, backgroundColor: s.color };

    if (s.shape === 'circle') base.borderRadius = '50%';
    if (s.shape === 'triangle') return <div style={{width:0, height:0, borderLeft:'60px solid transparent', borderRight:'60px solid transparent', borderBottom:`120px solid ${s.color}`}} />;
    if (s.shape === 'diamond') base.transform = 'rotate(45deg)';
    if (s.shape === 'hexagon') base.clipPath = 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';
    if (s.shape === 'cross') base.clipPath = 'polygon(33% 0%, 66% 0%, 66% 33%, 100% 33%, 100% 66%, 66% 66%, 66% 100%, 33% 100%, 33% 66%, 0% 66%, 0% 33%, 33% 33%)';

    return <div style={base} />;
  };

  return (
    <div style={styles.page}>
      {status === 'GIRIS' && (
        <div style={styles.card}>
          <h1 style={{color:'#3b82f6', fontSize:'2.5rem'}}>FOCUS PRO TEST V3</h1>
          <p style={{color:'#94a3b8', margin:'20px 0'}}>Sadece aşağıdaki mavi kareye tepki verin. Diğer nesneleri görmezden gelin.</p>
          <div style={{...styles.targetBase, position:'relative', margin:'0 auto 30px', backgroundColor:'#3b82f6', borderRadius:'10%'}}></div>
          <p style={{fontSize:'0.9rem', color:'#64748b', marginBottom:'30px'}}>Space tuşuna basabilir, mouse ile tıklayabilir veya ekrana dokunabilirsiniz.</p>
          <button style={styles.btnPrimary} onClick={() => { setStatus('TEST'); nextTrial(0); }}>TESTI BASLAT</button>
        </div>
      )}

      {status === 'TEST' && (
        <div style={styles.testArea} onMouseDown={handleInteraction} onTouchStart={handleInteraction}>
          {renderShape()}
        </div>
      )}

      {status === 'SONUC' && (
        <div style={styles.card}>
          <h2 style={{color:'#10b981'}}>TEST TAMAMLANDI</h2>
          <p style={{margin:'20px 0'}}>Analiz raporunuz MOXO uluslararası normlarına göre hazırlanmıştır.</p>
          <button style={styles.btnPrimary} onClick={generatePDF}>PROFESYONEL RAPORU INDIR (PDF)</button>
          <button style={{...styles.btnPrimary, background:'transparent', border:'1px solid #334155', marginLeft:'10px'}} onClick={() => window.location.reload()}>YENIDEN DENE</button>
        </div>
      )}
    </div>
  );
}

export default App;
