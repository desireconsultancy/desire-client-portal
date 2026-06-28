import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. " +
    "Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file."
  );
}

// Global object to hold dynamic headers
export const supabaseHeaders: Record<string, string | null> = {
  "x-firebase-auth": null,
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: (url, options = {}) => {
      const headers = new Headers(options.headers || {});
      
      // Dynamically inject x-firebase-auth if present
      if (supabaseHeaders["x-firebase-auth"]) {
        headers.set("x-firebase-auth", supabaseHeaders["x-firebase-auth"]);
      }
      
      return fetch(url, {
        ...options,
        headers,
      });
    },
  },
});
