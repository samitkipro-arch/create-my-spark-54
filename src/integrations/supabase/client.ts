import { createClient } from "@supabase/supabase-js";

// ✅ Configuration Supabase Finvisor
const SUPABASE_URL = "https://tzehanemtwxfzhthjhbn.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6ZWhhbmVtdHd4ZnpodGhqaGJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyOTA0NTgsImV4cCI6MjA3Njg2NjQ1OH0.4ORKSGvWZwpJZZ9szWQ5I848bQq2EPm8R2tyLUDJyK4";

// 🔗 Création du client Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
