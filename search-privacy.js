const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function searchPrivacy() {
  console.log('--- Searching for Privacy Policy Chunks ---');
  const { data: chunks, error } = await supabase
    .from('rag_chunks')
    .select('id, chunk, file_id')
    .ilike('chunk', '%privacy policy%')
    .limit(5);

  if (error) {
    console.error('Error searching chunks:', error);
  } else if (chunks.length === 0) {
    console.log('No chunks found containing "privacy policy".');
  } else {
    chunks.forEach(c => {
      console.log(`[ID: ${c.id}, File: ${c.file_id}]`);
      console.log(c.chunk.substring(0, 500));
      console.log('---');
    });
  }
}

searchPrivacy();
