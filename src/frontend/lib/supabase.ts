import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Mock client implementation for when environment variables are not configured
const createMockClient = () => {
  const mockFrom = (table: string) => ({
    select: () => ({
      from: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: null, error: null })
        }),
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null })
        }),
        order: () => ({
          execute: () => Promise.resolve({ data: [], error: null })
        })
      }),
      eq: () => ({
        single: () => Promise.resolve({ data: null, error: null })
      })
    }),
    insert: () => ({
      select: () => ({
        single: () => Promise.resolve({ data: null, error: null })
      }),
      single: () => Promise.resolve({ data: null, error: null })
    })
  });

  return {

    from: (table: string) => mockFrom(table),
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null })
    }
  };
};

let supabaseClient: any;

const initSupabase = () => {
  if (typeof window !== 'undefined') {
    // For client-side, use the real client
    if (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')) {
      supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    } else {
      // Use mock client for development when env vars not configured
      supabaseClient = createMockClient();
    }
  } else {
    // For server-side during build, use mock client
    supabaseClient = createMockClient();
  }
  return supabaseClient;
};

// Initialize the supabase client
supabaseClient = initSupabase();

export const supabase = supabaseClient;
