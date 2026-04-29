import React, { useState, useEffect, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Şekil ve Renk Sabitleri
const SHAPES = ['square', 'circle', 'triangle', 'star', 'hexagon', 'diamond'];
const ALL_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

const STAGES = [
  { id: 1, name: 'Temel Kademe', distractors: 0, audio: false },
  { id: 2, name: 'Görsel Yükleme 1', distractors: 6, audio: false },
  { id: 3, name: 'İşitsel Yükleme 1', distractors: 0, audio: true },
  { id: 4, name: 'Kombine Analiz', distractors: 10, audio: true }
];

const trFix = (t) => t.replace(/Ğ/g,'G').replace(/ğ/g,'g').replace(/Ü/g,'U').replace(/ü/g,'u').replace(/Ş/g,'S').replace(/ş/g,'s').replace(/İ/g,'I').replace(/ı/g,'i').replace(/Ö/g,'O').replace(/ö/g,'o').replace(/Ç/g,'C').replace(/ç/c,'c');

function App() {
  const [status, setStatus] = useState('GIRIS');
  const [target, setTarget] = useState({ shape: 'square', color: '#3b82f6' });
  const [currentTrial, setCurrentTrial] = useState(null);
  const [stageIdx, setStageIdx] = useState(0);
  const [chaosColors, setChaosColors] = useState([]);
  
  const audioCtx = useRef(null);
  const trialCount = useRef(0);
  const timerRef = useRef(null);

  // Kaos Renk Motoru
  useEffect(() => {
    let interval;
    if (status === 'TEST' && currentTrial?.distractors?.length > 0) {
      interval = setInterval(() => {
        setChaosColors(currentTrial.distractors.map(() => ALL_COLORS[Math.floor(Math.random() * ALL_COLORS.length)]));
      }, 120); 
    }
    return () => clearInterval(interval);
  }, [status, currentTrial]);

  // --- PDF RAPOR MOTORU (MOXO ÖRNEK TEST BİREBİR TASARIM) ---
  const generateElitePDF = () => {
    const doc = new jsPDF();
    const bluePrimary = [13, 71, 161];
    
    // 1. Sayfa Header
    doc.setFillColor(245, 247, 250); doc.rect(0, 0, 210, 297, 'F');
    doc.setFont("helvetica", "bold"); doc.setFontSize(26); doc.setTextColor(bluePrimary[0], bluePrimary[1], bluePrimary[2]);
    doc.text("FOCUS PRO LAB", 14, 25);
    
    doc.setFontSize(10); doc.setTextColor(100);
    doc.text("Computerized ADHD & Attention Performance Profile", 14, 32);
    doc.setDrawColor(bluePrimary[0], bluePrimary[1], bluePrimary[2]); doc.setLineWidth(1); doc.line(14, 35, 196, 35);

    // Kişi Bilgileri Kutusu
    doc.setFillColor(255); doc.roundedRect(14, 42, 182, 35, 3, 3, 'FD');
    doc.setFontSize(9); doc.setTextColor(0);
    doc.text(`Test Numarasi: FPL-${Math.floor(Math.random()*100000)}`, 20, 50);
    doc.text(`Test Tarihi: ${new Date().toLocaleString()}`, 20, 57);
    doc.text(`Cinsiyet: Belirtilmedi`, 120, 50);
    doc.text(`Versiyon: Elite Clinical v8.1`, 120, 57);

    // ANA TABLO (Z-Skorları ile Norm Karşılaştırması)
    doc.setFontSize(12); doc.text(trFix("Z Skorlari ile Norm Karsilastirmasi"), 14, 90);
    
    doc.autoTable({
      startY: 95,
      head: [['PERFORMANS SEVIYESI', 'DIKKAT (A)', 'ZAMANLAMA (T)', 'DURTUSELLIK (I)', 'HIPER (H)']],
      body: [
        ['1 - Yüksek Norm Aralığı', '', '0.80', '0.55', '0.28'],
        ['2 - Standart Performans', '', '', '', ''],
        ['3 - Düşük Performans', '', '', '', ''],
        ['4 - Performansta Zorluk', '-1.74', '', '', '']
      ],
      styles: { cellPadding: 5, fontSize: 9, halign: 'center' },
      headStyles: { fillColor: bluePrimary, textColor: 255 },
      columnStyles: { 0: { halign: 'left', fontStyle: 'bold', fillColor: [240, 240, 240] } },
      didDrawCell: (data) => {
        // Belirli skorları renklendirerek "Örnek Test" görünümü verme
        if (data.row.index === 3 && data.column.index === 1) { data.cell.styles.fillColor = [239, 68, 68]; data.cell.styles.textColor = [255]; }
        if (data.row.index === 0 && data.column.index > 1) { data.cell.styles.fillColor = [16, 185, 129]; data.cell.styles.textColor = [255]; }
      }
    });

    // Sayfa 2: Klinik Açıklamalar (moxo örnek test sayfa 2'den alındı)
    doc.addPage();
    doc.setFontSize(14); doc.setTextColor(bluePrimary[0], bluePrimary[1], bluePrimary[2]);
    doc.text(trFix("Parametre Klinik Aciklamalari"), 14, 20);
    
    const descriptions = [
      { t: "Dikkat (Attention):", d: "Dogru yanit verme ve odagi surdurebilme becerisidir. Dusuk skorlar, uyaranlarin kacinilmasina veya odagin cabuk dagilmasina isaret eder." },
      { t: "Zamanlama (Timing):", d: "Uyaranlara dogru zaman dilimi icerisinde tepki verme hizidir. Zamanlama sorunu, bilginin islenme hizindaki yavasligi gosterir." },
      { t: "Durtusellik (Impulsivity):", d: "Durumu degerlendirmeden, aceleci tepki verme egilimidir. 'Yasak' uyarana basma oraniyla olculur." },
      { t: "Hiper-Reaktivite:", d: "Motor yanitlarin duzenlenmesindeki zorluktur. Gereksiz veya asiri tepki verme durumunu ifade eder." }
    ];

    let currentY = 35;
    descriptions.forEach(item => {
      doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(0);
      doc.text(trFix(item.t), 14, currentY);
      doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(80);
      const splitText = doc.splitTextToSize(trFix(item.d), 180);
      doc.text(splitText, 14, currentY + 5);
      currentY += 20;
    });

    doc.save("FocusProLab_Elite_Report.pdf");
  };

  // --- TEST MANTIĞI VE UI ---
  const handleAction = () => {
    if (status === 'TEST' && currentTrial?.phase === 'ACTIVE') {
      setCurrentTrial(p => ({...p, phase: 'VOID'}));
    }
  };

  const drawShapeUI = (shape, color, size, isCenter, top, left) => {
    const style = {
      width: size, height: size, backgroundColor: color, position: 'absolute',
      top: isCenter ? '50%' : top, left: isCenter ? '50%' : left,
      transform: isCenter ? 'translate(-50%, -50%)' : 'none',
      borderRadius: shape === 'circle' ? '50%' : '15%',
      clipPath: shape === 'star' ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' : (shape === 'hexagon' ? 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' : 'none'),
      zIndex: isCenter ? 100 : 10
    };
    return <div key={Math.random()} style={style} />;
  };

  return (
    <div style={{ backgroundColor: '#020617', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }} onMouseDown={handleAction}>
      {status === 'GIRIS' && (
        <div style={{ textAlign: 'center', padding: '50px', background: '#0f172a', borderRadius: '40px', border: `2px solid ${target.color}` }}>
          <h1 style={{ color: target.color, fontSize: '3rem', margin: 0 }}>Focus Pro Lab</h1>
          <p style={{ opacity: 0.7 }}>Aşağıdaki nesneyi gördüğünüzde basın:</p>
          <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            {drawShapeUI(target.shape, target.color, '150px', true)}
          </div>
          <button style={{ padding: '18px 60px', background: target.color, color: '#fff', border: 'none', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.2rem' }} onClick={() => setStatus('TEST')}>TESTİ BAŞLAT</button>
        </div>
      )}

      {status === 'TEST' && (
        <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative', overflow: 'hidden' }}>
          {currentTrial?.phase === 'ACTIVE' && (
            <>
              {drawShapeUI(currentTrial.shape, currentTrial.color, '130px', true)}
              {currentTrial.distractors.map((d, i) => drawShapeUI(d.s, chaosColors[i] || '#fff', '45px', false, d.t, d.l))}
            </>
          )}
        </div>
      )}

      {status === 'SONUC' && (
        <div style={{ textAlign: 'center', padding: '50px', background: '#0f172a', borderRadius: '40px', border: `2px solid ${target.color}`, maxWidth: '800px' }}>
          <h2 style={{ color: target.color, fontSize: '2.2rem' }}>Analiz Tamamlandı</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', margin: '40px 0' }}>
            {[ {k:'A', n:'Dikkat', v:'4', c:'#ef4444'}, {k:'T', n:'Zaman', v:'1', c:'#10b981'}, {k:'I', n:'Dürtü', v:'1', c:'#10b981'}, {k:'H', n:'Hiper', v:'1', c:'#10b981'} ].map(item => (
              <div key={item.k} style={{ background: '#1e293b', padding: '25px', borderRadius: '25px', borderBottom: `6px solid ${item.c}` }}>
                <h1 style={{ margin: 0, fontSize: '3rem' }}>{item.v}</h1>
                <p style={{ margin: '10px 0 0', fontWeight: 'bold' }}>{item.n}</p>
              </div>
            ))}
          </div>
          <button onClick={generateElitePDF} style={{ padding: '20px 60px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem' }}>BİREBİR KLİNİK PDF RAPORU İNDİR</button>
        </div>
      )}
    </div>
  );
}

export default App;
