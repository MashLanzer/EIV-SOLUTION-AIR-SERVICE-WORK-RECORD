import { createRemoteJWKSet, jwtVerify } from "jose";

const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs")
);

// Verifies a Google ID token minted by the native Credential Manager sign-in
// flow (signature, issuer, audience, expiry) - the counterpart to the
// browser-based OAuth flow's authorization-code exchange, but here the
// native app already has the credential and just needs it validated.
export async function verifyGoogleIdToken(idToken: string) {
  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: process.env.AUTH_GOOGLE_ID,
  });

  const email = typeof payload.email === "string" ? payload.email : undefined;
  const emailVerified = payload.email_verified === true;
  const name = typeof payload.name === "string" ? payload.name : undefined;

  if (!email || !emailVerified) {
    throw new Error("Google ID token missing a verified email");
  }

  return { email, name };
}
