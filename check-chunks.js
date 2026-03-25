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

async function checkChunks() {
  const phoneNumber = '15558903791';
  console.log(`--- Checking Chunks for ${phoneNumber} ---`);
  
  const { data: mapping, error: mError } = await supabase
    .from('phone_document_mapping')
    .select('file_id')
    .eq('phone_number', phoneNumber)
    .maybeSingle();

  if (mError || !mapping) {
    console.error('Mapping error or not found:', mError);
    return;
  }

  console.log('File ID:', mapping.file_id);

  const { data: chunks, error: cError } = await supabase
    .from('rag_chunks')
    .select('chunk, pdf_name')
    .eq('file_id', mapping.file_id)
    .limit(20);

  if (cError) {
    console.error('Chunks error:', cError);
  } else {
    console.log(`Found ${chunks.length} chunks.`);
    chunks.forEach((c, i) => {
      console.log(`\n[Chunk ${i+1}]`);
      console.log(c.chunk.substring(0, 200) + '...');
    });
  }
}

checkChunks();
