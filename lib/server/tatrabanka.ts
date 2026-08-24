const DEFAULT_API_BASE_URL = "https://api.tatrabanka.sk/tatrapayplus/sandbox/v1";
const DEFAULT_TOKEN_URL = "https://api.tatrabanka.sk/tatrapayplus/sandbox/auth/oauth/v2/token";

export type TatraPaymentState = "successful" | "pending" | "failed";
export type TatraPaymentMethod = "BANK_TRANSFER" | "CARD_PAY";

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

function sanitizeName(value: string, fallback: string) {
  const sanitized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^ 0-9a-zA-Z]/g, "")
    .trim()
    .slice(0, 30);
  return sanitized || fallback;
}

async function getAccessToken() {
  const clientId = requireConfig("TATRABANKA_CLIENT_ID");
  const clientSecret = requireConfig("TATRABANKA_SHARED_SECRET");
  const credentials = Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64");
  const response = await fetch(process.env.TATRABANKA_TOKEN_URL || DEFAULT_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
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
  method?: TatraPaymentMethod;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
}) {
  const token = await getAccessToken();
  const method = input.method || "BANK_TRANSFER";
  if (method === "CARD_PAY" && !input.user) {
    throw new Error("TatraPayPlus CardPay requires user data");
  }
  const response = await fetch(`${process.env.TATRABANKA_API_BASE_URL || DEFAULT_API_BASE_URL}/payments`, {
    method: "POST",
    headers: {
      "X-Request-ID": input.requestId,
      "IP-Address": input.ipAddress,
      "Redirect-URI": input.redirectUri,
      "Automatic-Redirect": "true",
      "Preferred-Method": method,
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
      ...(method === "BANK_TRANSFER" && {
        bankTransfer: { remittanceInformationUnstructured: `Dobitie Telio kreditu ${input.amountEur} EUR` },
      }),
            ...(method === "CARD_PAY" && input.user && {
        userData: {
          firstName: sanitizeName(input.user.firstName, "Zakaznik"),
          lastName: sanitizeName(input.user.lastName, "Telio"),
          email: input.user.email.slice(0, 50),
        },
        cardDetail: {
          cardHolder: `${sanitizeName(input.user.firstName, "Zakaznik")} ${sanitizeName(input.user.lastName, "Telio")}`.slice(0, 45),
        },
      }),
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
  if (paymentStatuses.some((status) => ["FAIL", "RJCT", "CANC", "CANCELLED", "CANCELED", "EXPIRED", "AUTH_EXPIRED", "AUTH_CANCELED", "SPA", "XPA", "RV", "CB"].includes(status))) return "failed";
  return "pending";
}
