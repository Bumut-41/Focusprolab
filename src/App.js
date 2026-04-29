import React, { useState, useEffect, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const SHAPE_POOL = [
  { id: 'TARGET', shape: 'square', color: '#3b82f6', label: 'Mavi Kare' },
  { id: 'DIST_1', shape: 'circle', color: '#ef4444', label: 'Cekici 1' },
  { id: 'DIST_2', shape: 'triangle', color: '#10b981', label: 'Cekici 2' },
  { id: 'DIST_3', shape: 'diamond', color: '#f59e0b', label: 'Cekici 3' }
];

const CHAOS_COLORS = ['#ff0055', '#00ffcc', '#ffff00', '#ff8800', '#ff00ff', '#ffffff', '#00ff00'];

const STAGES = [
  { name: 'Temel-1', distractors: 0, audio: false },
  { name: 'Gorsel-1', distractors: 2, audio: false },
  { name: 'Gorsel-2', distractors: 4, audio: false },
  { name: 'Isitsel-1', distractors: 0, audio: true },
  { name: 'Isitsel-2', distractors: 0, audio: true },
  { name: 'Kombine-1', distractors: 3, audio: true },
  { name: 'Kombine-2', distractors: 6, audio: true },
  { name: 'Temel-2', distractors: 0, audio: false }
];

function App() {
  const [status, setStatus] = useState('GIRIS');
  const [currentTrial, setCurrentTrial] = useState(null);
  const [testLog, setTestLog] = useState([]);
  const [chaosColors, setChaosColors] = useState([]);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  
  const trialInStage = useRef(0);
  const pressCount = useRef(0);
  const timerRef = useRef(null);

  const trFix = (t) => t.replace(/Ğ/g,'G').replace(/ğ/g,'g').replace(/Ü/g,'U').replace(/ü/g,'u').replace(/Ş/g,'S').replace(/ş/g,'s').replace(/İ/g,'I').replace(/ı/g,'i').replace(/Ö/g,'O').replace(/ö/g,'o').replace(/Ç/g,'C').replace(/ç/g,'c');

  // Renk Kaosu Effect
  useEffect(() => {
    let interval;
    if (status === 'TEST' && currentTrial?.phase === 'ACTIVE') {
      interval = setInterval(() => {
        setChaosColors(prev => currentTrial.sideDistractors.map(() => CHAOS_COLORS[Math.floor(Math.random() * CHAOS_COLORS.length)]));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [status, currentTrial]);

  const startNextTrial = useCallback(() => {
    // AŞAMA KONTROLÜ
    if (trialInStage.current >= 6) { // Her aşama 6 uyaran
      if (currentStageIndex >= STAGES.length - 1) {
        setStatus('SONUC');
        return;
      }
      setCurrentStageIndex(prev => prev + 1);
      trialInStage.current = 0;
      return; // Stage artınca useEffect üzerinden yeni trial başlar
    }

    const isTarget = Math.random() > 0.6;
    const shape = isTarget ? SHAPE_POOL[0] : SHAPE_POOL[Math.floor(Math.random() * 3) + 1];
    
    // Yan çeldiriciler
    const sideDistractors = Array.from({ length: STAGES[currentStageIndex].distractors }, (_, i) => ({
      id: i,
      top: (Math.random() * 70 + 15) + '%',
      left: (Math.random() * 70 + 15) + '%'
    }));

    pressCount.current = 0;
    setCurrentTrial({
      shape,
      isTarget,
      sideDistractors,
      startTime: Date.now(),
      phase: 'ACTIVE'
    });

    // Kılavuz Protokolü: Uyaran süresi 1sn + Boşluk süresi 1sn
    timerRef.current = setTimeout(() => {
      setCurrentTrial(prev => prev ? { ...prev, phase: 'VOID', voidStart: Date.now() } : null);
      
      timerRef.current = setTimeout(() => {
        trialInStage.current++;
        startNextTrial();
      }, 1000);
    }, 1500);
  }, [currentStageIndex]);

  // Stage değiştiğinde testi tetikle (Beyaz ekranı çözen kısım)
  useEffect(() => {
    if (status === 'TEST') {
      startNextTrial();
    }
    return () => clearTimeout(timerRef.current);
  }, [currentStageIndex, status]);

  const handleAction = useCallback((e) => {
    if (!currentTrial || status !== 'TEST') return;
    
    pressCount.current++;
    const now = Date.now();
    const rt = now - currentTrial.startTime;
    
    setTestLog(prev => [...prev, {
      stage: STAGES[currentStageIndex].name,
      isTarget: currentTrial.isTarget,
      phase: currentTrial.phase,
      rt,
      multiPress: pressCount.current > 1
    }]);

    // Görsel geri bildirim için uyaranı gizle (opsiyonel)
    if (currentTrial.phase === 'ACTIVE') {
        setCurrentTrial(prev => ({...prev, phase: 'VOID'}));
    }
  }, [currentTrial, currentStageIndex, status]);

  const calculateStats = () => {
    const hits = testLog.filter(l => l.isTarget && l.phase === 'ACTIVE');
    const lateHits = testLog.filter(l => l.isTarget && l.phase === 'VOID');
    const impulsives = testLog.filter(l => !l.isTarget);
    const hyper = testLog.filter(l => l.multiPress).length;

    return {
      A: Math.max(1, 4 - Math.floor(hits.length / 8)), 
      T: Math.max(1, 4 - Math.floor(lateHits.length / 3)),
      I: Math.max(1, Math.min(4, Math.floor(impulsives.length / 2))),
      H: Math.max(1, Math.min(4, hyper))
    };
  };

  const renderShape = (s, isCenter, color) => {
    const size = isCenter ? '140px' : '45px';
    const style = {
      width: size, height: size, backgroundColor: color || s.color,
      position: 'absolute',
      top: isCenter ? '50%' : s.top,
      left: isCenter ? '50%' : s.left,
      transform: isCenter ? 'translate(-50%, -50%)' : 'none',
      zIndex: isCenter ? 100 : 10,
      borderRadius: s.shape === 'circle' ? '50%' : '15%',
      boxShadow: isCenter ? '0 0 30px rgba(255,255,255,0.1)' : 'none'
    };
    return <div key={isCenter ? 'center' : Math.random()} style={style} />;
  };

  return (
    <div style={{ backgroundColor: '#020617', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }} onMouseDown={handleAction}>
      {status === 'GIRIS' && (
        <div style={{ textAlign: 'center', padding: '50px', background: '#0f172a', borderRadius: '30px', border: '2px solid #3b82f6', maxWidth: '500px' }}>
          <h1 style={{color: '#3b82f6'}}>Focus Pro Klinik</h1>
          <p>Sadece merkeze gelen <b>MAVİ KARE</b> uyarısına tepki verin.</p>
          <div style={{ height: '180px', position: 'relative' }}>{renderShape(SHAPE_POOL[0], true)}</div>
          <button style={{ padding: '15px 50px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setStatus('TEST')}>TESTE BASLA</button>
        </div>
      )}

      {status === 'TEST' && (
        <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 20, left: 20, opacity: 0.4 }}>Bolum: {STAGES[currentStageIndex].name}</div>
          {currentTrial && currentTrial.phase === 'ACTIVE' && (
            <>
              {renderShape(currentTrial.shape, true)}
              {currentTrial.sideDistractors.map((d, i) => renderShape({ shape: 'circle' }, false, chaosColors[i]))}
            </>
          )}
        </div>
      )}

      {status === 'SONUC' && (
        <div style={{ textAlign: 'center', padding: '40px', background: '#0f172a', borderRadius: '25px', border: '2px solid #3b82f6' }}>
          <h2 style={{color: '#3b82f6'}}>MOXO Klinik Profili</h2>
          <div style={{ display: 'flex', gap: '15px', margin: '30px 0' }}>
            {Object.entries(calculateStats()).map(([key, val]) => (
              <div key={key} style={{ background: '#1e293b', padding: '20px', borderRadius: '15px', borderBottom: `5px solid ${val > 2 ? '#ef4444' : '#10b981'}` }}>
                <h1 style={{ margin: 0 }}>{val}</h1>
                <small>{key === 'A' ? 'DIKKAT' : key === 'T' ? 'ZAMANLAMA' : key === 'I' ? 'DURTUSELLIK' : 'HIPER'}</small>
              </div>
            ))}
          </div>
          <button onClick={() => window.location.reload()} style={{ padding: '12px 30px', background: '#3b82f6', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer' }}>YENIDEN BASLA</button>
        </div>
      )}
    </div>
  );
}

export default App;
