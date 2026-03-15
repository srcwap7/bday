// pages/RestaurantItemsPage.jsx
//
// Route (React Router v6):
//   <Route path="/res/:resId" element={<RestaurantItemsPage />} />

import { useState, useMemo, useEffect, useRef } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  addToCart,
  removeFromCart,
  dropFromCart,
  selectItemQuantity,
  selectCartTotalUnits,
} from "./redux_utils/cartSlice";

// ── Food state selectors ──────────────────────────────────────────
const selectDishesMap      = (s) => s.food.dishes;
const selectRestaurantsMap = (s) => s.food.restaurants;
const selectBindings       = (s) => s.food.bindings;

// ── Cart API ──────────────────────────────────────────────────────
// Fires POST /updateCart.  Returns true on success, false on failure.
// Optimistic: caller has already updated Redux before calling this.
async function callUpdateCart({ dish_id, dish_name, res_name, res_id, dish_image,action }) {
  try {
    const res = await fetch("http://localhost:3009/updateCart", {
      method:      "POST",
      credentials: "include",
      headers:     { "Content-Type": "application/json" },
      body:        JSON.stringify({ dish_id, dish_name, res_name, res_id, dish_image,action }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error("[updateCart] server error:", data.message ?? res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[updateCart] network error:", err);
    return false;
  }
}

// ── Palette ───────────────────────────────────────────────────────
const CUISINE_PALETTE = {
  chinese:      { grad: "135deg,#FF922B,#E64D00", accent: "#FF922B", glow: "#FF922B40", emoji: "🥡" },
  indian:       { grad: "135deg,#FF6B9D,#FF3D7F", accent: "#FF6B9D", glow: "#FF6B9D40", emoji: "🍛" },
  italian:      { grad: "135deg,#4D96FF,#1565C0", accent: "#4D96FF", glow: "#4D96FF40", emoji: "🍝" },
  soups:        { grad: "135deg,#38D9A9,#00897B", accent: "#38D9A9", glow: "#38D9A940", emoji: "🍲" },
  dessert:      { grad: "135deg,#CC5DE8,#9C27B0", accent: "#CC5DE8", glow: "#CC5DE840", emoji: "🍰" },
  "sweet dish": { grad: "135deg,#FFD93D,#FFC300", accent: "#FFD93D", glow: "#FFD93D40", emoji: "🍭" },
};
const DEFAULT_PALETTE = { grad: "135deg,#a78bfa,#7c3aed", accent: "#a78bfa", glow: "#a78bfa40", emoji: "🍽️" };
const getPalette = (key) => CUISINE_PALETTE[key?.toLowerCase()] ?? DEFAULT_PALETTE;

// ── Quantity stepper ──────────────────────────────────────────────
function Stepper({ quantity, onAdd, onRemove, accent }) {
  return (
    <div style={{
      display: "flex", alignItems: "center",
      background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)",
      border: `1px solid ${accent}55`, borderRadius: 12, overflow: "hidden",
    }}>
      <button
        onClick={e => { e.stopPropagation(); onRemove(); }}
        style={{
          width: 36, height: 36, border: "none",
          background: quantity === 1 ? "rgba(229,115,115,0.15)" : "transparent",
          color: quantity === 1 ? "#ef9a9a" : "rgba(255,255,255,0.75)",
          fontSize: "1rem", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background 0.2s, color 0.2s",
          borderRight: `1px solid ${accent}30`,
        }}
        onMouseEnter={e => e.currentTarget.style.background = quantity === 1 ? "rgba(229,115,115,0.3)" : `${accent}22`}
        onMouseLeave={e => e.currentTarget.style.background = quantity === 1 ? "rgba(229,115,115,0.15)" : "transparent"}
      >
        {quantity === 1
          ? <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          : "−"
        }
      </button>

      <span style={{
        minWidth: 32, textAlign: "center",
        fontFamily: "'Space Mono',monospace", fontWeight: 700,
        fontSize: "0.84rem", color: "#fff",
      }}>
        {quantity}
      </span>

      <button
        onClick={e => { e.stopPropagation(); onAdd(); }}
        style={{
          width: 36, height: 36, border: "none",
          background: "transparent", color: accent,
          fontSize: "1.2rem", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background 0.2s",
          borderLeft: `1px solid ${accent}30`,
        }}
        onMouseEnter={e => e.currentTarget.style.background = `${accent}28`}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >+</button>
    </div>
  );
}

// ── Add to cart button ────────────────────────────────────────────
function AddButton({ accent, onAdd }) {
  const [pressed, setPressed] = useState(false);

  const handle = (e) => {
    e.stopPropagation();
    setPressed(true);
    onAdd();
    setTimeout(() => setPressed(false), 500);
  };

  return (
    <button
      onClick={handle}
      style={{
        display: "flex", alignItems: "center", gap: 7,
        padding: "9px 16px", border: `1px solid ${accent}55`, borderRadius: 12, cursor: "pointer",
        background: pressed ? accent : `${accent}1e`,
        color: pressed ? "#fff" : accent,
        fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: "0.8rem",
        transition: "all 0.25s cubic-bezier(.34,1.56,.64,1)",
        transform: pressed ? "scale(0.94)" : "scale(1)",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={e => { if (!pressed) { e.currentTarget.style.background = `${accent}35`; e.currentTarget.style.transform = "scale(1.04)"; } }}
      onMouseLeave={e => { if (!pressed) { e.currentTarget.style.background = `${accent}1e`; e.currentTarget.style.transform = "scale(1)"; } }}
    >
      <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.3} strokeLinecap="round">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
        <line x1="3" y1="6" x2="21" y2="6"/>
        <path d="M16 10a4 4 0 01-8 0"/>
      </svg>
      Add to Cart
    </button>
  );
}

// ── Dish Card ─────────────────────────────────────────────────────
function DishCard({ dish, resId, accent, glow, idx, dispatch }) {
  const [hovered,   setHovered]   = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError,  setImgError]  = useState(false);

  const restaurantsMap = useSelector(selectRestaurantsMap);
  const resName = restaurantsMap[String(resId)]?.name ?? `Restaurant #${resId}`;

  const quantity = useSelector(selectItemQuantity(dish.dish_id, resId));
  const inCart   = quantity > 0;

  // Shared payload fields for the API
  const cartPayload = {
    dish_id:   dish.dish_id,
    dish_name: dish.dish_name,
    dish_image: dish.dish_image,
    res_name:  resName,
    res_id:    resId,
  };

  // ── Add: optimistic Redux update + fire API ───────────────────
  const handleAdd = () => {
    dispatch(addToCart({
      dish_id:   dish.dish_id,
      res_id:    resId,
      dish_image: dish.dish_image ?? "",
      dish_name: dish.dish_name,
      res_name:  resName,
    }));
    callUpdateCart({ ...cartPayload, action: "add" });
  };

  // ── Remove (decrement or drop): optimistic Redux + fire API ──
  const handleRemove = () => {
    if (quantity === 1) {
      dispatch(dropFromCart({ dish_id: dish.dish_id, res_id: resId }));
    } else {
      dispatch(removeFromCart({ dish_id: dish.dish_id, res_id: resId }));
    }
    // Server always gets "remove" — it handles qty=0 deletion internally
    callUpdateCart({ ...cartPayload, action: "remove" });
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: inCart
          ? `linear-gradient(145deg,${accent}18,${accent}0a)`
          : hovered
          ? `linear-gradient(145deg,${accent}10,${accent}06)`
          : "rgba(255,255,255,0.028)",
        border: `1px solid ${inCart ? accent + "65" : hovered ? accent + "40" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 24, overflow: "hidden",
        transition: "all 0.3s cubic-bezier(.34,1.56,.64,1)",
        transform: hovered ? "translateY(-6px) scale(1.02)" : "none",
        boxShadow: inCart
          ? `0 0 0 1px ${accent}28, 0 16px 50px ${glow}`
          : hovered
          ? `0 20px 60px ${glow}, 0 4px 20px rgba(0,0,0,0.5)`
          : "0 2px 16px rgba(0,0,0,0.3)",
        animation: `dishIn 0.6s cubic-bezier(.34,1.56,.64,1) ${idx * 0.07}s both`,
        display: "flex", flexDirection: "column",
      }}
    >
      {/* Image */}
      <div style={{
        position: "relative", height: 190,
        background: `linear-gradient(145deg,${accent}18,${accent}08)`,
        overflow: "hidden", flexShrink: 0,
      }}>
        {dish.dish_image && !imgError ? (
          <>
            {!imgLoaded && (
              <div style={{
                position: "absolute", inset: 0,
                background: `linear-gradient(145deg,${accent}22,${accent}08)`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3rem",
              }}>🍽️</div>
            )}
            <img
              src={dish.dish_image} alt={dish.dish_name}
              onLoad={() => setImgLoaded(true)} onError={() => setImgError(true)}
              style={{
                width: "100%", height: "100%", objectFit: "cover",
                opacity: imgLoaded ? 1 : 0,
                transition: "opacity 0.4s ease, transform 0.4s ease",
                transform: hovered ? "scale(1.07)" : "scale(1)",
              }}
            />
          </>
        ) : (
          <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"4rem" }}>🍽️</div>
        )}

        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 80,
          background: "linear-gradient(transparent,rgba(10,8,20,0.9))", pointerEvents: "none",
        }} />

        {/* Cuisine badge */}
        <div style={{
          position: "absolute", top: 12, left: 12,
          background: `${accent}25`, backdropFilter: "blur(10px)",
          border: `1px solid ${accent}55`, borderRadius: 10, padding: "3px 10px",
          fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: "0.68rem",
          color: accent, textTransform: "capitalize",
        }}>
          {dish.cuisine}
        </div>

        {/* In-cart quantity badge */}
        {inCart && (
          <div style={{
            position: "absolute", top: 12, right: 12,
            background: accent, borderRadius: 10, padding: "3px 9px",
            fontFamily: "'Space Mono',monospace", fontWeight: 700, fontSize: "0.68rem",
            color: "#fff", boxShadow: `0 4px 14px ${glow}`,
            animation: "badgePop 0.35s cubic-bezier(.34,1.56,.64,1) both",
          }}>
            ×{quantity}
          </div>
        )}

        {/* Keyword */}
        <div style={{
          position: "absolute", bottom: 10, left: 12,
          fontFamily: "'Nunito',sans-serif", fontWeight: 700,
          fontSize: "0.7rem", color: "rgba(255,255,255,0.45)",
        }}>
          #{dish.dishKeyword}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "14px 16px 16px", flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
        <h3 style={{
          margin: 0, fontFamily: "'Nunito',sans-serif", fontWeight: 900,
          fontSize: "1rem", color: "#fff", lineHeight: 1.2,
        }}>
          {dish.dish_name}
        </h3>

        {/* Accent underline */}
        <div style={{
          height: 2,
          width: inCart ? "80%" : hovered ? "55%" : "28%",
          background: `linear-gradient(90deg,${accent},transparent)`,
          borderRadius: 2, transition: "width 0.4s ease",
        }} />

        {/* Cart controls */}
        <div style={{ marginTop: "auto" }}>
          {inCart
            ? <Stepper quantity={quantity} accent={accent} onAdd={handleAdd} onRemove={handleRemove} />
            : <AddButton accent={accent} onAdd={handleAdd} />
          }
        </div>
      </div>
    </div>
  );
}

// ── Restaurant Hero ───────────────────────────────────────────────
function RestaurantHero({ restaurant, palette, totalItems }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  if (!restaurant) return null;

  return (
    <div style={{ position: "relative", animation: "heroIn 0.7s cubic-bezier(.34,1.56,.64,1) both" }}>
      <div style={{
        height: "clamp(180px,28vw,280px)", position: "relative", overflow: "hidden",
        background: `linear-gradient(145deg,${palette.accent}28,${palette.accent}08)`,
      }}>
        {restaurant.res_image && (
          <img src={restaurant.res_image} alt={restaurant.name}
            onLoad={() => setImgLoaded(true)}
            style={{ width:"100%", height:"100%", objectFit:"cover", opacity: imgLoaded ? 0.6 : 0, transition:"opacity 0.5s ease", filter:"saturate(1.1)" }}
          />
        )}
        <div style={{ position:"absolute", inset:0, background:`linear-gradient(to bottom,${palette.accent}18 0%,rgba(10,8,20,0.92) 100%)` }} />
        <div style={{ position:"absolute", inset:0, background:`radial-gradient(ellipse at 30% 50%,${palette.accent}15,transparent 70%)` }} />

        <div style={{ position:"absolute", bottom:24, left:24, right:24 }}>
          <div style={{ display:"flex", alignItems:"flex-end", gap:16, flexWrap:"wrap" }}>
            <div style={{
              width:72, height:72, borderRadius:20, overflow:"hidden", flexShrink:0,
              border:`3px solid ${palette.accent}`, boxShadow:`0 8px 32px ${palette.glow}`,
              background:`${palette.accent}22`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"2rem",
            }}>
              {restaurant.res_image
                ? <img src={restaurant.res_image} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                : "🏪"}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <h1 style={{
                margin:"0 0 4px", fontFamily:"'Nunito',sans-serif", fontWeight:900,
                fontSize:"clamp(1.3rem,4vw,2rem)", color:"#fff",
                textShadow:"0 2px 20px rgba(0,0,0,0.8)",
                whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
              }}>{restaurant.name}</h1>
              <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <span style={{ color:"#FFD93D", fontSize:"1rem" }}>★</span>
                  <span style={{ fontFamily:"'Space Mono',monospace", fontWeight:700, color:"#FFD93D", fontSize:"0.9rem" }}>
                    {parseFloat(restaurant.rating) > 0 ? parseFloat(restaurant.rating).toFixed(1) : "–"}
                  </span>
                </div>
                <div style={{
                  background:`${palette.accent}25`, border:`1px solid ${palette.accent}50`,
                  borderRadius:8, padding:"2px 10px",
                  fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:"0.75rem", color:palette.accent,
                }}>
                  {totalItems} item{totalItems !== 1 ? "s" : ""}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
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
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        background: "linear-gradient(135deg,#FF6B9D,#FF3D7F)",
        borderRadius: 18, padding: "13px 20px",
        boxShadow: "0 8px 36px rgba(255,61,127,0.5), 0 2px 12px rgba(0,0,0,0.4)",
        cursor: "pointer",
        transform: bumped ? "scale(1.12)" : "scale(1)",
        transition: "transform 0.3s cubic-bezier(.34,1.56,.64,1), box-shadow 0.25s",
        animation: "cartFloat 0.5s cubic-bezier(.34,1.56,.64,1) both",
      }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 14px 48px rgba(255,61,127,0.65)"; e.currentTarget.style.transform = "scale(1.05)"; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 8px 36px rgba(255,61,127,0.5), 0 2px 12px rgba(0,0,0,0.4)"; e.currentTarget.style.transform = "scale(1)"; }}
      >
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 01-8 0"/>
        </svg>
        <span style={{ fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:"0.9rem", color:"#fff" }}>
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

// ── Search Bar ────────────────────────────────────────────────────
function SearchBar({ value, onChange, accent }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{
      position: "relative",
      border: `1.5px solid ${focused ? accent : "rgba(255,255,255,0.1)"}`,
      borderRadius: 14, overflow: "hidden",
      background: focused ? `${accent}0c` : "rgba(255,255,255,0.04)",
      transition: "border-color 0.25s, background 0.25s, box-shadow 0.25s",
      boxShadow: focused ? `0 0 0 3px ${accent}20` : "none",
    }}>
      <div style={{
        position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
        color: focused ? accent : "rgba(255,255,255,0.25)", transition: "color 0.25s", pointerEvents: "none",
      }}>
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.3} strokeLinecap="round">
          <circle cx={11} cy={11} r={8}/><line x1={21} y1={21} x2={16.65} y2={16.65}/>
        </svg>
      </div>
      <input
        value={value} onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        placeholder="Search items…"
        style={{
          width: "100%", background: "none", border: "none", outline: "none",
          padding: "12px 40px 12px 42px",
          fontFamily: "'Nunito',sans-serif", fontWeight: 600, fontSize: "0.92rem",
          color: "#fff", caretColor: accent,
        }}
      />
      {value && (
        <button onClick={() => onChange("")} style={{
          position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
          background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "50%",
          width: 22, height: 22, cursor: "pointer", color: "rgba(255,255,255,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
        }}>×</button>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function RestaurantItemsPage() {
  const { resId }        = useParams();
  const [searchParams]   = useSearchParams();
  const navigate         = useNavigate();
  const dispatch         = useDispatch();

  const cuisineParam = searchParams.get("cuisine") ?? "";
  const dishParam    = searchParams.get("dish")    ?? "";

  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted]         = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 60); }, []);

  const dishesMap      = useSelector(selectDishesMap);
  const restaurantsMap = useSelector(selectRestaurantsMap);
  const bindings       = useSelector(selectBindings);
  const cartTotal      = useSelector(selectCartTotalUnits);
  const restaurant     = restaurantsMap[String(resId)] ?? null;

  const palette = getPalette(cuisineParam || dishParam);

  const filtered = useMemo(() => bindings.filter(b => {
    if (String(b.res_id) !== String(resId)) return false;
    const cm = cuisineParam ? b.cuisine?.toLowerCase() === cuisineParam.toLowerCase() : true;
    const dm = dishParam    ? b.dish?.toLowerCase()    === dishParam.toLowerCase()    : true;
    return cm && dm;
  }), [bindings, resId, cuisineParam, dishParam]);

  const uniqueDishes = useMemo(() => {
    const seen = new Set();
    return filtered
      .filter(b => { if (seen.has(b.dish_id)) return false; seen.add(b.dish_id); return true; })
      .map(b => ({ ...(dishesMap[String(b.dish_id)] ?? {}), dish_id: b.dish_id, cuisine: b.cuisine, dishKeyword: b.dish }))
      .filter(d => d.dish_name);
  }, [filtered, dishesMap]);

  const displayDishes = useMemo(() => {
    if (!searchQuery.trim()) return uniqueDishes;
    const q = searchQuery.toLowerCase();
    return uniqueDishes.filter(d =>
      d.dish_name?.toLowerCase().includes(q) ||
      d.dishKeyword?.toLowerCase().includes(q) ||
      d.cuisine?.toLowerCase().includes(q)
    );
  }, [uniqueDishes, searchQuery]);

  const keywordLabel = dishParam || cuisineParam;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg,#0a0814 0%,#110d24 50%,#080f1e 100%)",
      color: "#fff", fontFamily: "'Nunito',sans-serif",
      position: "relative", overflowX: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Space+Mono:wght@700&display=swap');
        @keyframes dishIn {
          0%   { opacity:0; transform: translateY(28px) scale(0.93); }
          100% { opacity:1; transform: translateY(0) scale(1); }
        }
        @keyframes heroIn {
          0%   { opacity:0; transform: translateY(-12px); }
          100% { opacity:1; transform: translateY(0); }
        }
        @keyframes fadeUp {
          0%   { opacity:0; transform: translateY(16px); }
          100% { opacity:1; transform: translateY(0); }
        }
        @keyframes barIn {
          0%   { opacity:0; transform: translateY(10px); }
          100% { opacity:1; transform: translateY(0); }
        }
        @keyframes badgePop {
          0%   { opacity:0; transform:scale(0); }
          60%  { transform:scale(1.3); }
          100% { opacity:1; transform:scale(1); }
        }
        @keyframes cartFloat {
          0%   { opacity:0; transform:translateY(24px) scale(0.88); }
          100% { opacity:1; transform:translateY(0) scale(1); }
        }
        ::placeholder { color: rgba(255,255,255,0.22) !important; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
      `}</style>

      {/* Blobs */}
      <div style={{ position:"fixed", top:-100, right:-100, width:480, height:480, borderRadius:"50%", background:`radial-gradient(circle,${palette.accent}14 0%,transparent 70%)`, pointerEvents:"none", zIndex:0 }} />
      <div style={{ position:"fixed", bottom:-60, left:-60, width:360, height:360, borderRadius:"50%", background:`radial-gradient(circle,${palette.accent}0c 0%,transparent 70%)`, pointerEvents:"none", zIndex:0 }} />

      <RestaurantHero restaurant={restaurant} palette={palette} totalItems={uniqueDishes.length} />

      {/* Sticky toolbar */}
      <div style={{
        position:"sticky", top:0, zIndex:50,
        background:"rgba(10,8,20,0.88)", backdropFilter:"blur(20px)",
        borderBottom:`1px solid rgba(255,255,255,0.06)`, padding:"12px 20px",
        animation:"barIn 0.4s ease 0.2s both",
      }}>
        <div style={{ maxWidth:900, margin:"0 auto", display:"flex", gap:12, alignItems:"center" }}>
          <button onClick={() => navigate(-1)} style={{
            flexShrink:0, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)",
            borderRadius:12, padding:"9px 14px", color:"rgba(255,255,255,0.7)",
            cursor:"pointer", fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:"0.82rem",
            display:"flex", alignItems:"center", gap:5, transition:"all 0.2s",
          }}
            onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.1)";e.currentTarget.style.color="#fff";}}
            onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.06)";e.currentTarget.style.color="rgba(255,255,255,0.7)";}}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            Back
          </button>

          <div style={{ flex:1 }}>
            <SearchBar value={searchQuery} onChange={setSearchQuery} accent={palette.accent} />
          </div>

          <div style={{
            flexShrink:0, background:`${palette.accent}1a`, border:`1px solid ${palette.accent}40`,
            borderRadius:10, padding:"8px 14px",
            fontFamily:"'Space Mono',monospace", fontWeight:700, fontSize:"0.78rem",
            color:palette.accent, whiteSpace:"nowrap",
          }}>
            {displayDishes.length} / {uniqueDishes.length}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div style={{
        maxWidth:900, margin:"0 auto",
        padding:"28px 20px 120px",
        opacity: mounted ? 1 : 0, transition:"opacity 0.4s ease",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24, animation:"fadeUp 0.5s ease 0.1s both" }}>
          <span style={{ fontSize:"1.6rem" }}>{palette.emoji}</span>
          <div>
            <div style={{
              fontFamily:"'Nunito',sans-serif", fontWeight:900,
              fontSize:"clamp(1rem,2.5vw,1.25rem)",
              background:`linear-gradient(${palette.grad})`,
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
              textTransform:"capitalize",
            }}>
              {keywordLabel || "Menu Items"}
            </div>
            {searchQuery && (
              <div style={{ color:"rgba(255,255,255,0.35)", fontSize:"0.75rem", marginTop:2 }}>
                results for "{searchQuery}"
              </div>
            )}
          </div>
          <div style={{ flex:1, height:1, background:`linear-gradient(90deg,${palette.accent}50,transparent)`, marginLeft:4 }} />
        </div>

        {displayDishes.length === 0 ? (
          <div style={{ textAlign:"center", padding:"70px 24px", animation:"fadeUp 0.5s ease both" }}>
            <div style={{ fontSize:"3.5rem", marginBottom:14 }}>{searchQuery ? "🔍" : "🍽️"}</div>
            <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:"1.1rem", color:"rgba(255,255,255,0.5)", marginBottom:8 }}>
              {searchQuery ? `No items matching "${searchQuery}"` : "No items found"}
            </div>
            <div style={{ color:"rgba(255,255,255,0.25)", fontSize:"0.82rem" }}>
              {searchQuery ? "Try a different search term" : "Data is loading — check back shortly"}
            </div>
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} style={{
                marginTop:20, background:`${palette.accent}1a`, border:`1px solid ${palette.accent}40`,
                borderRadius:12, padding:"10px 22px", cursor:"pointer",
                color:palette.accent, fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:"0.88rem",
              }}>Clear search</button>
            )}
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:22 }}>
            {displayDishes.map((dish, idx) => (
              <DishCard
                key={dish.dish_id}
                dish={dish}
                resId={resId}
                accent={palette.accent}
                glow={palette.glow}
                idx={idx}
                dispatch={dispatch}
              />
            ))}
          </div>
        )}
      </div>

      <FloatingCartButton totalUnits={cartTotal} />
    </div>
  );
}