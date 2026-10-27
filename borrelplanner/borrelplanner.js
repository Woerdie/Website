const SUPABASE_URL = "https://rdlkdglzfjniwamumucb.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_AT7MYeDMdYFer6a8HL6LQA_P5_Itx3S";

// Borrels en beschikbaarheid zijn anoniem; het account (account.js) onthoudt je naam, sleutel en borrels.
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, storageKey: "borrelplanner-anoniem" } });

const $ = id => document.getElementById(id);

const MAANDEN = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december"
];
const DOW = ["ma", "di", "wo", "do", "vr", "za", "zo"];
const PER_PAGINA = 5;

const borrelId = new URLSearchParams(location.search).get("b");
let borrel = null;

const gekozen = new Set();
let ruweData = [];
let alleResultaten = [];
let pagina = 0;
let maxAantal = 0;
let viewYear;
let viewMonth;
let eigenGeladen = false;

const verbPersonen = new Set();
const verbDagen = new Set();

(function initMonth() {
  const nu = new Date();
  viewYear = nu.getFullYear();
  viewMonth = nu.getMonth();
})();

/* Jouw sleutel: een geheim in deze browser (en in je account als je bent ingelogd).
   In de database staat alleen de sha256 ervan, dus alleen jij kunt jouw dagen aanpassen. */
const opslag = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};
let sleutel = opslag.get("borrel_sleutel", null);
if (!sleutel) { sleutel = crypto.randomUUID() + crypto.randomUUID(); opslag.set("borrel_sleutel", sleutel); }
let mijnBorrels = opslag.get("borrel_mijn", []);
let accountNaam = "";
let accountGeladen = false;
let mijnHash = "";

async function sha256(tekst) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(tekst));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function bewaarAccount() {
  if (accountGeladen) bewaarAccountData("borrelplanner", { naam: accountNaam, sleutel, borrels: mijnBorrels });
}

// Ingelogd? Dan neem je sleutel, naam en borrels mee naar elk apparaat.
async function laadAccount() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;
  const { data: rij, error } = await sb.from("user_data").select("data").eq("app", "borrelplanner").maybeSingle();
  if (error) return; // niet overschrijven als het laden mislukt
  accountGeladen = true;
  const d = rij?.data || {};
  if (d.sleutel) { sleutel = d.sleutel; opslag.set("borrel_sleutel", sleutel); }
  accountNaam = d.naam || "";
  const ids = new Set(mijnBorrels.map(b => b.id));
  mijnBorrels = [...mijnBorrels, ...(d.borrels || []).filter(b => !ids.has(b.id))];
  opslag.set("borrel_mijn", mijnBorrels);
  if (!d.sleutel || (d.borrels || []).length !== mijnBorrels.length) bewaarAccount();
}

function onthoudBorrel(b) {
  mijnBorrels = [{ id: b.id, naam: b.naam }, ...mijnBorrels.filter(x => x.id !== b.id)].slice(0, 30);
  opslag.set("borrel_mijn", mijnBorrels);
  bewaarAccount();
}

function isoOf(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function todayISO() {
  const nu = new Date();
  return isoOf(nu.getFullYear(), nu.getMonth(), nu.getDate());
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}

function toast(message, isError = false) {
  const toastEl = $("toast");
  toastEl.textContent = message;
  toastEl.className = "toast show" + (isError ? " err" : "");
  setTimeout(() => { toastEl.className = "toast"; }, 2600);
}

function fmtDate(iso) {
  return new Date(iso + "T00:00:00").toLocaleDateString("nl-NL", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
}

function fmtShort(iso) {
  return new Date(iso + "T00:00:00").toLocaleDateString("nl-NL", {
    weekday: "short", day: "numeric", month: "short"
  });
}

function tierVan(count) {
  const ratio = maxAantal ? count / maxAantal : 0;
  if (ratio >= 0.66) return "green";
  if (ratio >= 0.34) return "orange";
  return "red";
}

/* Startscherm: borrel maken of een eerdere openen */

function toonStart() {
  $("startScherm").hidden = false;
  $("mijnBorrelsKaart").hidden = !mijnBorrels.length;
  $("mijnBorrels").replaceChildren(...mijnBorrels.map(b => {
    const a = document.createElement("a");
    a.className = "borrel-link";
    a.href = "?b=" + encodeURIComponent(b.id);
    a.textContent = b.naam;
    return a;
  }));
}

$("nieuweBorrel").onsubmit = async event => {
  event.preventDefault();
  const naam = $("borrelNaam").value.trim();
  if (!naam) return;

  $("maakBtn").disabled = true;
  const { data, error } = await db.from("borrels").insert({ naam }).select().single();
  $("maakBtn").disabled = false;

  if (error) {
    console.error(error);
    toast("Er ging iets mis bij het maken van de borrel.", true);
    return;
  }

  onthoudBorrel(data);
  location.href = "?b=" + encodeURIComponent(data.id);
};

/* Borrelscherm */

async function openBorrel() {
  const { data, error } = await db.from("borrels").select("id, naam").eq("id", borrelId).maybeSingle();

  if (error || !data) {
    if (error) console.error(error);
    $("nietGevonden").hidden = false;
    return;
  }

  borrel = data;
  onthoudBorrel(borrel);
  document.title = borrel.naam + " · Borrelplanner";
  $("kop").textContent = borrel.naam;
  $("intro").textContent = "Vul je naam in, tik de dagen aan dat jij kan, en zie waar de meeste mensen kunnen.";
  $("borrelScherm").hidden = false;
  if (accountNaam) $("naam").value = accountNaam;

  renderCalendar();
  updateSelected();
  laadResultaten();
}

$("deelBtn").onclick = async () => {
  const url = location.origin + location.pathname + "?b=" + encodeURIComponent(borrel.id);
  try {
    if (navigator.share) {
      await navigator.share({ title: borrel.naam, text: `Wanneer kun jij? ${borrel.naam}`, url });
    } else {
      await navigator.clipboard.writeText(url);
      toast("Link gekopieerd, plak hem in de groepsapp");
    }
  } catch (e) {
    if (e.name !== "AbortError") toast("Delen lukte niet. Kopieer de link uit de adresbalk.", true);
  }
};

function renderCalendar() {
  $("calTitle").textContent = `${MAANDEN[viewMonth]} ${viewYear}`;

  const grid = $("calGrid");
  grid.innerHTML = "";

  DOW.forEach(day => {
    const el = document.createElement("div");
    el.className = "cal-dow";
    el.textContent = day;
    grid.appendChild(el);
  });

  let firstDow = new Date(viewYear, viewMonth, 1).getDay();
  firstDow = (firstDow + 6) % 7;

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const tISO = todayISO();

  for (let i = 0; i < firstDow; i++) {
    const empty = document.createElement("div");
    empty.className = "cal-day empty";
    grid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const iso = isoOf(viewYear, viewMonth, d);
    const btn = document.createElement("button");

    btn.className = "cal-day";
    btn.textContent = d;
    btn.setAttribute("aria-pressed", gekozen.has(iso));

    if (iso === tISO) btn.classList.add("today");

    if (iso < tISO) {
      btn.classList.add("disabled");
      btn.disabled = true;
    }

    if (gekozen.has(iso)) btn.classList.add("selected");

    btn.onclick = () => {
      if (gekozen.has(iso)) gekozen.delete(iso);
      else gekozen.add(iso);

      btn.classList.toggle("selected");
      btn.setAttribute("aria-pressed", gekozen.has(iso));
      updateSelected();
    };

    grid.appendChild(btn);
  }
}

function eigenDagen() {
  return ruweData.filter(row => row.eigenaar === mijnHash);
}

function updateSelected() {
  $("selCount").textContent = gekozen.size;
  $("clearBtn").style.display = gekozen.size ? "block" : "none";
  $("eigenUitleg").hidden = !eigenDagen().length;
}

$("prevBtn").onclick = () => {
  viewMonth--;
  if (viewMonth < 0) { viewMonth = 11; viewYear--; }
  renderCalendar();
};

$("nextBtn").onclick = () => {
  viewMonth++;
  if (viewMonth > 11) { viewMonth = 0; viewYear++; }
  renderCalendar();
};

$("clearBtn").onclick = () => {
  gekozen.clear();
  renderCalendar();
  updateSelected();
};

// Opslaan vervangt al jouw dagen voor deze borrel door wat nu aangevinkt staat (ook 0 dagen = alles weg).
$("saveBtn").onclick = async () => {
  const naam = $("naam").value.trim();

  if (!naam) {
    toast("Vul eerst je naam in.", true);
    $("naam").focus();
    return;
  }

  const hadDagen = eigenDagen().length > 0;

  if (gekozen.size === 0 && !hadDagen) {
    toast("Tik minstens één dag aan.", true);
    return;
  }

  const btn = $("saveBtn");
  btn.disabled = true;
  btn.textContent = "Bezig met opslaan...";

  const { error } = await db.rpc("borrel_zet_dagen", {
    borrel: borrel.id,
    naam,
    dagen: [...gekozen],
    sleutel
  });

  btn.disabled = false;
  btn.textContent = "Opslaan";

  if (error) {
    console.error(error);
    toast("Er ging iets mis bij het opslaan.", true);
    return;
  }

  toast(gekozen.size ? "Opgeslagen! Bedankt 🎉" : "Je dagen zijn weggehaald.");
  accountNaam = naam;
  bewaarAccount();
  laadResultaten(true);
};

// eigenOpnieuw: na opslaan je dagen opnieuw aanvinken; bij vernieuwen blijven je niet-opgeslagen vinkjes staan
async function laadResultaten(eigenOpnieuw = false) {
  const { data, error } = await db
    .from("beschikbaarheid")
    .select("naam, datum, eigenaar")
    .eq("borrel_id", borrel.id)
    .gte("datum", todayISO());

  if (error) {
    console.error(error);
    toast("Kon de dagen niet laden.", true);
    return;
  }

  ruweData = data || [];

  // Je eigen dagen staan aangevinkt, zodat je ze meteen kunt aanpassen
  const eigen = eigenDagen();
  if (!eigenGeladen || eigenOpnieuw) {
    gekozen.clear();
    eigen.forEach(row => gekozen.add(row.datum));
    if (eigen.length) $("naam").value = eigen[0].naam;
    eigenGeladen = true;
    renderCalendar();
  }
  updateSelected();

  bouwFilters();
  berekenResultaten();
}

function bouwFilters() {
  const namen = [...new Set(ruweData.map(row => row.naam))].sort((a, b) => a.localeCompare(b));
  const dagen = [...new Set(ruweData.map(row => row.datum))].sort();

  $("filterBtn").style.display = ruweData.length ? "block" : "none";

  if (!ruweData.length) {
    $("filterPanel").classList.remove("open");
    $("filterBtn").classList.remove("active");
  }

  const peopleBox = $("filterPeople");
  peopleBox.innerHTML = "";

  namen.forEach(naam => {
    const btn = document.createElement("button");
    btn.className = "filter-pill" + (verbPersonen.has(naam) ? " off" : "");
    btn.textContent = naam;
    btn.onclick = () => {
      if (verbPersonen.has(naam)) verbPersonen.delete(naam);
      else verbPersonen.add(naam);
      btn.classList.toggle("off");
      berekenResultaten();
    };
    peopleBox.appendChild(btn);
  });

  const daysBox = $("filterDays");
  daysBox.innerHTML = "";

  dagen.forEach(iso => {
    const btn = document.createElement("button");
    btn.className = "filter-pill" + (verbDagen.has(iso) ? " off" : "");
    btn.textContent = fmtShort(iso);
    btn.onclick = () => {
      if (verbDagen.has(iso)) verbDagen.delete(iso);
      else verbDagen.add(iso);
      btn.classList.toggle("off");
      berekenResultaten();
    };
    daysBox.appendChild(btn);
  });
}

function berekenResultaten() {
  const perDag = {};

  ruweData.forEach(row => {
    if (verbPersonen.has(row.naam)) return;
    if (verbDagen.has(row.datum)) return;
    if (!perDag[row.datum]) perDag[row.datum] = new Set();
    perDag[row.datum].add(row.naam);
  });

  alleResultaten = Object.entries(perDag)
    .map(([datum, namen]) => ({ datum, namen: [...namen].sort((a, b) => a.localeCompare(b)) }))
    .sort((a, b) => b.namen.length - a.namen.length || a.datum.localeCompare(b.datum));

  maxAantal = alleResultaten.length ? alleResultaten[0].namen.length : 0;
  pagina = 0;

  renderResultaten();
}

function renderResultaten() {
  const box = $("results");
  box.innerHTML = "";

  const totaal = alleResultaten.length;
  const heeftData = ruweData.length > 0;

  $("resultsEmpty").style.display = totaal ? "none" : "block";
  $("resultsEmpty").textContent = heeftData
    ? "Geen dagen om te tonen — pas je filters aan."
    : "Nog niemand heeft iets ingevuld. Deel de link in de groepsapp!";

  $("legend").style.display = totaal ? "flex" : "none";

  const start = pagina * PER_PAGINA;
  const pageItems = alleResultaten.slice(start, start + PER_PAGINA);

  pageItems.forEach((item, index) => {
    const positie = start + index + 1;
    const tier = tierVan(item.namen.length);
    const div = document.createElement("div");
    div.className = "result";

    const pills = item.namen.map(naam => `<span class="name-pill">${esc(naam)}</span>`).join("");

    div.innerHTML = `
      <div class="rank ${tier}">${positie}</div>
      <div class="result-main">
        <div class="result-row">
          <div class="result-date">${fmtDate(item.datum)}</div>
          <div class="count ${tier}">
            ${item.namen.length} ${item.namen.length === 1 ? "persoon" : "pers."}
          </div>
        </div>
        <div class="names">${pills}</div>
      </div>
    `;

    box.appendChild(div);
  });

  const pages = Math.ceil(totaal / PER_PAGINA);
  $("pager").style.display = pages > 1 ? "flex" : "none";

  if (pages > 1) {
    const tot = Math.min(start + PER_PAGINA, totaal);
    $("pageInfo").textContent = `${start + 1}–${tot} van ${totaal}`;
    $("prevPage").disabled = pagina === 0;
    $("nextPage").disabled = pagina >= pages - 1;
  }
}

$("filterBtn").onclick = () => {
  $("filterPanel").classList.toggle("open");
  $("filterBtn").classList.toggle("active");
};

$("filterReset").onclick = () => {
  verbPersonen.clear();
  verbDagen.clear();
  bouwFilters();
  berekenResultaten();
};

$("prevPage").onclick = () => {
  if (pagina > 0) {
    pagina--;
    renderResultaten();
    window.scrollTo({ top: $("results").offsetTop - 80, behavior: "smooth" });
  }
};

$("nextPage").onclick = () => {
  const pages = Math.ceil(alleResultaten.length / PER_PAGINA);
  if (pagina < pages - 1) {
    pagina++;
    renderResultaten();
    window.scrollTo({ top: $("results").offsetTop - 80, behavior: "smooth" });
  }
};

$("refreshBtn").onclick = () => laadResultaten();

(async () => {
  await laadAccount();
  mijnHash = await sha256(sleutel);
  if (borrelId) openBorrel();
  else toonStart();
})();
