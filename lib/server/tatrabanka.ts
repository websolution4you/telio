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

function sanitizeIpAddress(ip?: string | null): string {
  const fallback = "87.197.100.1";
  if (!ip) return fallback;
  const trimmed = ip.trim();
  const parts = trimmed.split(".");
  if (parts.length !== 4) return fallback;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => isNaN(n) || n < 0 || n > 255)) return fallback;
  // Exclude loopback (127.x.x.x) or zero
  if (nums[0] === 127 || nums[0] === 0) return fallback;
  // Exclude private ranges: 10.x.x.x, 192.168.x.x, 172.16-31.x.x
  if (nums[0] === 10) return fallback;
  if (nums[0] === 192 && nums[1] === 168) return fallback;
  if (nums[0] === 172 && nums[1] >= 16 && nums[1] <= 31) return fallback;
  return trimmed;
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
      "IP-Address": sanitizeIpAddress(input.ipAddress),
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

export function extractTatraPaymentAmount(data: JsonRecord): { amount: number; currency: string } | null {
  let foundAmount: number | null = null;
  let foundCurrency = "EUR";

  const visit = (value: unknown) => {
    if (value && typeof value === "object") {
      const obj = value as Record<string, unknown>;
      if ("amount" in obj && (typeof obj.amount === "string" || typeof obj.amount === "number")) {
        const num = Number(obj.amount);
        if (!isNaN(num)) {
          foundAmount = num;
          if (typeof obj.currency === "string") foundCurrency = obj.currency;
        }
      }
      for (const v of Object.values(obj)) {
        visit(v);
      }
    }
  };
  visit(data);

  return foundAmount !== null ? { amount: foundAmount, currency: foundCurrency } : null;
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
  const paymentAmount = extractTatraPaymentAmount(data);
  return {
    data,
    state: classifyTatraPaymentStatus(data),
    amount: paymentAmount?.amount ?? null,
    currency: paymentAmount?.currency ?? null,
  };
}

function classifyTatraPaymentStatus(data: JsonRecord): TatraPaymentState {
  const paymentStatuses: string[] = [];
  const visit = (value: unknown, key = "") => {
    if (
      typeof value === "string" &&
      (/status$/i.test(key) ||
        key.toLowerCase() === "status" ||
        key.toLowerCase() === "state" ||
        key.toLowerCase() === "cardpaystatus" ||
        key.toLowerCase() === "banktransferstatus" ||
        key.toLowerCase() === "authorizationstatus")
    ) {
      paymentStatuses.push(value.toUpperCase());
    } else if (value && typeof value === "object") {
      for (const [childKey, childValue] of Object.entries(value as JsonRecord)) visit(childValue, childKey);
    }
  };
  visit(data);

  if (
    paymentStatuses.some((status) =>
      [
        "OK",
        "ACCC",
        "ACSC",
        "ACCP",
        "AUTHORIZED",
        "AUTHORIZATION_APPROVED",
        "SUCCESSFUL",
        "PAID",
      ].includes(status)
    )
  ) {
    return "successful";
  }

  if (
    paymentStatuses.some((status) =>
      [
        "FAIL",
        "FAILED",
        "RJCT",
        "CANC",
        "CANCELLED",
        "CANCELED",
        "EXPIRED",
        "AUTH_EXPIRED",
        "AUTH_CANCELED",
        "NOT_AUTHORIZED",
        "AUTHORIZATION_DECLINED",
        "SPA",
        "XPA",
        "RV",
        "CB",
      ].includes(status)
    )
  ) {
    return "failed";
  }

  return "pending";
}
