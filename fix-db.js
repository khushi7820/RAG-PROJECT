const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://cuhzjwqifseqmvlfizdf.supabase.co',
  'sb_publishable_eCEZS4uZBxnFNoS3Bmbkzw_13KObcpa'
);

async function fixPhoneNumber() {
  console.log('Searching for corrupted phone numbers...');
  
  const { data: configs, error } = await supabase
    .from('phone_document_mapping')
    .select('id, phone_number');

  if (error) {
    console.error('Error fetching configs:', error);
    return;
  }

  for (const config of configs) {
    const original = config.phone_number;
    const cleaned = original.replace(/\D/g, '');
    
    if (original !== cleaned) {
      console.log(`Fixing number: "${original}" -> "${cleaned}"`);
      const { error: updateError } = await supabase
        .from('phone_document_mapping')
        .update({ phone_number: cleaned })
        .eq('id', config.id);
        
      if (updateError) {
        console.error(`Error updating id ${config.id}:`, updateError);
      } else {
        console.log(`Successfully updated id ${config.id}`);
      }
    }
  }
}

fixPhoneNumber();
