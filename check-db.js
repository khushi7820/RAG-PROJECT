const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://cuhzjwqifseqmvlfizdf.supabase.co',
  'sb_publishable_eCEZS4uZBxnFNoS3Bmbkzw_13KObcpa'
);

async function checkMessages() {
  console.log('--- MO Messages (User messages) ---');
  const { data: moMsgs, error: moErr } = await supabase
    .from('whatsapp_messages')
    .select('from_number, to_number, content_text, received_at, event_type')
    .order('received_at', { ascending: false })
    .limit(5);

  if (moErr) console.error(moErr);
  else console.table(moMsgs);

  console.log('\n--- Phone Configuration ---');
  const { data: configs, error: configErr } = await supabase
    .from('phone_document_mapping')
    .select('phone_number, auth_token, origin, system_prompt')
    .limit(5);

  if (configErr) console.error(configErr);
  else console.table(configs);
}

checkMessages();
