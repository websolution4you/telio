const PILOT_USER_IDS = [
  "e9e3b12e-5e08-46ce-bd6d-9da8096db37d", // Peter Kaľavský, peto@ntc.sk
  "8b86a015-0924-4780-8264-b9beabc3519f", // Kamil Bartko, kamil@ntc.sk
].join(",");

export function walletEnabledForUser(userId: string) {
  const mode = process.env.NTC_WALLET_MODE?.trim().toLowerCase() || "test";
  if (mode === "on") return true;
  if (mode !== "test") return false;

  const configuredIds = process.env.NTC_WALLET_TEST_USER_IDS || PILOT_USER_IDS;
  const allowedIds = new Set(
    configuredIds
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
    return allowedIds.has(userId.toLowerCase());
}


