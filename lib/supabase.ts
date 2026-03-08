import { createClient } from "@supabase/supabase-js";

// General / Pizza Project
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const supabase = createClient(supabaseUrl, supabaseKey);

// Taxi Project (potrebujeme NEXT_PUBLIC_ predponu pre client-side)
const taxiUrl = process.env.NEXT_PUBLIC_TAXI_SUPABASE_URL || "https://tutzmgzznuiceqrcxxhw.supabase.co";
const taxiKey = process.env.NEXT_PUBLIC_TAXI_SUPABASE_ANON_KEY || "";
export const taxiSupabase = createClient(taxiUrl, taxiKey);
