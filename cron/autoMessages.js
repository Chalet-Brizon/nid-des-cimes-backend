// ===============================
// AUTO-MESSAGES – CRON QUOTIDIEN
// ===============================

require("dotenv").config();
const cron = require("node-cron");
const fs = require("fs");
const path = require("path");

const {
  sendMessageJ0,
  sendMessageJ7,
  sendMessageJ3,
  sendMessageJ1,
  sendMessageJ1Depart,
  sendMessageJplus1
} = require("../sendMessage.js");

// 📌 Chemin vers ton fichier de réservations
const RESA_FILE = path.join(process.cwd(), "data", "reservations.json");

// 📌 Fonction utilitaire : différence en jours
function diffDays(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.floor((d1 - d2) / (1000 * 60 * 60 * 24));
}

// 📌 Charger les réservations
function loadReservations() {
  if (!fs.existsSync(RESA_FILE)) return [];
  return JSON.parse(fs.readFileSync(RESA_FILE, "utf8"));
}

// 📌 Sauvegarder les réservations (pour éviter les doublons)
function saveReservations(data) {
  fs.writeFileSync(RESA_FILE, JSON.stringify(data, null, 2));
}

// ===============================
// CRON – Exécution chaque jour à 08h00
// ===============================
cron.schedule("0 8 * * *", async () => {
  console.log("⏰ CRON : Vérification des messages automatiques…");

  let reservations = loadReservations();
  const today = new Date().toISOString().split("T")[0];

  for (let resa of reservations) {
    const daysBefore = diffDays(resa.dateArrivee, today);
    const daysAfter = diffDays(today, resa.dateDepart);

    try {
      // ===============================
      // J-7
      // ===============================
      if (daysBefore === 7 && !resa.sentJ7) {
        await sendMessageJ7(resa);
        resa.sentJ7 = true;
        console.log("📨 J-7 envoyé à", resa.email);
      }

      // ===============================
      // J-3
      // ===============================
      if (daysBefore === 3 && !resa.sentJ3) {
        await sendMessageJ3(resa);
        resa.sentJ3 = true;
        console.log("📨 J-3 envoyé à", resa.email);
      }

      // ===============================
      // J-1 (arrivée)
      // ===============================
      if (daysBefore === 1 && !resa.sentJ1) {
        await sendMessageJ1(resa);
        resa.sentJ1 = true;
        console.log("📨 J-1 (arrivée) envoyé à", resa.email);
      }

      // ===============================
      // J-0 (confirmation)
      // ===============================
      if (daysBefore === 0 && !resa.sentJ0) {
        await sendMessageJ0(resa);
        resa.sentJ0 = true;
        console.log("📨 J-0 envoyé à", resa.email);
      }

      // ===============================
      // J-1 (départ)
      // ===============================
      if (daysAfter === 1 && !resa.sentJ1Depart) {
        await sendMessageJ1Depart(resa);
        resa.sentJ1Depart = true;
        console.log("📨 J-1 (départ) envoyé à", resa.email);
      }

      // ===============================
      // J+1 (remerciement + avis)
      // ===============================
      if (daysAfter === -1 && !resa.sentJplus1) {
        await sendMessageJplus1(resa);
        resa.sentJplus1 = true;
        console.log("📨 J+1 envoyé à", resa.email);
      }

    } catch (err) {
      console.error("❌ Erreur CRON pour", resa.email, err);
    }
  }

  saveReservations(reservations);
  console.log("✔ CRON terminé.");
});
