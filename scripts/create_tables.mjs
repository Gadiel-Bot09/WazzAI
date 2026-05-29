const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env.local');
const env = fs.readFileSync(envPath, 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

async function execSQL(sql) {
  const resp = await fetch(url + '/rest/v1/rpc/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': 'Bearer ' + key
    },
    body: JSON.stringify({ sql })
  });
  const text = await resp.text();
  return { status: resp.status, body: text.substring(0, 500) };
}

async function verifyTable(tableName) {
  const resp = await fetch(url + '/rest/v1/' + tableName + '?limit=1', {
    headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
  });
  return resp.status === 200;
}

async function createTables() {
  const stmts = [
    `CREATE TABLE IF NOT EXISTS satisfaction_surveys (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      score INTEGER CHECK (score BETWEEN 1 AND 5),
      comment TEXT,
      sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      responded_at TIMESTAMPTZ,
      status TEXT NOT NULL DEFAULT 'sent',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `ALTER TABLE satisfaction_surveys ENABLE ROW LEVEL SECURITY`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='satisfaction_surveys' AND policyname='org_members_satisfaction_surveys') THEN
      CREATE POLICY org_members_satisfaction_surveys ON satisfaction_surveys FOR ALL USING (
        org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_app_meta_data->>'platform_admin' = 'true')
      );
    END IF; END $$`,
    `CREATE TABLE IF NOT EXISTS canned_messages (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      shortcut TEXT,
      content TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `ALTER TABLE canned_messages ENABLE ROW LEVEL SECURITY`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='canned_messages' AND policyname='org_members_canned_messages') THEN
      CREATE POLICY org_members_canned_messages ON canned_messages FOR ALL USING (
        org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_app_meta_data->>'platform_admin' = 'true')
      );
    END IF; END $$`,
    `CREATE TABLE IF NOT EXISTS reminders (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      message TEXT NOT NULL,
      remind_at TIMESTAMPTZ NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `ALTER TABLE reminders ENABLE ROW LEVEL SECURITY`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='reminders' AND policyname='org_members_reminders') THEN
      CREATE POLICY org_members_reminders ON reminders FOR ALL USING (
        org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_app_meta_data->>'platform_admin' = 'true')
      );
    END IF; END $$`
  ];

  for (const sql of stmts) {
    const r = await execSQL(sql);
    const preview = sql.trim().split('\n')[0].substring(0, 60);
    console.log(`[${r.status}] ${preview}...`);
    if (r.status !== 200 && r.status !== 204) {
      console.log('  Response:', r.body);
    }
  }

  console.log('\nVerifying tables:');
  console.log('satisfaction_surveys:', await verifyTable('satisfaction_surveys'));
  console.log('canned_messages:', await verifyTable('canned_messages'));
  console.log('reminders:', await verifyTable('reminders'));
}

createTables();
