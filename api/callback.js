// api/lti/callback.js
// Stap 2: Ontvangt de JWT id_token van het LMS, verifieert hem, en redirect naar de e-learning
// URL: https://leerhuis-xl.vercel.app/api/lti/callback

import { createRemoteJWKSet, jwtVerify } from "jose";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Alleen POST toegestaan" });
  }

  try {
    const { id_token, state } = req.body;

    if (!id_token || !state) {
      return res.status(400).json({ error: "id_token en state zijn verplicht" });
    }

    // Verifieer state cookie (CSRF bescherming)
    const cookies = parseCookies(req.headers.cookie || "");
    if (cookies.lti_state !== state) {
      return res.status(400).json({ error: "Ongeldige state — mogelijke CSRF aanval" });
    }

    // Haal JWKS op van het LMS om de JWT te verifiëren
    const JWKS = createRemoteJWKSet(new URL(process.env.LTI_JWKS_URL));

    // Verifieer en decode de JWT
    const { payload } = await jwtVerify(id_token, JWKS, {
      issuer: process.env.LTI_ISSUER,
      audience: process.env.LTI_CLIENT_ID,
    });

    // Verifieer nonce
    if (payload.nonce !== cookies.lti_nonce) {
      return res.status(400).json({ error: "Ongeldige nonce" });
    }

    // Haal LTI claims op
    const resourceLink = payload["https://purl.imsglobal.org/spec/lti/claim/resource_link"];
    const targetLinkUri = payload["https://purl.imsglobal.org/spec/lti/claim/target_link_uri"];
    const roles = payload["https://purl.imsglobal.org/spec/lti/claim/roles"] || [];

    console.log("LTI Launch succesvol:", {
      user: payload.sub,
      name: payload.name,
      email: payload.email,
      resource: resourceLink?.id,
      targetUri: targetLinkUri,
      roles,
    });

    // Wis de state/nonce cookies
    res.setHeader("Set-Cookie", [
      "lti_state=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0",
      "lti_nonce=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0",
    ]);

    // Redirect naar de target URL (de e-learning)
    if (targetLinkUri) {
      return res.redirect(302, targetLinkUri);
    }

    // Fallback: toon succespagina
    res.setHeader("Content-Type", "text/html");
    res.status(200).send(`
      <!DOCTYPE html>
      <html lang="nl">
      <head>
        <title>LTI Launch geslaagd</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 60px auto; padding: 20px; }
          .success { background: #e5f5e9; border: 2px solid #4caf50; padding: 24px; border-radius: 8px; }
          pre { background: #f5f5f5; padding: 16px; overflow: auto; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="success">
          <h2>✅ LTI 1.3 Launch geslaagd!</h2>
          <p>Gebruiker: <strong>${payload.name || payload.sub}</strong></p>
          <p>E-mail: <strong>${payload.email || "onbekend"}</strong></p>
          <p>Resource: <strong>${resourceLink?.title || resourceLink?.id || "onbekend"}</strong></p>
        </div>
        <h3>JWT Claims (debug)</h3>
        <pre>${JSON.stringify(payload, null, 2)}</pre>
      </body>
      </html>
    `);
  } catch (err) {
    console.error("LTI callback error:", err);
    res.setHeader("Content-Type", "text/html");
    res.status(400).send(`
      <!DOCTYPE html>
      <html lang="nl">
      <head><title>LTI Launch mislukt</title></head>
      <body style="font-family:Arial;max-width:600px;margin:60px auto;padding:20px">
        <h2>❌ LTI Launch mislukt</h2>
        <p><strong>Fout:</strong> ${err.message}</p>
        <p>Controleer de Vercel logs voor meer details.</p>
      </body>
      </html>
    `);
  }
}

function parseCookies(cookieHeader) {
  return Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [key, ...val] = c.trim().split("=");
      return [key, val.join("=")];
    })
  );
}
