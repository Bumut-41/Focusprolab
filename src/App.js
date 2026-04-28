import React, { useState, useEffect, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

function App() {
  const [status, setStatus] = useState('GIRIS'); 
  const [shapes, setShapes] = useState([]);
  const [testStats, setTestStats] = useState({
    correct: 0,
    wrong: 0,
    missed: 0,
    timing: 0,
    impulse: 0,
    totalAttempts: 0
  });

  const TOTAL_TRIALS = 20; 
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

    const isTarget = Math.random() > 0.4; 
    setShapes([{ id: Date.now(), isTarget, startTime: Date.now() }]);

    setTimeout(() => {
      setShapes([]);
      setTimeout(() => nextTrial(count + 1), 500);
    }, SHAPE_DISPLAY_TIME);
  };

  const handleKeyPress = useCallback((e) => {
    if (e.code !== 'Space' || status !== 'TEST' || shapes.length === 0) return;

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
    setShapes([]); 
  }, [status, shapes]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  const downloadPDF = () => {
    const doc = new jsPDF();
    const avgTiming = testStats.correct > 0 ? Math.round(testStats.timing / testStats.correct) : 0;
    const accuracyRate = Math.round((testStats.correct / TOTAL_TRIALS) * 100);

    doc.setFillColor(52, 73, 94);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("FOCUS PRO LAB", 105, 18, { align: "center" });
    doc.setFontSize(12);
    doc.text("GELISMIS BILISSEL PERFORMANS VE DIKKAT ANALIZI", 105, 28, { align: "center" });

    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);
    doc.text(`Rapor No: #FPL-${Math.floor(Math.random() * 10000)}`, 20, 50);
    doc.text(`Test Tarihi: ${new Date().toLocaleString('tr-TR')}`, 20, 56);

    doc.autoTable({
      startY: 70,
      head: [['PARAMETRE', 'SKOR', 'PERFORMANS SEVIYESI', 'ACIKLAMA']],
      body: [
        ['DIKKAT', `%${accuracyRate}`, accuracyRate > 80 ? 'Yuksek' : 'Standart', 'Hedef uyaranlari yakalama basarisi.'],
        ['ZAMANLAMA', `${avgTiming} ms`, avgTiming < 500 ? 'Hizli' : 'Normal', 'Bilissel tepki hizi.'],
        ['DURTUSELLIK', testStats.impulse, testStats.impulse < 2 ? 'Kontrollu' : 'Riskli', 'Hatali tepki olcumu.'],
        ['HIPERAKTIVITE', testStats.wrong, testStats.wrong < 3 ? 'Dusuk' : 'Orta', 'Motor kontrol olcumu.']
      ],
      theme: 'striped',
      headStyles: { fillColor: [44, 62, 80] }
    });

    doc.save("FocusProLab_Rapor.pdf");
  };

  return (
    <div style={{ textAlign: 'center', fontFamily: 'sans-serif', paddingTop: '50px' }}>
      {status === 'GIRIS' && (
        <div>
          <h1>FOCUS PRO LAB</h1>
          <p>Mavi kareyi görünce <b>BOŞLUK</b> tuşuna basın.</p>
          <button onClick={startTest} style={{ padding: '15px 30px', fontSize: '18px', cursor: 'pointer' }}>TESTE BAŞLA</button>
        </div>
      )}

      {status === 'TEST' && (
        <div>
          {shapes.map(s => (
            <div key={s.id} style={{
              width: '150px', height: '150px', margin: 'auto',
              backgroundColor: s.isTarget ? '#3498db' : '#e74c3c',
              borderRadius: s.isTarget ? '10%' : '50%'
            }} />
          ))}
        </div>
      )}

      {status === 'SONUC' && (
        <div>
          <h2>Test Tamamlandı</h2>
          <button onClick={downloadPDF} style={{ padding: '15px 30px', cursor: 'pointer' }}>PROFESYONEL PDF RAPORU INDIR</button>
        </div>
      )}
    </div>
  );
}

export default App;
