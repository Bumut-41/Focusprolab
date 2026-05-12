export function getGifPosition(area, zone) {
  const row = { upper: 26, middle: 50, lower: 74 };
  return { left: area === "left" ? 18 : 82, top: row[zone] ?? 50 };
}

export function getShapeSvg(shape, color) {
  const c = color;
  const map = {
    circle: `<svg width="72" height="72" viewBox="0 0 72 72"><circle cx="36" cy="36" r="30" fill="${c}"/></svg>`,
    square: `<svg width="72" height="72" viewBox="0 0 72 72"><rect x="10" y="10" width="52" height="52" fill="${c}"/></svg>`,
    triangle: `<svg width="72" height="72" viewBox="0 0 72 72"><polygon points="36,6 8,66 64,66" fill="${c}"/></svg>`,
    diamond: `<svg width="72" height="72" viewBox="0 0 72 72"><polygon points="36,4 68,36 36,68 4,36" fill="${c}"/></svg>`,
    pentagon: `<svg width="72" height="72" viewBox="0 0 72 72"><polygon points="36,5 66,28 54,66 18,66 6,28" fill="${c}"/></svg>`,
    hexagon: `<svg width="72" height="72" viewBox="0 0 72 72"><polygon points="20,8 52,8 66,36 52,64 20,64 6,36" fill="${c}"/></svg>`,
    vertical: `<svg width="72" height="72" viewBox="0 0 72 72"><rect x="28" y="6" width="16" height="60" fill="${c}"/></svg>`,
    horizontal: `<svg width="72" height="72" viewBox="0 0 72 72"><rect x="6" y="28" width="60" height="16" fill="${c}"/></svg>`,
    plus: `<svg width="72" height="72" viewBox="0 0 72 72"><rect x="28" y="8" width="16" height="56" fill="${c}"/><rect x="8" y="28" width="56" height="16" fill="${c}"/></svg>`,
    xshape: `<svg width="72" height="72" viewBox="0 0 72 72"><line x1="12" y1="12" x2="60" y2="60" stroke="${c}" stroke-width="12"/><line x1="60" y1="12" x2="12" y2="60" stroke="${c}" stroke-width="12"/></svg>`
  };
  return map[shape] ?? map.circle;
}

export function ShapeView({ shape, color, size = 100 }) {
  const b = { width: size, height: size, background: color, display: "inline-block" };
  if (shape === "circle") return <div style={{ ...b, borderRadius: "50%" }} />;
  if (shape === "square") return <div style={b} />;
  if (shape === "triangle") return <div style={{ ...b, clipPath: "polygon(50% 0%,0% 100%,100% 100%)" }} />;
  if (shape === "diamond") return <div style={{ ...b, transform: "rotate(45deg)" }} />;
  if (shape === "pentagon") {
    return <div style={{ ...b, clipPath: "polygon(50% 0%,100% 38%,82% 100%,18% 100%,0% 38%)" }} />;
  }
  if (shape === "hexagon") {
    return <div style={{ ...b, clipPath: "polygon(25% 0%,75% 0%,100% 50%,75% 100%,25% 100%,0% 50%)" }} />;
  }
  if (shape === "vertical") return <div style={{ width: size * 0.4, height: size, background: color, display: "inline-block" }} />;
  if (shape === "horizontal") return <div style={{ width: size, height: size * 0.4, background: color, display: "inline-block" }} />;
  if (shape === "plus") {
    return (
      <div style={{ width: size, height: size, position: "relative", display: "inline-block" }}>
        <div style={{ position: "absolute", left: size * 0.38, top: 0, width: size * 0.24, height: size, background: color }} />
        <div style={{ position: "absolute", left: 0, top: size * 0.38, width: size, height: size * 0.24, background: color }} />
      </div>
    );
  }
  if (shape === "xshape") {
    return (
      <div style={{ width: size, height: size, position: "relative", display: "inline-block" }}>
        <div style={{ position: "absolute", left: size * 0.42, top: 0, width: size * 0.16, height: size, background: color, transform: "rotate(45deg)" }} />
        <div style={{ position: "absolute", left: size * 0.42, top: 0, width: size * 0.16, height: size, background: color, transform: "rotate(-45deg)" }} />
      </div>
    );
  }
  return null;
}
