const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://cuhzjwqifseqmvlfizdf.supabase.co',
  'sb_publishable_eCEZS4uZBxnFNoS3Bmbkzw_13KObcpa'
);

async function checkNumbersDetailed() {
  const { data: configs, error } = await supabase
    .from('phone_document_mapping')
    .select('phone_number');

  if (error) {
    console.error(error);
    return;
  }

  console.log('Phone Numbers in DB:');
  configs.forEach((c, i) => {
    const s = c.phone_number;
    let charCodes = '';
    for (let j = 0; j < s.length; j++) {
      charCodes += s.charCodeAt(j) + ',';
    }
    console.log(`${i}: "${s}" (Length: ${s.length}, Codes: ${charCodes})`);
  });
}

checkNumbersDetailed();
