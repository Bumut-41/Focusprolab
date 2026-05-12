import { useCallback, useRef, useState } from "react";
import { ageFromBirthDate, getProfile, profileKeyFromAge } from "./profiles.js";
import { ShapeView } from "./shapeUtils.jsx";
import { useAttentionTest } from "./useAttentionTest.js";
import { ReportPanel } from "./components/ReportPanel.jsx";

const input = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  fontSize: 15,
  marginTop: 6
};

const card = {
  width: "100%",
  maxWidth: 640,
  background: "#fff",
  borderRadius: 20,
  padding: 28,
  boxShadow: "0 12px 40px rgba(15,23,42,0.1)"
};

export default function App() {
  const [step, setStep] = useState("form");
  const [name, setName] = useState("");
  const [birth, setBirth] = useState("");
  const [gender, setGender] = useState("");
  const [consent, setConsent] = useState(false);
  const [err, setErr] = useState("");
  const [age, setAge] = useState("");
  const [pkey, setPkey] = useState("adult");
  const [logs, setLogs] = useState([]);

  const chartRef = useRef(null);
  const profile = getProfile(pkey);

  const onDone = useCallback((snapshot) => {
    setLogs(snapshot);
    setStep("report");
  }, []);

  const { target, scene, gifs, running, start, register, resetAfterReport } = useAttentionTest(profile, {
    onFinished: onDone
  });

  const participant = { name, age, birthDate: birth, gender };

  function submitForm(e) {
    e.preventDefault();
    setErr("");
    if (!name.trim()) {
      setErr("Ad soyad girin.");
      return;
    }
    const a = ageFromBirthDate(birth);
    if (a === null || a < 6 || a > 99) {
      setErr("Geçerli doğum tarihi (6–99 yaş).");
      return;
    }
    if (!gender) {
      setErr("Cinsiyet seçin.");
      return;
    }
    const k = profileKeyFromAge(a);
    if ((k === "child" || k === "teen") && !consent) {
      setErr("Çocuk/ergen için onam kutusunu işaretleyin.");
      return;
    }
    setAge(String(a));
    setPkey(k);
    setStep("brief");
  }

  function beginTest() {
    setLogs([]);
    start();
    setStep("run");
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 16px 48px", background: "#f1f5f9" }}>
      <header style={{ textAlign: "center", marginBottom: 20 }}>
        <h1 style={{ margin: 0, color: "#0f172a" }}>FocusProLab</h1>
        <p style={{ margin: "8px 0 0", color: "#475569", maxWidth: 520 }}>
          Hedef şekil ve renk birlikte gelince SPACE veya ekrana dokun. Yaşa göre süre ve fazlar değişir.
        </p>
      </header>

      {step === "form" && (
        <form onSubmit={submitForm} style={card}>
          <h2 style={{ marginTop: 0 }}>Katılımcı</h2>
          <label style={{ fontWeight: 600 }}>Ad soyad</label>
          <input value={name} onChange={(e) => setName(e.target.value)} style={input} autoComplete="name" />
          <label style={{ fontWeight: 600, display: "block", marginTop: 12 }}>Doğum tarihi</label>
          <input
            type="date"
            value={birth}
            onChange={(e) => {
              setBirth(e.target.value);
              const a = ageFromBirthDate(e.target.value);
              setPkey(a == null ? "adult" : profileKeyFromAge(a));
              if (profileKeyFromAge(a) === "adult") setConsent(false);
            }}
            style={input}
          />
          <label style={{ fontWeight: 600, display: "block", marginTop: 12 }}>Cinsiyet</label>
          <select value={gender} onChange={(e) => setGender(e.target.value)} style={input}>
            <option value="">Seçin</option>
            <option value="Kadın">Kadın</option>
            <option value="Erkek">Erkek</option>
          </select>
          {(pkey === "child" || pkey === "teen") && (
            <label style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "flex-start", color: "#334155" }}>
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 4 }} />
              <span>Veli / yasal temsilci bilgilendirme ve onamı alındı.</span>
            </label>
          )}
          {err && <p style={{ color: "#b91c1c", background: "#fef2f2", padding: 12, borderRadius: 12 }}>{err}</p>}
          <button
            type="submit"
            style={{
              marginTop: 20,
              width: "100%",
              padding: "14px 20px",
              border: "none",
              borderRadius: 14,
              background: "#142440",
              color: "#fff",
              fontWeight: 700,
              fontSize: 16,
              cursor: "pointer"
            }}
          >
            Devam
          </button>
        </form>
      )}

      {step === "brief" && target && (
        <div style={{ ...card, maxWidth: 720, textAlign: "center" }}>
          <h2>Test hazır</h2>
          <p style={{ color: "#475569" }}>
            Profil: <strong>{getProfile(pkey).label}</strong> — süre yaklaşık <strong>{Math.round(getProfile(pkey).durationMs / 60000)}</strong> dk.
          </p>
          <p>
            Aşağıdaki <strong>hedef</strong> göründüğünde yanıt ver.
          </p>
          <div
            style={{
              margin: "24px auto",
              width: 160,
              height: 160,
              borderRadius: 20,
              border: "3px solid #142440",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#f8fafc"
            }}
          >
            <ShapeView shape={target.shape} color={target.color} size={90} />
          </div>
          <button
            type="button"
            onClick={beginTest}
            style={{
              padding: "14px 28px",
              border: "none",
              borderRadius: 14,
              background: "#142440",
              color: "#fff",
              fontWeight: 700,
              fontSize: 16,
              cursor: "pointer"
            }}
          >
            Teste başla
          </button>
        </div>
      )}

      {step === "run" && running && (
        <div
          role="presentation"
          onClick={register}
          onTouchStart={register}
          style={{
            width: "min(96vw, 900px)",
            height: "min(72vh, 620px)",
            background: "#fff",
            borderRadius: 20,
            position: "relative",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 12px 40px rgba(15,23,42,0.12)",
            touchAction: "manipulation",
            userSelect: "none"
          }}
        >
          {gifs.map((g) => (
            <img
              key={g.id}
              src={g.gif}
              alt=""
              onError={(e) => {
                e.target.style.display = "none";
              }}
              style={{
                position: "absolute",
                left: `${g.left}%`,
                top: `${g.top}%`,
                width: g.size,
                maxWidth: "32%",
                transform: "translate(-50%, -50%)",
                pointerEvents: "none",
                zIndex: 1
              }}
            />
          ))}
          {scene && (
            <div style={{ zIndex: 2 }}>
              <ShapeView shape={scene.shape} color={scene.color} size={140} />
            </div>
          )}
        </div>
      )}

      {step === "report" && target && logs.length > 0 && (
        <div style={{ ...card, maxWidth: 900 }}>
          <ReportPanel
            logs={logs}
            profile={profile}
            participant={participant}
            target={target}
            chartRef={chartRef}
            extraActions={
              <>
                <button
                  type="button"
                  onClick={() => {
                    resetAfterReport();
                    setLogs([]);
                    setStep("brief");
                  }}
                  style={{ padding: "12px 22px", borderRadius: 12, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" }}
                >
                  Aynı kişi — yeni test
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetAfterReport();
                    setName("");
                    setBirth("");
                    setGender("");
                    setConsent(false);
                    setAge("");
                    setPkey("adult");
                    setLogs([]);
                    setErr("");
                    setStep("form");
                  }}
                  style={{ padding: "12px 22px", borderRadius: 12, border: "1px solid #cbd5e1", background: "#f8fafc", cursor: "pointer" }}
                >
                  Yeni katılımcı
                </button>
              </>
            }
          />
        </div>
      )}
    </div>
  );
}
