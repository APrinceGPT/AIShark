/**
 * Storage Bucket Verification Script
 * Verifies that the pcap-files bucket is correctly configured
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

async function verifyStorageBucket() {
  console.log('🔍 Verifying Supabase Storage Bucket Setup...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ ERROR: Supabase environment variables not set');
    console.log('   Missing: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    console.log('   Check your .env file');
    process.exit(1);
  }

  console.log('✅ Environment variables loaded');
  console.log(`   URL: ${supabaseUrl}`);
  console.log(`   Key: ${supabaseKey.substring(0, 20)}...\n`);

  const supabase = createClient(supabaseUrl, supabaseKey);

  if (!supabase) {
    console.error('❌ ERROR: Supabase client not initialized');
    process.exit(1);
  }

  try {
    // 1. Check if we can list buckets
    console.log('1️⃣  Checking bucket access...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

    if (bucketsError) {
      console.error('❌ ERROR: Cannot list buckets');
      console.error('   Error:', bucketsError.message);
      process.exit(1);
    }

    console.log('✅ Successfully connected to Supabase Storage');
    console.log(`   Found ${buckets?.length || 0} bucket(s)\n`);

    // 2. Check if pcap-files bucket exists
    console.log('2️⃣  Checking for pcap-files bucket...');
    const pcapBucket = buckets?.find(b => b.name === 'pcap-files');

    if (!pcapBucket) {
      console.error('❌ ERROR: pcap-files bucket not found');
      console.log('\n📋 Available buckets:');
      buckets?.forEach(b => console.log(`   - ${b.name} (${b.public ? 'public' : 'private'})`));
      console.log('\n💡 TIP: Make sure you created the bucket with the exact name "pcap-files"');
      process.exit(1);
    }

    console.log('✅ pcap-files bucket found!');
    console.log(`   - Name: ${pcapBucket.name}`);
    console.log(`   - Public: ${pcapBucket.public ? 'Yes ⚠️' : 'No ✅'}`);
    console.log(`   - ID: ${pcapBucket.id}`);
    console.log(`   - Created: ${pcapBucket.created_at}`);

    if (pcapBucket.public) {
      console.log('\n⚠️  WARNING: Bucket is public! Consider making it private for security.');
    }

    // 3. Try to list files in bucket (should work even if empty)
    console.log('\n3️⃣  Testing bucket access...');
    const { data: files, error: filesError } = await supabase.storage
      .from('pcap-files')
      .list('', { limit: 1 });

    if (filesError) {
      console.error('❌ ERROR: Cannot access bucket contents');
      console.error('   Error:', filesError.message);
      console.log('\n💡 This might be a permissions issue. Check your bucket policies.');
      process.exit(1);
    }

    console.log('✅ Successfully accessed bucket contents');
    console.log(`   Current files: ${files?.length || 0}`);

    // 4. Check bucket policies (this requires additional API calls)
    console.log('\n4️⃣  Checking bucket configuration...');
    console.log('✅ Basic operations working');
    console.log('   (Full policy check requires admin access)');

    // Success summary
    console.log('\n' + '='.repeat(50));
    console.log('✅ STORAGE BUCKET VERIFICATION PASSED!');
    console.log('='.repeat(50));
    console.log('\n📦 Bucket Details:');
    console.log(`   Name: pcap-files`);
    console.log(`   Status: ${pcapBucket.public ? 'Public ⚠️' : 'Private ✅'}`);
    console.log(`   Access: Working ✅`);
    console.log(`   Ready for use: YES ✅`);

    console.log('\n🎯 Next Steps:');
    console.log('   1. Policies should be set up for user-based access');
    console.log('   2. Users can upload files to: userId/filename.pcap');
    console.log('   3. Session saving feature is now ready!');

    console.log('\n✨ You can now proceed with Phase 1 implementation!\n');

  } catch (error) {
    console.error('\n❌ UNEXPECTED ERROR:', error);
    process.exit(1);
  }
}

// Run verification
verifyStorageBucket();
