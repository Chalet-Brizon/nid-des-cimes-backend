// Remplacez :
// const { messageJ0, ... } = require("./templates.js");
// Par :
import * as templates from "./templates.js";
const {
  messageJ0,
  messageJ7,
  messageJ3,
  messageJ1,
  messageJ1Depart,
  messageJplus1
} = templates;

// Remplacez :
// const { sendEmail } = require("./mailer/sendEmail.js");
// Par :
import { sendEmail } from "../mailer/sendEmail.js";

// Remplacez :
// const settings = require("./settings.json");
// Par :
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Nécessaire pour __dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lire settings.json manuellement
// On remonte d'un dossier (..) pour atteindre la racine
const settingsPath = path.join(__dirname, '..', 'settings.json');
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));

const establishment = settings.establishments[0];


// ===============================
// TEMPLATE PREMIUM HTML
// ===============================
function generatePremiumHtml({ prenom, dateArrivee, dateDepart, nbNuits, codeBoite }) {
  return `
  <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; color: #333;">
    <div style="max-width: 600px; margin: auto; background-color: #fff; border-radius: 8px; padding: 30px; box-shadow: 0 0 10px rgba(0,0,0,0.05);">
      
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="cid:logo_nid_des_alpes" alt="Le Nid des Alpes" style="max-width: 120px; margin-bottom: 10px;" />
        <h2 style="margin: 0; color: #2f5d50;">Le Nid des Alpes</h2>
      </div>

      <p style="font-size: 16px; line-height: 1.6;">
        Bonjour <strong>${prenom}</strong>,  
        <br><br>
        Votre séjour est bien enregistré du <strong>${dateArrivee}</strong> au <strong>${dateDepart}</strong> 
        pour <strong>${nbNuits} nuit${nbNuits > 1 ? "s" : ""}</strong>.
      </p>

      ${codeBoite ? `
      <p style="font-size: 16px; line-height: 1.6;">
        Votre code d’accès au chalet est :  
        <strong style="font-size: 18px;">${codeBoite}</strong>
      </p>` : ""}

      <p style="font-size: 16px; line-height: 1.6;">
        Si vous avez la moindre question, n’hésitez pas à nous contacter par WhatsApp ou à nous laisser un avis après votre séjour.
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${establishment.lienAvis}" 
           style="background-color: #2f5d50; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">
           Laisser un avis
        </a>
      </div>

      <div style="text-align: center;">
        <a href="https://wa.me/${establishment.whatsapp}?text=Bonjour%20Le%20Nid%20des%20Alpes%2C%20j’ai%20une%20question%20concernant%20ma%20réservation%20du%20${dateArrivee}%20au%20${dateDepart}" 
           style="text-decoration: none;">
          <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" 
               alt="WhatsApp" style="width: 40px; height: 40px;" />
          <p style="margin: 8px 0 0; color: #2f5d50; font-weight: bold;">Nous contacter</p>
        </a>
      </div>

      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />

      <p style="font-size: 12px; color: #888; text-align: center;">
        Le Nid des Alpes – Brizon / Mont-Saxonnex, Haute-Savoie  
        <br>
        Ce message est généré automatiquement depuis notre plateforme de réservation.
      </p>
    </div>
  </div>
  `;
}



// ===============================
// J-0 — Confirmation
// ===============================
async function sendMessageJ0(reservation) {

  reservation.codeBoite = establishment.codeBoite;
  reservation.lienAvis = establishment.lienAvis;
  reservation.whatsapp = establishment.whatsapp;
  reservation.nomLogement = establishment.name;

  const message = messageJ0
    .replace("[PRENOM]", reservation.prenom)
    .replace("[DATE_ARRIVEE]", reservation.dateArrivee)
    .replace("[DATE_DEPART]", reservation.dateDepart)
    .replace("[NB_NUITS]", reservation.nbNuits);

  await sendEmail({
    to: reservation.email,
    subject: "Votre réservation est confirmée",
    text: message,
    html: generatePremiumHtml(reservation)
  });
}



// ===============================
// J-7 — Informations pratiques
// ===============================
async function sendMessageJ7(reservation) {

  reservation.codeBoite = establishment.codeBoite;
  reservation.lienAvis = establishment.lienAvis;
  reservation.whatsapp = establishment.whatsapp;
  reservation.nomLogement = establishment.name;

  const message = messageJ7
    .replace("[PRENOM]", reservation.prenom)
    .replace("[DATE_ARRIVEE]", reservation.dateArrivee)
    .replace("[DATE_DEPART]", reservation.dateDepart)
    .replace("[NB_NUITS]", reservation.nbNuits);

  await sendEmail({
    to: reservation.email,
    subject: "Informations pratiques avant votre arrivée",
    text: message,
    html: message.replace(/\n/g, "<br>")
  });
}



// ===============================
// J-3 — Préparation du séjour
// ===============================
async function sendMessageJ3(reservation) {

  reservation.codeBoite = establishment.codeBoite;
  reservation.lienAvis = establishment.lienAvis;
  reservation.whatsapp = establishment.whatsapp;
  reservation.nomLogement = establishment.name;

  const message = messageJ3
    .replace("[PRENOM]", reservation.prenom)
    .replace("[DATE_ARRIVEE]", reservation.dateArrivee)
    .replace("[DATE_DEPART]", reservation.dateDepart)
    .replace("[NB_NUITS]", reservation.nbNuits);

  await sendEmail({
    to: reservation.email,
    subject: "Préparation de votre séjour",
    text: message,
    html: message.replace(/\n/g, "<br>")
  });
}



// ===============================
// J-1 — Arrivée
// ===============================
async function sendMessageJ1(reservation) {

  reservation.codeBoite = establishment.codeBoite;
  reservation.lienAvis = establishment.lienAvis;
  reservation.whatsapp = establishment.whatsapp;
  reservation.nomLogement = establishment.name;

  const message = messageJ1
    .replace("[PRENOM]", reservation.prenom)
    .replace("[DATE_ARRIVEE]", reservation.dateArrivee)
    .replace("[DATE_DEPART]", reservation.dateDepart)
    .replace("[NB_NUITS]", reservation.nbNuits)
    .replace("[CODE_BOITE]", reservation.codeBoite);

  await sendEmail({
    to: reservation.email,
    subject: "Informations pour votre arrivée demain",
    text: message,
    html: generatePremiumHtml(reservation)
  });
}



// ===============================
// J-1 — Départ
// ===============================
async function sendMessageJ1Depart(reservation) {

  reservation.codeBoite = establishment.codeBoite;
  reservation.lienAvis = establishment.lienAvis;
  reservation.whatsapp = establishment.whatsapp;
  reservation.nomLogement = establishment.name;

  const message = messageJ1Depart
    .replace("[PRENOM]", reservation.prenom)
    .replace("[DATE_DEPART]", reservation.dateDepart);

  await sendEmail({
    to: reservation.email,
    subject: "Informations pour votre départ demain",
    text: message,
    html: message.replace(/\n/g, "<br>")
  });
}



// ===============================
// J+1 — Remerciement + Avis
// ===============================
async function sendMessageJplus1(reservation) {

  reservation.codeBoite = establishment.codeBoite;
  reservation.lienAvis = establishment.lienAvis;
  reservation.whatsapp = establishment.whatsapp;
  reservation.nomLogement = establishment.name;

  const message = messageJplus1
    .replace("[PRENOM]", reservation.prenom);

  await sendEmail({
    to: reservation.email,
    subject: "Merci pour votre séjour",
    text: message,
    html: generatePremiumHtml(reservation)
  });
}

// Remplacez :
// module.exports = { ... }
// Par :
export default {
  sendMessageJ0,
  sendMessageJ7,
  sendMessageJ3,
  sendMessageJ1,
  sendMessageJ1Depart,
  sendMessageJplus1
};