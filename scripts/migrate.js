const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const stmts = [
  "CREATE TABLE IF NOT EXISTS satisfaction_surveys (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE, contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE, score INTEGER CHECK (score BETWEEN 1 AND 5), comment TEXT, sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), responded_at TIMESTAMPTZ, status TEXT NOT NULL DEFAULT 'sent', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())",
  "CREATE TABLE IF NOT EXISTS canned_messages (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, created_by UUID REFERENCES users(id) ON DELETE SET NULL, title TEXT NOT NULL, shortcut TEXT, content TEXT NOT NULL, is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())",
  "CREATE TABLE IF NOT EXISTS reminders (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE, created_by UUID REFERENCES users(id) ON DELETE SET NULL, message TEXT NOT NULL, remind_at TIMESTAMPTZ NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())"
];

async function run() {
  for (const sql of stmts) {
    const resp = await fetch(url + '/rest/v1/rpc/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': key, 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({ sql })
    });
    const text = await resp.text();
    console.log(resp.status, sql.substring(0, 50), '->', text.substring(0, 150));
  }
}

run();
