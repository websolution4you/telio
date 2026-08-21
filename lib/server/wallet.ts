export function walletEnabledForUser(_userId: string) {
  // Wallet and payments are enabled for all authenticated users by default.
  // Set NTC_WALLET_MODE=off to disable them, or =test to restore a restricted pilot mode.
  const mode = process.env.NTC_WALLET_MODE?.trim().toLowerCase() || "on";
  if (mode === "on") return true;
  if (mode === "off") return false;

  if (mode === "test") {
    const configuredIds = process.env.NTC_WALLET_TEST_USER_IDS || "";
    const allowedIds = new Set(
      configuredIds
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    );
    return allowedIds.has(_userId.toLowerCase());
  }

  return false;
}


