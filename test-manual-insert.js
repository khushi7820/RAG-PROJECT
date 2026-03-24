const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://cuhzjwqifseqmvlfizdf.supabase.co',
  'sb_publishable_eCEZS4uZBxnFNoS3Bmbkzw_13KObcpa'
);

async function testInsert() {
  const payload = {
    message_id: 'manual-test-' + Date.now(),
    channel: 'whatsapp',
    from_number: '9112345678',
    to_number: '15558903791',
    received_at: new Date().toISOString(),
    content_type: 'text',
    content_text: 'Manual test message',
    event_type: 'MoMessage'
  };

  console.log('Attempting manual insert...');
  const { data, error } = await supabase
    .from('whatsapp_messages')
    .insert([payload])
    .select();

  if (error) {
    console.error('❌ Insert Error:', error);
  } else {
    console.log('✅ Insert Successful:', data);
  }
}

testInsert();
