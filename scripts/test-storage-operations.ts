/**
 * Storage Operations Test
 * Tests actual upload, download, and delete operations on pcap-files bucket
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { randomBytes } from 'crypto';

// Load environment variables
config();

async function testStorageOperations() {
  console.log('🧪 Testing Supabase Storage Operations...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ ERROR: Environment variables not set');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log('✅ Supabase client initialized\n');

  // Generate test file content
  const testFileName = `test-${Date.now()}.txt`;
  const testUserId = 'test-user-123'; // In real app, this would be auth.uid()
  const testFilePath = `${testUserId}/${testFileName}`;
  const testContent = `AIShark Storage Test\nTimestamp: ${new Date().toISOString()}\nRandom: ${randomBytes(16).toString('hex')}`;
  const testBlob = new Blob([testContent], { type: 'text/plain' });

  console.log('📝 Test File Details:');
  console.log(`   Path: ${testFilePath}`);
  console.log(`   Size: ${testContent.length} bytes`);
  console.log(`   Content preview: ${testContent.substring(0, 50)}...\n`);

  try {
    // Test 1: Upload file
    console.log('1️⃣  Testing UPLOAD...');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('pcap-files')
      .upload(testFilePath, testBlob, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('❌ UPLOAD FAILED');
      console.error('   Error:', uploadError.message);
      console.error('   Code:', uploadError.name);
      
      if (uploadError.message.includes('not found')) {
        console.log('\n💡 Bucket "pcap-files" not found. Please verify:');
        console.log('   1. Bucket exists in Supabase dashboard');
        console.log('   2. Bucket name is exactly "pcap-files"');
      } else if (uploadError.message.includes('policies')) {
        console.log('\n💡 Policy issue detected. Please verify:');
        console.log('   1. INSERT policy exists');
        console.log('   2. Policy allows anon key access (for testing)');
        console.log('   3. Or sign in with a real user first');
      }
      
      process.exit(1);
    }

    console.log('✅ UPLOAD successful');
    console.log(`   Path: ${uploadData.path}`);
    console.log(`   Full path: ${uploadData.fullPath || 'N/A'}\n`);

    // Test 2: Download file
    console.log('2️⃣  Testing DOWNLOAD...');
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from('pcap-files')
      .download(testFilePath);

    if (downloadError) {
      console.error('❌ DOWNLOAD FAILED');
      console.error('   Error:', downloadError.message);
      process.exit(1);
    }

    // Verify content
    const downloadedText = await downloadData.text();
    if (downloadedText !== testContent) {
      console.error('❌ CONTENT MISMATCH');
      console.error('   Expected:', testContent.substring(0, 50));
      console.error('   Got:', downloadedText.substring(0, 50));
      process.exit(1);
    }

    console.log('✅ DOWNLOAD successful');
    console.log(`   Size: ${downloadData.size} bytes`);
    console.log(`   Content verified: Match ✅\n`);

    // Test 3: List files
    console.log('3️⃣  Testing LIST...');
    const { data: listData, error: listError } = await supabase.storage
      .from('pcap-files')
      .list(testUserId, { limit: 10 });

    if (listError) {
      console.error('⚠️  LIST FAILED (non-critical)');
      console.error('   Error:', listError.message);
    } else {
      console.log('✅ LIST successful');
      console.log(`   Files found: ${listData?.length || 0}`);
      if (listData && listData.length > 0) {
        listData.forEach(file => {
          console.log(`   - ${file.name} (${file.metadata?.size || 0} bytes)`);
        });
      }
    }
    console.log();

    // Test 4: Get public URL (will fail for private bucket, that's OK)
    console.log('4️⃣  Testing PUBLIC URL...');
    const { data: urlData } = supabase.storage
      .from('pcap-files')
      .getPublicUrl(testFilePath);

    console.log('✅ URL generation successful');
    console.log(`   URL: ${urlData.publicUrl.substring(0, 60)}...`);
    console.log(`   Note: Will return 401 for private bucket (expected)\n`);

    // Test 5: Delete file
    console.log('5️⃣  Testing DELETE...');
    const { error: deleteError } = await supabase.storage
      .from('pcap-files')
      .remove([testFilePath]);

    if (deleteError) {
      console.error('❌ DELETE FAILED');
      console.error('   Error:', deleteError.message);
      console.log('\n⚠️  Test file may remain in bucket. Please delete manually:');
      console.log(`   Path: ${testFilePath}`);
      process.exit(1);
    }

    console.log('✅ DELETE successful');
    console.log('   Test file cleaned up\n');

    // Success!
    console.log('='.repeat(60));
    console.log('✅ ALL STORAGE OPERATIONS PASSED!');
    console.log('='.repeat(60));
    console.log('\n✅ Bucket Access: VERIFIED');
    console.log('✅ Upload: WORKING');
    console.log('✅ Download: WORKING');
    console.log('✅ Delete: WORKING');
    console.log('\n🎉 Storage bucket is fully operational!');
    console.log('🚀 Ready to proceed with Phase 1 implementation!\n');

  } catch (error) {
    console.error('\n❌ UNEXPECTED ERROR:', error);
    console.error('\nStack trace:', error instanceof Error ? error.stack : 'N/A');
    process.exit(1);
  }
}

// Run test
testStorageOperations();
