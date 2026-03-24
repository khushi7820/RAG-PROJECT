const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...rest] = line.split('=');
    if (key && rest.length > 0) env[key.trim()] = rest.join('=').trim().replace(/['"]/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function updateConfig() {
    // ⚠️ PASTE YOUR AUTH TOKEN HERE (from the 3rd screenshot)
    const AUTH_TOKEN = "U2FsdGVkX1/HqmPNoMv87Y/fJHln6aarnlp6dt9NUZwIlWsUthr6qAyequJP6JQ/5OvlmspZAHljts4oCmGJynb52Sqt46m4M/rrIRwyP4IDwH3YqxlzemsjSfG2Xu+bZ4O6ajPX2GBl0mmBpxLv2OAUATgf0sk8RNp7ullBwEGw7ALWS2oIiBYw58L7DCOa";
    
    // Origin is fixed based on your screenshot
    const ORIGIN_WEBSITE = "https://prateektosniwal.com/";

    console.log("Updating config for 15558903791...");
    
    const { data, error } = await supabase
        .from('phone_document_mapping')
        .update({ 
            origin: ORIGIN_WEBSITE,
            auth_token: AUTH_TOKEN 
        })
        .eq('phone_number', '15558903791');

    if (error) {
        console.error("❌ Error updating config:", error);
    } else {
        console.log("✅ Successfully updated! Vercel should now be able to reply.");
    }
}

updateConfig();
