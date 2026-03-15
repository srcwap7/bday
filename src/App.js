import { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { selectByCuisine, selectByDishKeyword } from "./redux_utils/foodSlice";
import { useNavigate, Link } from "react-router-dom";
import { syncCartFromServer, selectCartTotalUnits } from "./redux_utils/cartSlice";
import { apiFetch } from "./api";

// ── Balloon colours ──────────────────────────────────────────────
const BALLOON_COLORS = [
  ["#FF6B9D", "#FF3D7F"], ["#FFD93D", "#FFC300"], ["#6BCB77", "#4CAF50"],
  ["#4D96FF", "#1565C0"], ["#FF922B", "#E64D00"], ["#CC5DE8", "#9C27B0"],
  ["#FF6B6B", "#E53935"], ["#38D9A9", "#00897B"],
];

function seeded(seed) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

function generateBalloons(count = 18) {
  const rand = seeded(42);
  return Array.from({ length: count }, (_, i) => ({
    id: i, x: rand() * 100, color: BALLOON_COLORS[i % BALLOON_COLORS.length],
    size: 38 + rand() * 28, duration: 7 + rand() * 8, delay: rand() * 6, sway: 20 + rand() * 30,
  }));
}
const BALLOONS = generateBalloons(18);

const CONFETTI_COLORS = ["#FF6B9D","#FFD93D","#6BCB77","#4D96FF","#CC5DE8","#FF922B","#FF6B6B","#ffffff"];
function generateConfetti(count = 60) {
  const rand = seeded(99);
  return Array.from({ length: count }, (_, i) => ({
    id: i, x: rand() * 100, color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: 6 + rand() * 8, duration: 4 + rand() * 5, delay: rand() * 4,
    rotate: rand() * 360, shape: rand() > 0.5 ? "square" : "circle",
  }));
}
const CONFETTI = generateConfetti(60);

// ── Candle ────────────────────────────────────────────────────────
function Candle({ color, x, height = 28 }) {
  return (
    <g transform={`translate(${x}, 0)`}>
      <rect x={-4} y={-height} width={8} height={height} rx={3} fill={color} />
      <line x1={0} y1={-height} x2={0} y2={-height - 6} stroke="#555" strokeWidth={1.5} />
      <ellipse cx={0} cy={-height - 12} rx={5} ry={8} fill="#FFD93D" opacity={0.9}>
        <animate attributeName="ry" values="8;10;7;9;8" dur="0.6s" repeatCount="indefinite" />
        <animate attributeName="rx" values="5;4;6;5;5" dur="0.5s" repeatCount="indefinite" />
        <animate attributeName="cy" values={`${-height-12};${-height-14};${-height-11};${-height-13};${-height-12}`} dur="0.55s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx={0} cy={-height - 10} rx={2.5} ry={5} fill="#FF922B" opacity={0.85}>
        <animate attributeName="ry" values="5;6;4;5;5" dur="0.5s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx={0} cy={-height - 12} rx={10} ry={10} fill="#FFD93D" opacity={0.15}>
        <animate attributeName="opacity" values="0.15;0.25;0.1;0.2;0.15" dur="0.6s" repeatCount="indefinite" />
      </ellipse>
    </g>
  );
}

const CANDLE_DEFS = [
  { color: "#FF6B9D", x: -52, h: 26 }, { color: "#FFD93D", x: -36, h: 32 },
  { color: "#6BCB77", x: -20, h: 24 }, { color: "#4D96FF", x: 0, h: 30 },
  { color: "#CC5DE8", x: 20, h: 26 }, { color: "#FF922B", x: 36, h: 32 }, { color: "#FF6B6B", x: 52, h: 28 },
];

function BirthdayCake() {
  return (
    <svg width="220" height="190" viewBox="-110 -100 220 190" style={{ overflow: "visible" }}>
      <ellipse cx={0} cy={88} rx={96} ry={10} fill="#0004" />
      <rect x={-90} y={30} width={180} height={60} rx={12} fill="#FF6B9D" />
      <rect x={-90} y={30} width={180} height={14} rx={6} fill="#FF3D7F" />
      {[-70,-50,-30,-10,10,30,50,70].map((dx,i)=>(<ellipse key={i} cx={dx} cy={30} rx={8} ry={10} fill="#fff" opacity={0.85} />))}
      {[-60,-30,0,30,60].map((dx,i)=>(<circle key={i} cx={dx} cy={60} r={5} fill="#FFD93D" />))}
      <rect x={-64} y={-10} width={128} height={42} rx={10} fill="#CC5DE8" />
      <rect x={-64} y={-10} width={128} height={12} rx={6} fill="#9C27B0" />
      {[-46,-22,2,26,50].map((dx,i)=>(<ellipse key={i} cx={dx} cy={-10} rx={7} ry={9} fill="#fff" opacity={0.85} />))}
      {[-36,0,36].map((dx,i)=>(<circle key={i} cx={dx} cy={20} r={5} fill="#FF922B" />))}
      <rect x={-42} y={-48} width={84} height={40} rx={8} fill="#FFD93D" />
      <rect x={-42} y={-48} width={84} height={10} rx={5} fill="#FFC300" />
      {[-28,-8,12,32].map((dx,i)=>(<ellipse key={i} cx={dx} cy={-48} rx={6} ry={8} fill="#fff" opacity={0.85} />))}
      <g transform="translate(0,-48)">
        {CANDLE_DEFS.map((c,i) => <Candle key={i} color={c.color} x={c.x} height={c.h} />)}
      </g>
      <text x={0} y={72} textAnchor="middle" fontSize="11" fontFamily="'Pacifico',cursive" fill="#fff" opacity={0.9}>
        Happy Birthday!
      </text>
    </svg>
  );
}

// ── Shruti handwritten SVG ────────────────────────────────────────
const SHRUTI_LETTERS = [
  { id: "S", w: 72, paths: [{ d: "M 58,22 C 44,10 18,12 16,30 C 14,46 52,50 52,66 C 52,84 24,90 12,80", len: 180 }] },
  { id: "H", w: 76, paths: [
    { d: "M 14,18 C 13,30 12,70 12,90", len: 75 },
    { d: "M 12,54 C 25,46 46,46 60,54", len: 55, delay: 0.55 },
    { d: "M 60,18 C 60,32 60,70 62,92", len: 77, delay: 0.95 },
  ]},
  { id: "R", w: 68, paths: [
    { d: "M 14,20 C 13,40 13,70 14,92", len: 74 },
    { d: "M 14,20 C 28,14 52,18 54,36 C 56,52 36,58 14,58", len: 120, delay: 0.55 },
    { d: "M 14,58 C 30,56 44,68 58,92", len: 80, delay: 1.1 },
  ]},
  { id: "U", w: 68, paths: [{ d: "M 14,20 C 13,55 13,74 16,82 C 22,96 48,96 54,82 C 58,72 58,50 58,20", len: 180 }] },
  { id: "T", w: 62, paths: [
    { d: "M 31,14 C 31,40 31,70 33,92", len: 80 },
    { d: "M 10,28 C 20,22 44,22 54,28", len: 55, delay: 0.6 },
  ]},
  { id: "I", w: 38, paths: [
    { d: "M 19,14 C 19,40 19,68 21,92", len: 80 },
    { d: "M 14,28 C 16,24 24,22 26,26", len: 22, delay: 0 },
    { d: "M 16,90 C 18,92 26,94 28,90", len: 22, delay: 0.6 },
  ]},
];

const LETTER_DELAYS = [0, 1.0, 2.1, 3.4, 4.5, 5.4];
const WRITE_DURATION = 0.9;

function ShrutiHandwritten({ startWrite, delayOffset = 0, compact = false }) {
  const totalW = SHRUTI_LETTERS.reduce((a, l) => a + l.w, 0) + 8 * (SHRUTI_LETTERS.length - 1);
  return (
    <svg viewBox={`0 0 ${totalW} 120`} style={{
      width: compact ? "min(78vw, 340px)" : "min(92vw, 680px)", height: "auto", overflow: "visible",
      filter: "drop-shadow(0 0 24px rgba(255,217,61,0.55)) drop-shadow(0 0 8px rgba(255,107,157,0.4))",
    }}>
      <defs>
        <linearGradient id="shrutiGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFD93D" />
          <stop offset="40%" stopColor="#fff" />
          <stop offset="70%" stopColor="#FF6B9D" />
          <stop offset="100%" stopColor="#CC5DE8" />
        </linearGradient>
      </defs>
      {(() => {
        let xOffset = 0;
        return SHRUTI_LETTERS.map((letter, li) => {
          const x = xOffset;
          xOffset += letter.w + 8;
          const baseDelay = LETTER_DELAYS[li];
          return (
            <g key={letter.id} transform={`translate(${x}, 0)`}>
              {letter.paths.map((stroke, si) => {
                const strokeDelay = delayOffset + baseDelay + (stroke.delay || 0);
                const animStyle = startWrite
                  ? { strokeDasharray: stroke.len, strokeDashoffset: stroke.len, animation: `drawStroke ${WRITE_DURATION}s cubic-bezier(0.4,0,0.2,1) ${strokeDelay}s forwards` }
                  : { strokeDasharray: stroke.len, strokeDashoffset: stroke.len };
                return (
                  <path key={si} d={stroke.d} fill="none" stroke="url(#shrutiGrad)"
                    strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" style={animStyle} />
                );
              })}
            </g>
          );
        });
      })()}
    </svg>
  );
}

function TimerRing({ progress, seconds }) {
  const r = 22, circ = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: 60, height: 60, flexShrink: 0 }}>
      <svg width={60} height={60} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={30} cy={30} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={4} />
        <circle cx={30} cy={30} r={r} fill="none" stroke="#FFD93D" strokeWidth={4}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - progress)} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s linear" }} />
      </svg>
      <span style={{
        position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Space Mono', monospace", fontSize: 15, fontWeight: 700, color: "#FFD93D"
      }}>{seconds}</span>
    </div>
  );
}

// ── Explore Data ──────────────────────────────────────────────────
const DISHES = [
  { label: "Noodles",       keyword: "noodles",       cuisine: "chinese",   emoji: "🍜" },
  { label: "Momos",         keyword: "momos",         cuisine: "chinese",   emoji: "🥟" },
  { label: "Fried Rice",    keyword: "fried rice",    cuisine: "chinese",   emoji: "🍚" },
  { label: "Manchurian",    keyword: "manchurian",    cuisine: "chinese",   emoji: "🥢" },
  { label: "Soups",         keyword: "soups",         cuisine: "soups",     emoji: "🍲" },
  { label: "Pizza",         keyword: "pizza",         cuisine: "italian",   emoji: "🍕" },
  { label: "Pasta",         keyword: "pastas",        cuisine: "italian",   emoji: "🍝" },
  { label: "Gobi",          keyword: "gobi",          cuisine: "indian",    emoji: "🥦" },
  { label: "Biryani",       keyword: "biryani",       cuisine: "indian",    emoji: "🫕" },
  { label: "Mushroom",      keyword: "mushroom",      cuisine: "indian",    emoji: "🍄" },
  { label: "Paneer",        keyword: "paneer",        cuisine: "indian",    emoji: "🧀" },
  { label: "Bhurji",        keyword: "bhurji",        cuisine: "indian",    emoji: "🍳" },
  { label: "Chaap",         keyword: "chaap",         cuisine: "indian",    emoji: "🥩" },
  { label: "Chole Kulche",  keyword: "chhole kulche", cuisine: "indian",    emoji: "🫓" },
  { label: "Chole Bhatura", keyword: "chhola bhatura",cuisine: "indian",    emoji: "🫔" },
  { label: "Alu Puri",      keyword: "alu puri",      cuisine: "indian",    emoji: "🥙" },
  { label: "Sweet",         keyword: "sweet",         cuisine: "dessert",   emoji: "🍬" },
  { label: "Dessert",       keyword: "dessert",       cuisine: "dessert",   emoji: "🍮" },
  { label: "Sweet Dish",    keyword: "sweet dish",    cuisine: "sweet dish",emoji: "🧁" },
];

const CUISINES = [
  { label: "Chinese",    keyword: "chinese",    emoji: "🥡" },
  { label: "Indian",     keyword: "indian",     emoji: "🍛" },
  { label: "Italian",    keyword: "italian",    emoji: "🇮🇹" },
  { label: "Soups",      keyword: "soups",      emoji: "🍜" },
  { label: "Desserts",   keyword: "dessert",    emoji: "🍰" },
  { label: "Sweet Dish", keyword: "sweet dish", emoji: "🍭" },
];

const CUISINE_COLORS = {
  chinese:      { bg: "linear-gradient(135deg,#FF922B22,#FFD93D22)", border: "#FF922B66", accent: "#FF922B" },
  indian:       { bg: "linear-gradient(135deg,#FF6B9D22,#FF3D7F22)", border: "#FF6B9D66", accent: "#FF6B9D" },
  italian:      { bg: "linear-gradient(135deg,#4D96FF22,#1565C022)", border: "#4D96FF66", accent: "#4D96FF" },
  soups:        { bg: "linear-gradient(135deg,#38D9A922,#00897B22)", border: "#38D9A966", accent: "#38D9A9" },
  dessert:      { bg: "linear-gradient(135deg,#CC5DE822,#9C27B022)", border: "#CC5DE866", accent: "#CC5DE8" },
  "sweet dish": { bg: "linear-gradient(135deg,#FFD93D22,#FFC30022)", border: "#FFD93D66", accent: "#FFD93D" },
  default:      { bg: "linear-gradient(135deg,#ffffff10,#ffffff08)", border: "#ffffff30", accent: "#ffffff" },
};

function getColors(cuisine) {
  return CUISINE_COLORS[cuisine?.toLowerCase()] || CUISINE_COLORS.default;
}

// ── Floating Cart Button ──────────────────────────────────────────
function FloatingCartButton({ totalUnits }) {
  const prevRef = useRef(totalUnits);
  const [bumped, setBumped] = useState(false);

  useEffect(() => {
    if (totalUnits !== prevRef.current) {
      setBumped(true);
      const t = setTimeout(() => setBumped(false), 400);
      prevRef.current = totalUnits;
      return () => clearTimeout(t);
    }
  }, [totalUnits]);

  if (totalUnits === 0) return null;

  return (
    <Link to="/cart" style={{ textDecoration: "none", position: "fixed", bottom: 28, right: 24, zIndex: 200 }}>
      <div
        style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "linear-gradient(135deg,#FF6B9D,#FF3D7F)",
          borderRadius: 18, padding: "13px 20px",
          boxShadow: "0 8px 36px rgba(255,61,127,0.5), 0 2px 12px rgba(0,0,0,0.4)",
          cursor: "pointer",
          transform: bumped ? "scale(1.12)" : "scale(1)",
          transition: "transform 0.3s cubic-bezier(.34,1.56,.64,1), box-shadow 0.25s",
          animation: "cartFloat 0.5s cubic-bezier(.34,1.56,.64,1) both",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.boxShadow = "0 14px 48px rgba(255,61,127,0.65)";
          e.currentTarget.style.transform = "scale(1.05)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.boxShadow = "0 8px 36px rgba(255,61,127,0.5), 0 2px 12px rgba(0,0,0,0.4)";
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 01-8 0"/>
        </svg>
        <span style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 900, fontSize: "0.9rem", color: "#fff" }}>
          View Cart
        </span>
        <div style={{
          background: "rgba(255,255,255,0.25)", borderRadius: 20,
          padding: "2px 10px", minWidth: 26, textAlign: "center",
          fontFamily: "'Space Mono',monospace", fontWeight: 700, fontSize: "0.78rem", color: "#fff",
          transform: bumped ? "scale(1.25)" : "scale(1)",
          transition: "transform 0.3s cubic-bezier(.34,1.56,.64,1)",
        }}>
          {totalUnits}
        </div>
      </div>
    </Link>
  );
}

// ── Restaurant Results Page ───────────────────────────────────────
function RestaurantCard({ item, idx }) {
  const { dishDetails: dish, restaurantDetails: res } = item;
  if (!dish || !res) return null;
  const colors = getColors(item.cuisine);

  return (
    <div style={{
      background: colors.bg, border: `1px solid ${colors.border}`,
      borderRadius: 20, padding: "20px 22px", display: "flex", gap: 16, alignItems: "center",
      animation: `cardSlideIn 0.5s cubic-bezier(.34,1.56,.64,1) ${idx * 0.07}s both`,
      cursor: "pointer", transition: "transform 0.2s, box-shadow 0.2s",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 12px 40px ${colors.accent}33`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{
        width: 72, height: 72, borderRadius: 16, flexShrink: 0, overflow: "hidden",
        background: `${colors.accent}22`, display: "flex", alignItems: "center", justifyContent: "center",
        border: `1px solid ${colors.border}`,
      }}>
        {res.res_image
          ? <img src={res.res_image} alt={res.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontSize: 32 }}>🏪</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: "1.05rem", color: "#fff", marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {res.name}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ background: `${colors.accent}33`, color: colors.accent, borderRadius: 8, padding: "2px 10px", fontSize: "0.78rem", fontWeight: 700, fontFamily: "'Nunito',sans-serif" }}>
            {dish.dish_name}
          </span>
          <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", fontFamily: "'Nunito',sans-serif" }}>{item.cuisine}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ color: "#FFD93D", fontSize: "0.85rem" }}>★</span>
          <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.85rem", fontWeight: 700, fontFamily: "'Space Mono',monospace" }}>{res.rating ?? "–"}</span>
        </div>
      </div>
      {dish.dish_image_link && (
        <div style={{ width: 56, height: 56, borderRadius: 12, overflow: "hidden", flexShrink: 0 }}>
          <img src={dish.dish_image_link} alt={dish.dish_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      )}
    </div>
  );
}

function ResultsPage({ selection, onBack }) {
  const isCuisine = selection.type === "cuisine";
  const items = useSelector(isCuisine ? selectByCuisine(selection.keyword) : selectByDishKeyword(selection.keyword));
  const colors = getColors(isCuisine ? selection.keyword : selection.cuisine);

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#1a0533 0%,#2d1b4e 40%,#0d2137 100%)", fontFamily: "'Nunito',sans-serif", padding: "0 0 60px" }}>
      <div style={{ padding: "24px 24px 0", display: "flex", alignItems: "center", gap: 16, position: "sticky", top: 0, zIndex: 10, background: "linear-gradient(135deg,#1a0533ee,#2d1b4eee)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${colors.accent}22` }}>
        <button onClick={onBack} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, padding: "8px 14px", color: "#fff", cursor: "pointer", fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: "0.9rem", display: "flex", alignItems: "center", gap: 6 }}>
          ← Back
        </button>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "1.8rem" }}>{selection.emoji}</span>
            <span style={{ fontFamily: "'Pacifico',cursive", fontSize: "1.5rem", color: colors.accent, textShadow: `0 0 20px ${colors.accent}66` }}>{selection.label}</span>
          </div>
          <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.82rem", marginTop: 2 }}>
            {items.length} {items.length === 1 ? "spot" : "spots"} available
          </div>
        </div>
      </div>
      <div style={{ padding: "24px 20px", display: "flex", flexDirection: "column", gap: 14, maxWidth: 600, margin: "0 auto" }}>
        {items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,0.35)", fontFamily: "'Nunito',sans-serif", fontSize: "1rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: 12 }}>🍽️</div>
            <div style={{ fontWeight: 700 }}>No restaurants found yet</div>
            <div style={{ fontSize: "0.85rem", marginTop: 6 }}>Check back after a moment!</div>
          </div>
        ) : (
          items.map((item, idx) => <RestaurantCard key={`${item.dish_id}-${item.res_id}`} item={item} idx={idx} />)
        )}
      </div>
    </div>
  );
}

// ── Explore Section ───────────────────────────────────────────────
function ExploreIcon({ emoji, label, accent, onClick, delay = 0 }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? `${accent}22` : "rgba(255,255,255,0.04)",
        border: `1.5px solid ${hovered ? accent : "rgba(255,255,255,0.1)"}`,
        borderRadius: 20, padding: "16px 12px", cursor: "pointer",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
        transition: "all 0.25s cubic-bezier(.34,1.56,.64,1)",
        transform: hovered ? "scale(1.08) translateY(-3px)" : "scale(1)",
        boxShadow: hovered ? `0 8px 28px ${accent}44` : "none",
        animation: `cardSlideIn 0.5s cubic-bezier(.34,1.56,.64,1) ${delay}s both`,
        minWidth: 80,
      }}
    >
      <span style={{ fontSize: "2rem", lineHeight: 1, filter: hovered ? `drop-shadow(0 0 8px ${accent})` : "none", transition: "filter 0.25s" }}>
        {emoji}
      </span>
      <span style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: "0.72rem", color: hovered ? accent : "rgba(255,255,255,0.7)", textAlign: "center", lineHeight: 1.2, transition: "color 0.25s", whiteSpace: "nowrap" }}>
        {label}
      </span>
    </button>
  );
}

function ExploreSection({ onSelect, visible }) {
  const navigate = useNavigate();
  return (
    <div style={{
      opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(40px)",
      transition: "opacity 0.8s ease, transform 0.8s cubic-bezier(.34,1.56,.64,1)",
      padding: "0 20px 100px", maxWidth: 680, margin: "0 auto",
    }}>
      
      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 0 28px" }}>
        <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,transparent,rgba(255,217,61,0.4))" }} />
        <span style={{ fontFamily: "'Pacifico',cursive", fontSize: "1.4rem", color: "#FFD93D", textShadow: "0 0 20px rgba(255,217,61,0.5)" }}>Explore Variants</span>
        <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,rgba(255,217,61,0.4),transparent)" }} />
      </div>

      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: "1.1rem" }}>🌍</span>
          <span style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", letterSpacing: "0.12em", textTransform: "uppercase" }}>By Cuisine</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {CUISINES.map((c, i) => {
            const colors = getColors(c.keyword);
            return <ExploreIcon key={c.keyword} emoji={c.emoji} label={c.label} accent={colors.accent} delay={i * 0.06} onClick={() => navigate(`/explore?cuisine=${c.keyword}`)} />;
          })}
        </div>
      </div>

      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: "1.1rem" }}>🍽️</span>
          <span style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", letterSpacing: "0.12em", textTransform: "uppercase" }}>By Dish</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {DISHES.map((c, i) => {
            const colors = getColors(c.cuisine);
            return <ExploreIcon key={c.keyword} emoji={c.emoji} label={c.label} accent={colors.accent} delay={i * 0.06} onClick={() => navigate(`/explore?dish=${c.keyword}`)} />;
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────
const LOCK_SECONDS   = 13;
const MODAL_SEEN_KEY = "birthday_modal_seen_v1";

export default function BirthdayPage() {
  const dispatch  = useDispatch();
  const cartTotal = useSelector(selectCartTotalUnits);

  const alreadySeen = sessionStorage.getItem(MODAL_SEEN_KEY) === "true";

  const [modalOpen,      setModalOpen]      = useState(!alreadySeen);
  const [timeLeft,       setTimeLeft]       = useState(alreadySeen ? 0 : LOCK_SECONDS);
  const [canClose,       setCanClose]       = useState(alreadySeen);
  const [titleVisible,   setTitleVisible]   = useState(alreadySeen);
  const [exploreVisible, setExploreVisible] = useState(alreadySeen);
  const [selection,      setSelection]      = useState(null);

  const intervalRef = useRef(null);

  useEffect(() => {

    apiFetch("/cart").then(async res => {
      if (res.ok) {
        const data = await res.json();
        if (data.success) dispatch(syncCartFromServer(data.cart));
      }
    }).catch(err => console.log(err));

    if (alreadySeen) return;

    setTimeout(() => setTitleVisible(true), 300);

    intervalRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(intervalRef.current); setCanClose(true); return 0; }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => {
    if (!canClose) return;
    sessionStorage.setItem(MODAL_SEEN_KEY, "true");
    setModalOpen(false);
    setTimeout(() => setExploreVisible(true), 400);
  };

  const progress = alreadySeen ? 1 : (LOCK_SECONDS - timeLeft) / LOCK_SECONDS;

  if (selection) {
    return (
      <>
        <style>{globalStyles}</style>
        <ResultsPage selection={selection} onBack={() => setSelection(null)} />
        <FloatingCartButton totalUnits={cartTotal} />
      </>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg,#1a0533 0%,#2d1b4e 40%,#0d2137 100%)",
      fontFamily: "'Nunito',sans-serif", overflow: "hidden", position: "relative",
    }}>
      <style>{globalStyles}</style>

      {BALLOONS.map(b => (
        <div key={b.id} className="balloon" style={{ left: `${b.x}%`, "--dur": `${b.duration}s`, "--delay": `${b.delay}s`, "--sway": `${b.sway}px` }}>
          <svg width={b.size} height={b.size * 1.3} viewBox="0 0 60 78" style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.3))" }}>
            <defs>
              <radialGradient id={`bg${b.id}`} cx="35%" cy="30%" r="65%">
                <stop offset="0%" stopColor={b.color[0]} />
                <stop offset="100%" stopColor={b.color[1]} />
              </radialGradient>
            </defs>
            <ellipse cx={30} cy={28} rx={26} ry={28} fill={`url(#bg${b.id})`} />
            <ellipse cx={20} cy={16} rx={8} ry={6} fill="rgba(255,255,255,0.35)" />
            <ellipse cx={30} cy={57} rx={4} ry={3} fill={b.color[1]} />
            <path d={`M30 60 Q${22+b.id%10} 68 30 78`} stroke={b.color[1]} strokeWidth={1.5} fill="none" opacity={0.7} />
          </svg>
        </div>
      ))}

      {CONFETTI.map(c => (
        <div key={c.id} className="confetti-piece" style={{
          left: `${c.x}%`, "--dur": `${c.duration}s`, "--delay": `${c.delay}s`,
          width: c.size, height: c.size, background: c.color,
          borderRadius: c.shape === "circle" ? "50%" : "2px",
          transform: `rotate(${c.rotate}deg)`, opacity: 0.85,
        }} />
      ))}

      <div style={{
        filter: modalOpen ? "blur(6px) brightness(0.55)" : "none",
        transition: "filter 0.6s ease",
        padding: "60px 24px 0",
        textAlign: "center",
        pointerEvents: modalOpen ? "none" : "auto",
      }}>
        <div style={{ marginBottom: 8 }}>
          {"HAPPY BIRTHDAY".split("").map((ch, i) => (
            <span key={i} style={{
              display: "inline-block",
              fontFamily: "'Pacifico',cursive",
              fontSize: "clamp(2rem, 6vw, 5rem)",
              color: i % 2 === 0 ? "#FFD93D" : "#FF6B9D",
              animation: titleVisible ? `letterPop 0.5s cubic-bezier(.34,1.56,.64,1) ${i * 0.06}s both` : "none",
              opacity: titleVisible ? undefined : 1,
              marginRight: ch === " " ? "0.4em" : "0.02em",
            }}>{ch}</span>
          ))}
        </div>
        <div style={{ marginBottom: 40, display: "flex", justifyContent: "center" }}>
          <ShrutiHandwritten startWrite={titleVisible} />
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 48 }}>
          <BirthdayCake />
        </div>
        <p style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: "clamp(1.1rem,2.5vw,1.8rem)", color: "rgba(255,255,255,0.75)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
          🎊 Wishing you a day as magical as you are 🎊
        </p>
        <ExploreSection visible={exploreVisible} onSelect={setSelection} />
      </div>

      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{
            background: "linear-gradient(145deg,#2d1b4e,#1a0533)",
            border: "2px solid rgba(255,217,61,0.35)", borderRadius: 28,
            padding: "40px 36px 36px", maxWidth: 480, width: "100%",
            textAlign: "center",
            boxShadow: "0 30px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.08)",
            animation: "modalIn 0.6s cubic-bezier(.34,1.56,.64,1) both",
            position: "relative", overflow: "hidden",
          }}>
            {[{ top: 16, left: 20 }, { top: 16, right: 20 }, { bottom: 16, left: 20 }, { bottom: 16, right: 20 }].map((pos, i) => (
              <div key={i} style={{ position: "absolute", ...pos, fontSize: 22, animation: `sparkle ${1 + i * 0.3}s ${i * 0.4}s ease-in-out infinite` }}>✨</div>
            ))}
            <div style={{ marginBottom: 8 }}>
              <svg width={110} height={100} viewBox="-55 -55 110 100" style={{ overflow: "visible" }}>
                <rect x={-44} y={10} width={88} height={40} rx={8} fill="#FF6B9D" />
                <rect x={-44} y={10} width={88} height={10} rx={5} fill="#FF3D7F" />
                {[-28,-8,12,32].map((dx,i) => <ellipse key={i} cx={dx} cy={10} rx={6} ry={8} fill="#fff" opacity={0.85} />)}
                <rect x={-28} y={-16} width={56} height={28} rx={6} fill="#FFD93D" />
                <rect x={-28} y={-16} width={56} height={8} rx={4} fill="#FFC300" />
                {[-14,4,22].map((dx,i) => <ellipse key={i} cx={dx} cy={-16} rx={5} ry={7} fill="#fff" opacity={0.85} />)}
                <g transform="translate(0,-16)">
                  {[{c:"#FF6B9D",x:-22,h:18},{c:"#6BCB77",x:-8,h:22},{c:"#4D96FF",x:8,h:18},{c:"#CC5DE8",x:22,h:20}].map((cd,i) => (
                    <Candle key={i} color={cd.c} x={cd.x} height={cd.h} />
                  ))}
                </g>
              </svg>
            </div>
            <div style={{ fontFamily: "'Pacifico',cursive", fontSize: "1.9rem", color: "#FFD93D", margin: "0 0 10px", textShadow: "0 0 30px rgba(255,217,61,0.5)", opacity: 0, animation: "fadeSlideUp 0.7s ease 0.5s forwards" }}>
              Happy Birthday
            </div>
            <div style={{ display: "flex", justifyContent: "center", margin: "0 0 6px" }}>
              <ShrutiHandwritten startWrite={true} delayOffset={1.1} compact />
            </div>
            <div style={{ fontSize: "2rem", margin: "0 0 16px", opacity: 0, animation: "fadeSlideUp 0.6s cubic-bezier(.34,1.56,.64,1) 7.8s forwards" }}>🎉</div>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "1rem", lineHeight: 1.6, marginBottom: 28, fontWeight: 600 }}>
              Something special is being prepared just for you.<br />
              Hold on for just a moment… ✨
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 16, background: "rgba(255,255,255,0.05)", borderRadius: 16, padding: "14px 20px", marginBottom: 20, border: "1px solid rgba(255,255,255,0.08)" }}>
              <TimerRing progress={progress} seconds={timeLeft} />
              <p style={{ margin: 0, textAlign: "left", color: canClose ? "#6BCB77" : "rgba(255,255,255,0.65)", fontSize: "0.92rem", fontWeight: 600, transition: "color 0.4s" }}>
                {canClose ? "🎊 Everything's ready! Click below to continue." : `Fetching your birthday surprise… ${timeLeft}s`}
              </p>
            </div>
            <button onClick={handleClose} disabled={!canClose} style={{
              width: "100%", padding: "15px 24px", borderRadius: 14, border: "none",
              cursor: canClose ? "pointer" : "not-allowed",
              fontFamily: "'Nunito',sans-serif", fontWeight: 900, fontSize: "1.05rem",
              letterSpacing: "0.05em", textTransform: "uppercase",
              background: canClose ? "linear-gradient(135deg,#FF6B9D,#FF3D7F)" : "rgba(255,255,255,0.08)",
              color: canClose ? "#fff" : "rgba(255,255,255,0.3)",
              transition: "all 0.4s ease",
              animation: canClose ? "pulse 1.5s ease-in-out infinite" : "none",
              boxShadow: canClose ? "0 8px 32px rgba(255,61,127,0.4)" : "none",
            }}>
              {canClose ? "🎂 Let's Celebrate!" : "Please wait…"}
            </button>
          </div>
        </div>
      )}

      <FloatingCartButton totalUnits={cartTotal} />
    </div>
  );
}

// ── Global Styles ─────────────────────────────────────────────────
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Pacifico&family=Nunito:wght@400;600;700;800;900&family=Space+Mono:wght@700&display=swap');

  @keyframes floatUp {
    0%   { transform: translateY(110vh) translateX(0); opacity:0; }
    5%   { opacity:1; }
    95%  { opacity:1; }
    100% { transform: translateY(-12vh) translateX(var(--sway)); opacity:0; }
  }
  @keyframes confettiFall {
    0%   { transform: translateY(-10vh) rotate(0deg); opacity:1; }
    100% { transform: translateY(110vh) rotate(720deg); opacity:0; }
  }
  @keyframes letterPop {
    0%   { transform: scale(0) rotate(-15deg); opacity:0; }
    60%  { transform: scale(1.2) rotate(4deg); }
    100% { transform: scale(1) rotate(0deg); opacity:1; }
  }
  @keyframes pulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(255,217,61,0.4); }
    50%      { box-shadow: 0 0 0 14px rgba(255,217,61,0); }
  }
  @keyframes modalIn {
    0%   { transform: scale(0.6) translateY(40px); opacity:0; }
    70%  { transform: scale(1.04) translateY(-4px); }
    100% { transform: scale(1) translateY(0); opacity:1; }
  }
  @keyframes sparkle {
    0%,100% { opacity:0; transform:scale(0); }
    50%      { opacity:1; transform:scale(1); }
  }
  @keyframes drawStroke { to { stroke-dashoffset: 0; } }
  @keyframes fadeSlideUp {
    0%   { opacity:0; transform: translateY(10px); }
    100% { opacity:1; transform: translateY(0); }
  }
  @keyframes inkDot {
    0%   { opacity:1; }
    60%  { opacity:1; }
    100% { opacity:0; }
  }
  @keyframes cardSlideIn {
    0%   { opacity:0; transform: translateY(20px) scale(0.94); }
    100% { opacity:1; transform: translateY(0) scale(1); }
  }
  @keyframes cartFloat {
    0%   { opacity:0; transform: translateY(24px) scale(0.88); }
    100% { opacity:1; transform: translateY(0) scale(1); }
  }
  @keyframes addressPulse {
    0%,100% { opacity:0.6; transform:scale(1); }
    50%      { opacity:0; transform:scale(1.18); }
  }
  .balloon { position:absolute; bottom:-10%; animation: floatUp var(--dur) var(--delay) ease-in infinite; }
  .confetti-piece { position:absolute; top:-5%; animation: confettiFall var(--dur) var(--delay) linear infinite; }
  * { box-sizing: border-box; }
`;