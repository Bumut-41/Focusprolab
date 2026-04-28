import React, { useState, useEffect, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// CSS'i JavaScript içine gömüyoruz (Ekstra dosya uğraşısı olmasın diye)
const styles = {
  page: { backgroundColor: '#0a0e17', color: '#e0e6ed', minHeight: '100vh', fontFamily: "'Orbitron', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  header: { color: '#00d2ff', textShadow: '0 0 10px rgba(0,210,255,0.7)', fontSize: '2.8rem', marginBottom: '10px' },
  tvContainer: { width: '80%', maxWidth: '900px', height: '500px', backgroundColor: '#141b29', border: '10px solid #2c3e50', borderRadius: '20px', boxShadow: '0 0 50px rgba(0,0,0,0.8), inset 0 0 20px rgba(0,210,255,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', padding: '20px' },
  onboardingShape: { width: '80px', height: '80px', margin: '15px', borderRadius: '10%' },
  startBtn: { padding: '15px 40px', fontSize: '1.2rem', cursor: 'pointer', backgroundColor: 'transparent', border: '2px solid #00d2ff', color: '#00d2ff', textTransform: 'uppercase', borderRadius: '30px', transition: 'all 0.3s ease', boxShadow: '0 0 15px rgba(0,210,255,0.3)', marginTop: '30px' },
  gameShape: { width: '150px', height: '150px', position: 'absolute', transition: 'all 0.1s ease', boxShadow: '0 0 30px rgba(255,255,255,0.2)' },
  resultBtn: { padding: '15px 40px', fontSize: '1.1rem', cursor: 'pointer', backgroundColor: '#27ae60', border: 'none', color: 'white', textTransform: 'uppercase', borderRadius: '5px', marginTop: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }
};

// Global animasyonlar için style etiketi
const animationStyle = `
  @keyframes pulse { 0% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.05); opacity: 1; } 100% { transform: scale(1); opacity: 0.8; } }
  .pulseBtn:hover { background-color: rgba(0,210,255,0.1) !important; transform: translateY(-3px); boxShadow: 0 0 25px rgba(0,210,255,0.6) !important; }
`;

function App() {
  const [status, setStatus] = useState('GIRIS'); // GIRIS, TALIMAT, TEST, SONUC
  const [shapes, setShapes] = useState([]);
  const pdfRef = useRef(null); // PDF instance'ını saklamak için
  const [testStats, setTestStats] = useState({ correct: 0, wrong: 0, missed: 0, timing: 0, impulse: 0 });

  const TOTAL_TRIALS = 10; // Test süresi (kısa tutuldu)
  const SHAPE_DISPLAY_TIME = 1000; 

  const startTest = () => {
    setTestStats({ correct: 0, wrong: 0, missed: 0, timing: 0, impulse: 0 });
    setStatus('TEST');
    nextTrial(0);
  };

  const nextTrial = (count) => {
    if (count >= TOTAL_TRIALS) {
      setStatus('SONUC');
      return;
    }
    const isTarget = Math.random() > 0.4; 
    setShapes([{ id: Date.now(), isTarget, startTime: Date.now() }]);
    setTimeout(() => { setShapes([]); setTimeout(() => nextTrial(count + 1), 500); }, SHAPE_DISPLAY_TIME);
  };

  const handleKeyPress = useCallback((e) => {
    if (e.code !== 'Space' || status !== 'TEST' || shapes.length === 0) return;
    const currentShape = shapes[0];
    const reactionTime = Date.now() - currentShape.startTime;
    if (currentShape.isTarget) {
      setTestStats(prev => ({ ...prev, correct: prev.correct + 1, timing: prev.timing + reactionTime }));
    } else {
      setTestStats(prev => ({ ...prev, wrong: prev.wrong + 1, impulse: prev.impulse + 1 }));
    }
    setShapes([]); 
  }, [status, shapes]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // PDF indirme fonksiyonu (jspdf-autotable gömülü)
  const downloadPDF = () => {
    try {
      const doc = new jsPDF();
      const avgTiming = testStats.correct > 0 ? Math.round(testStats.timing / testStats.correct) : 0;
      const accuracyRate = Math.round((testStats.correct / TOTAL_TRIALS) * 100);

      // Başlık Alanı
      doc.setFillColor(10, 14, 23); doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(0, 210, 255); doc.setFontSize(24); doc.text("FOCUS PRO LAB", 105, 20, { align: "center" });
      doc.setTextColor(200, 200, 200); doc.setFontSize(10); doc.text("BILISSEL DIKKAT VE PERFORMANS RAPORU", 105, 30, { align: "center" });

      // Veri Tablosu
      doc.autoTable({
        startY: 50,
        head: [['ANALIZ PARAMETRESI', 'SKOR', 'SEVIYE', 'ACIKLAMA']],
        body: [
          ['DİKKAT (Doğru Tepki)', `%${accuracyRate}`, accuracyRate > 80 ? 'Yüksek' : 'Standart', 'Hedef mavi kareleri yakalama başarısı.'],
          ['REAKSİYON HIZI (Ortalama)', `${avgTiming} ms`, avgTiming < 400 ? 'Çok Hızlı' : 'Normal', 'Zihinsel işlem ve tepki verme hızı.'],
          ['DÜRTÜSÜLLÜK (Hatalı Tepki)', testStats.impulse, testStats.impulse < 2 ? 'Kontrollü' : 'Riskli', 'Beklemesi gerekirken basma eğilimi.'],
          ['MOTOR KONTROL', testStats.wrong, testStats.wrong < 3 ? 'Stabil' : 'Değişken', 'Hareketlerin doğruluğu.']
        ],
        theme: 'grid',
        headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255] },
        styles: { fontSize: 10, cellPadding: 5 }
      });

      doc.save(`FocusProLab_Rapor_${Date.now()}.pdf`);
    } catch (error) {
      alert("PDF oluşturulurken bir hata oluştu. Lütfen tarayıcı izinlerini kontrol edin.");
      console.error(error);
    }
  };

  return (
    <div style={styles.page}>
      <style>{animationStyle}</style>
      <h1 style={styles.header}>FOCUS PRO LAB</h1>

      <div style={styles.tvContainer}>
        {status === 'GIRIS' && (
          <div style={{ textAlign: 'center' }}>
            <h2>HOŞ GELDİNİZ</h2>
            <p style={{ color: '#aaa', maxWidth: '500px' }}>Bu test, zihinsel odaklanma ve reaksiyon hızınızı ölçer. Hazırsanız talimatları görmek için ilerleyin.</p>
            <button className="pulseBtn" style={styles.startBtn} onClick={() => setStatus('TALIMAT')}>TALİMATLARI GÖR</button>
          </div>
        )}

        {status === 'TALIMAT' && (
          <div style={{ textAlign: 'center', display:'flex', flexDirection:'column', alignItems:'center' }}>
            <h3 style={{color:'#fff'}}>GÖREV TALİMATI</h3>
            <p>Ekranda aşağıdaki nesneyi görünce <b style={{color:'#00d2ff'}}>BOŞLUK</b> tuşuna basın:</p>
            <div style={{...styles.onboardingShape, backgroundColor:'#3498db', border:'2px solid #00d2ff'}}></div>
            <p>Aşağıdaki nesneye <b style={{color:'#e74c3c'}}>ASLA</b> basmayın:</p>
            <div style={{...styles.onboardingShape, backgroundColor:'#e74c3c', borderRadius:'50%'}}></div>
            <button className="pulseBtn" style={styles.startBtn} onClick={startTest}>TESTİ BAŞLAT</button>
          </div>
        )}

        {status === 'TEST' && (
          <>
            <div style={{position:'absolute', top:'10px', right:'20px', color:'#555'}}>{shapes.length > 0 ? '' : 'Hazırlan...'}</div>
            {shapes.map(s => (
              <div key={s.id} style={{
                ...styles.gameShape,
                backgroundColor: s.isTarget ? '#3498db' : '#e74c3c',
                borderRadius: s.isTarget ? '10%' : '50%',
                border: s.isTarget ? '4px solid #00d2ff' : '4px solid #c0392b',
              }} />
            ))}
          </>
        )}

        {status === 'SONUC' && (
          <div style={{ textAlign: 'center' }}>
            <h2 style={{color:'#27ae60'}}>ANALİZ TAMAMLANDI</h2>
            <p style={{color:'#aaa'}}>Verileriniz işlendi. Detaylı, tablolu performans raporunuz hazır.</p>
            <button style={styles.resultBtn} onClick={downloadPDF}>PROFESYONEL PDF RAPORU İNDİR</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
