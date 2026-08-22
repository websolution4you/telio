const DEFAULT_API_BASE_URL = "https://api.tatrabanka.sk/tatrapayplus/sandbox/v1";
const DEFAULT_TOKEN_URL = "https://api.tatrabanka.sk/tatrapayplus/sandbox/auth/oauth/v2/token";

export type TatraPaymentState = "successful" | "pending" | "failed";

type JsonRecord = Record<string, unknown>;

function requireConfig(name: "TATRABANKA_CLIENT_ID" | "TATRABANKA_SHARED_SECRET") {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

async function readResponse(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) as JsonRecord : {};
  } catch {
    return { raw: text };
  }
}

async function getAccessToken() {
  const response = await fetch(process.env.TATRABANKA_TOKEN_URL || DEFAULT_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: requireConfig("TATRABANKA_CLIENT_ID"),
      client_secret: requireConfig("TATRABANKA_SHARED_SECRET"),
      scope: "TATRAPAYPLUS",
    }),
    cache: "no-store",
  });
  const data = await readResponse(response);
  if (!response.ok || typeof data.access_token !== "string") {
    console.error("TatraPayPlus token request failed:", response.status, data);
    throw new Error("TatraPayPlus authorization failed");
  }
  return data.access_token;
}

export async function createTatraPayment(input: {
  amountEur: number;
  redirectUri: string;
  ipAddress: string;
  requestId: string;
}) {
  const token = await getAccessToken();
  const response = await fetch(`${process.env.TATRABANKA_API_BASE_URL || DEFAULT_API_BASE_URL}/payments`, {
    method: "POST",
    headers: {
      "X-Request-ID": input.requestId,
      "IP-Address": input.ipAddress,
      "Redirect-URI": input.redirectUri,
      "Preferred-Method": "BANK_TRANSFER",
      "Accept-Language": "sk",
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      basePayment: {
        instructedAmount: { amountValue: input.amountEur, currency: "EUR" },
        endToEnd: { variableSymbol: input.requestId.replace(/\D/g, "").slice(0, 10) || "1" },
      },
      bankTransfer: { remittanceInformationUnstructured: `Dobitie Telio kreditu ${input.amountEur} EUR` },
    }),
    cache: "no-store",
  });
  const data = await readResponse(response);
  if (!response.ok || typeof data.paymentId !== "string" || typeof data.tatraPayPlusUrl !== "string") {
    console.error("TatraPayPlus payment creation failed:", response.status, data);
    throw new Error("TatraPayPlus payment creation failed");
  }
  return { paymentId: data.paymentId, url: data.tatraPayPlusUrl };
}

export async function getTatraPaymentStatus(paymentId: string) {
  const token = await getAccessToken();
  const response = await fetch(`${process.env.TATRABANKA_API_BASE_URL || DEFAULT_API_BASE_URL}/payments/${encodeURIComponent(paymentId)}/status`, {
    headers: { "X-Request-ID": crypto.randomUUID(), Accept: "application/json", Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await readResponse(response);
  if (!response.ok) {
    console.error("TatraPayPlus status request failed:", response.status, data);
    throw new Error("TatraPayPlus status request failed");
  }
  return { data, state: classifyTatraPaymentStatus(data) };
}

function classifyTatraPaymentStatus(data: JsonRecord): TatraPaymentState {
  const paymentStatuses: string[] = [];
  const visit = (value: unknown, key = "") => {
    if (typeof value === "string" && /status$/i.test(key) && key.toLowerCase() !== "authorizationstatus") {
      paymentStatuses.push(value.toUpperCase());
    } else if (value && typeof value === "object") {
      for (const [childKey, childValue] of Object.entries(value as JsonRecord)) visit(childValue, childKey);
    }
  };
  visit(data);

  if (paymentStatuses.some((status) => ["OK", "ACCC", "ACSC"].includes(status))) return "successful";
  if (paymentStatuses.some((status) => ["FAIL", "RJCT", "CANCELLED", "CANCELED", "EXPIRED", "AUTH_EXPIRED", "AUTH_CANCELED"].includes(status))) return "failed";
  return "pending";
}
