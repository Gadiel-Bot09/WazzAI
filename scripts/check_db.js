const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

// Extract project ref from URL: https://<ref>.supabase.co
const projectRef = url.replace('https://', '').split('.')[0];
console.log('Project ref:', projectRef);

// Use Supabase Management API to run SQL
// POST https://api.supabase.com/v1/projects/{ref}/database/query
// Note: This requires a personal access token, not the service role key.
// Alternative: use the db connection string approach.
// Best alternative: use the Supabase REST API with a custom RPC function,
// but since there's none, let's just use insert with the admin client
// to do the equivalent via the PostgREST API.

// Actually the simplest approach: use the pg connection string via POSTGRES_URL
const pgUrl = env.match(/POSTGRES_URL=(.*)/);
const directUrl = env.match(/DIRECT_URL=(.*)/);
console.log('POSTGRES_URL:', pgUrl ? pgUrl[1].trim().substring(0,50) + '...' : 'NOT FOUND');
console.log('DIRECT_URL:', directUrl ? directUrl[1].trim().substring(0,50) + '...' : 'NOT FOUND');
