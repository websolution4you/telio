"use server";

import { getSession } from "@/lib/auth/bookingAuth";
import { getCoreServiceDb } from "@/lib/server/supabase";
import { walletEnabledForUser } from "@/lib/server/wallet";

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || "595cbb6c-1019-41ae-b1c2-a60c13c8dcdf";

export async function getWalletAction() {
  const session = await getSession();
  if (!session) return { success: false as const, enabled: false, error: "Not logged in" };

  const enabled = walletEnabledForUser(session.userId);
  if (!enabled) return { success: true as const, enabled: false, balanceEur: null };

  const db = getCoreServiceDb();
  const { data, error } = await db.rpc("wallet_get_balance", {
    p_tenant_id: TENANT_ID,
    p_user_id: session.userId,
  });

  if (error) {
    console.error("getWalletAction failed:", error);
    return { success: false as const, enabled: true, error: "Zostatok sa nepodarilo načítať." };
  }

  return {
    success: true as const,
    enabled: true,
    balanceEur: data?.[0] ? Number(data[0].balance_eur) : 0,
  };
}

export async function addTestWalletCreditAction(amountEur: number, operationId: string) {
  const session = await getSession();
  if (!session) return { success: false as const, error: "Pre dobitie sa musíte prihlásiť." };
  if (!walletEnabledForUser(session.userId)) {
    return { success: false as const, error: "Testovacie dobíjanie nie je pre tento účet povolené." };
  }
  if (![10, 20, 50].includes(amountEur)) {
    return { success: false as const, error: "Nepovolená suma dobitia." };
  }
  if (!operationId || operationId.length > 100) {
    return { success: false as const, error: "Neplatný identifikátor operácie." };
  }

  const db = getCoreServiceDb();
  const { data, error } = await db.rpc("wallet_manual_adjustment", {
    p_tenant_id: TENANT_ID,
    p_user_id: session.userId,
    p_amount_eur: amountEur,
    p_reason: "Pilotné testovacie dobitie kreditu",
    p_idempotency_key: `frontend-pilot-topup:${operationId}`,
    p_metadata: {
      source: "frontend_pilot",
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
    },
  });

  if (error) {
    console.error("addTestWalletCreditAction failed:", error);
    return { success: false as const, error: "Testovací kredit sa nepodarilo pridať." };
  }

  const result = data?.[0];
  if (!result) return { success: false as const, error: "Databáza nevrátila výsledok dobitia." };

  return {
    success: true as const,
    balanceEur: Number(result.balance_eur),
    created: Boolean(result.created),
    amountEur,
  };
}




