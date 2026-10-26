// Gedeeld door de hub en de privéprojecten. Laad eerst supabase-js.
// shortcut: alleen client-side; de bestanden blijven via de (publieke) GitHub-repo en hun URL bereikbaar. Echt afschermen = hosting met server-side auth.
const sb = supabase.createClient(
  "https://rdlkdglzfjniwamumucb.supabase.co",
  "sb_publishable_AT7MYeDMdYFer6a8HL6LQA_P5_Itx3S"
);

// app_metadata kan een gebruiker niet zelf aanpassen; toegang zet je in Supabase (zie PRODUCT.md).
const magPrive = user => user?.app_metadata?.prive === true;
