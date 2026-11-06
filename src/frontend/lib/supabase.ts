// Mock Supabase client when env vars not configured
// Prevents build errors during static generation

const mockFrom = (table: string) => ({
  select: () => mockFrom(table),
  insert: (data: any) => ({
    select: () => ({
      single: () => Promise.resolve({ data: { id: "mock-id" }, error: null })
    }),
    single: () => Promise.resolve({ data: { id: "mock-id" }, error: null })
  }),
  eq: (field: string, value: any) => ({
    single: () => Promise.resolve({ data: value ? { id: "mock-id", table_number: value } : null, error: value ? null : { message: "Not found" } })
  }),
  order: (field: string) => ({
    execute: () => Promise.resolve({ data: [], error: null })
  })
});

const mockClient = {
  from: (table: string) => mockFrom(table),
  auth: {
    getUser: () => Promise.resolve({ data: { user: null }, error: null })
  }
};

let supabase: any = null;

function getSupabase() {
  if (supabase) return supabase;
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (url && key && url.startsWith("http")) {
    const { createClient } = require("@supabase/supabase-js");
    supabase = createClient(url, key);
  } else {
    supabase = mockClient;
  }
  return supabase;
}

export { getSupabase };
export default getSupabase;
