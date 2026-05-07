import { useState } from "react";
import { supabase } from "./lib/supabaseClient";

export default function AuthPage({ onAuthSuccess }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [infoMessage, setInfoMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const isLogin = mode === "login";

  const resetMessages = () => {
    setInfoMessage("");
    setErrorMessage("");
  };

  const handleSubmit = async () => {
    resetMessages();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setErrorMessage("E-posta ve şifre zorunludur.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Şifre en az 6 karakter olmalıdır.");
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          if (
            error.message?.toLowerCase().includes("email not confirmed") ||
            error.message?.toLowerCase().includes("not confirmed")
          ) {
            setErrorMessage(
              "Hesabınız henüz doğrulanmamış. Lütfen mail adresinize gelen doğrulama linkine tıklayın."
            );
          } else {
            setErrorMessage(error.message);
          }

          return;
        }

        onAuthSuccess();
      } else {
        const { error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
        });

        if (error) {
          setErrorMessage(error.message);
          return;
        }

        setInfoMessage(
          "Üyelik kaydınız oluşturuldu. Mail adresinize gelen linke tıklayarak hesap doğrulama ve sisteme giriş işlemini yapabilirsiniz."
        );

        setMode("login");
        setPassword("");
      }
    } catch (error) {
      setErrorMessage(
        "İşlem sırasında bağlantı hatası oluştu. Lütfen internet bağlantınızı kontrol edip tekrar deneyin."
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    resetMessages();
    setMode(isLogin ? "register" : "login");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FFFFFF",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Arial, sans-serif",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 430,
          background: "white",
          borderRadius: 24,
          padding: 34,
          boxShadow: "0 18px 50px rgba(15,23,42,0.12)",
        }}
      >
        <h1 style={{ textAlign: "center", marginTop: 0 }}>
          {isLogin ? "Giriş Yap" : "Üye Ol"}
        </h1>

        <p
          style={{
            textAlign: "center",
            fontWeight: "bold",
            color: "#142440",
            marginBottom: 26,
          }}
        >
          FocusProLab
        </p>

        <label style={{ fontWeight: "bold" }}>E-posta</label>
        <input
          type="email"
          placeholder="ornek@mail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />

        <label style={{ fontWeight: "bold" }}>Şifre</label>
        <input
          type="password"
          placeholder="En az 6 karakter"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />

        {infoMessage && <div style={infoBox}>{infoMessage}</div>}

        {errorMessage && <div style={errorBox}>{errorMessage}</div>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            ...buttonStyle,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "İşleniyor..." : isLogin ? "Giriş Yap" : "Üye Ol"}
        </button>

        <button
          onClick={toggleMode}
          style={{
            marginTop: 12,
            width: "100%",
            border: "none",
            background: "transparent",
            color: "#142440",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          {isLogin
            ? "Hesabınız yok mu? Üye Ol"
            : "Zaten hesabınız var mı? Giriş Yap"}
        </button>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: 13,
  marginTop: 8,
  marginBottom: 16,
  borderRadius: 12,
  border: "1px solid #CBD5E1",
  fontSize: 15,
  boxSizing: "border-box",
};

const buttonStyle = {
  width: "100%",
  padding: 15,
  background: "#142440",
  color: "white",
  border: "none",
  borderRadius: 14,
  fontSize: 16,
  cursor: "pointer",
  fontWeight: "bold",
};

const infoBox = {
  background: "#ECFDF5",
  border: "1px solid #86EFAC",
  color: "#166534",
  padding: 12,
  borderRadius: 12,
  fontSize: 14,
  lineHeight: 1.45,
  marginBottom: 14,
};

const errorBox = {
  background: "#FEF2F2",
  border: "1px solid #FCA5A5",
  color: "#DC2626",
  padding: 12,
  borderRadius: 12,
  fontSize: 14,
  lineHeight: 1.45,
  marginBottom: 14,
};