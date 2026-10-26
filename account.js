// Eén account voor de hele site: de hub, de apps en de privéprojecten. Laad eerst supabase-js.
const sb = supabase.createClient(
  "https://rdlkdglzfjniwamumucb.supabase.co",
  "sb_publishable_AT7MYeDMdYFer6a8HL6LQA_P5_Itx3S"
);

// shortcut: privé is alleen client-side; de bestanden blijven via de (publieke) GitHub-repo en hun URL bereikbaar. Echt afschermen = hosting met server-side auth.
// app_metadata kan een gebruiker niet zelf aanpassen; toegang zet je in Supabase (zie PRODUCT.md).
// Admins kiezen op de hub wie privétoegang krijgt (zie supabase/admin.sql) en hebben zelf altijd toegang.
const isAdmin = user => user?.app_metadata?.admin === true;
const magPrive = user => user?.app_metadata?.prive === true || isAdmin(user);

// Per account per app een stukje data bewaren (tabel user_data, zie supabase/user_data.sql).
// Zonder login, of als het misgaat, krijg je null terug en werkt de app gewoon lokaal verder.
async function laadAccountData(app) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return null;
  const { data, error } = await sb.from("user_data").select("data").eq("app", app).maybeSingle();
  if (error) { console.warn("Accountdata laden mislukt:", error.message); return null; }
  return data?.data ?? null;
}

async function bewaarAccountData(app, data) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;
  const { error } = await sb.from("user_data")
    .upsert({ user_id: session.user.id, app, data, updated_at: new Date().toISOString() });
  if (error) console.warn("Accountdata opslaan mislukt:", error.message);
}
