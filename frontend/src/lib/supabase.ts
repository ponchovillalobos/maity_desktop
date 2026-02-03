import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Use 'any' for the schema type to allow both placeholder and real clients
let supabaseInstance: SupabaseClient<any, any, any> | null = null

// Check if we're in a browser environment (not during SSG/SSR build)
const isBrowser = typeof window !== 'undefined'

function getSupabaseClient(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // During build time (SSG), env vars may not be available
  // Only throw in browser where the client is actually needed
  if (!supabaseUrl || !supabaseAnonKey) {
    if (isBrowser) {
      console.error(
        'Supabase environment variables are not configured. ' +
        'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
      )
    }
    // Return a stub client that will fail gracefully
    // This allows the build to complete; runtime errors will surface in the browser
    supabaseInstance = createClient(
      'https://placeholder.supabase.co',
      'placeholder-key',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )
    return supabaseInstance
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false, // Desktop app — no URL-based session detection
    },
    db: { schema: 'maity' },
  })

  return supabaseInstance
}

// Lazy-initialized getter to avoid build-time errors when env vars are missing
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient()
    const value = (client as unknown as Record<string | symbol, unknown>)[prop]
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  },
})
