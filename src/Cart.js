// pages/CartPage.jsx
// Route: /cart

import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  selectCartItems,
  selectCartTotalUnits,
  addToCart,
  removeFromCart,
  dropFromCart,
  clearCart,
} from "./redux_utils/cartSlice";

const selectDishes      = (state) => state.food.dishes;
const selectRestaurants = (state) => state.food.restaurants;

// ── updateCart API ────────────────────────────────────────────────
// Optimistic: Redux is already updated before this fires.
async function callUpdateCart({ dish_id, dish_name, res_name, res_id, dish_image,action }) {
  try {
    const res = await fetch("http://localhost:3009/updateCart", {
      method:      "POST",
      credentials: "include",
      headers:     { "Content-Type": "application/json" },
      body:        JSON.stringify({ dish_id, dish_name, res_name, res_id, dish_image,action}),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error("[updateCart] server error:", data.message ?? res.status);
    }
  } catch (err) {
    console.error("[updateCart] network error:", err);
  }
}

// ── placeOrder API ────────────────────────────────────────────────
async function placeOrder(cartItems) {
  const res_id = cartItems[0].res_id;
  const items  = cartItems.map(item => ({
    variant_id: item.dish_id,
    quantity:   item.quantity,
  }));

  const res = await fetch("http://localhost:3009/placeOrder", {
    method:      "POST",
    credentials: "include",
    headers:     { "Content-Type": "application/json" },
    body:        JSON.stringify({ res_id, items }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }

  return res.json();
}

// ── Quantity Stepper ──────────────────────────────────────────────
function Stepper({ quantity, onAdd, onRemove, accent, disabled }) {
  return (
    <div style={{
      display: "flex", alignItems: "center",
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 12, overflow: "hidden",
      opacity: disabled ? 0.4 : 1,
      pointerEvents: disabled ? "none" : "auto",
    }}>
      <button
        onClick={onRemove}
        style={{
          width: 36, height: 36, border: "none", background: "transparent",
          color: quantity === 1 ? "#e57373" : "rgba(255,255,255,0.65)",
          fontSize: "1.1rem", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background 0.2s, color 0.2s",
          borderRight: "1px solid rgba(255,255,255,0.08)",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        {quantity === 1 ? (
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        ) : "−"}
      </button>

      <span style={{
        minWidth: 32, textAlign: "center", padding: "0 4px",
        fontFamily: "'Space Mono',monospace", fontWeight: 700,
        fontSize: "0.88rem", color: "#fff",
      }}>
        {quantity}
      </span>

      <button
        onClick={onAdd}
        style={{
          width: 36, height: 36, border: "none", background: "transparent",
          color: accent, fontSize: "1.2rem", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background 0.2s",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
        }}
        onMouseEnter={e => e.currentTarget.style.background = `${accent}20`}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >+</button>
    </div>
  );
}

// ── Cart Row ──────────────────────────────────────────────────────
function CartRow({ item, idx, dispatch, disabled }) {
  const [hovered,  setHovered]  = useState(false);
  const [removing, setRemoving] = useState(false);
  const [imgErr,   setImgErr]   = useState(false);

  const ACCENT = "#FF6B9D";

  // Shared API payload — all fields are stored on the cart item
  const cartPayload = {
    dish_id:   item.dish_id,
    dish_name: item.dish_name,
    res_name:  item.res_name,
    res_id:    item.res_id,
    dish_image: item.dish_image
  };

  // ── Add ───────────────────────────────────────────────────────
  const handleAdd = () => {
    dispatch(addToCart({
      dish_id:   item.dish_id,
      res_id:    item.res_id,
      dish_image: item.dish_image,
      dish_name: item.dish_name,
      res_name:  item.res_name,
    }));
    callUpdateCart({ ...cartPayload, action: "add" });
  };

  // ── Decrement (stepper −) ─────────────────────────────────────
  const handleDecrement = () => {
    if (item.quantity === 1) {
      handleDrop();
    } else {
      dispatch(removeFromCart({ dish_id: item.dish_id, res_id: item.res_id }));
      callUpdateCart({ ...cartPayload, action: "remove" });
    }
  };

  // ── Full drop (trash button or qty→0) ────────────────────────
  // Server always sees "remove" — it splices the item when qty hits 0
  const handleDrop = () => {
    setRemoving(true);
    callUpdateCart({ ...cartPayload, action: "remove" });
    setTimeout(() => dispatch(dropFromCart({ dish_id: item.dish_id, res_id: item.res_id })), 320);
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center",
        background: hovered ? "rgba(255,107,157,0.06)" : "rgba(255,255,255,0.025)",
        border: `1px solid ${hovered ? "rgba(255,107,157,0.25)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 20, overflow: "hidden",
        transition: "all 0.28s cubic-bezier(.34,1.56,.64,1)",
        transform: removing ? "translateX(110%)" : hovered ? "translateX(3px)" : "none",
        opacity: removing ? 0 : disabled ? 0.5 : 1,
        pointerEvents: disabled ? "none" : "auto",
        animation: `rowIn 0.55s cubic-bezier(.34,1.56,.64,1) ${idx * 0.06}s both`,
        boxShadow: hovered
          ? "0 8px 36px rgba(255,107,157,0.15), 0 2px 10px rgba(0,0,0,0.4)"
          : "0 1px 8px rgba(0,0,0,0.25)",
      }}
    >
      {/* Image */}
      <div style={{
        width: 90, height: 90, flexShrink: 0, position: "relative", overflow: "hidden",
        background: "linear-gradient(135deg,rgba(255,107,157,0.18),rgba(255,61,127,0.06))",
      }}>
        {item.dish_image && !imgErr ? (
          <img src={item.dish_image} onError={() => setImgErr(true)}
            style={{
              width: "100%", height: "100%", objectFit: "cover",
              opacity: hovered ? 0.95 : 0.8,
              transform: hovered ? "scale(1.08)" : "scale(1)",
              transition: "opacity 0.3s, transform 0.4s",
            }}
          />
        ) : (
          <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"2.4rem" }}>🍽️</div>
        )}
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
          background: "linear-gradient(to bottom,#FF6B9D,#FF3D7F88)",
          opacity: hovered ? 1 : 0, transition: "opacity 0.25s",
        }} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, padding: "14px 16px", minWidth: 0 }}>
        <div style={{
          fontFamily: "'Nunito',sans-serif", fontWeight: 900,
          fontSize: "0.97rem", color: "#fff", marginBottom: 3,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {item.dish_name || `Dish #${item.dish_id}`}
        </div>
        <div style={{
          fontFamily: "'Nunito',sans-serif", fontWeight: 600,
          fontSize: "0.77rem", color: "rgba(255,255,255,0.4)",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          🏪 {item.res_name || `Restaurant #${item.res_id}`}
        </div>
      </div>

      {/* Stepper + explicit remove */}
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"0 16px", flexShrink:0 }}>
        <Stepper
          quantity={item.quantity}
          accent={ACCENT}
          disabled={disabled}
          onAdd={handleAdd}
          onRemove={handleDecrement}
        />
        <button
          onClick={handleDrop}
          title="Remove item"
          style={{
            width: 32, height: 32, border: "none", borderRadius: 10,
            background: "rgba(229,115,115,0.1)", color: "#ef9a9a",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.2s, color 0.2s", flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(229,115,115,0.22)"; e.currentTarget.style.color = "#ef5350"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(229,115,115,0.1)";  e.currentTarget.style.color = "#ef9a9a"; }}
        >
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────
function EmptyCart({ onBrowse }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"80px 24px", textAlign:"center", animation:"fadeUp 0.6s ease both" }}>
      <div style={{
        width: 120, height: 120, borderRadius: "50%",
        background: "linear-gradient(135deg,rgba(255,107,157,0.12),rgba(255,61,127,0.05))",
        border: "1px solid rgba(255,107,157,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "3.8rem", marginBottom: 28,
        animation: "plateBounce 3s ease-in-out infinite",
        boxShadow: "0 0 40px rgba(255,107,157,0.12)",
      }}>🍽️</div>
      <h2 style={{ margin:"0 0 10px", fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:"1.4rem", color:"#fff" }}>
        Your cart is empty
      </h2>
      <p style={{ margin:"0 0 32px", fontFamily:"'Nunito',sans-serif", fontWeight:600, fontSize:"0.9rem", color:"rgba(255,255,255,0.38)", lineHeight:1.6 }}>
        Looks like you haven't added anything yet.<br />
        Go explore and pick something delicious!
      </p>
      <button onClick={onBrowse} style={{
        background:"linear-gradient(135deg,#FF6B9D,#FF3D7F)", border:"none", borderRadius:14, padding:"13px 28px",
        fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:"0.95rem",
        color:"#fff", cursor:"pointer", boxShadow:"0 8px 28px rgba(255,61,127,0.35)",
        transition:"transform 0.2s, box-shadow 0.2s",
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.04)"; e.currentTarget.style.boxShadow = "0 12px 36px rgba(255,61,127,0.5)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(255,61,127,0.35)"; }}
      >🍜 Browse Menu</button>
    </div>
  );
}

// ── Success overlay ───────────────────────────────────────────────
function SuccessOverlay({ onDone }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(10,8,20,0.93)", backdropFilter: "blur(18px)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 32, textAlign: "center",
      animation: "fadeUp 0.5s ease both",
    }}>
      <div style={{
        width: 110, height: 110, borderRadius: "50%",
        background: "linear-gradient(135deg,rgba(107,203,119,0.18),rgba(76,175,80,0.08))",
        border: "2px solid rgba(107,203,119,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 28, boxShadow: "0 0 60px rgba(107,203,119,0.25)",
        animation: "successPulse 2s ease-in-out infinite",
      }}>
        <svg width={52} height={52} viewBox="0 0 24 24" fill="none" stroke="#6BCB77"
          strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"
          style={{ animation: "checkDraw 0.6s cubic-bezier(.34,1.56,.64,1) 0.1s both" }}>
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <h2 style={{
        margin:"0 0 10px", fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:"1.7rem",
        background:"linear-gradient(135deg,#6BCB77,#4CAF50)",
        WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
      }}>
        Order Placed! 🎉
      </h2>
      <p style={{ margin:"0 0 36px", fontFamily:"'Nunito',sans-serif", fontWeight:600, fontSize:"0.95rem", color:"rgba(255,255,255,0.5)", lineHeight:1.65 }}>
        Your order has been sent to the restaurant.<br/>
        Sit back and enjoy the wait ✨
      </p>
      <button onClick={onDone} style={{
        background:"linear-gradient(135deg,#FF6B9D,#FF3D7F)", border:"none", borderRadius:14,
        padding:"13px 30px", fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:"0.95rem",
        color:"#fff", cursor:"pointer", boxShadow:"0 8px 28px rgba(255,61,127,0.4)",
        transition:"transform 0.2s, box-shadow 0.2s",
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.04)"; e.currentTarget.style.boxShadow = "0 12px 36px rgba(255,61,127,0.55)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(255,61,127,0.4)"; }}
      >
        🏠 Back to Home
      </button>
    </div>
  );
}

// ── Error banner ──────────────────────────────────────────────────
function ErrorBanner({ message, onDismiss }) {
  return (
    <div style={{
      position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)",
      zIndex: 150, width: "min(92vw, 540px)",
      background: "linear-gradient(135deg,rgba(229,57,53,0.22),rgba(183,28,28,0.15))",
      border: "1px solid rgba(229,57,53,0.45)", borderRadius: 18,
      padding: "18px 22px", boxShadow: "0 12px 48px rgba(183,28,28,0.3)",
      animation: "fadeUp 0.4s ease both",
    }}>
      <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
        <span style={{ fontSize:"1.4rem", flexShrink:0 }}>⚠️</span>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:"0.95rem", color:"#ef9a9a", marginBottom:4 }}>
            Failed to place order
          </div>
          <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:600, fontSize:"0.82rem", color:"rgba(255,255,255,0.5)" }}>
            {message}
          </div>
        </div>
        <button onClick={onDismiss} style={{
          background:"none", border:"none", color:"rgba(255,255,255,0.4)",
          cursor:"pointer", fontSize:18, padding:0, flexShrink:0, lineHeight:1,
        }}>×</button>
      </div>
    </div>
  );
}

// ── Cart Summary footer ───────────────────────────────────────────
function CartSummary({ totalUnits, onClear, onCheckout, isLoading }) {
  return (
    <div style={{
      position: "sticky", bottom: 0, zIndex: 40,
      background: "rgba(10,8,20,0.92)", backdropFilter: "blur(20px)",
      borderTop: "1px solid rgba(255,255,255,0.07)", padding: "16px 20px",
      animation: "summarySlide 0.5s cubic-bezier(.34,1.56,.64,1) 0.2s both",
    }}>
      <div style={{ maxWidth:640, margin:"0 auto", display:"flex", alignItems:"center", gap:12 }}>

        <div style={{ flex:1, fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:"0.85rem", color:"rgba(255,255,255,0.45)" }}>
          {totalUnits} item{totalUnits !== 1 ? "s" : ""} in cart
        </div>

        <button onClick={onCheckout} disabled={isLoading} style={{
          background: isLoading ? "rgba(255,255,255,0.08)" : "linear-gradient(135deg,#FF6B9D,#FF3D7F)",
          border:"none", borderRadius:13, padding:"12px 24px",
          fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:"0.92rem",
          color: isLoading ? "rgba(255,255,255,0.4)" : "#fff",
          cursor: isLoading ? "not-allowed" : "pointer",
          boxShadow: isLoading ? "none" : "0 6px 24px rgba(255,61,127,0.4)",
          transition:"all 0.25s", flexShrink:0,
          display:"flex", alignItems:"center", gap:8,
          minWidth:140, justifyContent:"center",
        }}
          onMouseEnter={e => { if (!isLoading) { e.currentTarget.style.transform = "scale(1.04)"; e.currentTarget.style.boxShadow = "0 10px 32px rgba(255,61,127,0.55)"; }}}
          onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = isLoading ? "none" : "0 6px 24px rgba(255,61,127,0.4)"; }}
        >
          {isLoading ? (
            <>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"
                style={{ animation:"spin 0.8s linear infinite" }}>
                <path d="M12 2a10 10 0 1 0 10 10"/>
              </svg>
              Placing…
            </>
          ) : (
            <>
              Checkout
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────
export default function CartPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [mounted,       setMounted]       = useState(false);
  const [checkoutState, setCheckoutState] = useState("idle");
  const [errorMessage,  setErrorMessage]  = useState(null);

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  const cartItems  = useSelector(selectCartItems);
  const totalUnits = useSelector(selectCartTotalUnits);
  const isEmpty    = cartItems.length === 0;

  const handleCheckout = async () => {
    if (checkoutState === "loading") return;
    setErrorMessage(null);
    setCheckoutState("loading");

    try {
      // Snapshot items NOW — Redux will be emptzy after clearCart
      const itemsToClear = cartItems;
      await placeOrder(itemsToClear);                // 1. place order on server
      dispatch(clearCart());                         // 3. wipe Redux cart
      setCheckoutState("success");
    } 
    catch (err) {
      setCheckoutState("idle");
      setErrorMessage(err.message || "Something went wrong. Please try again.");
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      background: "linear-gradient(160deg,#0a0814 0%,#110d24 55%,#08101e 100%)",
      fontFamily: "'Nunito',sans-serif", color: "#fff",
      position: "relative", overflowX: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Space+Mono:wght@700&display=swap');
        @keyframes rowIn {
          0%   { opacity:0; transform: translateX(-20px); }
          100% { opacity:1; transform: translateX(0); }
        }
        @keyframes fadeUp {
          0%   { opacity:0; transform: translateY(18px); }
          100% { opacity:1; transform: translateY(0); }
        }
        @keyframes headerIn {
          0%   { opacity:0; transform: translateY(-14px); }
          100% { opacity:1; transform: translateY(0); }
        }
        @keyframes summarySlide {
          0%   { opacity:0; transform: translateY(20px); }
          100% { opacity:1; transform: translateY(0); }
        }
        @keyframes plateBounce {
          0%,100% { transform: translateY(0) rotate(-2deg); }
          50%      { transform: translateY(-10px) rotate(2deg); }
        }
        @keyframes badgePop {
          0%   { transform: scale(0); }
          60%  { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
        @keyframes successPulse {
          0%,100% { box-shadow: 0 0 60px rgba(107,203,119,0.25); }
          50%      { box-shadow: 0 0 90px rgba(107,203,119,0.45); }
        }
        @keyframes checkDraw {
          0%   { opacity:0; stroke-dashoffset:30; stroke-dasharray:30; }
          100% { opacity:1; stroke-dashoffset:0;  stroke-dasharray:30; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
      `}</style>

      <div style={{ position:"fixed", top:-80, right:-80, width:440, height:440, borderRadius:"50%", background:"radial-gradient(circle,rgba(255,107,157,0.1) 0%,transparent 70%)", pointerEvents:"none", zIndex:0 }} />
      <div style={{ position:"fixed", bottom:-60, left:-60, width:360, height:360, borderRadius:"50%", background:"radial-gradient(circle,rgba(255,61,127,0.07) 0%,transparent 70%)", pointerEvents:"none", zIndex:0 }} />

      {checkoutState === "success" && (
        <SuccessOverlay onDone={() => { setCheckoutState("idle"); navigate("/"); }} />
      )}

      {errorMessage && (
        <ErrorBanner message={errorMessage} onDismiss={() => setErrorMessage(null)} />
      )}

      {/* ── Header ── */}
      <div style={{
        position:"sticky", top:0, zIndex:50,
        background:"rgba(10,8,20,0.88)", backdropFilter:"blur(20px)",
        borderBottom:"1px solid rgba(255,255,255,0.06)",
        padding:"0 20px", animation:"headerIn 0.4s ease both",
      }}>
        <div style={{ maxWidth:640, margin:"0 auto", padding:"16px 0 14px", display:"flex", alignItems:"center", gap:14 }}>
          <button onClick={() => navigate(-1)} style={{
            background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)",
            borderRadius:11, padding:"8px 13px", color:"rgba(255,255,255,0.6)",
            cursor:"pointer", fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:"0.82rem",
            display:"flex", alignItems:"center", gap:5, transition:"all 0.2s", flexShrink:0,
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
          >
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            Back
          </button>

          <div style={{ flex:1, display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:"1.4rem" }}>🛒</span>
            <h1 style={{
              margin:0, fontFamily:"'Nunito',sans-serif", fontWeight:900,
              fontSize:"clamp(1.05rem,3vw,1.35rem)",
              background:"linear-gradient(135deg,#FF6B9D,#FF3D7F)",
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            }}>Your Cart</h1>
            {totalUnits > 0 && (
              <div style={{
                background:"linear-gradient(135deg,#FF6B9D,#FF3D7F)", borderRadius:20, padding:"2px 9px",
                fontFamily:"'Space Mono',monospace", fontWeight:700, fontSize:"0.75rem", color:"#fff",
                animation:"badgePop 0.4s cubic-bezier(.34,1.56,.64,1) both",
                boxShadow:"0 4px 14px rgba(255,61,127,0.4)",
              }}>
                {totalUnits}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{
        flex:1, maxWidth:640, width:"100%", margin:"0 auto",
        padding: isEmpty ? "0 20px" : "22px 20px 24px",
        opacity: mounted ? 1 : 0, transition:"opacity 0.4s ease",
      }}>
        {isEmpty ? (
          <EmptyCart onBrowse={() => navigate("/explore")} />
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
            {cartItems.map((item, idx) => (
              <CartRow
                key={`${item.dish_id}-${item.res_id}`}
                item={item}
                idx={idx}
                dispatch={dispatch}
                disabled={checkoutState === "loading"}
              />
            ))}
          </div>
        )}
      </div>

      {!isEmpty && (
        <CartSummary
          totalUnits={totalUnits}
          isLoading={checkoutState === "loading"}
          onClear={() => dispatch(clearCart())}
          onCheckout={handleCheckout}
        />
      )}
    </div>
  );
}