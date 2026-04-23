import { createHash, randomBytes } from "node:crypto";

function base64Url(input: Buffer): string {
  return input.toString("base64url");
}

export function createPkcePair() {
  const codeVerifier = base64Url(randomBytes(48));
  const codeChallenge = base64Url(
    createHash("sha256").update(codeVerifier, "utf8").digest(),
  );

  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: "S256" as const,
  };
}
