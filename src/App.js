import React, { useState, useEffect, useRef } from "react";
import { jsPDF } from "jspdf";
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

const TOTAL_TRIALS = 40;
const TARGET_COUNT = 16;
const STIMULUS_DURATION = 1000;
const GAP_DURATION = 500;
const LATE_RESPONSE_MS = 800;

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

export default function App() {
  const [view, setView] = useState("START");
  const [scene, setScene] = useState(null);
  const [target, setTarget] = useState(null);

  const targetRef = useRef(null);
  const trialLog = useRef([]);
  const currentTrial = useRef(null);
  const counter = useRef(0);
  const timer = useRef(null);
  const chartRef = useRef(null);
  const trialPlan = useRef([]);

  const createNewTarget = () => {
    const newTarget = {
      shape: randomItem(SHAPES).id,
      color: randomItem(COLORS)
    };
    targetRef.current = newTarget;
    setTarget(newTarget);
  };

  useEffect(() => {
    createNewTarget();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.code === "Space") {
        event.preventDefault();
        handleResponse();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const createTrialPlan = () => {
    const targets = Array.from({ length: TARGET_COUNT }, () => true);
    const nonTargets = Array.from({ length: TOTAL_TRIALS - TARGET_COUNT }, () => false);
    trialPlan.current = shuffleArray([...targets, ...nonTargets]);
  };

  const getSectionName = (trialNumber) => {
    if (trialNumber <= 10) return "Temel";
    if (trialNumber <= 20) return "Görsel";
    if (trialNumber <= 30) return "İşitsel";
    return "Kombine";
  };

  const createNonTargetObject = () => {
    const currentTarget = targetRef.current;
    let obj;

    do {
      obj = {
        shape: randomItem(SHAPES).id,
        color: randomItem(COLORS)
      };
    } while (obj.shape === currentTarget.shape && obj.color === currentTarget.color);

    return obj;
  };

  const startTest = () => {
    trialLog.current = [];
    currentTrial.current = null;
    counter.current = 0;
    setScene(null);
    createTrialPlan();
    setView("PLAY");
  };

  const newTest = () => {
    clearTimeout(timer.current);
    trialLog.current = [];
    currentTrial.current = null;
    counter.current = 0;
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
    if (counter.current >= TOTAL_TRIALS) {
      currentTrial.current = null;
      setScene(null);
      setView("END");
      return;
    }

    const trialNumber = counter.current + 1;
    const isTarget = trialPlan.current[counter.current];
    const currentTarget = targetRef.current;
    const shownObject = isTarget ? { ...currentTarget } : createNonTargetObject();

    currentTrial.current = {
      trialNumber,
      section: getSectionName(trialNumber),
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

    setScene({
      shape: shownObject.shape,
      color: shownObject.color,
      isTarget
    });

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

      counter.current += 1;
      timer.current = setTimeout(nextTrial, GAP_DURATION);
    }, STIMULUS_DURATION);
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

    const avgReaction =
      correctHits.length > 0
        ? Math.round(correctHits.reduce((sum, t) => sum + t.reactionTime, 0) / correctHits.length)
        : 0;

    const accuracy =
      logs.length > 0
        ? Math.round(((correctHits.length + nonTargets.filter((t) => !t.responded).length) / logs.length) * 100)
        : 0;

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

    return {
      attention: m.omissions,
      timing: m.lateResponses,
      impulsivity: m.impulsiveErrors,
      hyperactivity: m.multiPress
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

    comments.push(
      `Test ${metrics.totalTrials} deneme üzerinden tamamlandı. Genel doğruluk oranı %${metrics.accuracy}, ortalama tepki süresi ${metrics.avgReaction} ms olarak hesaplandı.`
    );

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

  const drawCanvasShape = (ctx, shape, color, x, y, size) => {
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 0.12;

    if (shape === "circle") {
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    if (shape === "square") {
      ctx.fillRect(x, y, size, size);
    }

    if (shape === "triangle") {
      ctx.beginPath();
      ctx.moveTo(x + size / 2, y);
      ctx.lineTo(x, y + size);
      ctx.lineTo(x + size, y + size);
      ctx.closePath();
      ctx.fill();
    }

    if (shape === "diamond") {
      ctx.beginPath();
      ctx.moveTo(x + size / 2, y);
      ctx.lineTo(x + size, y + size / 2);
      ctx.lineTo(x + size / 2, y + size);
      ctx.lineTo(x, y + size / 2);
      ctx.closePath();
      ctx.fill();
    }

    if (shape === "pentagon") {
      ctx.beginPath();
      ctx.moveTo(x + size / 2, y);
      ctx.lineTo(x + size, y + size * 0.38);
      ctx.lineTo(x + size * 0.82, y + size);
      ctx.lineTo(x + size * 0.18, y + size);
      ctx.lineTo(x, y + size * 0.38);
      ctx.closePath();
      ctx.fill();
    }

    if (shape === "hexagon") {
      ctx.beginPath();
      ctx.moveTo(x + size * 0.25, y);
      ctx.lineTo(x + size * 0.75, y);
      ctx.lineTo(x + size, y + size * 0.5);
      ctx.lineTo(x + size * 0.75, y + size);
      ctx.lineTo(x + size * 0.25, y + size);
      ctx.lineTo(x, y + size * 0.5);
      ctx.closePath();
      ctx.fill();
    }

    if (shape === "vertical") {
      ctx.fillRect(x + size * 0.28, y, size * 0.44, size);
    }

    if (shape === "horizontal") {
      ctx.fillRect(x, y + size * 0.28, size, size * 0.44);
    }

    if (shape === "plus") {
      ctx.fillRect(x + size * 0.4, y, size * 0.2, size);
      ctx.fillRect(x, y + size * 0.4, size, size * 0.2);
    }

    if (shape === "xshape") {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + size, y + size);
      ctx.moveTo(x + size, y);
      ctx.lineTo(x, y + size);
      ctx.stroke();
    }
  };

  const drawWrappedText = (ctx, text, x, y, maxWidth, lineHeight) => {
    const words = text.split(" ");
    let line = "";
    let currentY = y;

    words.forEach((word) => {
      const testLine = line + word + " ";
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && line !== "") {
        ctx.fillText(line, x, currentY);
        line = word + " ";
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    });

    ctx.fillText(line, x, currentY);
    return currentY + lineHeight;
  };

  const createPdfPageCanvas = (pageNumber) => {
    const scores = calculateScores();
    const metrics = getRawMetrics();
    const sections = getSectionSummary();
    const currentTarget = targetRef.current;

    const canvas = document.createElement("canvas");
    canvas.width = 1240;
    canvas.height = 1754;

    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#142440";
    ctx.fillRect(0, 0, canvas.width, 190);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "52px Arial";
    ctx.fillText(
      pageNumber === 1 ? "Dikkat Performans Raporu" : "Performans Grafiği",
      80,
      85
    );

    ctx.font = "24px Arial";
    ctx.fillText(
      pageNumber === 1
        ? "Bilgisayarlı dikkat ve tepki kontrolü değerlendirmesi"
        : "Bölüm bazlı performans ve otomatik yorum",
      80,
      145
    );

    ctx.fillStyle = "#111827";

    if (pageNumber === 1) {
      ctx.font = "26px Arial";
      ctx.fillText("Rapor Tarihi: " + new Date().toLocaleDateString("tr-TR"), 80, 280);
      ctx.fillText("Test Tipi: 10 nesneli hedef / hedef dışı uyaran görevi", 80, 330);
      ctx.fillText("Toplam Deneme: " + TOTAL_TRIALS, 80, 380);
      ctx.fillText("Hedef Nesne:", 80, 450);
      drawCanvasShape(ctx, currentTarget.shape, currentTarget.color, 260, 405, 70);

      const cardData = [
        ["Dikkat", scores.attention],
        ["Zamanlama", scores.timing],
        ["Dürtüsellik", scores.impulsivity],
        ["Hiperaktivite", scores.hyperactivity]
      ];

      cardData.forEach((item, index) => {
        const x = 80 + index * 285;
        const y = 560;
        ctx.fillStyle = getScoreColor(item[1]);
        ctx.roundRect(x, y, 250, 145, 18);
        ctx.fill();

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "27px Arial";
        ctx.fillText(item[0], x + 28, y + 55);
        ctx.font = "48px Arial";
        ctx.fillText(String(item[1]), x + 28, y + 115);
      });

      const tableY = 820;
      ctx.fillStyle = "#142440";
      ctx.fillRect(80, tableY, 1080, 60);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "24px Arial";
      ctx.fillText("İndeks", 100, tableY + 38);
      ctx.fillText("Hata Skoru", 390, tableY + 38);
      ctx.fillText("Seviye", 610, tableY + 38);
      ctx.fillText("Yorum", 790, tableY + 38);

      const rows = [
        ["A - Dikkat", scores.attention, getLevel(scores.attention), getLevelText(scores.attention)],
        ["T - Zamanlama", scores.timing, getLevel(scores.timing), getLevelText(scores.timing)],
        ["I - Dürtüsellik", scores.impulsivity, getLevel(scores.impulsivity), getLevelText(scores.impulsivity)],
        ["H - Hiperaktivite", scores.hyperactivity, getLevel(scores.hyperactivity), getLevelText(scores.hyperactivity)]
      ];

      ctx.font = "23px Arial";
      rows.forEach((row, index) => {
        const y = tableY + 60 + index * 60;
        ctx.fillStyle = index % 2 === 0 ? "#F8FAFC" : "#FFFFFF";
        ctx.fillRect(80, y, 1080, 60);
        ctx.strokeStyle = "#CBD5E1";
        ctx.strokeRect(80, y, 1080, 60);

        ctx.fillStyle = "#111827";
        ctx.fillText(row[0], 100, y + 38);
        ctx.fillText(String(row[1]), 390, y + 38);
        ctx.fillText(String(row[2]), 610, y + 38);
        ctx.fillText(row[3], 790, y + 38);
      });

      const metricY = 1130;
      ctx.fillStyle = "#142440";
      ctx.fillRect(80, metricY, 1080, 60);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "24px Arial";
      ctx.fillText("Ölçüm", 100, metricY + 38);
      ctx.fillText("Değer", 650, metricY + 38);

      const metricRows = [
        ["Genel Doğruluk", "%" + metrics.accuracy],
        ["Ortalama Tepki Süresi", metrics.avgReaction + " ms"],
        ["Hedef Sayısı", metrics.targets],
        ["Hedef Dışı Uyaran Sayısı", metrics.nonTargets],
        ["Doğru Hedef Yanıtı", metrics.correctHits],
        ["Kaçırılan Hedef", metrics.omissions],
        ["Geç Yanıt", metrics.lateResponses],
        ["Yanlış / Dürtüsel Yanıt", metrics.impulsiveErrors],
        ["Çoklu Tuşlama", metrics.multiPress]
      ];

      ctx.font = "22px Arial";
      metricRows.forEach((row, index) => {
        const y = metricY + 60 + index * 48;
        ctx.fillStyle = index % 2 === 0 ? "#F8FAFC" : "#FFFFFF";
        ctx.fillRect(80, y, 1080, 48);
        ctx.strokeStyle = "#CBD5E1";
        ctx.strokeRect(80, y, 1080, 48);

        ctx.fillStyle = "#111827";
        ctx.fillText(row[0], 100, y + 31);
        ctx.fillText(String(row[1]), 650, y + 31);
      });
    }

    if (pageNumber === 2) {
      const chart = chartRef.current;
      const chartImage = chart?.canvas?.toDataURL("image/png", 1.0);

      if (chartImage) {
        const img = new Image();
        img.src = chartImage;
        ctx.drawImage(img, 80, 240, 1080, 520);
      }

      const tableY = 840;

      ctx.fillStyle = "#142440";
      ctx.fillRect(80, tableY, 1080, 60);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "23px Arial";
      ctx.fillText("Bölüm", 100, tableY + 38);
      ctx.fillText("Dikkat", 340, tableY + 38);
      ctx.fillText("Zamanlama", 520, tableY + 38);
      ctx.fillText("Dürtüsellik", 760, tableY + 38);
      ctx.fillText("Hiperaktivite", 980, tableY + 38);

      ctx.font = "22px Arial";
      sections.forEach((row, index) => {
        const y = tableY + 60 + index * 55;
        ctx.fillStyle = index % 2 === 0 ? "#F8FAFC" : "#FFFFFF";
        ctx.fillRect(80, y, 1080, 55);
        ctx.strokeStyle = "#CBD5E1";
        ctx.strokeRect(80, y, 1080, 55);

        ctx.fillStyle = "#111827";
        ctx.fillText(row.section, 100, y + 36);
        ctx.fillText(String(row.attentionScore), 340, y + 36);
        ctx.fillText(String(row.timingScore), 520, y + 36);
        ctx.fillText(String(row.impulsivityScore), 760, y + 36);
        ctx.fillText(String(row.hyperactivityScore), 980, y + 36);
      });

      ctx.fillStyle = "#111827";
      ctx.font = "30px Arial";
      ctx.fillText("Otomatik Yorum", 80, 1160);

      ctx.font = "24px Arial";
      drawWrappedText(ctx, generateSmartComment(scores, metrics), 80, 1210, 1080, 34);

      ctx.font = "18px Arial";
      ctx.fillStyle = "#64748B";
      drawWrappedText(
        ctx,
        "Not: Bu uygulama klinik tanı koymaz. Sonuçlar yalnızca dikkat performansı hakkında ön bilgi sağlar.",
        80,
        1660,
        1080,
        26
      );
    }

    return canvas;
  };

  const downloadReport = () => {
    const pdf = new jsPDF("p", "mm", "a4");

    const page1 = createPdfPageCanvas(1);
    const page1Image = page1.toDataURL("image/png", 1.0);

    pdf.addImage(page1Image, "PNG", 0, 0, 210, 297);

    pdf.addPage();

    const page2 = createPdfPageCanvas(2);
    const page2Image = page2.toDataURL("image/png", 1.0);

    pdf.addImage(page2Image, "PNG", 0, 0, 210, 297);

    pdf.save("dikkat-performans-raporu.pdf");
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
            Aşağıdaki nesne hedef olarak seçildi. Test boyunca sadece bu şekil
            ve bu renk birlikte göründüğünde SPACE tuşuna basın.
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
          style={{
            width: "100%",
            maxWidth: 760,
            height: 440,
            background: "white",
            borderRadius: 24,
            boxShadow: "0 18px 50px rgba(15,23,42,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          {scene && <ShapeView shape={scene.shape} color={scene.color} size={150} />}
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
          <p style={{ lineHeight: 1.6 }}>{generateSmartComment(scores, metrics)}</p>

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
