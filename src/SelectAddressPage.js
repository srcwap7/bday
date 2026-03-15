// pages/SelectAddressPage.jsx
//
// Route: <Route path="/select-address" element={<SelectAddressPage />} />
//
// Tile sources (all free, no API key):
//   Primary:  CartoDB Voyager  — full streets, labels, POIs, building outlines
//   Fallback: Stadia Alidade Smooth Dark — dark themed with full street detail
//
// Geocoding:  Nominatim (OpenStreetMap)  — free, no key
// Elevation:  Open-Elevation API         — free, no key

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

// ── Load Leaflet from CDN once ────────────────────────────────────
function ensureLeaflet() {
  return new Promise((resolve) => {
    if (window.L) { resolve(window.L); return; }

    const css = document.createElement("link");
    css.rel  = "stylesheet";
    css.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(css);

    const script   = document.createElement("script");
    script.src     = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    script.onload  = () => resolve(window.L);
    document.head.appendChild(script);
  });
}

// ── Tile layer configs ────────────────────────────────────────────
const TILE_LAYERS = [
  {
    id:    "voyager",
    label: "Street",
    url:   "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attr:  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
    subdomains: "abcd",
  },
  {
    id:    "dark",
    label: "Dark",
    url:   "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attr:  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
    subdomains: "abcd",
  },
  {
    id:    "satellite",
    label: "Satellite",
    url:   "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attr:  "Tiles © Esri",
    maxZoom: 19,
  },
];

// ── Reverse geocode via Nominatim ─────────────────────────────────
async function reverseGeocode(lat, lng) {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      { headers: { "Accept-Language": "en" } }
    );
    const d = await r.json();
    return {
      display: d.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      parts:   d.address ?? {},
    };
  } catch {
    return { display: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, parts: {} };
  }
}

// ── Altitude via Open-Elevation ───────────────────────────────────
async function fetchAltitude(lat, lng) {
  try {
    const r = await fetch(
      `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lng}`
    );
    const d = await r.json();
    return d.results?.[0]?.elevation ?? null;
  } catch {
    return null;
  }
}

// ── Coordinate pill ───────────────────────────────────────────────
function CoordPill({ label, value, accent, loading = false }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      background: `${accent}12`, border: `1px solid ${accent}35`,
      borderRadius: 14, padding: "10px 16px", minWidth: 96, flex: 1,
    }}>
      <span style={{
        fontFamily: "'Nunito',sans-serif", fontWeight: 700,
        fontSize: "0.6rem", color: `${accent}80`,
        textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4,
      }}>{label}</span>
      {loading
        ? <div style={{ width: 40, height: 3, borderRadius: 2, background: `${accent}30`, overflow: "hidden" }}>
            <div style={{ height: "100%", width: "40%", background: accent, borderRadius: 2, animation: "shimmer 1s ease-in-out infinite" }} />
          </div>
        : <span style={{
            fontFamily: "'Space Mono',monospace", fontWeight: 700,
            fontSize: "0.8rem", color: value ? "#fff" : "rgba(255,255,255,0.25)",
          }}>
            {value ?? "—"}
          </span>
      }
    </div>
  );
}

// ── Address line ──────────────────────────────────────────────────
function AddressDisplay({ loading, address, parts }) {
  const street = [parts?.road, parts?.house_number].filter(Boolean).join(" ");
  const area   = [parts?.suburb, parts?.neighbourhood, parts?.city_district].filter(Boolean)[0];
  const city   = parts?.city || parts?.town || parts?.village;
  const state  = parts?.state;

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 16, padding: "14px 16px", minHeight: 58,
    }}>
      {loading ? (
        <>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#FF6B9D" strokeWidth={2.5} strokeLinecap="round"
            style={{ animation: "spin 0.8s linear infinite", flexShrink: 0, marginTop: 1 }}>
            <path d="M12 2a10 10 0 1 0 10 10"/>
          </svg>
          <span style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 600, fontSize: "0.82rem", color: "rgba(255,255,255,0.3)" }}>
            Fetching address…
          </span>
        </>
      ) : address ? (
        <>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#FF6B9D" strokeWidth={2} strokeLinecap="round"
            style={{ flexShrink: 0, marginTop: 2 }}>
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx={12} cy={10} r={3}/>
          </svg>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Structured address when available */}
            {street && (
              <div style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: "0.88rem", color: "#fff", marginBottom: 2 }}>
                {street}
              </div>
            )}
            {(area || city) && (
              <div style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 600, fontSize: "0.78rem", color: "rgba(255,255,255,0.55)", marginBottom: street ? 1 : 0 }}>
                {[area, city].filter(Boolean).join(", ")}
              </div>
            )}
            {state && (
              <div style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 600, fontSize: "0.72rem", color: "rgba(255,255,255,0.35)" }}>
                {state}
              </div>
            )}
            {/* Fallback: full string if no parts parsed */}
            {!street && !area && !city && (
              <div style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 600, fontSize: "0.8rem", color: "rgba(255,255,255,0.65)", lineHeight: 1.45 }}>
                {address}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={2} strokeLinecap="round"
            style={{ flexShrink: 0, marginTop: 1 }}>
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx={12} cy={10} r={3}/>
          </svg>
          <span style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 600, fontSize: "0.82rem", color: "rgba(255,255,255,0.22)" }}>
            Drag the pin or tap the map to pick a location
          </span>
        </>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function SelectAddressPage({ onConfirm }) {
  const navigate    = useNavigate();
  const mapRef      = useRef(null);
  const leafletMap  = useRef(null);
  const markerRef   = useRef(null);
  const tileRef     = useRef(null);
  const geocodeTimer = useRef(null);

  const [coords,      setCoords]      = useState(null);
  const [altitude,    setAltitude]    = useState(null);
  const [address,     setAddress]     = useState("");
  const [addrParts,   setAddrParts]   = useState({});
  const [geocoding,   setGeocoding]   = useState(false);
  const [elevating,   setElevating]   = useState(false);
  const [confirmed,   setConfirmed]   = useState(false);
  const [mounted,     setMounted]     = useState(false);
  const [activeLayer, setActiveLayer] = useState("voyager");

  // ── Update info when pin moves ──────────────────────────────────
  const onPinMove = useCallback(async (lat, lng) => {
    setCoords({ lat, lng });
    setAltitude(null);
    setAddress("");
    setAddrParts({});

    clearTimeout(geocodeTimer.current);
    setGeocoding(true);
    setElevating(true);

    geocodeTimer.current = setTimeout(async () => {
      const [geoResult, alt] = await Promise.all([
        reverseGeocode(lat, lng),
        fetchAltitude(lat, lng),
      ]);
      setAddress(geoResult.display);
      setAddrParts(geoResult.parts);
      setGeocoding(false);
      setAltitude(alt);
      setElevating(false);
    }, 350);
  }, []);

  // ── Init Leaflet ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setTimeout(() => setMounted(true), 60);

    ensureLeaflet().then((L) => {
      if (cancelled || leafletMap.current) return;

      const defaultLat = 28.6139;
      const defaultLng = 77.2090;

      const map = L.map(mapRef.current, {
        center:      [defaultLat, defaultLng],
        zoom:        16,
        zoomControl: false,
        // Smooth pan
        inertia:      true,
        inertiaDeceleration: 2000,
      });

      // CartoDB Voyager as default tile — full street names + POIs
      const layer = TILE_LAYERS[0];
      tileRef.current = L.tileLayer(layer.url, {
        attribution:  layer.attr,
        maxZoom:      layer.maxZoom,
        subdomains:   layer.subdomains || "abc",
      }).addTo(map);

      // Custom pin using a div icon with drop shadow + bounce-in
      const pinIcon = L.divIcon({
        className: "",
        html: `<div class="map-pin-root">
          <svg viewBox="0 0 40 52" width="40" height="52" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="pg" cx="38%" cy="30%" r="65%">
                <stop offset="0%" stop-color="#FF6B9D"/>
                <stop offset="100%" stop-color="#C2185B"/>
              </radialGradient>
              <filter id="ps" x="-30%" y="-10%" width="160%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#FF3D7F" flood-opacity="0.55"/>
              </filter>
            </defs>
            <path d="M20 2C10.6 2 3 9.6 3 19c0 11.5 17 31 17 31s17-19.5 17-31c0-9.4-7.6-17-17-17z"
              fill="url(#pg)" filter="url(#ps)" stroke="rgba(255,255,255,0.6)" stroke-width="1.2"/>
            <circle cx="20" cy="19" r="7" fill="rgba(255,255,255,0.95)"/>
            <circle cx="20" cy="19" r="3.5" fill="#C2185B"/>
          </svg>
          <div class="map-pin-shadow"></div>
        </div>`,
        iconSize:   [40, 52],
        iconAnchor: [20, 52],
      });

      const marker = L.marker([defaultLat, defaultLng], {
        icon:      pinIcon,
        draggable: true,
      }).addTo(map);

      marker.on("drag", (e) => {
        // Live coordinate update while dragging (no geocode yet)
        const { lat, lng } = e.target.getLatLng();
        setCoords({ lat, lng });
      });

      marker.on("dragend", (e) => {
        const { lat, lng } = e.target.getLatLng();
        onPinMove(lat, lng);
      });

      map.on("click", (e) => {
        marker.setLatLng(e.latlng);
        onPinMove(e.latlng.lat, e.latlng.lng);
      });

      leafletMap.current = map;
      markerRef.current  = marker;

      onPinMove(defaultLat, defaultLng);
    });

    // Geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        if (leafletMap.current && markerRef.current && !cancelled) {
          leafletMap.current.setView([lat, lng], 17, { animate: true });
          markerRef.current.setLatLng([lat, lng]);
          onPinMove(lat, lng);
        }
      }, () => {});
    }

    return () => {
      cancelled = true;
      clearTimeout(geocodeTimer.current);
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Switch tile layer ───────────────────────────────────────────
  const switchLayer = useCallback((id) => {
    if (!leafletMap.current || id === activeLayer) return;
    const L   = window.L;
    const cfg = TILE_LAYERS.find(t => t.id === id);
    if (!cfg) return;

    if (tileRef.current) leafletMap.current.removeLayer(tileRef.current);
    tileRef.current = L.tileLayer(cfg.url, {
      attribution: cfg.attr,
      maxZoom:     cfg.maxZoom,
      subdomains:  cfg.subdomains || "abc",
    }).addTo(leafletMap.current);

    setActiveLayer(id);
  }, [activeLayer]);

  // ── Confirm ─────────────────────────────────────────────────────
  const handleConfirm = () => {
    if (!coords || geocoding) return;
    setConfirmed(true);
    const payload = {
      lat:      parseFloat(coords.lat.toFixed(6)),
      lng:      parseFloat(coords.lng.toFixed(6)),
      altitude: altitude,
      address,
      addressParts: addrParts,
    };
    if (typeof onConfirm === "function") {
      onConfirm(payload);
    } else {
      navigate(-1, { state: { selectedLocation: payload } });
    }
  };

  const ready = coords && !geocoding;

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      background: "linear-gradient(160deg,#0a0814 0%,#110d24 55%,#08101e 100%)",
      fontFamily: "'Nunito',sans-serif", color: "#fff",
      position: "relative", overflowX: "hidden",
      opacity: mounted ? 1 : 0, transition: "opacity 0.4s ease",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Space+Mono:wght@700&display=swap');

        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes shimmer {
          0%,100% { transform: translateX(-100%); }
          50%     { transform: translateX(250%); }
        }
        @keyframes headerIn {
          0%   { opacity:0; transform: translateY(-14px); }
          100% { opacity:1; transform: translateY(0); }
        }
        @keyframes slideUp {
          0%   { opacity:0; transform: translateY(20px); }
          100% { opacity:1; transform: translateY(0); }
        }
        @keyframes pinBounce {
          0%   { transform: translateY(-40px) scale(0.7); opacity:0; }
          65%  { transform: translateY(5px) scale(1.08); }
          85%  { transform: translateY(-4px) scale(0.97); }
          100% { transform: translateY(0) scale(1); opacity:1; }
        }
        @keyframes shadowPulse {
          0%,100% { transform: scaleX(1); opacity:0.5; }
          50%      { transform: scaleX(0.6); opacity:0.2; }
        }

        /* Pin element styles (injected into Leaflet divIcon html) */
        .map-pin-root {
          animation: pinBounce 0.55s cubic-bezier(.34,1.56,.64,1) both;
        }
        .map-pin-shadow {
          width: 16px; height: 6px; background: rgba(0,0,0,0.35);
          border-radius: 50%; margin: -3px auto 0;
          animation: shadowPulse 2s ease-in-out infinite;
          filter: blur(2px);
        }

        /* Leaflet attribution dark styling */
        .leaflet-control-attribution {
          background: rgba(10,8,20,0.8) !important;
          color: rgba(255,255,255,0.3) !important;
          font-size: 9px !important;
          backdrop-filter: blur(8px);
          border-radius: 6px 0 0 0 !important;
          padding: 3px 6px !important;
        }
        .leaflet-control-attribution a {
          color: rgba(255,107,157,0.6) !important;
        }

        /* Leaflet popup (not used but reset just in case) */
        .leaflet-popup-content-wrapper {
          background: rgba(17,13,36,0.95) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          border-radius: 14px !important;
          color: #fff !important;
          backdrop-filter: blur(12px);
        }

        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
      `}</style>

      {/* Blobs */}
      <div style={{ position:"fixed", top:-100, right:-100, width:440, height:440, borderRadius:"50%", background:"radial-gradient(circle,rgba(255,107,157,0.1) 0%,transparent 70%)", pointerEvents:"none", zIndex:0 }} />
      <div style={{ position:"fixed", bottom:-60, left:-60, width:340, height:340, borderRadius:"50%", background:"radial-gradient(circle,rgba(204,93,232,0.07) 0%,transparent 70%)", pointerEvents:"none", zIndex:0 }} />

      {/* ── Header ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 1000,
        background: "rgba(10,8,20,0.92)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "0 20px",
        animation: "headerIn 0.4s ease both",
      }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "13px 0 11px", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => navigate(-1)} style={{
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 11, padding: "8px 13px", color: "rgba(255,255,255,0.6)",
            cursor: "pointer", fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: "0.82rem",
            display: "flex", alignItems: "center", gap: 5, transition: "all 0.2s", flexShrink: 0,
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
          >
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            Back
          </button>

          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ fontSize: "1.25rem" }}>📍</span>
            <h1 style={{
              margin: 0, fontFamily: "'Nunito',sans-serif", fontWeight: 900,
              fontSize: "clamp(0.95rem,2.8vw,1.2rem)",
              background: "linear-gradient(135deg,#FF6B9D,#CC5DE8)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>Select Delivery Address</h1>
          </div>

          {/* Layer switcher */}
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            {TILE_LAYERS.map(layer => (
              <button key={layer.id} onClick={() => switchLayer(layer.id)} style={{
                padding: "5px 11px", borderRadius: 9, border: "none", cursor: "pointer",
                fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: "0.7rem",
                background: activeLayer === layer.id
                  ? "linear-gradient(135deg,#FF6B9D,#CC5DE8)"
                  : "rgba(255,255,255,0.07)",
                color: activeLayer === layer.id ? "#fff" : "rgba(255,255,255,0.45)",
                transition: "all 0.2s",
              }}>
                {layer.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Map ── */}
      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        <div ref={mapRef} style={{ width: "100%", height: "100%", minHeight: "52vh" }} />

        {/* Vignette overlay */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", zIndex: 400,
          background: "radial-gradient(ellipse at center, transparent 55%, rgba(10,8,20,0.28) 100%)",
        }} />

        {/* Locate me button */}
        <button title="Use my location" onClick={() => {
          if (!navigator.geolocation) return;
          navigator.geolocation.getCurrentPosition((pos) => {
            const { latitude: lat, longitude: lng } = pos.coords;
            if (leafletMap.current && markerRef.current) {
              leafletMap.current.setView([lat, lng], 17, { animate: true });
              markerRef.current.setLatLng([lat, lng]);
              onPinMove(lat, lng);
            }
          });
        }} style={{
          position: "absolute", bottom: 72, right: 14, zIndex: 800,
          width: 44, height: 44, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(10,8,20,0.88)", backdropFilter: "blur(12px)",
          color: "#fff", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 20px rgba(0,0,0,0.45)", transition: "all 0.2s",
        }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,107,157,0.2)"; e.currentTarget.style.borderColor = "rgba(255,107,157,0.4)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(10,8,20,0.88)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <circle cx={12} cy={12} r={3}/>
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
            <circle cx={12} cy={12} r={8} strokeOpacity={0.25}/>
          </svg>
        </button>

        {/* Zoom controls */}
        <div style={{ position: "absolute", bottom: 122, right: 14, zIndex: 800, display: "flex", flexDirection: "column", gap: 2 }}>
          {["+", "−"].map((label, i) => (
            <button key={i} onClick={() => i === 0 ? leafletMap.current?.zoomIn() : leafletMap.current?.zoomOut()} style={{
              width: 44, height: 42,
              borderRadius: i === 0 ? "11px 11px 4px 4px" : "4px 4px 11px 11px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(10,8,20,0.88)", backdropFilter: "blur(12px)",
              color: "#fff", cursor: "pointer", fontSize: "1.2rem", fontWeight: 300,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 18px rgba(0,0,0,0.4)", transition: "background 0.2s",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,107,157,0.18)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(10,8,20,0.88)"}
            >{label}</button>
          ))}
        </div>
      </div>

      {/* ── Info panel ── */}
      <div style={{
        background: "rgba(10,8,20,0.95)", backdropFilter: "blur(24px)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        padding: "18px 20px 26px", zIndex: 900, position: "relative",
        animation: "slideUp 0.5s cubic-bezier(.34,1.56,.64,1) 0.15s both",
      }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Coordinate pills */}
          <div style={{ display: "flex", gap: 8 }}>
            <CoordPill label="Latitude"   value={coords ? coords.lat.toFixed(6) : null} accent="#FF6B9D" loading={false} />
            <CoordPill label="Longitude"  value={coords ? coords.lng.toFixed(6) : null} accent="#CC5DE8" loading={false} />
            <CoordPill label="Altitude m" value={elevating ? null : altitude !== null ? `${altitude}` : null} accent="#38D9A9" loading={elevating} />
          </div>

          {/* Structured address */}
          <AddressDisplay loading={geocoding} address={address} parts={addrParts} />

          {/* Confirm button */}
          <button onClick={handleConfirm} disabled={!ready || confirmed} style={{
            padding: "14px 24px", border: "none", borderRadius: 16,
            fontFamily: "'Nunito',sans-serif", fontWeight: 900, fontSize: "0.98rem",
            letterSpacing: "0.03em",
            background: (!ready || confirmed)
              ? "rgba(255,255,255,0.07)"
              : "linear-gradient(135deg,#FF6B9D,#CC5DE8)",
            color: (!ready || confirmed) ? "rgba(255,255,255,0.28)" : "#fff",
            cursor: (!ready || confirmed) ? "not-allowed" : "pointer",
            boxShadow: (!ready || confirmed) ? "none" : "0 8px 32px rgba(255,61,127,0.38)",
            transition: "all 0.3s cubic-bezier(.34,1.56,.64,1)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
          }}
            onMouseEnter={e => { if (ready && !confirmed) { e.currentTarget.style.transform = "scale(1.02)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(255,61,127,0.52)"; } }}
            onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = (!ready || confirmed) ? "none" : "0 8px 32px rgba(255,61,127,0.38)"; }}
          >
            {confirmed ? (
              <>
                <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Location Confirmed!
              </>
            ) : geocoding ? (
              <>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"
                  style={{ animation: "spin 0.8s linear infinite" }}>
                  <path d="M12 2a10 10 0 1 0 10 10"/>
                </svg>
                Fetching address…
              </>
            ) : (
              <>
                <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx={12} cy={10} r={3}/>
                </svg>
                Confirm This Location
              </>
            )}
          </button>

          {coords && !geocoding && (
            <p style={{ margin: 0, textAlign: "center", fontFamily: "'Nunito',sans-serif", fontWeight: 600, fontSize: "0.72rem", color: "rgba(255,255,255,0.2)" }}>
              Drag the pin or tap anywhere on the map to adjust
            </p>
          )}
        </div>
      </div>
    </div>
  );
}