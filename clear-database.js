const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length === 2) {
    env[parts[0].trim()] = parts[1].trim();
  }
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function clearDatabase() {
  console.log('🚮 Clearing RAG data from database...');

  // 1. Delete all chunks
  const { error: chunkError } = await supabase
    .from('rag_chunks')
    .delete()
    .neq('pdf_name', 'DO_NOT_DELETE_ANYTHING_SO_NEQ_ALWAYS_MATCHES_EVERYTHING');
  
  if (chunkError) console.error('Error clearing rag_chunks:', chunkError);
  else console.log('✅ Cleared all chunks from rag_chunks.');

  // 2. Delete all files
  const { error: fileError } = await supabase
    .from('rag_files')
    .delete()
    .neq('name', 'DO_NOT_DELETE_ANYTHING_SO_NEQ_ALWAYS_MATCHES_EVERYTHING');
    
  if (fileError) console.error('Error clearing rag_files:', fileError);
  else console.log('✅ Cleared all files from rag_files.');

  // 3. Reset file_id in phone_document_mapping
  const { error: mappingError } = await supabase
    .from('phone_document_mapping')
    .update({ file_id: null })
    .not('phone_number', 'is', null);

  if (mappingError) console.error('Error resetting mapping file_id:', mappingError);
  else console.log('✅ Reset all file_id mappings in phone_document_mapping.');

  console.log('🎉 Database is now clean! No old data will interfere.');
}

clearDatabase();
