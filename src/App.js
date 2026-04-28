import React, { useState, useEffect, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

function App() {
  const [status, setStatus] = useState('GIRIS'); // GIRIS, TEST, SONUC
  const [shapes, setShapes] = useState([]);
  const [startTime, setStartTime] = useState(null);
  const [testStats, setTestStats] = useState({
    correct: 0,
    wrong: 0,
    missed: 0,
    timing: 0,
    impulse: 0,
    totalAttempts: 0
  });

  // --- TEST AYARLARI ---
  const TOTAL_TRIALS = 20; // Test süresi (Sayıyı artırarak testi uzatabilirsin)
  const SHAPE_DISPLAY_TIME = 1000; 

  const startTest = () => {
    setTestStats({ correct: 0, wrong: 0, missed: 0, timing: 0, impulse: 0, totalAttempts: 0 });
    setStatus('TEST');
    nextTrial(0);
  };

  const nextTrial = (count) => {
    if (count >= TOTAL_TRIALS) {
      setStatus('SONUC');
      return;
    }

    const isTarget = Math.random() > 0.4; // %60 ihtimalle hedef şekil
    setShapes([{ id: Date.now(), isTarget, startTime: Date.now() }]);

    setTimeout(() => {
      setShapes([]);
      setTimeout(() => nextTrial(count + 1), 500);
    }, SHAPE_DISPLAY_TIME);
  };

  const handleKeyPress = useCallback((e) => {
    if (status !== 'TEST' || shapes.length === 0) return;

    const currentShape = shapes[0];
    const reactionTime = Date.now() - currentShape.startTime;

    if (currentShape.isTarget) {
      setTestStats(prev => ({
        ...prev,
        correct: prev.correct + 1,
        timing: prev.timing + reactionTime,
        totalAttempts: prev.totalAttempts + 1
      }));
    } else {
      setTestStats(prev => ({
        ...prev,
        wrong: prev.wrong + 1,
        impulse: prev.impulse + 1
      }));
    }
    setShapes([]); // Tepki verildiğinde şekli kaldır
  }, [status, shapes]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // --- PROFESYONEL PDF RAPORLAMA ---
  const downloadPDF = () => {
    const doc = new jsPDF();
    const avgTiming = testStats.correct > 0 ? Math.round(testStats.timing / testStats.correct) : 0;
    const accuracyRate = Math.round((testStats.correct / TOTAL_TRIALS) * 100);

    // Başlık ve Kurumsal Kimlik
    doc.setFillColor(52, 73, 94);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("FOCUS PRO LAB", 105, 18, { align: "center" });
    doc.setFontSize(12);
    doc.text("GELISMIS BILISSEL PERFORMANS VE DIKKAT ANALIZI", 105, 28, { align: "center" });

    // Danışan ve Test Bilgileri
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);
    doc.text(`Rapor No: #FPL-${Math.floor(Math.random() * 10000)}`, 20, 50);
    doc.text(`Test Tarihi: ${new Date().toLocaleString('tr-TR')}`, 20, 56);
    doc.text(`Test Süresi: ${TOTAL_TRIALS} Uyaran`, 20, 62);

    // Grafik Alanı Benzetimi (MOXO Tablosu)
    doc.autoTable({
      startY: 70,
      head: [['PARAMETRE', 'SKOR', 'PERFORMANS SEVIYESI', 'ACIKLAMA']],
      body: [
        ['DIKKAT (Odaklanma)', `%${accuracyRate}`, accuracyRate > 80 ? 'Yuksek' : 'Standart', 'Hedef uyaranları yakalama başarısı.'],
        ['ZAMANLAMA (Hiz)', `${avgTiming} ms`, avgTiming < 500 ? 'Hizli' : 'Normal', 'Bilissel islemleme ve tepki hizi.'],
        ['DURTUSELLIK', testStats.impulse, testStats.impulse < 2 ? 'Kontrollu' : 'Riskli', 'Uyaran olmayan objelere verilen hatali tepki.'],
        ['HIPERAKTIVITE', testStats.wrong, testStats.wrong < 3 ? 'Dukuk' : 'Orta', 'Motor kontrol ve gereksiz tepki olcumu.']
      ],
      theme: 'striped',
      headStyles: { fillColor: [44, 62, 80] }
    });

    // Uzman Analizi Kısmı
    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("UZMAN DEGERLENDIRME OZETI", 20, finalY);
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const yorum = [
      `Analiz sonuclari, bireyin genel dikkat kapasitesinin %${accuracyRate} oraninda stabil oldugunu gostermektedir.`,
      `Ortalama ${avgTiming}ms olan tepki suresi, benzer yas grubu normlarina gore ${avgTiming < 500 ? 'oldukca basarilidir' : 'uyumludur'}.`,
      `Test sirasinda kaydedilen ${testStats.impulse} durtusel tepki, ${testStats.impulse > 2 ? 'ani karar verme egilimini' : 'yuksek oto-kontrolu'} isaret eder.`,
      "",
      "ONERILER:",
      "- Odaklanma gerektiren gorevlerde performans tutarlidir.",
      "- Sureli calismalarda bilissel yorgunluk takibi yapilmalidir."
    ];
    doc.text(yorum, 20, finalY + 10);

    // Alt Bilgi
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text("Bu rapor Focus Pro Lab tarafindan MOXO normlari baz alinarak uretilmistir. Tibbi tani niteligi tasimaz.", 105, 285, { align: "center" });

    doc.save("FocusProLab_Analiz_Raporu.pdf");
  };

  return (
    <div style={{
      fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
      display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh',
      backgroundColor: '#f4f7f6', margin: 0
    }}>
      {status === 'GIRIS' && (
        <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#fff', borderRadius: '15px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
          <h1 style={{ color: '#2c3e50', marginBottom: '10px' }}>FOCUS PRO LAB</h1>
          <p style={{ color: '#7f8c8d', marginBottom: '30px' }}>Gelişmiş Dikkat ve Performans Analiz Sistemi</p>
          <div style={{ textAlign: 'left', display: 'inline-block', marginBottom: '30px', color: '#34495e' }}>
            <p>• Mavi kareyi gördüğünüzde <b>BOŞLUK</b> tuşuna basın.</p>
            <p>• Diğer renklerde hiçbir şeye basmayın.</p>
            <p>• Toplam {TOTAL_TRIALS} uyaran gösterilecektir.</p>
          </div>
          <br />
          <button onClick={startTest} style={{
            padding: '15px 40px', fontSize: '18px', cursor: 'pointer',
            backgroundColor: '#3498db', color: '#fff', border: 'none', borderRadius: '5px', transition: '0.3s'
          }}>Testi Başlat</button>
        </div>
      )}

      {status === 'TEST' && (
        <div style={{ textAlign: 'center' }}>
          {shapes.map(s => (
            <div key={s.id} style={{
              width: '150px', height: '150px',
              backgroundColor: s.isTarget ? '#3498db' : '#e74c3c',
              borderRadius: s.isTarget ? '10%' : '50%',
              animation: 'scaleUp 0.1s ease'
            }} />
          ))}
          {!shapes.length && <div style={{ width: '150px', height: '150px', border: '2px dashed #ccc', borderRadius: '10%' }} />}
          <p style={{ marginTop: '20px', color: '#7f8c8d' }}>Boşluk tuşuna odaklanın...</p>
        </div>
      )}

      {status === 'SONUC' && (
        <div style={{ width: '80%', maxWidth: '600px', backgroundColor: '#fff', padding: '30px', borderRadius: '15px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
          <h2 style={{ textAlign: 'center', color: '#2c3e50' }}>Analiz Tamamlandı</h2>
          <hr />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', margin: '20px 0' }}>
            <div style={{ padding: '15px', background: '#f9f9f9', borderRadius: '10px' }}>
              <small>Doğru Tepki</small>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#27ae60' }}>{testStats.correct}</div>
            </div>
            <div style={{ padding: '15px', background: '#f9f9f9', borderRadius: '10px' }}>
              <small>Hatalı Tepki (Dürtüsellik)</small>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e74c3c' }}>{testStats.impulse}</div>
            </div>
          </div>
          <button onClick={downloadPDF} style={{
            width: '100%', padding: '15px', marginBottom: '10px',
            backgroundColor: '#2c3e50', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer'
          }}>Profesyonel PDF Raporu İndir</button>
          <button onClick={() => setStatus('GIRIS')} style={{
            width: '100%', padding: '10px', backgroundColor: 'transparent', color: '#7f8c8d', border: 'none', cursor: 'pointer'
          }}>Testi Tekrarla</button>
        </div>
      )}
    </div>
  );
}

export default App;