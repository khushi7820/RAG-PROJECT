const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConfig() {
    const phoneNumber = '15558689519'; // The bot's number from the logs
    const { data, error } = await supabase
        .from('phone_document_mapping')
        .select('*')
        .eq('phone_number', phoneNumber);

    if (error) {
        console.error('Error fetching config:', error);
        return;
    }

    console.log('--- Phone Configuration ---');
    console.log(JSON.stringify(data, null, 2));
}

checkConfig();

