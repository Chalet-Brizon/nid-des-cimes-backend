require("dotenv").config();

const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");
const Stripe = require("stripe");
const nodemailer = require("nodemailer");
const ical = require("ical");

// Pour récupérer les .ics
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 4000;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// =======================
// Fichiers de données
// =======================
const REVIEWS_FILE = path.join(__dirname, "reviews.json");
const BOOKINGS_FILE = path.join(__dirname, "bookings.json");
const SETTINGS_FILE = path.join(__dirname, "settings.json");
const STRIPE_BOOKINGS_FILE = path.join(__dirname, "stripeBookings.json");

// =======================
// Variables d'environnement
// =======================
const OWNER_EMAIL = process.env.OWNER_EMAIL || null;
const WHATSAPP_NUMBERS = process.env.WHATSAPP_NUMBERS
  ? process.env.WHATSAPP_NUMBERS.split(",").map((n) => n.trim())
  : [];

const SUCCESS_URL = process.env.STRIPE_SUCCESS_URL;
const CANCEL_URL = process.env.STRIPE_CANCEL_URL;

// =======================
// Middlewares
// =======================
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// =======================
// Transporter email (Gmail)
// =======================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// =======================
// Fonctions utilitaires JSON
// =======================
function readJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const data = fs.readFileSync(filePath, "utf8");
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Erreur de lecture JSON :", error);
    return [];
  }
}

function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error("Erreur d'écriture JSON :", error);
  }
}

// =======================
// Email propriétaire
// =======================
function sendOwnerEmail(subject, text) {
  if (!OWNER_EMAIL) {
    console.warn("OWNER_EMAIL non défini, email non envoyé.");
    return;
  }

  transporter.sendMail(
    {
      from: `"Le Nid des Alpes" <${process.env.GMAIL_USER}>`,
      to: OWNER_EMAIL,
      subject,
      text,
    },
    (err, info) => {
      if (err) console.error("Erreur envoi email propriétaire :", err);
    }
  );
}

// =======================
// CALENDRIERS iCal
// =======================
const calendars = [
  "https://www.airbnb.fr/calendar/ical/1203631202385110110.ics",
  "https://ical.booking.com/v1/export?t=0c26476e-6647-45d6-8cf9-01d6422911be",
  "http://www.abritel.fr/icalendar/a3ebc06e8f474da79b65ecfbe22505e5.ics",
];

let remoteBookings = [];

async function syncCalendars() {
  remoteBookings = [];

  for (const url of calendars) {
    try {
      const data = await fetch(url).then((r) => r.text());
      const parsed = ical.parseICS(data);

      for (const key in parsed) {
        const ev = parsed[key];
        if (ev.type === "VEVENT") {
          const start = new Date(ev.start);
          const end = new Date(ev.end);
          end.setDate(end.getDate() + 1);

          remoteBookings.push({
            start: start.toISOString().split("T")[0],
            end: end.toISOString().split("T")[0],
            display: "background",
            backgroundColor: "#ffcccc",
          });
        }
      }
    } catch (err) {
      console.error("Erreur calendrier :", url, err.message);
    }
  }

  console.log("Sync iCal terminée. Réservations plateformes :", remoteBookings.length);
}

syncCalendars();
setInterval(syncCalendars, 60 * 60 * 1000);

// =======================
// AVIS
// =======================
app.get("/api/reviews", (req, res) => {
  res.json(readJsonFile(REVIEWS_FILE));
});

app.post("/api/reviews", (req, res) => {
  const { name, rating, comment } = req.body;

  if (!name || !rating || !comment)
    return res.status(400).json({ error: "Champs manquants" });

  const reviews = readJsonFile(REVIEWS_FILE);
  const newReview = {
    id: Date.now(),
    name,
    rating,
    comment,
    date: new Date().toISOString(),
  };

  reviews.push(newReview);
  writeJsonFile(REVIEWS_FILE, reviews);

  sendOwnerEmail(
    "Nouvel avis client",
    `Un nouvel avis a été laissé :\n\nNom : ${name}\nNote : ${rating}\nCommentaire : ${comment}`
  );

  res.status(201).json(newReview);
});

// =======================
// RÉSERVATIONS
// =======================
app.get("/api/bookings", (req, res) => {
  const localBookingsRaw = readJsonFile(BOOKINGS_FILE);

  const localBookings = localBookingsRaw.map((b) => ({
    start: b.startDate,
    end: b.endDate,
    title: "Réservation site web",
    display: "block",
    backgroundColor: "#cce5ff",
    borderColor: "#004085",
  }));

  res.json([...remoteBookings, ...localBookings]);
});

app.post("/api/bookings", (req, res) => {
  const { name, email, startDate, endDate, options } = req.body;

  if (!name || !email || !startDate || !endDate)
    return res.status(400).json({ error: "Champs manquants" });

  const bookings = readJsonFile(BOOKINGS_FILE);
  const newBooking = {
    id: Date.now(),
    name,
    email,
    startDate,
    endDate,
    options: options || [],
    createdAt: new Date().toISOString(),
  };

  bookings.push(newBooking);
  writeJsonFile(BOOKINGS_FILE, bookings);

  sendOwnerEmail(
    "Nouvelle réservation (site web)",
    `Une nouvelle réservation a été effectuée :\n\nNom : ${name}\nEmail : ${email}\nArrivée : ${startDate}\nDépart : ${endDate}\nOptions : ${(options || []).join(", ")}`
  );

  res.status(201).json(newBooking);
});

// =======================
// STRIPE BOOKINGS
// =======================
app.get("/api/stripeBookings", (req, res) => {
  try {
    res.json(readJsonFile(STRIPE_BOOKINGS_FILE));
  } catch {
    res.status(500).json({ error: "Impossible de lire stripeBookings.json" });
  }
});

// =======================
// SETTINGS
// =======================
app.get("/api/settings", (req, res) => {
  try {
    res.json(readJsonFile(SETTINGS_FILE));
  } catch {
    res.status(500).json({ error: "Impossible de lire settings.json" });
  }
});

app.post("/api/settings", (req, res) => {
  try {
    const body = req.body;

    if (!body || !Array.isArray(body.establishments))
      return res.status(400).json({ error: "Format invalide" });

    writeJsonFile(SETTINGS_FILE, body);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Impossible d'écrire settings.json" });
  }
});

// =======================
// STRIPE CHECKOUT
// =======================
app.post("/create-checkout-session", async (req, res) => {
  try {
    const { amount, name, email, startDate, endDate, options } = req.body;

    if (!amount || !name || !email || !startDate || !endDate)
      return res.status(400).json({ error: "Champs manquants pour le paiement" });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Séjour – Le Nid des Alpes (${startDate} au ${endDate})`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      success_url: SUCCESS_URL,
      cancel_url: CANCEL_URL,
      consent_collection: {
        terms_of_service: "required",
      },
      metadata: {
        caution: "1000",
        usage: "Garantie locative",
        name,
        startDate,
        endDate,
        options: (options || []).join(","),
      },
    });

    // Email client
    transporter.sendMail(
      {
        from: `"Le Nid des Alpes" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: "Confirmation de votre réservation – Le Nid des Alpes",
        html: `
          <h2>Merci pour votre réservation 🌿</h2>
          <p>Votre séjour au <strong>Nid des Alpes</strong> est bien enregistré.</p>
          <p><strong>Montant payé :</strong> ${(amount / 100).toFixed(2)} €</p>
          <p><strong>Période :</strong> du ${startDate} au ${endDate}</p>
          <p>Un dépôt de garantie par empreinte bancaire est appliqué conformément aux CGV.</p>
          <br>
          <p>À très bientôt au Nid des Alpes.</p>
        `,
      },
      (err) => {
        if (err) console.error("Erreur envoi email client :", err.message);
      }
    );

    res.json({ url: session.url });
  } catch (error) {
    console.error("Erreur création session Stripe :", error);
    res.status(500).json({ error: "Erreur lors de la création de la session de paiement" });
  }
});

// =======================
// CHAT
// =======================
app.post("/api/chat", (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message)
    return res.status(400).json({ error: "Champs manquants" });

  sendOwnerEmail(
    "Nouveau message client (chat)",
    `Un client vous a écrit :\n\nNom : ${name}\nEmail : ${email}\nMessage :\n${message}`
  );

  res.json({
    success: true,
    reply: "Merci pour votre message, nous vous répondrons rapidement.",
  });
});

// =======================
// Démarrage serveur
// =======================
require("./cron/autoMessages.js");
app.listen(PORT, () => {
  console.log(`Serveur actif sur le port ${PORT}`);
});
