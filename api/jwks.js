// api/lti/jwks.js
// Publiceert de publieke sleutel zodat het LMS JWT-tokens kan verifiëren
// URL: https://leerhuis-xl.vercel.app/api/lti/jwks

import { createPublicKey } from "crypto";

export default function handler(req, res) {
  try {
    const privateKeyPem = Buffer.from(
      process.env.LTI_PRIVATE_KEY_BASE64,
      "base64"
    ).toString("utf8");

    const pubKey = createPublicKey(privateKeyPem);
    const jwk = pubKey.export({ format: "jwk" });

    const jwks = {
      keys: [
        {
          ...jwk,
          kid: "leerhuis-xl-key-1",
          use: "sig",
          alg: "RS256",
        },
      ],
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json(jwks);
  } catch (err) {
    console.error("JWKS error:", err);
    res.status(500).json({ error: "JWKS genereren mislukt" });
  }
}
