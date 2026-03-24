const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://cuhzjwqifseqmvlfizdf.supabase.co',
  'sb_publishable_eCEZS4uZBxnFNoS3Bmbkzw_13KObcpa'
);

async function getChat() {
  const toNumber = '15558903791';
  
  const { data: config } = await supabase
    .from('phone_document_mapping')
    .select('system_prompt')
    .eq('phone_number', toNumber)
    .single();

  const { data: msgs } = await supabase
    .from('whatsapp_messages')
    .select('content_text, event_type, received_at')
    .or(`from_number.eq.${toNumber},to_number.eq.${toNumber}`)
    .order('received_at', { ascending: false })
    .limit(15);

  const output = {
    system_prompt: config.system_prompt,
    messages: msgs.reverse()
  };

  fs.writeFileSync('chat-dump.json', JSON.stringify(output, null, 2));
}

getChat();
