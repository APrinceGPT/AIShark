/**
 * Test Supabase Connection
 * Run: npm run test:db
 */

// Load environment variables FIRST before any imports
import { config } from 'dotenv';
config({ path: '.env' });

// Now import after env vars are loaded
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function main() {
  console.log('🔍 Testing Supabase connection...\n');
  console.log('URL:', supabaseUrl);
  console.log('Key:', supabaseAnonKey?.slice(0, 20) + '...\n');

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing environment variables!');
    console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
    console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓' : '✗');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // Test basic connection by trying to query a system table
    const { data, error } = await supabase
      .from('analysis_sessions')
      .select('*', { count: 'exact', head: true })
      .limit(1);

    if (error && error.code === '42P01') {
      console.log('✅ Connection successful! (Tables not yet created)');
      console.log('\n📋 Next steps:');
      console.log('1. Go to your Supabase dashboard: https://hzndmvaqyvyyjdvdkktu.supabase.co');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Copy and run the SQL from: supabase-schema.sql');
      console.log('4. Run this test again to verify');
    } else if (error) {
      console.error('❌ Connection error:', error.message);
      console.error('Error code:', error.code);
      process.exit(1);
    } else {
      console.log('✅ Connection successful!');
      console.log('✅ Database tables exist!');
      console.log('📊 Existing sessions count:', data?.length || 0);
    }
    
    // Test auth
    console.log('\n🔍 Testing authentication...');
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      console.log('✅ User authenticated:', session.user.email);
    } else {
      console.log('ℹ️  No active session (expected for new setup)');
    }

    console.log('\n✅ All connection tests completed!');
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
}

main().catch(console.error);
