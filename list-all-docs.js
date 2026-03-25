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

async function listAllDocs() {
  console.log('--- Listing All Documents (rag_files) ---');
  const { data: docs, error } = await supabase
    .from('rag_files')
    .select('id, name, created_at');

  if (docs) console.table(docs);

  console.log('\n--- Searching for Gujarati in ALL rag_chunks ---');
  
  let hasGujarati = false;
  let page = 0;
  const pageSize = 500;
  
  while (true) {
    const { data: chunks, error: chunkErr } = await supabase
      .from('rag_chunks')
      .select('chunk, file_id')
      .range(page * pageSize, (page + 1) * pageSize - 1);
      
    if (chunkErr || !chunks || chunks.length === 0) break;
    
    const gujaratiChunks = chunks.filter(c => /[\u0a80-\u0aff]/.test(c.chunk));
    if (gujaratiChunks.length > 0) {
      hasGujarati = true;
      console.log(`Found ${gujaratiChunks.length} Gujarati chunks on page ${page + 1}.`);
      gujaratiChunks.forEach(c => {
        console.log(`[File: ${c.file_id}] ${c.chunk.substring(0, 100).replace(/\n/g, ' ')}...`);
      });
    }
    
    if (chunks.length < pageSize) break;
    page++;
  }
  
  if (!hasGujarati) {
    console.log('No Gujarati script found in the entire database.');
  }
}

listAllDocs();
