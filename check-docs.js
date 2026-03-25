const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cuhzjwqifseqmvlfizdf.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkDocs() {
  console.log('--- Documents ---');
  const { data: docs, error: docErr } = await supabase
    .from('documents')
    .select('id, name, type, created_at')
    .limit(10);

  if (docErr) console.error(docErr);
  else console.table(docs);

  console.log('\n--- Content Snippets ---');
  const { data: sections, error: secErr } = await supabase
    .from('document_sections')
    .select('id, content, file_id')
    .limit(10);

  if (secErr) console.error(secErr);
  else {
    sections.forEach(s => {
      console.log(`[File: ${s.file_id}] ${s.content.substring(0, 100)}...`);
    });
  }
}

checkDocs();
