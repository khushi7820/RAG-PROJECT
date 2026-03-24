const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://cuhzjwqifseqmvlfizdf.supabase.co',
  'sb_publishable_eCEZS4uZBxnFNoS3Bmbkzw_13KObcpa'
);

async function disableRLS() {
  console.log('Attempting to disable RLS (Note: this requires high privileges)...');
  
  // Note: Most anon/service keys cannot run arbitrary SQL via the client.
  // I should check if there's an API for this or if I need to tell the user.
  
  const { data, error } = await supabase.rpc('disable_rls_all'); // If such an RPC exists
  
  if (error) {
    console.error('RPC Error (Expected if not defined):', error);
    console.log('Please run the following in Supabase SQL Editor:');
    console.log('ALTER TABLE whatsapp_messages DISABLE ROW LEVEL SECURITY;');
  } else {
    console.log('Successfully disabled RLS via RPC.');
  }
}

disableRLS();
