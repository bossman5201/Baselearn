import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { withValidManifest } from "@coinbase/onchainkit/minikit";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const manifestPath = path.resolve(__dirname, "..", ".well-known", "farcaster.json");

function assertHttpsUrl(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`missing_${fieldName}`);
  }

  let parsed = null;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`invalid_${fieldName}_url`);
  }

  if (parsed.protocol !== "https:") {
    throw new Error(`non_https_${fieldName}`);
  }
}

function main() {
  if (!fs.existsSync(manifestPath)) {
    throw new Error("manifest_not_found");
  }

  const raw = fs.readFileSync(manifestPath, "utf8");
  const parsedManifest = JSON.parse(raw);
  const validated = withValidManifest(parsedManifest);
  const miniapp = validated.miniapp || validated.frame;

  assertHttpsUrl(miniapp.homeUrl, "home_url");
  assertHttpsUrl(miniapp.iconUrl, "icon_url");

  if (miniapp.imageUrl) {
    assertHttpsUrl(miniapp.imageUrl, "image_url");
  }

  if (miniapp.splashImageUrl) {
    assertHttpsUrl(miniapp.splashImageUrl, "splash_image_url");
  }

  if (miniapp.ogImageUrl) {
    assertHttpsUrl(miniapp.ogImageUrl, "og_image_url");
  }

  if (validated.accountAssociation) {
    const association = validated.accountAssociation;
    if (!association.header || !association.payload || !association.signature) {
      throw new Error("invalid_account_association");
    }
  }

  console.log("Mini app manifest validation passed.");
}

main();
