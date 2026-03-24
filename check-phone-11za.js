const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    console.log('🔍 Checking phone_document_mapping for 15558903791...\n');

    const { data, error } = await supabase
        .from('phone_document_mapping')
        .select('*')
        .eq('phone_number', '15558903791');

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('❌ NO RECORD FOUND for 15558903791');
        console.log('\n📱 All phone numbers in database:');
        const { data: allPhones } = await supabase.from('phone_document_mapping').select('phone_number, file_id');
        allPhones.forEach(p => {
            console.log(`   - ${p.phone_number} (file_id: ${p.file_id})`);
        });
        return;
    }

    data.forEach(row => {
        console.log('✅ Found record:');
        console.log(`   Phone: ${row.phone_number}`);
        console.log(`   File ID: ${row.file_id}`);
        console.log(`   Auth Token: ${row.auth_token ? '✅ SET' : '❌ MISSING'}`);
        console.log(`   Origin: ${row.origin || '❌ MISSING'}`);
        console.log(`   System Prompt: ${row.system_prompt ? '✅ SET' : '❌ MISSING'}`);
    });
}

check();
