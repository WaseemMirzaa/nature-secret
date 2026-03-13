const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

// Prefer explicit env vars, but also support legacy firebase functions:config via FIREBASE_CONFIG
let gmailUser = process.env.GMAIL_USER || "";
let gmailPass = process.env.GMAIL_PASS || "";
let emailSecret = process.env.EMAIL_SECRET || "";

if (!gmailUser || !gmailPass || !emailSecret) {
  try {
    const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG || "{}");
    if (firebaseConfig.gmail) {
      gmailUser = gmailUser || firebaseConfig.gmail.user || "";
      gmailPass = gmailPass || firebaseConfig.gmail.pass || "";
    }
    if (firebaseConfig.email) {
      emailSecret = emailSecret || firebaseConfig.email.secret || "";
    }
  } catch (e) {
    logger.warn("Failed to parse FIREBASE_CONFIG for gmail/email settings", e);
  }
}

let transporter = null;
if (gmailUser && gmailPass) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {user: gmailUser, pass: gmailPass},
  });
} else {
  logger.warn("Gmail credentials not configured in functions config (gmail.user / gmail.pass).");
}

function verifyAuthToken(token) {
  if (!emailSecret || !token || token.indexOf(".") === -1) return false;
  const parts = token.split(".");
  const body = parts[0];
  const sig = parts[1];
  const expected = crypto
    .createHmac("sha256", emailSecret)
    .update(body)
    .digest("base64url");
  if (sig !== expected) return false;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload.ts || Date.now() - payload.ts > 5 * 60 * 1000) return false;
    return true;
  } catch (e) {
    logger.error("Invalid auth token payload", e);
    return false;
  }
}

exports.sendOrderEmail = onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  if (!transporter) {
    res.status(500).send({ok: false, error: "Email transporter not configured"});
    return;
  }

  const origin = req.headers.origin || "";
  if (
    origin &&
    !origin.includes("naturesecret.pk") &&
    !origin.includes("localhost")
  ) {
    res.status(403).send("Forbidden");
    return;
  }

  const {authToken, to, subject, html} = req.body || {};
  if (!verifyAuthToken(authToken)) {
    res.status(403).send("Forbidden");
    return;
  }
  if (!to || !subject || !html) {
    res.status(400).send("Missing to/subject/html");
    return;
  }

  try {
    await transporter.sendMail({
      from: `"Nature Secret" <${gmailUser}>`,
      to,
      subject,
      html,
    });
    res.status(200).send({ok: true});
  } catch (err) {
    logger.error("sendOrderEmail failed", err);
    res.status(500).send({ok: false, error: err && err.message ? err.message : "Error sending email"});
  }
});
