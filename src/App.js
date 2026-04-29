import React, { useState, useEffect, useRef } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
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
  { id: "triangle", label: "Ucgen" },
  { id: "diamond", label: "Elmas" },
  { id: "pentagon", label: "Besgen" },
  { id: "hexagon", label: "Altigen" },
  { id: "vertical", label: "Dikey Dikdortgen" },
  { id: "horizontal", label: "Yatay Dikdortgen" },
  { id: "plus", label: "Arti" },
  { id: "xshape", label: "Carpi" }
];

const COLORS = [
  "#2563EB",
  "#16A34A",
  "#DC2626",
  "#F59E0B",
  "#7C3AED",
  "#0891B2",
  "#DB2777",
  "#65A30D",
  "#EA580C",
  "#0F172A"
];

function ShapeView({ shape, color, size = 130 }) {
  const base = {
    width: size,
    height: size,
    background: color,
    display: "inline-block"
  };

  if (shape === "circle") {
    return <div style={{ ...base, borderRadius: "50%" }} />;
  }

  if (shape === "square") {
    return <div style={base} />;
  }

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

  if (shape === "pentagon") {
    return (
      <div
        style={{
          ...base,
          clipPath: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)"
        }}
      />
    );
  }

  if (shape === "hexagon") {
    return (
      <div
        style={{
          ...base,
          clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)"
        }}
      />
    );
  }

  if (shape === "vertical") {
    return (
      <div
        style={{
          width: size * 0.45,
          height: size,
          background: color,
          display: "inline-block"
        }}
      />
    );
  }

  if (shape === "horizontal") {
    return (
      <div
        style={{
          width: size,
          height: size * 0.45,
          background: color,
          display: "inline-block"
        }}
      />
    );
  }

  if (shape === "plus") {
    return (
      <div style={{ width: size, height: size, position: "relative", display: "inline-block" }}>
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
      <div style={{ width: size, height: size, position: "relative", display: "inline-block" }}>
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

  const TOTAL_TRIALS = 40;
  const TARGET_COUNT = 16;
  const STIMULUS_DURATION = 1000;
  const GAP_DURATION = 500;
  const LATE_RESPONSE_MS = 800;

  const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const shuffleArray = (array) => {
    const copy = [...array];

    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }

    return copy;
  };

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

  const createTrialPlan = () => {
    const targets = Array.from({ length: TARGET_COUNT }, () => true);
    const nonTargets = Array.from(
      { length: TOTAL_TRIALS - TARGET_COUNT },
      () => false
    );

    trialPlan.current = shuffleArray([...targets, ...nonTargets]);
  };

  const getSectionName = (trialNumber) => {
    if (trialNumber <= 10) return "Temel";
    if (trialNumber <= 20) return "Gorsel";
    if (trialNumber <= 30) return "Isitsel";
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
    } while (
      obj.shape === currentTarget.shape &&
      obj.color === currentTarget.color
    );

    return obj;
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.code === "Space") {
        event.preventDefault();
        handleResponse();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

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
      currentTrial.current.reactionTime =
        now - currentTrial.current.startTime;
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

    const shownObject = isTarget
      ? { ...currentTarget }
      : createNonTargetObject();

    const startTime = performance.now();

    currentTrial.current = {
      trialNumber,
      section: getSectionName(trialNumber),
      isTarget,
      shownShape: shownObject.shape,
      shownColor: shownObject.color,
      targetShape: currentTarget.shape,
      targetColor: currentTarget.color,
      startTime,
      responded: false,
      reactionTime: 0,
      responses: []
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

      timer.current = setTimeout(() => {
        nextTrial();
      }, GAP_DURATION);
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

    const targets = logs.filter((t) => t.isTarget);
    const nonTargets = logs.filter((t) => !t.isTarget);

    const correctHits = targets.filter((t) => t.responded);
    const omissions = targets.filter((t) => !t.responded);

    const lateResponses = targets.filter(
      (t) => t.responded && t.reactionTime > LATE_RESPONSE_MS
    );

    const impulsiveErrors = nonTargets.filter((t) => t.responded);
    const multiPress = logs.filter((t) => t.responseCount > 1);

    const avgReaction =
      correctHits.length > 0
        ? Math.round(
            correctHits.reduce((sum, t) => sum + t.reactionTime, 0) /
              correctHits.length
          )
        : 0;

    const accuracy =
      logs.length > 0
        ? Math.round(
            ((correctHits.length +
              nonTargets.filter((t) => !t.responded).length) /
              logs.length) *
              100
          )
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

    if (level === 1) return "Iyi Performans";
    if (level === 2) return "Standart Performans";
    if (level === 3) return "Dusuk Performans";
    return "Performansta Zorluk";
  };

  const getScoreColor = (score) => {
    const level = getLevel(score);

    if (level === 1) return "#16A34A";
    if (level === 2) return "#65A30D";
    if (level === 3) return "#F59E0B";
    return "#DC2626";
  };

  const getPdfColor = (score) => {
    const level = getLevel(score);

    if (level === 1) return [22, 163, 74];
    if (level === 2) return [101, 163, 13];
    if (level === 3) return [245, 158, 11];
    return [220, 38, 38];
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
          label: "Durtusellik",
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

  const buildChartOptions = () => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: {
          display: true,
          position: "bottom"
        },
        tooltip: {
          enabled: true
        }
      },
      scales: {
        y: {
          min: 0,
          max: 100,
          ticks: {
            stepSize: 10
          }
        }
      }
    };
  };

  const getSectionSummary = () => {
    const sections = ["Temel", "Gorsel", "Isitsel", "Kombine"];

    return sections.map((section) => {
      const list = trialLog.current.filter((t) => t.section === section);

      const omissions = list.filter((t) => t.isTarget && !t.responded).length;
      const late = list.filter(
        (t) => t.isTarget && t.responded && t.reactionTime > LATE_RESPONSE_MS
      ).length;
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
      `Test ${metrics.totalTrials} deneme uzerinden tamamlandi. Genel dogruluk orani %${metrics.accuracy}, ortalama tepki suresi ${metrics.avgReaction} ms olarak hesaplandi.`
    );

    if (scores.attention >= 6) {
      comments.push("Dikkat alaninda belirgin zorlanma goruldu.");
    } else if (scores.attention >= 3) {
      comments.push("Dikkat performansinda zaman zaman dusus goruldu.");
    } else {
      comments.push("Dikkat performansi genel olarak korunmustur.");
    }

    if (scores.timing >= 6) {
      comments.push("Zamanlama alaninda belirgin gecikme vardir.");
    } else if (scores.timing >= 3) {
      comments.push("Zamanlama performansinda hafif-orta duzeyde gecikmeler gorulmustur.");
    } else {
      comments.push("Zamanlama becerisi genel olarak yeterli gorunmektedir.");
    }

    if (scores.impulsivity >= 6) {
      comments.push("Durtusel tepki egilimi yuksektir.");
    } else if (scores.impulsivity >= 3) {
      comments.push("Durtusel yanitlar zaman zaman ortaya cikmistir.");
    } else {
      comments.push("Durtu kontrolu genel olarak korunmustur.");
    }

    if (scores.hyperactivity >= 6) {
      comments.push("Motor yanit kontrolunde belirgin duzensizlik vardir.");
    } else if (scores.hyperactivity >= 3) {
      comments.push("Motor yanit kontrolunde zaman zaman duzensizlik gorulmustur.");
    } else {
      comments.push("Motor yanit kontrolu genel olarak duzenlidir.");
    }

    return comments.join(" ");
  };

  const drawPdfShape = (doc, shape, color, x, y, size) => {
    doc.setFillColor(color[0], color[1], color[2]);

    if (shape === "circle") {
      doc.circle(x + size / 2, y + size / 2, size / 2, "F");
    }

    if (shape === "square") {
      doc.rect(x, y, size, size, "F");
    }

    if (shape === "triangle") {
      doc.triangle(x + size / 2, y, x, y + size, x + size, y + size, "F");
    }

    if (shape === "diamond") {
      doc.triangle(x + size / 2, y, x, y + size / 2, x + size / 2, y + size, "F");
      doc.triangle(x + size / 2, y, x + size, y + size / 2, x + size / 2, y + size, "F");
    }

    if (shape === "pentagon") {
      const points = [
        [x + size / 2, y],
        [x + size, y + size * 0.38],
        [x + size * 0.82, y + size],
        [x + size * 0.18, y + size],
        [x, y + size * 0.38]
      ];
      doc.lines(
        points.slice(1).map((p, i) => [p[0] - points[i][0], p[1] - points[i][1]]),
        points[0][0],
        points[0][1],
        [1, 1],
        "F",
        true
      );
    }

    if (shape === "hexagon") {
      const points = [
        [x + size * 0.25, y],
        [x + size * 0.75, y],
        [x + size, y + size * 0.5],
        [x + size * 0.75, y + size],
        [x + size * 0.25, y + size],
        [x, y + size * 0.5]
      ];
      doc.lines(
        points.slice(1).map((p, i) => [p[0] - points[i][0], p[1] - points[i][1]]),
        points[0][0],
        points[0][1],
        [1, 1],
        "F",
        true
      );
    }

    if (shape === "vertical") {
      doc.rect(x + size * 0.28, y, size * 0.44, size, "F");
    }

    if (shape === "horizontal") {
      doc.rect(x, y + size * 0.28, size, size * 0.44, "F");
    }

    if (shape === "plus") {
      doc.rect(x + size * 0.4, y, size * 0.2, size, "F");
      doc.rect(x, y + size * 0.4, size, size * 0.2, "F");
    }

    if (shape === "xshape") {
      doc.setLineWidth(size * 0.12);
      doc.setDrawColor(color[0], color[1], color[2]);
      doc.line(x, y, x + size, y + size);
      doc.line(x + size, y, x, y + size);
      doc.setLineWidth(0.2);
    }
  };

  const hexToRgb = (hex) => {
    const clean = hex.replace("#", "");
    return [
      parseInt(clean.substring(0, 2), 16),
      parseInt(clean.substring(2, 4), 16),
      parseInt(clean.substring(4, 6), 16)
    ];
  };

  const drawPdfCard = (doc, title, value, x, y) => {
    const color = getPdfColor(value);

    doc.setFillColor(...color);
    doc.roundedRect(x, y, 42, 25, 3, 3, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text(title, x + 5, y + 8);

    doc.setFontSize(16);
    doc.text(String(value), x + 5, y + 19);

    doc.setTextColor(0, 0, 0);
  };

  const downloadReport = () => {
    const scores = calculateScores();
    const metrics = getRawMetrics();
    const sections = getSectionSummary();
    const currentTarget = targetRef.current;

    const doc = new jsPDF("p", "mm", "a4");

    doc.setFillColor(20, 36, 64);
    doc.rect(0, 0, 210, 34, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(19);
    doc.text("Dikkat Performans Raporu", 14, 17);

    doc.setFontSize(9);
    doc.text("Bilgisayarli dikkat ve tepki kontrolu degerlendirmesi", 14, 26);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text("Rapor Tarihi: " + new Date().toLocaleDateString("tr-TR"), 14, 45);
    doc.text("Test Tipi: 10 nesneli hedef / hedef disi uyaran gorevi", 14, 52);
    doc.text("Toplam Deneme: " + TOTAL_TRIALS, 14, 59);

    doc.text("Hedef Nesne:", 14, 72);
    drawPdfShape(doc, currentTarget.shape, hexToRgb(currentTarget.color), 45, 64, 16);

    drawPdfCard(doc, "Dikkat", scores.attention, 14, 90);
    drawPdfCard(doc, "Zamanlama", scores.timing, 60, 90);
    drawPdfCard(doc, "Durtusellik", scores.impulsivity, 106, 90);
    drawPdfCard(doc, "Hiperaktivite", scores.hyperactivity, 152, 90);

    autoTable(doc, {
      startY: 128,
      head: [["Indeks", "Hata Skoru", "Seviye", "Yorum"]],
      body: [
        ["A - Dikkat", scores.attention, getLevel(scores.attention), getLevelText(scores.attention)],
        ["T - Zamanlama", scores.timing, getLevel(scores.timing), getLevelText(scores.timing)],
        ["I - Durtusellik", scores.impulsivity, getLevel(scores.impulsivity), getLevelText(scores.impulsivity)],
        ["H - Hiperaktivite", scores.hyperactivity, getLevel(scores.hyperactivity), getLevelText(scores.hyperactivity)]
      ],
      theme: "grid",
      headStyles: { fillColor: [20, 36, 64], textColor: [255, 255, 255] },
      styles: { fontSize: 9, cellPadding: 3 }
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [["Olcum", "Deger"]],
      body: [
        ["Genel Dogruluk", "%" + metrics.accuracy],
        ["Ortalama Tepki Suresi", metrics.avgReaction + " ms"],
        ["Hedef Sayisi", metrics.targets],
        ["Hedef Disi Uyaran Sayisi", metrics.nonTargets],
        ["Dogru Hedef Yaniti", metrics.correctHits],
        ["Kacirilan Hedef", metrics.omissions],
        ["Gec Yanit", metrics.lateResponses],
        ["Yanlis / Durtusel Yanit", metrics.impulsiveErrors],
        ["Coklu Tuslama", metrics.multiPress]
      ],
      theme: "striped",
      headStyles: { fillColor: [55, 65, 81], textColor: [255, 255, 255] },
      styles: { fontSize: 9, cellPadding: 3 }
    });

    const chart = chartRef.current;
    const chartImage = chart?.canvas?.toDataURL("image/png", 1.0);

    doc.addPage();

    doc.setFillColor(20, 36, 64);
    doc.rect(0, 0, 210, 24, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.text("Performans Grafigi", 14, 15);

    doc.setTextColor(0, 0, 0);

    if (chartImage) {
      doc.addImage(chartImage, "PNG", 12, 34, 186, 95);
    }

    autoTable(doc, {
      startY: 140,
      head: [["Bolum", "Dikkat", "Zamanlama", "Durtusellik", "Hiperaktivite"]],
      body: sections.map((s) => [
        s.section,
        s.attentionScore,
        s.timingScore,
        s.impulsivityScore,
        s.hyperactivityScore
      ]),
      theme: "grid",
      headStyles: { fillColor: [20, 36, 64], textColor: [255, 255, 255] },
      styles: { fontSize: 9, cellPadding: 3 }
    });

    const comment = generateSmartComment(scores, metrics);

    doc.setFontSize(14);
    doc.text("Otomatik Yorum", 14, doc.lastAutoTable.finalY + 16);

    doc.setFontSize(10);
    doc.text(comment, 14, doc.lastAutoTable.finalY + 26, { maxWidth: 182 });

    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    doc.text(
      "Not: Bu uygulama klinik tani koymaz. Sonuclar yalnizca dikkat performansi hakkinda on bilgi saglar.",
      14,
      282,
      { maxWidth: 182 }
    );

    doc.save("dikkat-performans-raporu.pdf");
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
          {scene && (
            <ShapeView shape={scene.shape} color={scene.color} size={150} />
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
            <Line
              ref={chartRef}
              data={buildChartData()}
              options={buildChartOptions()}
            />
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
