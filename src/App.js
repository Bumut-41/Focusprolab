import React, { useEffect, useRef, useState } from "react";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Legend,
  Tooltip
} from "chart.js";

pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;
ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Legend, Tooltip);

const SHAPES = [
  { id: "circle", label: "Daire" },
  { id: "square", label: "Kare" },
  { id: "triangle", label: "Üçgen" },
  { id: "diamond", label: "Elmas" },
  { id: "pentagon", label: "Beşgen" },
  { id: "hexagon", label: "Altıgen" },
  { id: "vertical", label: "Dikey Dikdörtgen" },
  { id: "horizontal", label: "Yatay Dikdörtgen" },
  { id: "plus", label: "Artı" },
  { id: "xshape", label: "Çarpı" }
];

const COLORS = [
  "#2563EB", "#16A34A", "#DC2626", "#F59E0B", "#7C3AED",
  "#0891B2", "#DB2777", "#65A30D", "#EA580C", "#0F172A"
];

const GIF_FILES = {
  top: { name: "Top", gif: "/distractors/top.gif", sound: "/distractors/top.mp3", size: 235 },
  kosan: { name: "Koşan İnsan", gif: "/distractors/kosan.gif", sound: "/distractors/kosan.mp3", size: 235 },
  kedi: { name: "Kedi", gif: "/distractors/kedi.gif", sound: "/distractors/kedi.mp3", size: 230 },
  araba: { name: "Araba", gif: "/distractors/araba.gif", sound: "/distractors/araba.mp3", size: 240 },
  agac: { name: "Ağaç", gif: "/distractors/agac.gif", sound: "/distractors/agac.mp3", size: 235 },
  arabakorna: { name: "Araba Korna", gif: "/distractors/arabakorna.gif", sound: "/distractors/arabakorna.mp3", size: 240 },
  asansor: { name: "Asansör", gif: "/distractors/asansor.gif", sound: "/distractors/asansor.mp3", size: 235 },
  camtemizlik: { name: "Cam Temizliği", gif: "/distractors/camtemizlik.gif", sound: "/distractors/camtemizlik.mp3", size: 240 },
  kapi: { name: "Kapı", gif: "/distractors/kapi.gif", sound: "/distractors/kapi.mp3", size: 235 },
  motorsiklet: { name: "Motorsiklet", gif: "/distractors/motorsiklet.gif", sound: "/distractors/motorsiklet.mp3", size: 240 },
  televizyon: { name: "Televizyon", gif: "/distractors/televizyon.gif", sound: "/distractors/televizyon.mp3", size: 240 }
};

const INDEPENDENT_SOUNDS = {
  alarm: "/distractors/alarm.mp3",
  cekic: "/distractors/cekic.mp3",
  gemi: "/distractors/gemi.mp3",
  sudamlasi: "/distractors/sudamlasi.mp3",
  kussesi: "/distractors/kussesi.mp3",
  hilti: "/distractors/hilti.mp3",
  tren: "/distractors/tren.mp3",
  matkap: "/distractors/matkap.mp3",
  insan: "/distractors/insan.mp3",
  testere: "/distractors/testere.mp3"
};

const TEST_DURATION_MS = 280000;
const PHASE_1_END = 50000;
const PHASE_2_END = 100000;
const PHASE_3_END = 150000;
const PHASE_4_END = 200000;
const PHASE_5_END = 250000;
const LATE_RESPONSE_MS = 800;
const TARGET_PROBABILITY = 0.4;

const FIXED_GIF_EVENTS = [
  { at: 52000, duration: 5000, items: [{ key: "kedi", area: "left", zone: "middle", silent: true }] },
  { at: 57000, duration: 5000, items: [{ key: "agac", area: "left", zone: "middle", silent: true }, { key: "araba", area: "right", zone: "middle", silent: true }] },
  { at: 62000, duration: 5000, items: [{ key: "top", area: "right", zone: "upper", silent: true }] },
  { at: 67000, duration: 5000, items: [{ key: "kosan", area: "left", zone: "upper", silent: true }, { key: "televizyon", area: "right", zone: "upper", silent: true }] },
  { at: 72000, duration: 5000, items: [{ key: "asansor", area: "left", zone: "lower", silent: true }] },
  { at: 77000, duration: 5000, items: [{ key: "camtemizlik", area: "left", zone: "lower", silent: true }, { key: "arabakorna", area: "right", zone: "lower", silent: true }] },
  { at: 82000, duration: 5000, items: [{ key: "kapi", area: "right", zone: "middle", silent: true }] },
  { at: 87000, duration: 5000, items: [{ key: "motorsiklet", area: "left", zone: "upper", silent: true }, { key: "agac", area: "right", zone: "upper", silent: true }] },
  { at: 92000, duration: 5000, items: [{ key: "araba", area: "right", zone: "lower", silent: true }] },
  { at: 153000, duration: 8000, items: [{ key: "agac", area: "left", zone: "middle", silent: true }, { key: "arabakorna", area: "right", zone: "middle", silent: false }] },
  { at: 161000, duration: 8000, items: [{ key: "motorsiklet", area: "left", zone: "upper", silent: false }] },
  { at: 169000, duration: 8000, items: [{ key: "kedi", area: "left", zone: "middle", silent: true }, { key: "televizyon", area: "right", zone: "middle", silent: false }] },
  { at: 177000, duration: 8000, items: [{ key: "kapi", area: "right", zone: "upper", silent: false }] },
  { at: 185000, duration: 8000, items: [{ key: "camtemizlik", area: "left", zone: "lower", silent: false }, { key: "araba", area: "right", zone: "lower", silent: true }] },
  { at: 193000, duration: 8000, items: [{ key: "asansor", area: "right", zone: "middle", silent: false }] }
];

const FIXED_SOUND_EVENTS = [
  { at: 104000, duration: 10000, key: "alarm" },
  { at: 116000, duration: 10000, key: "insan" },
  { at: 128000, duration: 10000, key: "matkap" },
  { at: 140000, duration: 10000, key: "tren" }
];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function ShapeView({ shape, color, size = 120 }) {
  const base = { width: size, height: size, background: color, display: "inline-block" };

  if (shape === "circle") return <div style={{ ...base, borderRadius: "50%" }} />;
  if (shape === "square") return <div style={base} />;
  if (shape === "triangle") return <div style={{ ...base, clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }} />;
  if (shape === "diamond") return <div style={{ ...base, transform: "rotate(45deg)" }} />;
  if (shape === "pentagon") return <div style={{ ...base, clipPath: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)" }} />;
  if (shape === "hexagon") return <div style={{ ...base, clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)" }} />;
  if (shape === "vertical") return <div style={{ width: size * 0.45, height: size, background: color, display: "inline-block" }} />;
  if (shape === "horizontal") return <div style={{ width: size, height: size * 0.45, background: color, display: "inline-block" }} />;

  if (shape === "plus") {
    return (
      <div style={{ width: size, height: size, position: "relative", display: "inline-block" }}>
        <div style={{ position: "absolute", left: size * 0.4, top: 0, width: size * 0.2, height: size, background: color }} />
        <div style={{ position: "absolute", left: 0, top: size * 0.4, width: size, height: size * 0.2, background: color }} />
      </div>
    );
  }

  if (shape === "xshape") {
    return (
      <div style={{ width: size, height: size, position: "relative", display: "inline-block" }}>
        <div style={{ position: "absolute", left: size * 0.43, top: 0, width: size * 0.14, height: size, background: color, transform: "rotate(45deg)" }} />
        <div style={{ position: "absolute", left: size * 0.43, top: 0, width: size * 0.14, height: size, background: color, transform: "rotate(-45deg)" }} />
      </div>
    );
  }

  return null;
}

function getShapeSvg(shape, color) {
  if (shape === "circle") return `<svg width="80" height="80" viewBox="0 0 80 80"><circle cx="40" cy="40" r="35" fill="${color}"/></svg>`;
  if (shape === "square") return `<svg width="80" height="80" viewBox="0 0 80 80"><rect x="12" y="12" width="56" height="56" fill="${color}"/></svg>`;
  if (shape === "triangle") return `<svg width="80" height="80" viewBox="0 0 80 80"><polygon points="40,8 8,72 72,72" fill="${color}"/></svg>`;
  if (shape === "diamond") return `<svg width="80" height="80" viewBox="0 0 80 80"><polygon points="40,6 74,40 40,74 6,40" fill="${color}"/></svg>`;
  if (shape === "pentagon") return `<svg width="80" height="80" viewBox="0 0 80 80"><polygon points="40,6 74,32 61,72 19,72 6,32" fill="${color}"/></svg>`;
  if (shape === "hexagon") return `<svg width="80" height="80" viewBox="0 0 80 80"><polygon points="22,8 58,8 74,40 58,72 22,72 6,40" fill="${color}"/></svg>`;
  if (shape === "vertical") return `<svg width="80" height="80" viewBox="0 0 80 80"><rect x="28" y="6" width="24" height="68" fill="${color}"/></svg>`;
  if (shape === "horizontal") return `<svg width="80" height="80" viewBox="0 0 80 80"><rect x="6" y="28" width="68" height="24" fill="${color}"/></svg>`;
  if (shape === "plus") return `<svg width="80" height="80" viewBox="0 0 80 80"><rect x="32" y="8" width="16" height="64" fill="${color}"/><rect x="8" y="32" width="64" height="16" fill="${color}"/></svg>`;

  return `<svg width="80" height="80" viewBox="0 0 80 80"><line x1="15" y1="15" x2="65" y2="65" stroke="${color}" stroke-width="14" stroke-linecap="round"/><line x1="65" y1="15" x2="15" y2="65" stroke="${color}" stroke-width="14" stroke-linecap="round"/></svg>`;
}

function getGifPosition(area, zone, fileName) {
  const rowMap = { upper: 26, middle: 50, lower: 74 };
  let left = area === "left" ? 18 : 82;
  let top = rowMap[zone] || 50;

  if (area === "right" && (fileName === "Araba" || fileName === "Araba Korna")) {
    left = 83;
    top = Math.max(26, top - 2);
  }

  return { left, top };
}

export default function App() {
  const [view, setView] = useState("START");
  const [scene, setScene] = useState(null);
  const [target, setTarget] = useState(null);
  const [gifDistractors, setGifDistractors] = useState([]);

  const targetRef = useRef(null);
  const trialLog = useRef([]);
  const currentTrial = useRef(null);
  const timer = useRef(null);
  const testClockTimer = useRef(null);
  const eventTimers = useRef([]);
  const chartRef = useRef(null);
  const lastInputTime = useRef(0);
  const audioRefs = useRef({});
  const isPlayingRef = useRef(false);
  const testStartTimeRef = useRef(0);

  const createNewTarget = () => {
    const newTarget = { shape: randomItem(SHAPES).id, color: randomItem(COLORS) };
    targetRef.current = newTarget;
    setTarget(newTarget);
  };

  const getElapsedMs = () => {
    if (!testStartTimeRef.current) return 0;
    return performance.now() - testStartTimeRef.current;
  };

  const getPhaseInfo = (elapsedMs = getElapsedMs()) => {
    if (elapsedMs < PHASE_1_END) return { phase: 1, name: "Alışma", stimulusDuration: 1200, gapDuration: 1000 };
    if (elapsedMs < PHASE_2_END) return { phase: 2, name: "Sessiz GIF", stimulusDuration: 900, gapDuration: 700 };
    if (elapsedMs < PHASE_3_END) return { phase: 3, name: "Bağımsız Ses", stimulusDuration: 900, gapDuration: 700 };
    if (elapsedMs < PHASE_4_END) return { phase: 4, name: "Sesli ve Sessiz GIF", stimulusDuration: 650, gapDuration: 550 };
    if (elapsedMs < PHASE_5_END) return { phase: 5, name: "Hızlı Uyaran", stimulusDuration: 500, gapDuration: 450 };
    return { phase: 6, name: "Yavaş Kapanış", stimulusDuration: 1500, gapDuration: 1300 };
  };

  const clearEventTimers = () => {
    eventTimers.current.forEach((id) => clearTimeout(id));
    eventTimers.current = [];
  };

  const stopAllAudio = () => {
    Object.values(audioRefs.current).forEach((audio) => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.loop = false;
        audio.src = "";
      }
    });
    audioRefs.current = {};
  };

  const stopAllSystems = () => {
    clearEventTimers();
    stopAllAudio();
    setGifDistractors([]);
  };

  const removeGifItem = (id) => {
    const audio = audioRefs.current[id];
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.loop = false;
      audio.src = "";
      delete audioRefs.current[id];
    }
    setGifDistractors((prev) => prev.filter((item) => item.id !== id));
  };

  const showFixedGifEvent = (eventIndex) => {
    const event = FIXED_GIF_EVENTS[eventIndex];
    if (!event || !isPlayingRef.current) return;

    const items = event.items.map((raw, index) => {
      const file = GIF_FILES[raw.key];
      const position = getGifPosition(raw.area, raw.zone, file.name);
      const id = `gif-${eventIndex}-${index}-${Date.now()}`;
      return {
        id,
        name: file.name,
        gif: file.gif,
        sound: raw.silent ? null : file.sound,
        left: position.left,
        top: position.top,
        area: raw.area,
        zone: raw.zone,
        size: file.size
      };
    });

    setGifDistractors((prev) => [...prev, ...items]);

    items.forEach((item) => {
      if (item.sound) {
        const audio = new Audio(item.sound);
        audio.loop = true;
        audio.volume = 0.7;
        audioRefs.current[item.id] = audio;
        audio.play().catch(() => removeGifItem(item.id));
      }
      const removeTimer = setTimeout(() => removeGifItem(item.id), event.duration);
      eventTimers.current.push(removeTimer);
    });
  };

  const playFixedIndependentSound = (eventIndex) => {
    const event = FIXED_SOUND_EVENTS[eventIndex];
    if (!event || !isPlayingRef.current) return;
    const soundPath = INDEPENDENT_SOUNDS[event.key];
    if (!soundPath) return;

    const id = `sound-${eventIndex}-${Date.now()}`;
    const audio = new Audio(soundPath);
    audio.volume = 0.7;
    audioRefs.current[id] = audio;
    audio.play().catch(() => delete audioRefs.current[id]);

    const stopTimer = setTimeout(() => {
      if (audioRefs.current[id]) {
        audio.pause();
        audio.currentTime = 0;
        audio.src = "";
        delete audioRefs.current[id];
      }
    }, event.duration);

    eventTimers.current.push(stopTimer);
  };

  const scheduleFixedEvents = () => {
    clearEventTimers();
    FIXED_GIF_EVENTS.forEach((event, index) => {
      const timerId = setTimeout(() => showFixedGifEvent(index), event.at);
      eventTimers.current.push(timerId);
    });
    FIXED_SOUND_EVENTS.forEach((event, index) => {
      const timerId = setTimeout(() => playFixedIndependentSound(index), event.at);
      eventTimers.current.push(timerId);
    });
  };

  useEffect(() => {
    createNewTarget();
    return () => {
      clearTimeout(timer.current);
      clearTimeout(testClockTimer.current);
      stopAllSystems();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.code === "Space") {
        event.preventDefault();
        registerResponse();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const registerResponse = () => {
    const now = performance.now();
    if (now - lastInputTime.current < 120) return;
    lastInputTime.current = now;
    handleResponse();
  };

  const createNonTargetObject = () => {
    const currentTarget = targetRef.current;
    let obj;
    do {
      obj = { shape: randomItem(SHAPES).id, color: randomItem(COLORS) };
    } while (obj.shape === currentTarget.shape && obj.color === currentTarget.color);
    return obj;
  };

  const startTest = () => {
    trialLog.current = [];
    currentTrial.current = null;
    lastInputTime.current = 0;
    clearTimeout(timer.current);
    clearTimeout(testClockTimer.current);
    stopAllSystems();
    setScene(null);
    testStartTimeRef.current = performance.now();
    isPlayingRef.current = true;
    setView("PLAY");
    scheduleFixedEvents();
    testClockTimer.current = setTimeout(() => finishTest(), TEST_DURATION_MS);
  };

  const finishTest = () => {
    clearTimeout(timer.current);
    clearTimeout(testClockTimer.current);
    const t = currentTrial.current;
    if (t) {
      trialLog.current.push({
        trialNumber: t.trialNumber,
        section: t.section,
        isTarget: t.isTarget,
        shownShape: t.shownShape,
        shownColor: t.shownColor,
        targetShape: t.targetShape,
        targetColor: t.targetColor,
        responded: t.responded,
        reactionTime: t.reactionTime || 0,
        responseCount: t.responses.length
      });
    }
    currentTrial.current = null;
    setScene(null);
    isPlayingRef.current = false;
    stopAllSystems();
    setView("END");
  };

  const newTest = () => {
    clearTimeout(timer.current);
    clearTimeout(testClockTimer.current);
    isPlayingRef.current = false;
    stopAllSystems();
    trialLog.current = [];
    currentTrial.current = null;
    lastInputTime.current = 0;
    testStartTimeRef.current = 0;
    setScene(null);
    createNewTarget();
    setView("START");
  };

  const handleResponse = () => {
    if (!currentTrial.current) return;
    const now = performance.now();
    currentTrial.current.responses.push(now);
    if (!currentTrial.current.responded) {
      currentTrial.current.responded = true;
      currentTrial.current.reactionTime = now - currentTrial.current.startTime;
    }
  };

  const nextTrial = () => {
    if (!isPlayingRef.current) return;
    const elapsed = getElapsedMs();
    if (elapsed >= TEST_DURATION_MS) {
      finishTest();
      return;
    }
    const phase = getPhaseInfo(elapsed);
    const trialNumber = trialLog.current.length + 1;
    const isTarget = Math.random() < TARGET_PROBABILITY;
    const currentTarget = targetRef.current;
    const shownObject = isTarget ? { ...currentTarget } : createNonTargetObject();

    currentTrial.current = {
      trialNumber,
      section: phase.name,
      isTarget,
      shownShape: shownObject.shape,
      shownColor: shownObject.color,
      targetShape: currentTarget.shape,
      targetColor: currentTarget.color,
      responded: false,
      reactionTime: 0,
      responses: [],
      startTime: performance.now()
    };

    setScene({ shape: shownObject.shape, color: shownObject.color, isTarget });

    timer.current = setTimeout(() => {
      setScene(null);
      const t = currentTrial.current;
      if (t) {
        trialLog.current.push({
          trialNumber: t.trialNumber,
          section: t.section,
          isTarget: t.isTarget,
          shownShape: t.shownShape,
          shownColor: t.shownColor,
          targetShape: t.targetShape,
          targetColor: t.targetColor,
          responded: t.responded,
          reactionTime: t.reactionTime || 0,
          responseCount: t.responses.length
        });
      }
      currentTrial.current = null;
      const nextPhase = getPhaseInfo();
      timer.current = setTimeout(nextTrial, nextPhase.gapDuration);
    }, phase.stimulusDuration);
  };

  useEffect(() => {
    if (view === "PLAY" && targetRef.current) nextTrial();
    return () => clearTimeout(timer.current);
  }, [view]);

  const getRawMetrics = () => {
    const logs = trialLog.current;
    const targets = logs.filter((t) => t.isTarget);
    const nonTargets = logs.filter((t) => !t.isTarget);
    const correctHits = targets.filter((t) => t.responded);
    const omissions = targets.filter((t) => !t.responded);
    const lateResponses = targets.filter((t) => t.responded && t.reactionTime > LATE_RESPONSE_MS);
    const impulsiveErrors = nonTargets.filter((t) => t.responded);
    const multiPress = logs.filter((t) => t.responseCount > 1);
    const avgReaction = correctHits.length > 0 ? Math.round(correctHits.reduce((sum, t) => sum + t.reactionTime, 0) / correctHits.length) : 0;
    const accuracy = logs.length > 0 ? Math.round(((correctHits.length + nonTargets.filter((t) => !t.responded).length) / logs.length) * 100) : 0;

    return {
      totalTrials: logs.length,
      targets: targets.length,
      nonTargets: nonTargets.length,
      correctHits: correctHits.length,
      omissions: omissions.length,
      lateResponses: lateResponses.length,
      impulsiveErrors: impulsiveErrors.length,
      multiPress: multiPress.length,
      avgReaction,
      accuracy
    };
  };

  const calculateScores = () => {
    const m = getRawMetrics();
    return { attention: m.omissions, timing: m.lateResponses, impulsivity: m.impulsiveErrors, hyperactivity: m.multiPress };
  };

  const getLevel = (score) => {
    if (score === 0) return 1;
    if (score < 3) return 2;
    if (score < 6) return 3;
    return 4;
  };

  const getLevelText = (score) => {
    const level = getLevel(score);
    if (level === 1) return "İyi Performans";
    if (level === 2) return "Standart Performans";
    if (level === 3) return "Düşük Performans";
    return "Performansta Zorluk";
  };

  const getScoreColor = (score) => {
    const level = getLevel(score);
    if (level === 1) return "#16A34A";
    if (level === 2) return "#65A30D";
    if (level === 3) return "#F59E0B";
    return "#DC2626";
  };

  const getPerformanceScoreSeries = () => {
    let attentionScore = 100;
    let timingScore = 100;
    let impulsivityScore = 100;
    let hyperactivityScore = 100;
    const attentionData = [];
    const timingData = [];
    const impulsivityData = [];
    const hyperactivityData = [];

    trialLog.current.forEach((trial) => {
      if (trial.isTarget && !trial.responded) attentionScore -= 8;
      if (trial.isTarget && trial.responded && trial.reactionTime > LATE_RESPONSE_MS) timingScore -= 4;
      if (!trial.isTarget && trial.responded) impulsivityScore -= 10;
      if (trial.responseCount > 1) hyperactivityScore -= 10;
      attentionData.push(Math.max(attentionScore, 0));
      timingData.push(Math.max(timingScore, 0));
      impulsivityData.push(Math.max(impulsivityScore, 0));
      hyperactivityData.push(Math.max(hyperactivityScore, 0));
    });

    return { attentionData, timingData, impulsivityData, hyperactivityData };
  };

  const buildChartData = () => {
    const labels = trialLog.current.map((trial) => trial.trialNumber);
    const series = getPerformanceScoreSeries();
    return {
      labels,
      datasets: [
        { label: "Dikkat", data: series.attentionData, borderColor: "#2563EB", backgroundColor: "#2563EB", tension: 0.25, pointRadius: 3 },
        { label: "Zamanlama", data: series.timingData, borderColor: "#16A34A", backgroundColor: "#16A34A", tension: 0.25, pointRadius: 3 },
        { label: "Dürtüsellik", data: series.impulsivityData, borderColor: "#DC2626", backgroundColor: "#DC2626", tension: 0.25, pointRadius: 3 },
        { label: "Hiperaktivite", data: series.hyperactivityData, borderColor: "#F59E0B", backgroundColor: "#F59E0B", tension: 0.25, pointRadius: 3 }
      ]
    };
  };

  const buildChartOptions = () => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: { legend: { display: true, position: "bottom" }, tooltip: { enabled: true } },
    scales: { y: { min: 0, max: 100, ticks: { stepSize: 10 } } }
  });

  const getSectionSummary = () => {
    const sections = ["Alışma", "Sessiz GIF", "Bağımsız Ses", "Sesli ve Sessiz GIF", "Hızlı Uyaran", "Yavaş Kapanış"];
    return sections.map((section) => {
      const list = trialLog.current.filter((t) => t.section === section);
      const omissions = list.filter((t) => t.isTarget && !t.responded).length;
      const late = list.filter((t) => t.isTarget && t.responded && t.reactionTime > LATE_RESPONSE_MS).length;
      const impulse = list.filter((t) => !t.isTarget && t.responded).length;
      const hyper = list.filter((t) => t.responseCount > 1).length;
      return {
        section,
        attentionScore: Math.max(100 - omissions * 8, 0),
        timingScore: Math.max(100 - late * 4, 0),
        impulsivityScore: Math.max(100 - impulse * 10, 0),
        hyperactivityScore: Math.max(100 - hyper * 10, 0)
      };
    });
  };

  const generateSmartComment = (scores, metrics) => {
    const comments = [];
    comments.push(`Test ${metrics.totalTrials} deneme üzerinden tamamlandı. Genel doğruluk oranı %${metrics.accuracy}, ortalama tepki süresi ${metrics.avgReaction} ms olarak hesaplandı.`);
    comments.push("Test 6 aşamadan oluşmuştur. İlk aşama alışma, ikinci aşama sessiz GIF, üçüncü aşama bağımsız ses, dördüncü aşama sesli/sessiz GIF, beşinci aşama yüksek hız ve altıncı aşama yavaş kapanış olarak uygulanmıştır.");
    if (scores.attention >= 6) comments.push("Dikkat alanında belirgin zorlanma görüldü.");
    else if (scores.attention >= 3) comments.push("Dikkat performansında zaman zaman düşüş görüldü.");
    else comments.push("Dikkat performansı genel olarak korunmuştur.");
    if (scores.timing >= 6) comments.push("Zamanlama alanında belirgin gecikme vardır.");
    else if (scores.timing >= 3) comments.push("Zamanlama performansında hafif-orta düzeyde gecikmeler görülmüştür.");
    else comments.push("Zamanlama becerisi genel olarak yeterli görünmektedir.");
    if (scores.impulsivity >= 6) comments.push("Dürtüsel tepki eğilimi yüksektir.");
    else if (scores.impulsivity >= 3) comments.push("Dürtüsel yanıtlar zaman zaman ortaya çıkmıştır.");
    else comments.push("Dürtü kontrolü genel olarak korunmuştur.");
    if (scores.hyperactivity >= 6) comments.push("Motor yanıt kontrolünde belirgin düzensizlik vardır.");
    else if (scores.hyperactivity >= 3) comments.push("Motor yanıt kontrolünde zaman zaman düzensizlik görülmüştür.");
    else comments.push("Motor yanıt kontrolü genel olarak düzenlidir.");
    return comments.join(" ");
  };

  const downloadReport = () => {
    const scores = calculateScores();
    const metrics = getRawMetrics();
    const sections = getSectionSummary();
    const currentTarget = targetRef.current;
    const chart = chartRef.current;
    const chartImage = chart?.canvas?.toDataURL("image/png", 1.0);

    const docDefinition = {
      pageSize: "A4",
      pageMargins: [36, 36, 36, 36],
      defaultStyle: { font: "Roboto", fontSize: 10 },
      content: [
        { text: "Dikkat Performans Raporu", fontSize: 22, bold: true, color: "#142440", margin: [0, 0, 0, 6] },
        { text: "Bilgisayarlı dikkat ve tepki kontrolü değerlendirmesi", fontSize: 11, color: "#475569", margin: [0, 0, 0, 20] },
        {
          columns: [
            {
              width: "*",
              stack: [
                { text: "Rapor Tarihi: " + new Date().toLocaleDateString("tr-TR") },
                { text: "Test Tipi: 6 aşamalı hedef / hedef dışı uyaran görevi", margin: [0, 6, 0, 0] },
                { text: "Toplam Test Süresi: 280 saniye", margin: [0, 6, 0, 0] },
                { text: "Toplam Deneme: " + metrics.totalTrials, margin: [0, 6, 0, 0] }
              ]
            },
            {
              width: 110,
              stack: [
                { text: "Hedef Nesne", bold: true, alignment: "center" },
                { svg: getShapeSvg(currentTarget.shape, currentTarget.color), width: 45, alignment: "center", margin: [0, 6, 0, 0] }
              ]
            }
          ],
          margin: [0, 0, 0, 20]
        },
        {
          columns: [["Dikkat", scores.attention], ["Zamanlama", scores.timing], ["Dürtüsellik", scores.impulsivity], ["Hiperaktivite", scores.hyperactivity]].map(([title, value]) => ({
            width: "*",
            table: { widths: ["*"], body: [[{ stack: [{ text: title, color: "white", bold: true, fontSize: 11 }, { text: String(value), color: "white", bold: true, fontSize: 22, margin: [0, 8, 0, 0] }], fillColor: getScoreColor(value), margin: [10, 10, 10, 10] }]] },
            layout: "noBorders",
            margin: [0, 0, 8, 0]
          })),
          columnGap: 4,
          margin: [0, 0, 0, 24]
        },
        {
          table: {
            headerRows: 1,
            widths: ["*", "auto", "auto", "*"],
            body: [
              [{ text: "İndeks", bold: true, color: "white" }, { text: "Hata Skoru", bold: true, color: "white" }, { text: "Seviye", bold: true, color: "white" }, { text: "Yorum", bold: true, color: "white" }],
              ["A - Dikkat", scores.attention, getLevel(scores.attention), getLevelText(scores.attention)],
              ["T - Zamanlama", scores.timing, getLevel(scores.timing), getLevelText(scores.timing)],
              ["I - Dürtüsellik", scores.impulsivity, getLevel(scores.impulsivity), getLevelText(scores.impulsivity)],
              ["H - Hiperaktivite", scores.hyperactivity, getLevel(scores.hyperactivity), getLevelText(scores.hyperactivity)]
            ]
          },
          layout: {
            fillColor: (rowIndex) => rowIndex === 0 ? "#142440" : rowIndex % 2 === 0 ? "#F8FAFC" : null,
            hLineColor: () => "#CBD5E1",
            vLineColor: () => "#CBD5E1"
          },
          margin: [0, 0, 0, 16]
        },
        {
          table: {
            headerRows: 1,
            widths: ["*", "*"],
            body: [
              [{ text: "Ölçüm", bold: true, color: "white" }, { text: "Değer", bold: true, color: "white" }],
              ["Genel Doğruluk", "%" + metrics.accuracy],
              ["Ortalama Tepki Süresi", metrics.avgReaction + " ms"],
              ["Hedef Sayısı", metrics.targets],
              ["Hedef Dışı Uyaran Sayısı", metrics.nonTargets],
              ["Doğru Hedef Yanıtı", metrics.correctHits],
              ["Kaçırılan Hedef", metrics.omissions],
              ["Geç Yanıt", metrics.lateResponses],
              ["Yanlış / Dürtüsel Yanıt", metrics.impulsiveErrors],
              ["Çoklu Tuşlama", metrics.multiPress]
            ]
          },
          layout: {
            fillColor: (rowIndex) => rowIndex === 0 ? "#374151" : rowIndex % 2 === 0 ? "#F8FAFC" : null,
            hLineColor: () => "#CBD5E1",
            vLineColor: () => "#CBD5E1"
          }
        },
        { text: "Performans Grafiği", fontSize: 15, bold: true, margin: [0, 20, 0, 8], pageBreak: "before" },
        chartImage ? { image: chartImage, width: 520, margin: [0, 0, 0, 20] } : { text: "Grafik görüntüsü alınamadı.", margin: [0, 0, 0, 20] },
        {
          table: {
            headerRows: 1,
            widths: ["*", "*", "*", "*", "*"],
            body: [
              [{ text: "Bölüm", bold: true, color: "white" }, { text: "Dikkat", bold: true, color: "white" }, { text: "Zamanlama", bold: true, color: "white" }, { text: "Dürtüsellik", bold: true, color: "white" }, { text: "Hiperaktivite", bold: true, color: "white" }],
              ...sections.map((section) => [section.section, section.attentionScore, section.timingScore, section.impulsivityScore, section.hyperactivityScore])
            ]
          },
          layout: {
            fillColor: (rowIndex) => rowIndex === 0 ? "#142440" : rowIndex % 2 === 0 ? "#F8FAFC" : null,
            hLineColor: () => "#CBD5E1",
            vLineColor: () => "#CBD5E1"
          },
          margin: [0, 0, 0, 20]
        },
        { text: "Otomatik Yorum", fontSize: 15, bold: true, margin: [0, 0, 0, 8] },
        { text: generateSmartComment(scores, metrics), fontSize: 10, lineHeight: 1.3, margin: [0, 0, 0, 40] },
        { text: "Not: Bu uygulama klinik tanı koymaz. Sonuçlar yalnızca dikkat performansı hakkında ön bilgi sağlar.", fontSize: 8, color: "#64748B" }
      ]
    };

    pdfMake.createPdf(docDefinition).download("dikkat-performans-raporu.pdf");
  };

  const scores = calculateScores();
  const metrics = getRawMetrics();

  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF", fontFamily: "Arial, sans-serif", display: "flex", justifyContent: "center", alignItems: "center", padding: 24 }}>
      {view === "START" && target && (
        <div style={{ width: "100%", maxWidth: 900, background: "white", borderRadius: 24, padding: 36, boxShadow: "0 18px 50px rgba(15,23,42,0.12)", textAlign: "center" }}>
          <h1 style={{ marginTop: 0 }}>Dikkat Performans Testi</h1>
          <p style={{ fontSize: 17, color: "#475569" }}>Aşağıdaki nesne hedef olarak seçildi. Test boyunca sadece bu şekil ve bu renk birlikte göründüğünde SPACE tuşuna basın. Mouse ile tıklama ve dokunmatik ekranlarda dokunma da cevap olarak kabul edilir.</p>
          <div style={{ margin: "30px auto", width: 190, height: 190, borderRadius: 28, border: "3px solid #142440", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 30px rgba(15,23,42,0.12)" }}>
            <ShapeView shape={target.shape} color={target.color} size={110} />
          </div>
          <button onClick={startTest} style={{ background: "#142440", color: "white", border: "none", borderRadius: 14, padding: "15px 34px", fontSize: 17, cursor: "pointer", fontWeight: "bold" }}>Teste Başla</button>
        </div>
      )}

      {view === "PLAY" && (
        <div onClick={registerResponse} onTouchStart={registerResponse} style={{ width: "96vw", maxWidth: 1180, height: "78vh", minHeight: 560, background: "#FFFFFF", borderRadius: 24, boxShadow: "0 18px 50px rgba(15,23,42,0.12)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", cursor: "pointer", touchAction: "manipulation", userSelect: "none" }}>
          {gifDistractors.map((item) => (
            <img key={item.id} src={item.gif} alt={item.name} style={{ position: "absolute", left: `${item.left}%`, top: `${item.top}%`, width: item.size, maxWidth: "30%", maxHeight: "38%", height: "auto", transform: "translate(-50%, -50%)", pointerEvents: "none", zIndex: 1, objectFit: "contain" }} />
          ))}
          {scene && <div style={{ zIndex: 5 }}><ShapeView shape={scene.shape} color={scene.color} size={170} /></div>}
        </div>
      )}

      {view === "END" && target && (
        <div style={{ width: "100%", maxWidth: 980, background: "white", borderRadius: 24, padding: 34, boxShadow: "0 18px 50px rgba(15,23,42,0.12)" }}>
          <h1 style={{ textAlign: "center", marginTop: 0 }}>Test Tamamlandı</h1>
          <div style={{ textAlign: "center", marginBottom: 20 }}><strong>Hedef Nesne:</strong><div style={{ marginTop: 12 }}><ShapeView shape={target.shape} color={target.color} size={60} /></div></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginTop: 24, marginBottom: 22 }}>
            <ScoreBox title="Dikkat" value={scores.attention} color={getScoreColor(scores.attention)} />
            <ScoreBox title="Zamanlama" value={scores.timing} color={getScoreColor(scores.timing)} />
            <ScoreBox title="Dürtüsellik" value={scores.impulsivity} color={getScoreColor(scores.impulsivity)} />
            <ScoreBox title="Hiperaktivite" value={scores.hyperactivity} color={getScoreColor(scores.hyperactivity)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
            <MetricBox title="Doğruluk" value={`%${metrics.accuracy}`} />
            <MetricBox title="Ort. Tepki" value={`${metrics.avgReaction} ms`} />
            <MetricBox title="Doğru Hedef" value={metrics.correctHits} />
            <MetricBox title="Yanlış Yanıt" value={metrics.impulsiveErrors} />
          </div>
          <h3>Performans Grafiği</h3>
          <div style={{ width: "100%", height: 370 }}><Line ref={chartRef} data={buildChartData()} options={buildChartOptions()} /></div>
          <h3>Otomatik Yorum</h3>
          <p style={{ lineHeight: 1.6 }}>{generateSmartComment(scores, metrics)}</p>
          <div style={{ textAlign: "center", marginTop: 26 }}>
            <button onClick={downloadReport} style={{ background: "#142440", color: "white", border: "none", borderRadius: 14, padding: "15px 34px", fontSize: 16, cursor: "pointer", fontWeight: "bold" }}>Profesyonel PDF Raporu İndir</button>
            <button onClick={newTest} style={{ marginLeft: 12, background: "#E5E7EB", color: "#111827", border: "none", borderRadius: 14, padding: "15px 34px", fontSize: 16, cursor: "pointer" }}>Yeni Test Başlat</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreBox({ title, value, color }) {
  return <div style={{ background: color, color: "white", padding: 18, borderRadius: 16 }}><strong>{title}</strong><div style={{ fontSize: 30, fontWeight: "bold", marginTop: 6 }}>{value}</div></div>;
}

function MetricBox({ title, value }) {
  return <div style={{ background: "#F1F5F9", color: "#0F172A", padding: 16, borderRadius: 16, border: "1px solid #E2E8F0" }}><strong>{title}</strong><div style={{ fontSize: 24, fontWeight: "bold", marginTop: 6 }}>{value}</div></div>;
}
