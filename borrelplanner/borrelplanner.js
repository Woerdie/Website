const SUPABASE_URL = "https://rdlkdglzfjniwamumucb.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_AT7MYeDMdYFer6a8HL6LQA_P5_Itx3S";

const configured =
  SUPABASE_URL &&
  !SUPABASE_URL.includes("VUL_HIER") &&
  SUPABASE_ANON_KEY &&
  !SUPABASE_ANON_KEY.includes("VUL_HIER");

let db = null;

if (configured) {
  db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  document.getElementById("configWarn").style.display = "block";
}

const $ = id => document.getElementById(id);

const gekozen = new Set();
const MAANDEN = [
  "januari",
  "februari",
  "maart",
  "april",
  "mei",
  "juni",
  "juli",
  "augustus",
  "september",
  "oktober",
  "november",
  "december"
];

const DOW = ["ma", "di", "wo", "do", "vr", "za", "zo"];
const PER_PAGINA = 5;

let ruweData = [];
let alleResultaten = [];
let pagina = 0;
let maxAantal = 0;
let viewYear;
let viewMonth;
let removeNaamGevonden = "";

const verbPersonen = new Set();
const verbDagen = new Set();

(function initMonth() {
  const nu = new Date();
  viewYear = nu.getFullYear();
  viewMonth = nu.getMonth();
})();

function isoOf(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function todayISO() {
  const nu = new Date();
  return isoOf(nu.getFullYear(), nu.getMonth(), nu.getDate());
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, char => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char];
  });
}

function norm(value) {
  return String(value).trim().toLowerCase();
}

function toast(message, isError = false) {
  const toastEl = $("toast");

  toastEl.textContent = message;
  toastEl.className = "toast show" + (isError ? " err" : "");

  setTimeout(() => {
    toastEl.className = "toast";
  }, 2600);
}

function showRemoveError(message) {
  $("removeError").textContent = message;
  $("removeError").classList.add("show");
}

function hideRemoveError() {
  $("removeError").textContent = "";
  $("removeError").classList.remove("show");
}

function parseDatum(datum) {
  const parts = String(datum).split("-").map(Number);

  if (parts.length === 3 && parts.every(n => !Number.isNaN(n))) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  const date = new Date(datum);
  date.setHours(0, 0, 0, 0);
  return date;
}

function fmtDate(iso) {
  return new Date(iso + "T00:00:00").toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function fmtShort(iso) {
  return new Date(iso + "T00:00:00").toLocaleDateString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short"
  });
}

function dateParts(iso) {
  const date = parseDatum(iso);

  return {
    weekday: date.toLocaleDateString("nl-NL", { weekday: "long" }),
    main: date.toLocaleDateString("nl-NL", { day: "numeric", month: "long" }),
    year: date.toLocaleDateString("nl-NL", { year: "numeric" })
  };
}

function maandLabel(iso) {
  return parseDatum(iso).toLocaleDateString("nl-NL", {
    month: "long",
    year: "numeric"
  });
}

function sortDatumsPerMaand(datums) {
  return [...datums].sort((a, b) => parseDatum(a) - parseDatum(b));
}

function tierVan(count) {
  const ratio = maxAantal ? count / maxAantal : 0;

  if (ratio >= 0.66) return "green";
  if (ratio >= 0.34) return "orange";
  return "red";
}

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

    if (iso === tISO) {
      btn.classList.add("today");
    }

    if (iso < tISO) {
      btn.classList.add("disabled");
      btn.disabled = true;
    }

    if (gekozen.has(iso)) {
      btn.classList.add("selected");
    }

    btn.onclick = () => {
      if (gekozen.has(iso)) {
        gekozen.delete(iso);
      } else {
        gekozen.add(iso);
      }

      btn.classList.toggle("selected");
      updateSelected();
    };

    grid.appendChild(btn);
  }
}

function updateSelected() {
  $("selCount").textContent = gekozen.size;
  $("clearBtn").style.display = gekozen.size ? "block" : "none";
}

$("prevBtn").onclick = () => {
  viewMonth--;

  if (viewMonth < 0) {
    viewMonth = 11;
    viewYear--;
  }

  renderCalendar();
};

$("nextBtn").onclick = () => {
  viewMonth++;

  if (viewMonth > 11) {
    viewMonth = 0;
    viewYear++;
  }

  renderCalendar();
};

$("clearBtn").onclick = () => {
  gekozen.clear();
  renderCalendar();
  updateSelected();
};

$("saveBtn").onclick = async () => {
  if (!configured) {
    toast("Supabase is nog niet ingesteld.", true);
    return;
  }

  const naam = $("naam").value.trim();

  if (!naam) {
    toast("Vul eerst je naam in.", true);
    return;
  }

  if (gekozen.size === 0) {
    toast("Tik minstens één dag aan.", true);
    return;
  }

  const btn = $("saveBtn");
  btn.disabled = true;
  btn.textContent = "Bezig met opslaan...";

  const rows = [...gekozen].map(datum => ({
    naam,
    datum
  }));

  const { error } = await db
    .from("beschikbaarheid")
    .insert(rows);

  btn.disabled = false;
  btn.textContent = "Opslaan";

  if (error) {
    console.error(error);
    toast("Er ging iets mis bij het opslaan.", true);
    return;
  }

  toast("Opgeslagen! Bedankt 🎉");

  gekozen.clear();
  renderCalendar();
  updateSelected();
  laadResultaten();
};

$("removeBtn").onclick = () => {
  $("removeModal").classList.add("open");
  $("removeNaam").value = $("naam").value.trim();
  $("removeNaam").focus();

  hideRemoveError();

  $("removeDaysBox").classList.remove("open");
  $("removeDaysList").innerHTML = "";
  $("confirmRemoveBtn").disabled = true;

  $("nameChoicesBox").classList.remove("open");
  $("nameChoicesList").innerHTML = "";

  removeNaamGevonden = "";

  laadNamenVoorPopup();
};

$("cancelRemoveBtn").onclick = () => {
  $("removeModal").classList.remove("open");
};

$("removeModal").onclick = event => {
  if (event.target.id === "removeModal") {
    $("removeModal").classList.remove("open");
  }
};

async function laadNamenVoorPopup() {
  if (!configured) {
    showRemoveError("Supabase is nog niet ingesteld.");
    return;
  }

  hideRemoveError();

  $("nameChoicesBox").classList.remove("open");
  $("nameChoicesList").innerHTML = "";

  const { data, error } = await db
    .from("beschikbaarheid")
    .select("naam");

  if (error) {
    console.error(error);
    showRemoveError("Kon de opgeslagen namen niet ophalen.");
    return;
  }

  const namen = [...new Set((data || []).map(row => row.naam))]
    .sort((a, b) => a.localeCompare(b));

  if (namen.length === 0) {
    showRemoveError("Er zijn nog geen namen opgeslagen.");
    return;
  }

  namen.forEach(naam => {
    const btn = document.createElement("button");

    btn.className = "name-choice";
    btn.textContent = naam;
    btn.dataset.naam = naam;

    btn.onclick = () => {
      hideRemoveError();
      $("removeNaam").value = naam;
      markeerGekozenNaam(naam);
      laadDagenVoorNaam();
    };

    $("nameChoicesList").appendChild(btn);
  });

  $("nameChoicesBox").classList.add("open");

  const ingevuld = $("removeNaam").value.trim();

  if (ingevuld) {
    const match = namen.find(n => norm(n) === norm(ingevuld));

    if (match) {
      markeerGekozenNaam(match);
      laadDagenVoorNaam();
    }
  }
}

function markeerGekozenNaam(naam) {
  document.querySelectorAll(".name-choice").forEach(btn => {
    btn.classList.toggle("active", norm(btn.dataset.naam) === norm(naam));
  });
}

$("loadRemoveDaysBtn").onclick = laadDagenVoorNaam;

async function laadDagenVoorNaam() {
  if (!configured) {
    showRemoveError("Supabase is nog niet ingesteld.");
    return;
  }

  hideRemoveError();

  $("removeDaysBox").classList.remove("open");
  $("removeDaysList").innerHTML = "";
  $("confirmRemoveBtn").disabled = true;

  removeNaamGevonden = "";

  const naam = $("removeNaam").value.trim();

  if (!naam) {
    showRemoveError("Vul eerst je naam in of klik op een naam uit de lijst.");
    return;
  }

  const btn = $("loadRemoveDaysBtn");
  btn.disabled = true;
  btn.textContent = "Bezig met zoeken...";

  const { data, error } = await db
    .from("beschikbaarheid")
    .select("naam, datum");

  btn.disabled = false;
  btn.textContent = "Toon mijn dagen";

  if (error) {
    console.error(error);
    showRemoveError("Kon de opgeslagen dagen niet ophalen.");
    return;
  }

  const alleRijen = data || [];
  const namen = [...new Set(alleRijen.map(row => row.naam))];
  const gevondenNaam = namen.find(n => norm(n) === norm(naam));

  if (!gevondenNaam) {
    showRemoveError(`De naam "${naam}" staat niet opgeslagen. Klik op een naam uit de lijst of controleer de spelling.`);
    markeerGekozenNaam("");
    return;
  }

  markeerGekozenNaam(gevondenNaam);

  const datums = sortDatumsPerMaand(
