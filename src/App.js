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

const TOTAL_TRIALS = 48;
const TARGET_COUNT = 18;
const STIMULUS_DURATION = 900;
const GAP_DURATION = 500;
const LATE_RESPONSE_MS = 800;

const COLORS = [
  "#2563EB",
  "#16A34A",
  "#DC2626",
  "#F59E0B",
  "#7C3AED",
  "#0891B2",
  "#DB2777",
  "#EA580C"
];

const SHAPES = [
  { id: "circle", label: "Daire" },
  { id: "square", label: "Kare" },
  { id: "triangle", label: "Üçgen" },
  { id: "diamond", label: "Elmas" },
  { id: "plus", label: "Artı" },
  { id: "xshape", label: "Çarpı" }
];

const DISTRACTOR_TYPES = [
  { label: "Polis Arabası", icon: "🚓", sound: "siren" },
  { label: "Köpek", icon: "🐕", sound: "dog" },
  { label: "Kedi", icon: "🐈", sound: "cat" },
  { label: "Kuş", icon: "🐦", sound: "bird" },
  { label: "Top", icon: "🏀", sound: "bounce" },
  { label: "Koşan İnsan", icon: "🏃", sound: "step" }
];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffleArray(array) {
  const copy = [...array];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function ShapeView({ shape, color, size = 120 }) {
  const base = {
    width: size,
    height: size,
    background: color,
    display: "inline-block"
  };

  if (shape === "circle") return <div style={{ ...base, borderRadius: "50%" }} />;
  if (shape === "square") return <div style={base} />;

  if (shape === "triangle") {
    return (
      <div
        style={{
          ...base,
          clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)"
        }}
      />
    );
  }

  if (shape === "diamond") {
    return (
      <div
        style={{
          ...base,
          transform: "rotate(45deg)"
        }}
      />
    );
  }

  if (shape === "plus") {
    return (
      <div style={{ width: size, height: size, position: "relative" }}>
        <div
          style={{
            position: "absolute",
            left: size * 0.4,
            top: 0,
            width: size * 0.2,
            height: size,
            background: color
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            top: size * 0.4,
            width: size,
            height: size * 0.2,
            background: color
          }}
        />
      </div>
    );
  }

  if (shape === "xshape") {
    return (
      <div style={{ width: size, height: size, position: "relative" }}>
        <div
          style={{
            position: "absolute",
            left: size * 0.43,
            top: 0,
            width: size * 0.14,
            height: size,
            background: color,
            transform: "rotate(45deg)"
          }}
        />
        <div
          style={{
            position: "absolute",
            left: size * 0.43,
            top: 0,
            width: size * 0.14,
            height: size,
            background: color,
            transform: "rotate(-45deg)"
          }}
        />
      </div>
    );
  }

  return null;
}

function getShapeSvg(shape, color) {
  if (shape === "circle") {
    return `<svg width="80" height="80" viewBox="0 0 80 80"><circle cx="40" cy="40" r="34" fill="${color}"/></svg>`;
  }

  if (shape === "square") {
    return `<svg width="80" height="80" viewBox="0 0 80 80"><rect x="14" y="14" width="52" height="52" fill="${color}"/></svg>`;
  }

  if (shape === "triangle") {
    return `<svg width="80" height="80" viewBox="0 0 80 80"><polygon points="40,8 8,72 72,72" fill="${color}"/></svg>`;
  }

  if (shape === "diamond") {
    return `<svg width="80" height="80" viewBox="0 0 80 80"><polygon points="40,6 74,40 40,74 6,40" fill="${color}"/></svg>`;
  }

  if (shape === "plus") {
    return `<svg width="80" height="80" viewBox="0 0 80 80"><rect x="32" y="8" width="16" height="64" fill="${color}"/><rect x="8" y="32" width="64" height="16" fill="${color}"/></svg>`;
  }

  return `<svg width="80" height="80" viewBox="0 0 80 80"><line x1="15" y1="15" x2="65" y2="65" stroke="${color}" stroke-width="14" stroke-linecap="round"/><line x1="65" y1="15" x2="15" y2="65" stroke="${color}" stroke-width="14" stroke-linecap="round"/></svg>`;
}

export default function App() {
  const [view, setView] = useState("START");
  const [target, setTarget] = useState(null);
  const [scene, setScene] = useState(null);
  const [distractors, setDistractors] = useState([]);

  const targetRef = useRef(null);
  const currentTrial = useRef(null);
  const trialLog = useRef([]);
  const trialPlan = useRef([]);
  const counter = useRef(0);
  const timer = useRef(null);
  const chartRef = useRef(null);
  const lastInputTime = useRef(0);
  const audioContextRef = useRef(null);

  const createTarget = () => {
    const newTarget = {
      shape: randomItem(SHAPES).id,
      color: randomItem(COLORS)
    };

    targetRef.current = newTarget;
    setTarget(newTarget);
  };

  useEffect(() => {
    createTarget();

    return () => {
      clearTimeout(timer.current);
    };
  }, []);

  const initAudio = () => {
    if (!audioContextRef.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioContextRef.current = new AudioContext();
      }
    }

    if (audioContextRef.current?.state === "suspended") {
      audioContextRef.current.resume();
    }
  };

  const playSound = (soundType) => {
    const ctx = audioContextRef.current;
    if (!ctx || soundType === "none") return;

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    if (soundType === "siren") {
      oscillator.type = "sawtooth";
      oscillator.frequency.setValueAtTime(650, ctx.currentTime);
      oscillator.frequency.linearRampToValueAtTime(1100, ctx.currentTime + 0.25);
    } else if (soundType === "dog") {
      oscillator.type = "square";
      oscillator.frequency.value = 180;
    } else if (soundType === "cat") {
      oscillator.type = "triangle";
      oscillator.frequency.value = 720;
    } else if (soundType === "bird") {
      oscillator.type = "sine";
      oscillator.frequency.value = 1300;
    } else if (soundType === "bounce") {
      oscillator.type = "sine";
      oscillator.frequency.value = 280;
    } else {
      oscillator.type = "sine";
      oscillator.frequency.value = 220;
    }

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.38);
  };

  const createTrialPlan = () => {
    const targets = Array.from({ length: TARGET_COUNT }, () => true);
    const nonTargets = Array.from({ length: TOTAL_TRIALS - TARGET_COUNT }, () => false);
    trialPlan.current = shuffleArray([...targets, ...nonTargets]);
  };

  const createNonTargetObject = () => {
    const currentTargetValue = targetRef.current;
    let object;

    do {
      object = {
        shape: randomItem(SHAPES).id,
        color: randomItem(COLORS)
      };
    } while (
      object.shape === currentTargetValue.shape &&
      object.color === currentTargetValue.color
    );

    return object;
  };

  const createDistractorsForTrial = () => {
    const modeRandom = Math.random();

    let visualCount = 0;
    let soundCount = 0;

    if (modeRandom < 0.35) {
      visualCount = 0;
      soundCount = 0;
    } else if (modeRandom < 0.6) {
      visualCount = 1 + Math.floor(Math.random() * 3);
    } else if (modeRandom < 0.8) {
      soundCount = 1;
    } else {
      visualCount = 1 + Math.floor(Math.random() * 3);
      soundCount = 1;
    }

    const positions = [
      { left: 12, top: 20 },
      { left: 84, top: 22 },
      { left: 14, top: 78 },
      { left: 82, top: 76 },
      { left: 50, top: 13 },
      { left: 50, top: 87 }
    ];

    const selectedPositions = shuffleArray(positions).slice(0, visualCount);

    const visualItems = selectedPositions.map((position, index) => {
      const type = randomItem(DISTRACTOR_TYPES);

      return {
        id: `${Date.now()}-${index}`,
        ...type,
        left: position.left,
        top: position.top,
        size: 46 + Math.floor(Math.random() * 16)
      };
    });

    const soundItems = Array.from({ length: soundCount }).map(() =>
      randomItem(DISTRACTOR_TYPES)
    );

    return {
      visualItems,
      soundItems
    };
  };

  const getSectionName = (trialNumber) => {
    if (trialNumber <= 12) return "Temel";
    if (trialNumber <= 24) return "Görsel";
    if (trialNumber <= 36) return "İşitsel";
    return "Kombine";
  };

  const startTest = () => {
    initAudio();

    trialLog.current = [];
    currentTrial.current = null;
    counter.current = 0;
    lastInputTime.current = 0;

    setScene(null);
    setDistractors([]);
    createTrialPlan();
    setView("PLAY");
  };

  const newTest = () => {
    clearTimeout(timer.current);

    trialLog.current = [];
    currentTrial.current = null;
    counter.current = 0;
    lastInputTime.current = 0;

    setScene(null);
    setDistractors([]);
    createTarget();
    setView("START");
  };

  const registerResponse = () => {
    const now = performance.now();

    if (now - lastInputTime.current < 120) return;

    lastInputTime.current = now;
    handleResponse();
  };

  const handleResponse = () => {
    if (!currentTrial.current) return;

    const now = performance.now();

    currentTrial.current.responses.push(now);

    if (!currentTrial.current.responded) {
      currentTrial.current.responded = true;
      currentTrial.current.reactionTime =
        now - currentTrial.current.startTime;
    }
  };

  useEffect(() => {
    const keyHandler = (event) => {
      if (event.code === "Space") {
        event.preventDefault();
        registerResponse();
      }
    };

    window.addEventListener("keydown", keyHandler);

    return () => {
      window.removeEventListener("keydown", keyHandler);
    };
  }, []);

  const nextTrial = () => {
    if (counter.current >= TOTAL_TRIALS) {
      currentTrial.current = null;
      setScene(null);
      setDistractors([]);
      setView("END");
      return;
    }

    const trialNumber = counter.current + 1;
    const isTarget = trialPlan.current[counter.current];
    const currentTargetValue = targetRef.current;
    const shownObject = isTarget ? { ...currentTargetValue } : createNonTargetObject();
    const distractorData = createDistractorsForTrial();

    currentTrial.current = {
      trialNumber,
      section: getSectionName(trialNumber),
      isTarget,
      shownShape: shownObject.shape,
      shownColor: shownObject.color,
      targetShape: currentTargetValue.shape,
      targetColor: currentTargetValue.color,
      visualDistractorCount: distractorData.visualItems.length,
      soundDistractorCount: distractorData.soundItems.length,
      responded: false,
      reactionTime: 0,
      responses: [],
      startTime: performance.now()
    };

    setScene({
      shape: shownObject.shape,
      color: shownObject.color,
      isTarget
    });

    setDistractors(distractorData.visualItems);

    distractorData.soundItems.forEach((item, index) => {
      setTimeout(() => playSound(item.sound), index * 220);
    });

    timer.current = setTimeout(() => {
      setScene(null);
      setDistractors([]);

      const trial = currentTrial.current;

      if (trial) {
        trialLog.current.push({
          trialNumber: trial.trialNumber,
          section: trial.section,
          isTarget: trial.isTarget,
          shownShape: trial.shownShape,
          shownColor: trial.shownColor,
          targetShape: trial.targetShape,
          targetColor: trial.targetColor,
          visualDistractorCount: trial.visualDistractorCount,
          soundDistractorCount: trial.soundDistractorCount,
          responded: trial.responded,
          reactionTime: trial.reactionTime || 0,
          responseCount: trial.responses.length
        });
      }

      currentTrial.current = null;
      counter.current += 1;
      timer.current = setTimeout(nextTrial, GAP_DURATION);
    }, STIMULUS_DURATION);
  };

  useEffect(() => {
    if (view === "PLAY" && targetRef.current) {
      nextTrial();
    }

    return () => {
      clearTimeout(timer.current);
    };
  }, [view]);

  const getRawMetrics = () => {
    const logs = trialLog.current;

    const targets = logs.filter((item) => item.isTarget);
    const nonTargets = logs.filter((item) => !item.isTarget);

    const correctHits = targets.filter((item) => item.responded);
    const omissions = targets.filter((item) => !item.responded);
    const lateResponses = targets.filter(
      (item) => item.responded && item.reactionTime > LATE_RESPONSE_MS
    );
    const impulsiveErrors = nonTargets.filter((item) => item.responded);
    const multiPress = logs.filter((item) => item.responseCount > 1);

    const avgReaction =
      correctHits.length > 0
        ? Math.round(
            correctHits.reduce((sum, item) => sum + item.reactionTime, 0) /
              correctHits.length
          )
        : 0;

    const accuracy =
      logs.length > 0
        ? Math.round(
            ((correctHits.length +
              nonTargets.filter((item) => !item.responded).length) /
              logs.length) *
              100
          )
        : 0;

    const visualDistractorTrials = logs.filter(
      (item) => item.visualDistractorCount > 0
    ).length;

    const soundDistractorTrials = logs.filter(
      (item) => item.soundDistractorCount > 0
    ).length;

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
      accuracy,
      visualDistractorTrials,
      soundDistractorTrials
    };
  };

  const calculateScores = () => {
    const metrics = getRawMetrics();

    return {
      attention: metrics.omissions,
      timing: metrics.lateResponses,
      impulsivity: metrics.impulsiveErrors,
      hyperactivity: metrics.multiPress
    };
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

      if (
        trial.isTarget &&
        trial.responded &&
        trial.reactionTime > LATE_RESPONSE_MS
      ) {
        timingScore -= 4;
      }

      if (!trial.isTarget && trial.responded) impulsivityScore -= 10;
      if (trial.responseCount > 1) hyperactivityScore -= 10;

      attentionData.push(Math.max(attentionScore, 0));
      timingData.push(Math.max(timingScore, 0));
      impulsivityData.push(Math.max(impulsivityScore, 0));
      hyperactivityData.push(Math.max(hyperactivityScore, 0));
    });

    return {
      attentionData,
      timingData,
      impulsivityData,
      hyperactivityData
    };
  };

  const buildChartData = () => {
    const labels = trialLog.current.map((trial) => trial.trialNumber);
    const series = getPerformanceScoreSeries();

    return {
      labels,
      datasets: [
        {
          label: "Dikkat",
          data: series.attentionData,
          borderColor: "#2563EB",
          backgroundColor: "#2563EB",
          tension: 0.25,
          pointRadius: 3
        },
        {
          label: "Zamanlama",
          data: series.timingData,
          borderColor: "#16A34A",
          backgroundColor: "#16A34A",
          tension: 0.25,
          pointRadius: 3
        },
        {
          label: "Dürtüsellik",
          data: series.impulsivityData,
          borderColor: "#DC2626",
          backgroundColor: "#DC2626",
          tension: 0.25,
          pointRadius: 3
        },
        {
          label: "Hiperaktivite",
          data: series.hyperactivityData,
          borderColor: "#F59E0B",
          backgroundColor: "#F59E0B",
          tension: 0.25,
          pointRadius: 3
        }
      ]
    };
  };

  const buildChartOptions = () => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: true, position: "bottom" },
      tooltip: { enabled: true }
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: { stepSize: 10 }
      }
    }
  });

  const getSectionSummary = () => {
    const sections = ["Temel", "Görsel", "İşitsel", "Kombine"];

    return sections.map((section) => {
      const list = trialLog.current.filter((item) => item.section === section);

      const omissions = list.filter((item) => item.isTarget && !item.responded).length;
      const late = list.filter(
        (item) => item.isTarget && item.responded && item.reactionTime > LATE_RESPONSE_MS
      ).length;
      const impulse = list.filter((item) => !item.isTarget && item.responded).length;
      const hyper = list.filter((item) => item.responseCount > 1).length;

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

    comments.push(
      `Test ${metrics.totalTrials} deneme üzerinden tamamlandı. Genel doğruluk oranı %${metrics.accuracy}, ortalama tepki süresi ${metrics.avgReaction} ms olarak hesaplandı.`
    );

    comments.push(
      `${metrics.visualDistractorTrials} denemede görsel dikkat dağıtıcı, ${metrics.soundDistractorTrials} denemede sesli dikkat dağıtıcı kullanıldı.`
    );

    if (scores.attention >= 6) {
      comments.push("Dikkat alanında belirgin zorlanma görüldü.");
    } else if (scores.attention >= 3) {
      comments.push("Dikkat performansında zaman zaman düşüş görüldü.");
    } else {
      comments.push("Dikkat performansı genel olarak korunmuştur.");
    }

    if (scores.timing >= 6) {
      comments.push("Zamanlama alanında belirgin gecikme vardır.");
    } else if (scores.timing >= 3) {
      comments.push("Zamanlama performansında hafif-orta düzeyde gecikmeler görülmüştür.");
    } else {
      comments.push("Zamanlama becerisi genel olarak yeterli görünmektedir.");
    }

    if (scores.impulsivity >= 6) {
      comments.push("Dürtüsel tepki eğilimi yüksektir.");
    } else if (scores.impulsivity >= 3) {
      comments.push("Dürtüsel yanıtlar zaman zaman ortaya çıkmıştır.");
    } else {
      comments.push("Dürtü kontrolü genel olarak korunmuştur.");
    }

    if (scores.hyperactivity >= 6) {
      comments.push("Motor yanıt kontrolünde belirgin düzensizlik vardır.");
    } else if (scores.hyperactivity >= 3) {
      comments.push("Motor yanıt kontrolünde zaman zaman düzensizlik görülmüştür.");
    } else {
      comments.push("Motor yanıt kontrolü genel olarak düzenlidir.");
    }

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
      defaultStyle: {
        font: "Roboto",
        fontSize: 10
      },
      content: [
        {
          text: "Dikkat Performans Raporu",
          fontSize: 22,
          bold: true,
          color: "#142440",
          margin: [0, 0, 0, 6]
        },
        {
          text: "Bilgisayarlı dikkat ve tepki kontrolü değerlendirmesi",
          fontSize: 11,
          color: "#475569",
          margin: [0, 0, 0, 20]
        },
        {
          columns: [
            {
              width: "*",
              stack: [
                { text: "Rapor Tarihi: " + new Date().toLocaleDateString("tr-TR") },
                { text: "Test Tipi: Videodaki gibi temiz hedef uyaran görevi", margin: [0, 6, 0, 0] },
                { text: "Toplam Deneme: " + TOTAL_TRIALS, margin: [0, 6, 0, 0] },
                { text: "Görsel Dikkat Dağıtıcı Deneme: " + metrics.visualDistractorTrials, margin: [0, 6, 0, 0] },
                { text: "Sesli Dikkat Dağıtıcı Deneme: " + metrics.soundDistractorTrials, margin: [0, 6, 0, 0] }
              ]
            },
            {
              width: 110,
              stack: [
                { text: "Hedef Nesne", bold: true, alignment: "center" },
                {
                  svg: getShapeSvg(currentTarget.shape, currentTarget.color),
                  width: 45,
                  alignment: "center",
                  margin: [0, 6, 0, 0]
                }
              ]
            }
          ],
          margin: [0, 0, 0, 20]
        },
        {
          columns: [
            ["Dikkat", scores.attention],
            ["Zamanlama", scores.timing],
            ["Dürtüsellik", scores.impulsivity],
            ["Hiperaktivite", scores.hyperactivity]
          ].map(([title, value]) => ({
            width: "*",
            table: {
              widths: ["*"],
              body: [
                [
                  {
                    stack: [
                      { text: title, color: "white", bold: true, fontSize: 11 },
                      { text: String(value), color: "white", bold: true, fontSize: 22, margin: [0, 8, 0, 0] }
                    ],
                    fillColor: getScoreColor(value),
                    margin: [10, 10, 10, 10]
                  }
                ]
              ]
            },
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
              [
                { text: "İndeks", bold: true, color: "white" },
                { text: "Hata Skoru", bold: true, color: "white" },
                { text: "Seviye", bold: true, color: "white" },
                { text: "Yorum", bold: true, color: "white" }
              ],
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
              [
                { text: "Ölçüm", bold: true, color: "white" },
                { text: "Değer", bold: true, color: "white" }
              ],
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
        {
          text: "Performans Grafiği",
          fontSize: 15,
          bold: true,
          margin: [0, 20, 0, 8],
          pageBreak: "before"
        },
        chartImage
          ? { image: chartImage, width: 520, margin: [0, 0, 0, 20] }
          : { text: "Grafik görüntüsü alınamadı.", margin: [0, 0, 0, 20] },
        {
          table: {
            headerRows: 1,
            widths: ["*", "*", "*", "*", "*"],
            body: [
              [
                { text: "Bölüm", bold: true, color: "white" },
                { text: "Dikkat", bold: true, color: "white" },
                { text: "Zamanlama", bold: true, color: "white" },
                { text: "Dürtüsellik", bold: true, color: "white" },
                { text: "Hiperaktivite", bold: true, color: "white" }
              ],
              ...sections.map((section) => [
                section.section,
                section.attentionScore,
                section.timingScore,
                section.impulsivityScore,
                section.hyperactivityScore
              ])
            ]
          },
          layout: {
            fillColor: (rowIndex) => rowIndex === 0 ? "#142440" : rowIndex % 2 === 0 ? "#F8FAFC" : null,
            hLineColor: () => "#CBD5E1",
            vLineColor: () => "#CBD5E1"
          },
          margin: [0, 0, 0, 20]
        },
        {
          text: "Otomatik Yorum",
          fontSize: 15,
          bold: true,
          margin: [0, 0, 0, 8]
        },
        {
          text: generateSmartComment(scores, metrics),
          fontSize: 10,
          lineHeight: 1.3,
          margin: [0, 0, 0, 40]
        },
        {
          text: "Not: Bu uygulama klinik tanı koymaz. Sonuçlar yalnızca dikkat performansı hakkında ön bilgi sağlar.",
          fontSize: 8,
          color: "#64748B"
        }
      ]
    };

    pdfMake.createPdf(docDefinition).download("dikkat-performans-raporu.pdf");
  };

  const scores = calculateScores();
  const metrics = getRawMetrics();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#EEF2F7",
        fontFamily: "Arial, sans-serif",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 24
      }}
    >
      {view === "START" && target && (
        <div
          style={{
            width: "100%",
            maxWidth: 760,
            background: "white",
            borderRadius: 24,
            padding: 36,
            boxShadow: "0 18px 50px rgba(15,23,42,0.12)",
            textAlign: "center"
          }}
        >
          <h1 style={{ marginTop: 0 }}>Dikkat Performans Testi</h1>

          <p style={{ fontSize: 17, color: "#475569" }}>
            Aşağıdaki nesne hedef olarak seçildi. Test boyunca sadece bu şekil ve bu renk birlikte göründüğünde SPACE tuşuna basın.
            Mouse ile tıklama ve dokunmatik ekranlarda dokunma da cevap olarak kabul edilir.
          </p>

          <div
            style={{
              margin: "30px auto",
              width: 190,
              height: 190,
              borderRadius: 28,
              border: "3px solid #142440",
              background: "#F8FAFC",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 10px 30px rgba(15,23,42,0.12)"
            }}
          >
            <ShapeView shape={target.shape} color={target.color} size={110} />
          </div>

          <button
            onClick={startTest}
            style={{
              background: "#142440",
              color: "white",
              border: "none",
              borderRadius: 14,
              padding: "15px 34px",
              fontSize: 17,
              cursor: "pointer",
              fontWeight: "bold"
            }}
          >
            Teste Başla
          </button>
        </div>
      )}

      {view === "PLAY" && (
        <div
          onClick={registerResponse}
          onTouchStart={registerResponse}
          style={{
            width: "100%",
            maxWidth: 760,
            height: 440,
            background: "white",
            borderRadius: 24,
            boxShadow: "0 18px 50px rgba(15,23,42,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
            cursor: "pointer",
            touchAction: "manipulation",
            userSelect: "none"
          }}
        >
          {distractors.map((item) => (
            <div
              key={item.id}
              style={{
                position: "absolute",
                left: `${item.left}%`,
                top: `${item.top}%`,
                transform: "translate(-50%, -50%)",
                fontSize: item.size,
                zIndex: 1,
                pointerEvents: "none",
                opacity: 0.9
              }}
            >
              {item.icon}
            </div>
          ))}

          {scene && (
            <div style={{ zIndex: 2 }}>
              <ShapeView shape={scene.shape} color={scene.color} size={150} />
            </div>
          )}
        </div>
      )}

      {view === "END" && target && (
        <div
          style={{
            width: "100%",
            maxWidth: 980,
            background: "white",
            borderRadius: 24,
            padding: 34,
            boxShadow: "0 18px 50px rgba(15,23,42,0.12)"
          }}
        >
          <h1 style={{ textAlign: "center", marginTop: 0 }}>Test Tamamlandı</h1>

          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <strong>Hedef Nesne:</strong>

            <div style={{ marginTop: 12 }}>
              <ShapeView shape={target.shape} color={target.color} size={60} />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 14,
              marginTop: 24,
              marginBottom: 22
            }}
          >
            <ScoreBox title="Dikkat" value={scores.attention} color={getScoreColor(scores.attention)} />
            <ScoreBox title="Zamanlama" value={scores.timing} color={getScoreColor(scores.timing)} />
            <ScoreBox title="Dürtüsellik" value={scores.impulsivity} color={getScoreColor(scores.impulsivity)} />
            <ScoreBox title="Hiperaktivite" value={scores.hyperactivity} color={getScoreColor(scores.hyperactivity)} />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 14,
              marginBottom: 28
            }}
          >
            <MetricBox title="Doğruluk" value={`%${metrics.accuracy}`} />
            <MetricBox title="Ort. Tepki" value={`${metrics.avgReaction} ms`} />
            <MetricBox title="Doğru Hedef" value={metrics.correctHits} />
            <MetricBox title="Yanlış Yanıt" value={metrics.impulsiveErrors} />
          </div>

          <h3>Performans Grafiği</h3>

          <div style={{ width: "100%", height: 370 }}>
            <Line ref={chartRef} data={buildChartData()} options={buildChartOptions()} />
          </div>

          <h3>Otomatik Yorum</h3>

          <p style={{ lineHeight: 1.6 }}>
            {generateSmartComment(scores, metrics)}
          </p>

          <div style={{ textAlign: "center", marginTop: 26 }}>
            <button
              onClick={downloadReport}
              style={{
                background: "#142440",
                color: "white",
                border: "none",
                borderRadius: 14,
                padding: "15px 34px",
                fontSize: 16,
                cursor: "pointer",
                fontWeight: "bold"
              }}
            >
              Profesyonel PDF Raporu İndir
            </button>

            <button
              onClick={newTest}
              style={{
                marginLeft: 12,
                background: "#E5E7EB",
                color: "#111827",
                border: "none",
                borderRadius: 14,
                padding: "15px 34px",
                fontSize: 16,
                cursor: "pointer"
              }}
            >
              Yeni Test Başlat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreBox({ title, value, color }) {
  return (
    <div
      style={{
        background: color,
        color: "white",
        padding: 18,
        borderRadius: 16
      }}
    >
      <strong>{title}</strong>

      <div style={{ fontSize: 30, fontWeight: "bold", marginTop: 6 }}>
        {value}
      </div>
    </div>
  );
}

function MetricBox({ title, value }) {
  return (
    <div
      style={{
        background: "#F1F5F9",
        color: "#0F172A",
        padding: 16,
        borderRadius: 16,
        border: "1px solid #E2E8F0"
      }}
    >
      <strong>{title}</strong>

      <div style={{ fontSize: 24, fontWeight: "bold", marginTop: 6 }}>
        {value}
      </div>
    </div>
  );
}
