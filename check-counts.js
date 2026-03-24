const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://cuhzjwqifseqmvlfizdf.supabase.co',
  'sb_publishable_eCEZS4uZBxnFNoS3Bmbkzw_13KObcpa'
);

async function checkCounts() {
  const { count: msgCount, error: msgErr } = await supabase
    .from('whatsapp_messages')
    .select('*', { count: 'exact', head: true });

  const { count: configCount, error: configErr } = await supabase
    .from('phone_document_mapping')
    .select('*', { count: 'exact', head: true });

  const { data: configs } = await supabase
    .from('phone_document_mapping')
    .select('phone_number');

  console.log(JSON.stringify({
    msgCount,
    configCount,
    numbers: configs?.map(c => c.phone_number),
    msgErr,
    configErr
  }, null, 2));
}

checkCounts();
