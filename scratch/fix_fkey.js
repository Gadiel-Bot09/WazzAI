const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local','utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

async function execSQL(sql) {
  const resp = await fetch(url + '/rest/v1/rpc/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': key, 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ sql })
  });
  const text = await resp.text();
  return { status: resp.status, body: text };
}

async function run() {
  // First, find the constraint name
  const getFkSql = `
    SELECT
      tc.constraint_name
    FROM
      information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name = 'team_members'
      AND kcu.column_name = 'user_id';
  `;
  const res = await execSQL(getFkSql);
  console.log("FK Query:", res.body);

  const sql = `
    ALTER TABLE public.team_members
    DROP CONSTRAINT IF EXISTS team_members_user_id_fkey;
    
    ALTER TABLE public.team_members
    ADD CONSTRAINT team_members_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  `;
  const r = await execSQL(sql);
  console.log('Status:', r.status, '|', r.body);
}

run();
