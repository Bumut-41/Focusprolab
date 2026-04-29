import React, { useState, useEffect, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// MOXO d-CPT Standart Uyaranları
const SHAPE_POOL = [
  { id: 'TARGET', shape: 'square', color: '#3b82f6', label: 'Hedef (Mavi Kare)' },
  { id: 'DIST_1', shape: 'circle', color: '#ef4444', label: 'Cekici 1' },
  { id: 'DIST_2', shape: 'triangle', color: '#10b981', label: 'Cekici 2' },
  { id: 'DIST_3', shape: 'diamond', color: '#f59e0b', label: 'Cekici 3' }
];

const CHAOS_COLORS = ['#ff0055', '#00ffcc', '#ffff00', '#ff8800', '#ff00ff', '#ffffff', '#00ff00'];

function App() {
  const [status, setStatus] = useState('GIRIS');
  const [currentTrial, setCurrentTrial] = useState(null);
  const [testLog, setTestLog] = useState([]);
  const [chaosColors, setChaosColors] = useState([]);
  const [currentStage, setCurrentStage] = useState(0);
  
  const STAGES = [
    { name: 'Temel-1', distractors: 0 },
    { name: 'Gorsel-1', distractors: 3 },
    { name: 'Gorsel-2', distractors: 6 },
    { name: 'Isitsel-1', distractors: 0, audio: true }, // Sesli simülasyonu
    { name: 'Isitsel-2', distractors: 0, audio: true },
    { name: 'Kombine-1', distractors: 4, audio: true },
    { name: 'Kombine-2', distractors: 8, audio: true },
    { name: 'Temel-2', distractors: 0 }
  ];

  const trialInStage = useRef(0);
  const pressCount = useRef(0);

  // Çeldirici Renk Kaosu (Sadece yanlardakiler için)
  useEffect(() => {
    let interval;
    if (status === 'TEST' && currentTrial) {
      interval = setInterval(() => {
        setChaosColors(currentTrial.sideDistractors.map(() => CHAOS_COLORS[Math.floor(Math.random() * CHAOS_COLORS.length)]));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [status, currentTrial]);

  const startNextTrial = useCallback(() => {
    if (trialInStage.current >= 5) { // Her aşama 5 trial (Örnekleme için kısa tutuldu)
      if (currentStage >= STAGES.length - 1) { setStatus('SONUC'); return; }
      setCurrentStage(prev => prev + 1);
      trialInStage.current = 0;
    }

    const isTarget = Math.random() > 0.6;
    const shape = isTarget ? SHAPE_POOL[0] : SHAPE_POOL[Math.floor(Math.random() * 3) + 1];
    
    const sideDistractors = Array.from({ length: STAGES[currentStage].distractors }, (_, i) => ({
      id: i,
      top: (Math.random() * 80 + 10) + '%',
      left: (Math.random() * 80 + 10) + '%'
    }));

    pressCount.current = 0;
    const startTime = Date.now();

    setCurrentTrial({
      shape,
      isTarget,
      sideDistractors,
      startTime,
      phase: 'ACTIVE' // Uyaran ekranda
    });

    // Kılavuz: 0.5 - 3 sn arası ekranda kalma
    setTimeout(() => {
      setCurrentTrial(prev => prev ? { ...prev, phase: 'VOID', voidStart: Date.now() } : null);
      
      // Kılavuz: Uyaran sonrası boşluk süresi
      setTimeout(() => {
        trialInStage.current++;
        startNextTrial();
      }, 1000);
    }, 1000);
  }, [currentStage]);

  const handleAction = useCallback(() => {
    if (!currentTrial || status !== 'TEST') return;
    
    pressCount.current++;
    const now = Date.now();
    const responseTime = now - currentTrial.startTime;
    
    const logEntry = {
      stage: STAGES[currentStage].name,
      isTarget: currentTrial.isTarget,
      phase: currentTrial.phase, // ACTIVE veya VOID
      rt: responseTime,
      multiPress: pressCount.current > 1
    };

    setTestLog(prev => [...prev, logEntry]);
  }, [currentTrial, currentStage, status]);

  // Puanlama Motoru (Kılavuz A-T-I-H Mantığı)
  const calculateKlinik = () => {
    const hits = testLog.filter(l => l.isTarget && l.phase === 'ACTIVE');
    const lateHits = testLog.filter(l => l.isTarget && l.phase === 'VOID'); // Zamanlama hatası
    const impulsives = testLog.filter(l => !l.isTarget); // Dürtüsellik
    const hyper = testLog.filter(l => l.multiPress).length;

    return {
      A: Math.max(1, 4 - Math.floor(hits.length / 5)), // Dikkat
      T: Math.max(1, 4 - Math.floor(lateHits.length / 2)), // Zamanlama
      I: Math.max(1, Math.min(4, impulsives.length)), // Dürtüsellik
      H: Math.max(1, Math.min(4, hyper)) // Hiper-Reaktivite
    };
  };

  const renderShape = (s, isCenter, color) => {
    const size = isCenter ? '140px' : '40px';
    const style = {
      width: size, height: size, backgroundColor: color || s.color,
      position: 'absolute',
      top: isCenter ? '50%' : s.top,
      left: isCenter ? '50%' : s.left,
      transform: isCenter ? 'translate(-50%, -50%)' : 'none',
      zIndex: isCenter ? 100 : 10,
      borderRadius: s.shape === 'circle' ? '50%' : '15%',
      border: isCenter ? '3px solid rgba(255,255,255,0.2)' : 'none'
    };
    return <div style={style} />;
  };

  return (
    <div style={{ backgroundColor: '#020617', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }} onMouseDown={handleAction}>
      {status === 'GIRIS' && (
        <div style={{ textAlign: 'center', padding: '50px', background: '#0f172a', borderRadius: '30px', border: '2px solid #3b82f6' }}>
          <h1>MOXO d-CPT Laboratuvarı</h1>
          <p>Sadece <b>MAVİ KARE</b> merkezde belirdiğinde tepki verin.</p>
          <div style={{ height: '150px', position: 'relative', margin: '20px 0' }}>{renderShape(SHAPE_POOL[0], true)}</div>
          <button style={{ padding: '15px 40px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer' }} onClick={() => { setStatus('TEST'); startNextTrial(); }}>TESTİ BAŞLAT</button>
        </div>
      )}

      {status === 'TEST' && (
        <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 20, left: 20, opacity: 0.3 }}>Asama: {STAGES[currentStage].name}</div>
          {currentTrial && currentTrial.phase === 'ACTIVE' && (
            <>
              {renderShape(currentTrial.shape, true)}
              {currentTrial.sideDistractors.map((d, i) => renderShape({ shape: 'circle' }, false, chaosColors[i]))}
            </>
          )}
        </div>
      )}

      {status === 'SONUC' && (
        <div style={{ textAlign: 'center', padding: '40px', background: '#0f172a', borderRadius: '25px' }}>
          <h2>Klinik Performans Profili</h2>
          <div style={{ display: 'flex', gap: '15px', margin: '30px 0' }}>
            {Object.entries(calculateKlinik()).map(([key, val]) => (
              <div key={key} style={{ background: '#1e293b', padding: '20px', borderRadius: '15px', borderBottom: `4px solid ${val > 2 ? '#ef4444' : '#10b981'}` }}>
                <h1 style={{ margin: 0 }}>{val}</h1>
                <p>{key === 'A' ? 'Dikkat' : key === 'T' ? 'Zamanlama' : key === 'I' ? 'Durtusellik' : 'Hiperaktivite'}</p>
              </div>
            ))}
          </div>
          <p style={{ opacity: 0.7 }}>*Skorlar 1 (Normal) - 4 (Siddetli Zorluk) arasındadır.</p>
          <button onClick={() => window.location.reload()} style={{ padding: '15px 30px', background: '#3b82f6', border: 'none', color: '#fff', borderRadius: '10px', cursor: 'pointer' }}>YENİDEN BAŞLA</button>
        </div>
      )}
    </div>
  );
}

export default App;
