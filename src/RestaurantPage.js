// pages/RestaurantListingPage.jsx
// Route: /explore?cuisine=chinese  OR  /explore?dish=momos  OR  /explore?cuisine=chinese&dish=momos

import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectCartTotalUnits } from "./redux_utils/cartSlice";

// ── Selectors ─────────────────────────────────────────────────────
const selectRestaurants = (state) => state.food.restaurants;
const selectBindings    = (state) => state.food.bindings;

function useFilteredRestaurants(cuisineParam, dishParam) {
  const restaurants = useSelector(selectRestaurants);
  const bindings    = useSelector(selectBindings);

  return useMemo(() => {
    const matchedResIds = new Set(
      bindings
        .filter(b => {
          const cuisineMatch = cuisineParam
            ? b.cuisine?.toLowerCase() === cuisineParam.toLowerCase()
            : true;
          const dishMatch = dishParam
            ? b.dish?.toLowerCase() === dishParam.toLowerCase()
            : true;
          return cuisineMatch && dishMatch;
        })
        .map(b => String(b.res_id))
    );
    return Object.values(restaurants).filter(r => matchedResIds.has(String(r.res_id)));
  }, [restaurants, bindings, cuisineParam, dishParam]);
}

// ── Palette ───────────────────────────────────────────────────────
const CUISINE_PALETTE = {
  chinese:      { grad: "135deg,#FF922B,#E64D00", accent: "#FF922B", glow: "#FF922B30", emoji: "🥡" },
  indian:       { grad: "135deg,#FF6B9D,#FF3D7F", accent: "#FF6B9D", glow: "#FF6B9D30", emoji: "🍛" },
  italian:      { grad: "135deg,#4D96FF,#1565C0", accent: "#4D96FF", glow: "#4D96FF30", emoji: "🍝" },
  soups:        { grad: "135deg,#38D9A9,#00897B", accent: "#38D9A9", glow: "#38D9A930", emoji: "🍲" },
  dessert:      { grad: "135deg,#CC5DE8,#9C27B0", accent: "#CC5DE8", glow: "#CC5DE830", emoji: "🍰" },
  "sweet dish": { grad: "135deg,#FFD93D,#FFC300", accent: "#FFD93D", glow: "#FFD93D30", emoji: "🍭" },
};
const DEFAULT_PALETTE = { grad: "135deg,#a78bfa,#7c3aed", accent: "#a78bfa", glow: "#a78bfa30", emoji: "🍽️" };
const getPalette = (key) => CUISINE_PALETTE[key?.toLowerCase()] ?? DEFAULT_PALETTE;

// ── Star Row ──────────────────────────────────────────────────────
function StarRow({ rating }) {
  const val = parseFloat(rating) || 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
      {[1,2,3,4,5].map(i => (
        <svg key={i} width={13} height={13} viewBox="0 0 24 24">
          <path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            fill={i <= Math.round(val) ? "#FFD93D" : "rgba(255,255,255,0.13)"}
          />
        </svg>
      ))}
      <span style={{
        marginLeft: 5, fontFamily: "'Space Mono',monospace",
        fontSize: "0.78rem", fontWeight: 700, color: "#FFD93D",
      }}>
        {val > 0 ? val.toFixed(1) : "–"}
      </span>
    </div>
  );
}

// ── Restaurant Row ────────────────────────────────────────────────
function RestaurantRow({ res, accent, glow, idx, cuisineParam, dishParam }) {
  const [hovered, setHovered] = useState(false);
  const [imgErr,  setImgErr]  = useState(false);

  const params = new URLSearchParams();
  if (cuisineParam) params.set("cuisine", cuisineParam);
  if (dishParam)    params.set("dish",    dishParam);
  const to = `/res/${res.res_id}?${params.toString()}`;

  return (
    <Link
      to={to}
      style={{ textDecoration: "none", display: "block" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{
        display: "flex", alignItems: "center",
        background: hovered ? `${accent}0e` : "rgba(255,255,255,0.026)",
        border: `1px solid ${hovered ? accent + "50" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 20, overflow: "hidden",
        transition: "all 0.28s cubic-bezier(.34,1.56,.64,1)",
        transform: hovered ? "translateX(5px)" : "none",
        boxShadow: hovered
          ? `0 8px 40px ${glow}, 0 2px 12px rgba(0,0,0,0.4)`
          : "0 1px 8px rgba(0,0,0,0.25)",
        animation: `rowIn 0.55s cubic-bezier(.34,1.56,.64,1) ${idx * 0.055}s both`,
      }}>
        {/* Image */}
        <div style={{
          width: 106, height: 88, flexShrink: 0,
          position: "relative", overflow: "hidden",
          background: `linear-gradient(135deg,${accent}22,${accent}08)`,
        }}>
          {res.res_image && !imgErr ? (
            <img
              src={res.res_image} alt={res.name}
              onError={() => setImgErr(true)}
              style={{
                width: "100%", height: "100%", objectFit: "cover",
                opacity: hovered ? 0.92 : 0.75,
                transform: hovered ? "scale(1.08)" : "scale(1)",
                transition: "opacity 0.3s, transform 0.4s",
              }}
            />
          ) : (
            <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"2.2rem" }}>🏪</div>
          )}
          <div style={{
            position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
            background: `linear-gradient(to bottom,${accent},${accent}66)`,
            opacity: hovered ? 1 : 0, transition: "opacity 0.25s",
          }} />
        </div>

        {/* Info */}
        <div style={{ flex: 1, padding: "14px 16px", minWidth: 0 }}>
          <div style={{
            fontFamily: "'Nunito',sans-serif", fontWeight: 900,
            fontSize: "0.98rem", color: "#fff", marginBottom: 6,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {res.name}
          </div>
          <StarRow rating={res.rating} />
        </div>

        {/* Arrow */}
        <div style={{
          padding: "0 18px", flexShrink: 0,
          color: hovered ? accent : "rgba(255,255,255,0.18)",
          transition: "color 0.25s, transform 0.25s",
          transform: hovered ? "translateX(3px)" : "none",
        }}>
          <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.3} strokeLinecap="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

// ── Search Bar ────────────────────────────────────────────────────
function SearchBar({ value, onChange, accent }) {
  const inputRef = useRef(null);
  const [focused, setFocused] = useState(false);

  return (
    <div style={{
      position: "relative",
      border: `1.5px solid ${focused ? accent : "rgba(255,255,255,0.1)"}`,
      borderRadius: 14, overflow: "hidden",
      background: focused ? `${accent}0c` : "rgba(255,255,255,0.04)",
      transition: "border-color 0.25s, background 0.25s, box-shadow 0.25s",
      boxShadow: focused ? `0 0 0 3px ${accent}1e` : "none",
    }}>
      <div style={{
        position: "absolute", left: 15, top: "50%", transform: "translateY(-50%)",
        color: focused ? accent : "rgba(255,255,255,0.28)", transition: "color 0.25s", pointerEvents: "none",
      }}>
        <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
          <circle cx={11} cy={11} r={8} /><line x1={21} y1={21} x2={16.65} y2={16.65} />
        </svg>
      </div>
      <input
        ref={inputRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Search restaurants…"
        style={{
          width: "100%", background: "none", border: "none", outline: "none",
          padding: "13px 40px 13px 44px",
          fontFamily: "'Nunito',sans-serif", fontWeight: 600, fontSize: "0.92rem",
          color: "#fff", caretColor: accent,
        }}
      />
      {value && (
        <button
          onClick={() => { onChange(""); inputRef.current?.focus(); }}
          style={{
            position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
            background: "rgba(255,255,255,0.09)", border: "none", borderRadius: "50%",
            width: 22, height: 22, cursor: "pointer", color: "rgba(255,255,255,0.55)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
          }}
        >×</button>
      )}
    </div>
  );
}

// ── Sort Selector ─────────────────────────────────────────────────
function SortSelector({ value, onChange }) {
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 12, padding: "11px 32px 11px 13px",
          color: "#fff", fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: "0.8rem",
          cursor: "pointer", outline: "none", appearance: "none", WebkitAppearance: "none",
        }}
      >
        {[
          { value: "default",     label: "Default"  },
          { value: "rating_desc", label: "Rating ↓" },
          { value: "rating_asc",  label: "Rating ↑" },
          { value: "name_asc",    label: "A → Z"    },
        ].map(o => (
          <option key={o.value} value={o.value} style={{ background: "#0d0d1a" }}>{o.label}</option>
        ))}
      </select>
      <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "rgba(255,255,255,0.35)", fontSize: 9 }}>▼</div>
    </div>
  );
}

// ── Filter Chip ───────────────────────────────────────────────────
function FilterChip({ label, accent, onRemove }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: `${accent}1e`, border: `1px solid ${accent}48`,
      borderRadius: 20, padding: "5px 10px 5px 13px",
      fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: "0.76rem", color: accent,
      animation: "chipIn 0.3s cubic-bezier(.34,1.56,.64,1) both",
    }}>
      {label}
      {onRemove && (
        <button onClick={onRemove} style={{
          background: `${accent}28`, border: "none", borderRadius: "50%",
          width: 17, height: 17, cursor: "pointer", color: accent,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, padding: 0,
        }}>×</button>
      )}
    </div>
  );
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
    <Link to="/cart" style={{ textDecoration: "none", position: "fixed", bottom: 28, right: 24, zIndex: 100 }}>
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
        {/* Cart icon */}
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 01-8 0"/>
        </svg>

        <span style={{
          fontFamily: "'Nunito',sans-serif", fontWeight: 900,
          fontSize: "0.9rem", color: "#fff",
        }}>
          View Cart
        </span>

        {/* Count bubble */}
        <div style={{
          background: "rgba(255,255,255,0.25)", borderRadius: 20,
          padding: "2px 10px", minWidth: 26, textAlign: "center",
          fontFamily: "'Space Mono',monospace", fontWeight: 700,
          fontSize: "0.78rem", color: "#fff",
          transform: bumped ? "scale(1.25)" : "scale(1)",
          transition: "transform 0.3s cubic-bezier(.34,1.56,.64,1)",
        }}>
          {totalUnits}
        </div>
      </div>
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────
export default function RestaurantListingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const cuisineParam = searchParams.get("cuisine") ?? "";
  const dishParam    = searchParams.get("dish")    ?? "";

  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode]       = useState("default");
  const [mounted, setMounted]         = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  const baseRestaurants = useFilteredRestaurants(cuisineParam, dishParam);
  const palette         = getPalette(cuisineParam || dishParam);
  const cartTotal       = useSelector(selectCartTotalUnits);

  const searched = useMemo(() => {
    if (!searchQuery.trim()) return baseRestaurants;
    const q = searchQuery.toLowerCase();
    return baseRestaurants.filter(r => r.name?.toLowerCase().includes(q));
  }, [baseRestaurants, searchQuery]);

  const sorted = useMemo(() => {
    const arr = [...searched];
    if (sortMode === "rating_desc") arr.sort((a,b) => (parseFloat(b.rating)||0) - (parseFloat(a.rating)||0));
    else if (sortMode === "rating_asc")  arr.sort((a,b) => (parseFloat(a.rating)||0) - (parseFloat(b.rating)||0));
    else if (sortMode === "name_asc")    arr.sort((a,b) => (a.name||"").localeCompare(b.name||""));
    return arr;
  }, [searched, sortMode]);

  const title = dishParam
    ? dishParam.replace(/\b\w/g, c => c.toUpperCase())
    : cuisineParam
    ? cuisineParam.replace(/\b\w/g, c => c.toUpperCase())
    : "All Restaurants";

  const removeCuisine = () => { const p = new URLSearchParams(searchParams); p.delete("cuisine"); setSearchParams(p); };
  const removeDish    = () => { const p = new URLSearchParams(searchParams); p.delete("dish");    setSearchParams(p); };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg,#0d0d1a 0%,#150d2e 45%,#0a1628 100%)",
      fontFamily: "'Nunito',sans-serif", color: "#fff",
      position: "relative", overflowX: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Space+Mono:wght@700&display=swap');
        @keyframes rowIn {
          0%   { opacity:0; transform: translateX(-18px); }
          100% { opacity:1; transform: translateX(0); }
        }
        @keyframes chipIn {
          0%   { opacity:0; transform: scale(0.75); }
          100% { opacity:1; transform: scale(1); }
        }
        @keyframes fadeUp {
          0%   { opacity:0; transform: translateY(14px); }
          100% { opacity:1; transform: translateY(0); }
        }
        @keyframes headerSlide {
          0%   { opacity:0; transform: translateY(-16px); }
          100% { opacity:1; transform: translateY(0); }
        }
        @keyframes cartFloat {
          0%   { opacity:0; transform: translateY(24px) scale(0.88); }
          100% { opacity:1; transform: translateY(0) scale(1); }
        }
        ::placeholder { color: rgba(255,255,255,0.22) !important; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        a { color: inherit; }
      `}</style>

      {/* Ambient blobs */}
      <div style={{ position:"fixed", top:-100, left:-100, width:480, height:480, borderRadius:"50%", background:`radial-gradient(circle,${palette.accent}12 0%,transparent 70%)`, pointerEvents:"none", zIndex:0 }} />
      <div style={{ position:"fixed", bottom:-80, right:-80, width:380, height:380, borderRadius:"50%", background:`radial-gradient(circle,${palette.accent}0c 0%,transparent 70%)`, pointerEvents:"none", zIndex:0 }} />

      {/* ── Sticky header ── */}
      <div style={{
        position:"sticky", top:0, zIndex:50,
        background:"rgba(13,13,26,0.86)", backdropFilter:"blur(20px)",
        borderBottom:"1px solid rgba(255,255,255,0.055)",
        padding:"0 20px",
        animation:"headerSlide 0.4s ease both",
      }}>
        <div style={{ maxWidth:660, margin:"0 auto", padding:"16px 0 12px" }}>

          {/* Title row */}
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:13 }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)",
                borderRadius:11, padding:"7px 13px", color:"rgba(255,255,255,0.6)",
                cursor:"pointer", fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:"0.82rem",
                display:"flex", alignItems:"center", gap:5, transition:"all 0.2s", flexShrink:0,
              }}
              onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.1)";e.currentTarget.style.color="#fff";}}
              onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.06)";e.currentTarget.style.color="rgba(255,255,255,0.6)";}}
            >
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
              Back
            </button>

            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:"1.35rem" }}>{palette.emoji}</span>
                <h1 style={{
                  margin:0, fontFamily:"'Nunito',sans-serif", fontWeight:900,
                  fontSize:"clamp(1rem,3vw,1.35rem)",
                  background:`linear-gradient(${palette.grad})`,
                  WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                }}>
                  {title}
                </h1>
              </div>
              <div style={{ color:"rgba(255,255,255,0.3)", fontSize:"0.73rem", fontWeight:600, marginTop:2 }}>
                {sorted.length} restaurant{sorted.length !== 1 ? "s" : ""}
                {searchQuery && ` matching "${searchQuery}"`}
              </div>
            </div>
          </div>

          {/* Search + sort */}
          <div style={{ display:"flex", gap:10, marginBottom:(cuisineParam||dishParam)?10:0 }}>
            <div style={{ flex:1 }}>
              <SearchBar value={searchQuery} onChange={setSearchQuery} accent={palette.accent} />
            </div>
            <SortSelector value={sortMode} onChange={setSortMode} />
          </div>

          {/* Filter chips */}
          {(cuisineParam || dishParam) && (
            <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
              {cuisineParam && <FilterChip label={`🌍 ${cuisineParam}`} accent={palette.accent} onRemove={removeCuisine} />}
              {dishParam    && <FilterChip label={`🍽️ ${dishParam}`}   accent={palette.accent} onRemove={removeDish} />}
            </div>
          )}
        </div>
      </div>

      {/* ── Restaurant list ── */}
      <div style={{
        maxWidth:660, margin:"0 auto", padding:"22px 20px 100px",
        opacity: mounted ? 1 : 0, transition:"opacity 0.4s ease",
      }}>
        {sorted.length === 0 ? (
          <div style={{ textAlign:"center", padding:"80px 20px", animation:"fadeUp 0.5s ease both" }}>
            <div style={{ fontSize:"3.5rem", marginBottom:14 }}>{searchQuery ? "🔍" : "🍽️"}</div>
            <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:"1.08rem", color:"rgba(255,255,255,0.5)", marginBottom:8 }}>
              {searchQuery ? `No restaurants match "${searchQuery}"` : "No restaurants found"}
            </div>
            <div style={{ color:"rgba(255,255,255,0.28)", fontSize:"0.8rem" }}>
              {searchQuery ? "Try a different name" : "Data is still loading — check back shortly"}
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{
                  marginTop:18, background:`${palette.accent}1a`,
                  border:`1px solid ${palette.accent}40`, borderRadius:11,
                  padding:"9px 20px", cursor:"pointer", color:palette.accent,
                  fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:"0.86rem",
                }}
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
            {sorted.map((res, idx) => (
              <RestaurantRow
                key={res.res_id}
                res={res}
                idx={idx}
                accent={palette.accent}
                glow={palette.glow}
                cuisineParam={cuisineParam}
                dishParam={dishParam}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Floating cart button ── */}
      <FloatingCartButton totalUnits={cartTotal} />
    </div>
  );
}