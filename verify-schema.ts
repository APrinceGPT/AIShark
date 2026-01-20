/**
 * Verify Database Schema
 */

import { config } from 'dotenv';
config({ path: '.env' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function verifySchema() {
  console.log('🔍 Verifying database schema...\n');

  const tables = [
    'analysis_sessions',
    'ai_insights',
    'packet_annotations',
    'shared_reports',
    'session_statistics'
  ];

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`❌ ${table}: ${error.message}`);
    } else {
      console.log(`✅ ${table}: ${count || 0} rows`);
    }
  }

  console.log('\n🔍 Checking storage buckets...');
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  
  if (bucketError) {
    console.log('⚠️  Storage check failed:', bucketError.message);
  } else {
    console.log('Storage buckets:', buckets?.map(b => b.name).join(', ') || 'none');
    if (!buckets?.find(b => b.name === 'pcap-files')) {
      console.log('\n⚠️  Note: "pcap-files" bucket not found');
      console.log('Create it in Supabase dashboard > Storage > New bucket');
      console.log('Settings: Private, Max file size: 100MB');
    }
  }
}

verifySchema().catch(console.error);
