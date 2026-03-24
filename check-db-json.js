const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://cuhzjwqifseqmvlfizdf.supabase.co',
  'sb_publishable_eCEZS4uZBxnFNoS3Bmbkzw_13KObcpa'
);

async function checkMessages() {
  const result = {};

  const { data: moMsgs, error: moErr } = await supabase
    .from('whatsapp_messages')
    .select('from_number, to_number, content_text, received_at, event_type')
    .order('received_at', { ascending: false })
    .limit(10);

  if (moErr) result.moMessagesError = moErr;
  else result.moMessages = moMsgs;

  const { data: configs, error: configErr } = await supabase
    .from('phone_document_mapping')
    .select('phone_number, auth_token, origin, system_prompt')
    .limit(10);

  if (configErr) result.configsError = configErr;
  else result.configs = configs;

  console.log(JSON.stringify(result, null, 2));
}

checkMessages();
