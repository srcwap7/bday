import client from "./connections/mcp_connect.js"
import twilio from "./connections/twilio_connect.js"
import ZomatoService from "./classes/zomato.js";
import transporter from "./connections/node_mailer.js";
import fetchRestaurants from "./utils/fetchRestaurants.js";
import express from "express";
import cookieParser from 'cookie-parser'
import loadSearchConfig from "./utils/loadConfig.js";
import crypto from "crypto";
import http from 'http';

const app = express()

// ── Allowed origins ───────────────────────────────────────────────
const allowedOrigins = [
  "https://bday-yyqs.onrender.com",
  "http://localhost:3000",
  "https://tonsorial-preppily-jamika.ngrok-free.dev",
];

// ── CORS headers helper ───────────────────────────────────────────
function setCORSHeaders(req, res) {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, ngrok-skip-browser-warning");
  res.setHeader("Vary", "Origin");
}

// ── 1. CORS middleware — must be first ────────────────────────────
app.use((req, res, next) => {
  setCORSHeaders(req, res);
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// ── 2. Body + cookie parsing ──────────────────────────────────────
app.use(express.json())
app.use(cookieParser())

// ── In-memory stores ──────────────────────────────────────────────
const requestCache = {
  zomato_dishes: new Map(),
  restaurants:   new Map(),
  bindings:      new Map(),
  lastUpdated:   0,
  cacheTTL:      5 * 60 * 1000,
}

const sessionToCart        = new Map();
const sessionToLastFetched = new Map();

const zomatoInstance = new ZomatoService(client)
const preferences    = loadSearchConfig();

// ── Cookie helper — one place, consistent options everywhere ──────
function setSessionCookie(res, sessionId) {
  res.cookie("sessionId", sessionId, {
    httpOnly: true,
    secure:   true,
    sameSite: "none",   // required for cross-origin (Render → ngrok)
    maxAge:   1000 * 60 * 60,
    path:     "/",
  });
}

// ── 3. Session middleware — runs before every route ───────────────
// Creates a session on the very first request regardless of which
// route it hits, eliminating the race condition where /cart or
// /updateCart fires before GET / has created the session.
function ensureSession(req, res, next) {
  let sessionId = req.cookies?.sessionId;

  if (!sessionId || !sessionToLastFetched.has(sessionId)) {
    // Brand new session
    sessionId = crypto.randomBytes(10).toString("hex");

    setSessionCookie(res, sessionId);

    sessionToLastFetched.set(sessionId, {
      last_fetched_zomato_dishes: new Map(),
      last_fetched_restaurants:   new Map(),
      last_fetched_bindings:      new Map(),
    });

    sessionToCart.set(sessionId, []);
  } else {
    // Slide the cookie expiry window forward on every request
    // so the session never expires while the page is open
    setSessionCookie(res, sessionId);
  }

  // Attach to req so all route handlers can use req.sessionId
  // (req.cookies.sessionId is NOT updated when we call res.cookie,
  //  so always use req.sessionId inside route handlers)
  req.sessionId = sessionId;
  next();
}

app.use(ensureSession);

// ── Diff helper ───────────────────────────────────────────────────
function fetch_diff_and_update_map(sessionId, seen_zomato_dishes, seen_restaurants, seen_bindings) {
  const new_zomato_dishes     = []
  const deleted_zomato_dishes = []
  const new_restaurants       = []
  const deleted_restaurants   = []
  const new_bindings          = []
  const deleted_bindings      = []

  const sessionState = sessionToLastFetched.get(sessionId)

  for (const [dishId, dish] of seen_zomato_dishes.entries()) {
    if (!sessionState.last_fetched_zomato_dishes.has(dishId)) new_zomato_dishes.push(dish)
  }
  for (const [dishId, dish] of sessionState.last_fetched_zomato_dishes.entries()) {
    if (!seen_zomato_dishes.has(dishId)) deleted_zomato_dishes.push(dish)
  }

  for (const [resId, restaurant] of seen_restaurants.entries()) {
    if (!sessionState.last_fetched_restaurants.has(resId)) new_restaurants.push(restaurant)
  }
  for (const [resId, restaurant] of sessionState.last_fetched_restaurants.entries()) {
    if (!seen_restaurants.has(resId)) deleted_restaurants.push(restaurant)
  }

  for (const [bindingId, binding] of seen_bindings.entries()) {
    if (!sessionState.last_fetched_bindings.has(bindingId)) new_bindings.push(binding)
  }
  for (const [bindingId, binding] of sessionState.last_fetched_bindings.entries()) {
    if (!seen_bindings.has(bindingId)) deleted_bindings.push(binding)
  }

  sessionToLastFetched.set(sessionId, {
    last_fetched_zomato_dishes: new Map(seen_zomato_dishes),
    last_fetched_restaurants:   new Map(seen_restaurants),
    last_fetched_bindings:      new Map(seen_bindings),
  })

  return {
    new_zomato_dishes, deleted_zomato_dishes,
    new_restaurants,   deleted_restaurants,
    new_bindings,      deleted_bindings,
  }
}

// ── Routes ────────────────────────────────────────────────────────

app.get("/cart", async (req, res) => {
  try {
    const sessionId = req.sessionId;
    return res.status(200).json({
      success: true,
      cart:    sessionToCart.get(sessionId) ?? null,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "internal server error" });
  }
})

app.post("/updateCart", async (req, res) => {
  try {
    const { dish_id, dish_name, res_name, res_id, action, dish_image } = req.body;
    const sessionId = req.sessionId;  // always set by ensureSession

    const cart = sessionToCart.get(sessionId);  // always exists — created by ensureSession

    if (action === "add") {
      const tgt = cart.find(e => e.dish_id === dish_id);
      if (tgt) {
        tgt.quantity++;
      } else {
        cart.push({ dish_id, dish_name, res_name, res_id, dish_image, quantity: 1 });
      }
      return res.status(200).json({ success: true });
    }

    if (action === "remove") {
      const tgt = cart.find(e => e.dish_id === dish_id);
      if (!tgt) return res.status(404).json({ success: false, message: "Item not found in cart" });
      tgt.quantity--;
      if (tgt.quantity === 0) cart.splice(cart.indexOf(tgt), 1);
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ success: false, message: "Unknown action requested" });

  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

app.post('/placeOrder', async (req, res) => {
  try {
    const sessionId = req.sessionId;

    const { res_id, items } = req.body;
    const filterFunction  = (address) => address.includes(process.env.CITY.toLowerCase());
    const addressId       = await zomatoInstance.getAddressForUserId(filterFunction);
    const createCartResult = await zomatoInstance.createCart(res_id, items, addressId);

    if (createCartResult) {
      const checkoutCartResult = await zomatoInstance.checkoutCart(createCartResult);

      twilio.calls.create({
        from:  "+17406743927",
        to:    "+917439247036",
        twiml: "<Response><Say>Complete Payment</Say></Response>",
      });

      transporter.sendMail({
        from:    process.env.EMAIL_FROM,
        to:      process.env.EMAIL_TO,
        subject: "Please complete payment",
        html:    `<h2>Please find attached the following base64 qr code</h2>`,
        attachments: [{
          filename: "qr.png",
          content:  checkoutCartResult,
          encoding: "base64",
        }],
      });

      sessionToCart.set(sessionId, []);

      return res.status(200).json({ success: true, message: "order placed successful" });
    }

    return res.status(503).json({ success: false, message: "order checkout unsuccessful" });

  } catch (error) {
    console.log(error);
    return res.status(501).json({ success: false, message: "Internal server error" });
  }
})

app.get("/", async (req, res) => {
  try {
    const sessionId    = req.sessionId;  // always set by ensureSession
    const sessionStart = req.query.sessionStart;

    if (sessionStart === "true") {
      sessionToLastFetched.set(sessionId, {
        last_fetched_zomato_dishes: new Map(),
        last_fetched_restaurants:   new Map(),
        last_fetched_bindings:      new Map(),
      });
    }

    if (Date.now() - requestCache.lastUpdated < requestCache.cacheTTL) {
      const diff = fetch_diff_and_update_map(
        sessionId,
        requestCache.zomato_dishes,
        requestCache.restaurants,
        requestCache.bindings
      )
      return res.status(200).json({
        success: true,
        new:     { dishes: diff.new_zomato_dishes,     restaurants: diff.new_restaurants,     bindings: diff.new_bindings     },
        deleted: { dishes: diff.deleted_zomato_dishes, restaurants: diff.deleted_restaurants, bindings: diff.deleted_bindings },
      })
    }

    const allPromises = []
    for (const keyword of preferences.keywords) {
      allPromises.push(fetchRestaurants.call(zomatoInstance, keyword, true))
    }
    const results = await Promise.all(allPromises)

    const seenZomatoDishes = new Map()
    const seenRestaurants  = new Map()
    const seenBindings     = new Map()

    for (const result of results) {
      const dish_keyword    = result.dish
      const cuisine_keyword = result.cuisine

      for (const restaurant of result.results) {
        const restaurant_id = restaurant.res_id

        if (!seenRestaurants.has(restaurant_id)) {
          seenRestaurants.set(restaurant_id, {
            res_id:    restaurant_id,
            name:      restaurant.name,
            rating:    restaurant.rating,
            res_image: restaurant.res_image,
          })
        }

        for (const item of restaurant.items) {
          if (!seenZomatoDishes.has(item.variant_id)) {
            seenZomatoDishes.set(item.variant_id, {
              dish_id:      item.variant_id,
              catalogue_id: item.catalogue_id,
              dish_image:   item.image_link,
              dish_name:    item.name,
            })
          }

          const bindingId = `${item.variant_id}_${restaurant_id}`
          if (!seenBindings.has(bindingId)) {
            seenBindings.set(bindingId, {
              dish_id: item.variant_id,
              res_id:  restaurant_id,
              dish:    dish_keyword,
              cuisine: cuisine_keyword,
            })
          }
        }
      }
    }

    requestCache.zomato_dishes = new Map(seenZomatoDishes)
    requestCache.restaurants   = new Map(seenRestaurants)
    requestCache.bindings      = new Map(seenBindings)
    requestCache.lastUpdated   = Date.now()

    const diff = fetch_diff_and_update_map(
      sessionId,
      seenZomatoDishes,
      seenRestaurants,
      seenBindings
    )

    return res.status(200).json({
      success: true,
      new:     { dishes: diff.new_zomato_dishes,     restaurants: diff.new_restaurants,     bindings: diff.new_bindings     },
      deleted: { dishes: diff.deleted_zomato_dishes, restaurants: diff.deleted_restaurants, bindings: diff.deleted_bindings },
    })

  } catch (error) {
    console.log(error);
    return res.status(504).json({ success: false, message: "Internal server error" });
  }
});

const server = http.createServer(app);
server.listen(3009, () => { console.log("Server running on port 3009") })