import { createClient } from '@supabase/supabase-js';

// Load from environment variables (Next.js automatically loads .env in dev/build)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase environment variables not set. Database features will be disabled.');
}

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

// Test connection function
export async function testConnection(): Promise<{ success: boolean; message: string }> {
  if (!supabase) {
    return { success: false, message: 'Supabase client not initialized. Check environment variables.' };
  }

  try {
    const { data, error } = await supabase
      .from('_test_connection')
      .select('*')
      .limit(1);

    if (error && error.code === 'PGRST204') {
      // Table doesn't exist yet, but connection works
      return { success: true, message: 'Connection successful! Database is ready for setup.' };
    }

    if (error) {
      return { success: false, message: `Connection error: ${error.message}` };
    }

    return { success: true, message: 'Connection successful!' };
  } catch (err) {
    return { success: false, message: `Failed to connect: ${err}` };
  }
}
