require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const nodemailer = require("nodemailer");
const Stripe = require("stripe");
const ical = require("ical");

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// =======================
// CONFIG
// =======================
app.use(express.json());

// Autoriser Netlify
app.use(cors({
  origin: "*"
}));

// =======================
// EMAIL (optionnel)
// =======================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// =======================
// CALENDRIERS
// =======================
const calendars = [
  "https://www.airbnb.fr/calendar/ical/1203631202385110110.ics",
  "https://ical.booking.com/v1/export?t=0c26476e-6647-45d6-8cf9-01d6422911be",
  "http://www.abritel.fr/icalendar/a3ebc06e8f474da79b65ecfbe22505e5.ics"
];

let bookings = [];

async function syncCalendars() {
  bookings = [];

  for (const url of calendars) {
    try {
      const data = await fetch(url).then(r => r.text());
      const parsed = ical.parseICS(data);

      for (const key in parsed) {
        if (parsed[key].type === "VEVENT") {
          const start = new Date(parsed[key].start);
          const end = new Date(parsed[key].end);
          end.setDate(end.getDate() + 1);

          bookings.push({
            start: start.toISOString().split("T")[0],
            end: end.toISOString().split("T")[0],
            display: "background"
          });
        }
      }
    } catch (err) {
      console.error("Erreur calendrier :", url);
    }
  }
}

syncCalendars();
setInterval(syncCalendars, 60 * 60 * 1000);

// Endpoint pour le front
app.get("/api/bookings", (req, res) => {
  res.json(bookings);
});

// =======================
// AVIS CLIENTS
// =======================
const REVIEWS_FILE = path.join(__dirname, "reviews.json");

// GET avis
app.get("/api/reviews", (req, res) => {
  const data = fs.readFileSync(REVIEWS_FILE, "utf8");
  res.json(JSON.parse(data));
});

// POST avis
app.post("/api/reviews", (req, res) => {
  const { name, text } = req.body;

  if (!name || !text) {
    return res.status(400).json({ error: "Champs manquants" });
  }

  const reviews = JSON.parse(fs.readFileSync(REVIEWS_FILE, "utf8"));
  reviews.push({ name, text, date: new Date().toISOString() });

  fs.writeFileSync(REVIEWS_FILE, JSON.stringify(reviews, null, 2));

  res.json({ success: true });
});

// =======================
// MINI CHAT
// =======================
app.post("/api/chat", (req, res) => {
  const { message } = req.body;

  if (!message) return res.json({ reply: "Message vide" });

  // Réponse simple
  res.json({
    reply: "Merci pour votre message ! Nous vous répondrons rapidement."
  });
});

// =======================
// STRIPE CHECKOUT
// =======================
app.post("/create-checkout-session", async (req, res) => {
  try {
    const { email, total } = req.body;
    const amount = Math.round(Number(total) * 100);

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Montant invalide" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,

      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "Séjour – Le Nid des Cimes"
            },
            unit_amount: amount
          },
          quantity: 1
        }
      ],

      success_url: process.env.SUCCESS_URL,
      cancel_url: process.env.CANCEL_URL,

      payment_intent_data: {
        capture_method: "manual" // Empreinte bancaire
      },

      metadata: {
        caution: "1000 EUR"
      }
    });

    res.json({ url: session.url });

  } catch (err) {
    console.error("Stripe error :", err.message);
    res.status(500).json({ error: err.message });
  }
});

// =======================
// LANCEMENT SERVEUR
// =======================
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log("Serveur actif sur le port", PORT);
});
