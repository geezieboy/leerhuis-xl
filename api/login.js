// api/lti/login.js
// Stap 1: Ontvangt de login initiation van het LMS en stuurt door naar de OIDC auth endpoint
// URL: https://leerhuis-xl.vercel.app/api/lti/login

import { randomBytes } from "crypto";

export default function handler(req, res) {
  try {
    const params =
      req.method === "POST" ? req.body : req.query;

    const {
      iss,             // LMS issuer URL
      login_hint,      // Gebruiker identifier van het LMS
      target_link_uri, // Waar naartoe na succesvolle launch
      lti_message_hint // Extra context van het LMS (bijv. resource ID)
    } = params;

    if (!iss || !login_hint || !target_link_uri) {
      return res.status(400).json({ error: "Verplichte parameters ontbreken: iss, login_hint, target_link_uri" });
    }

    // Genereer nonce en state voor CSRF-beveiliging
    const nonce = randomBytes(16).toString("hex");
    const state = randomBytes(16).toString("hex");

    // Sla state op in cookie zodat we hem kunnen verifiëren in de callback
    res.setHeader("Set-Cookie", [
      `lti_state=${state}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=600`,
      `lti_nonce=${nonce}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=600`,
    ]);

    // Bouw de OIDC auth URL
    const authUrl = new URL(process.env.LTI_OIDC_AUTH_URL);
    authUrl.searchParams.set("scope", "openid");
    authUrl.searchParams.set("response_type", "id_token");
    authUrl.searchParams.set("client_id", process.env.LTI_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", `${process.env.LTI_BASE_URL}/api/lti/callback`);
    authUrl.searchParams.set("login_hint", login_hint);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("nonce", nonce);
    authUrl.searchParams.set("response_mode", "form_post");
    authUrl.searchParams.set("prompt", "none");

    if (lti_message_hint) {
      authUrl.searchParams.set("lti_message_hint", lti_message_hint);
    }

    // Stuur gebruiker door naar het LMS voor authenticatie
    res.redirect(302, authUrl.toString());
  } catch (err) {
    console.error("LTI login error:", err);
    res.status(500).json({ error: "Login initiatie mislukt", details: err.message });
  }
}
