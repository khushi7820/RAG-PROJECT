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

async function clearMessages() {
  console.log('--- Clearing All WhatsApp Messages ---');
  const { data, error } = await supabase
    .from('whatsapp_messages')
    .delete()
    .not('id', 'is', null); // Delete all rows where id exists

  if (error) {
    console.error('Error clearing messages:', error);
  } else {
    console.log('Successfully cleared all messages.');
  }
}

clearMessages();
