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

  const datums = sortDatumsPerMaand([
    ...new Set(
      alleRijen
        .filter(row => norm(row.naam) === norm(gevondenNaam))
        .map(row => row.datum)
    )
  ]);

  if (datums.length === 0) {
    showRemoveError(`Er zijn geen dagen gevonden voor "${gevondenNaam}".`);
    return;
  }

  hideRemoveError();

  removeNaamGevonden = gevondenNaam;

  const list = $("removeDaysList");
  list.innerHTML = "";

  let laatsteMaand = "";

  datums.forEach(datum => {
    const maand = maandLabel(datum);

    if (maand !== laatsteMaand) {
      const kop = document.createElement("div");
      kop.className = "month-divider";
      kop.textContent = maand;
      list.appendChild(kop);
      laatsteMaand = maand;
    }

    const parts = dateParts(datum);
    const label = document.createElement("label");

    label.className = "date-card";
    label.innerHTML = `
      <input type="checkbox" class="remove-date-check" value="${esc(datum)}">
      <div class="date-info">
        <div class="date-weekday">${esc(parts.weekday)}</div>
        <div class="date-main">${esc(parts.main)}</div>
        <div class="date-year">${esc(parts.year)}</div>
      </div>
      <span class="date-status">blijft staan</span>
    `;

    const check = label.querySelector("input");
    const status = label.querySelector(".date-status");

    check.addEventListener("change", () => {
      label.classList.toggle("selected", check.checked);
      status.textContent = check.checked ? "wordt verwijderd" : "blijft staan";
      updateDeleteButtonState();
      hideRemoveError();
    });

    list.appendChild(label);
  });

  $("removeDaysBox").classList.add("open");
  updateDeleteButtonState();
}

function updateDeleteButtonState() {
  const checked = document.querySelectorAll(".remove-date-check:checked").length;
  $("confirmRemoveBtn").disabled = checked === 0;
}

$("confirmRemoveBtn").onclick = async () => {
  const gekozenVoorVerwijderen = [...document.querySelectorAll(".remove-date-check:checked")]
    .map(check => check.value);

  if (!removeNaamGevonden) {
    showRemoveError("Kies eerst een naam.");
    return;
  }

  if (gekozenVoorVerwijderen.length === 0) {
    showRemoveError("Klik minstens één dag aan om te verwijderen.");
    return;
  }

  const btn = $("confirmRemoveBtn");
  btn.disabled = true;
  btn.textContent = "Bezig met verwijderen...";

  const { data, error } = await db
    .from("beschikbaarheid")
    .delete()
    .eq("naam", removeNaamGevonden)
    .in("datum", gekozenVoorVerwijderen)
    .select();

  btn.disabled = false;
  btn.textContent = "Geselecteerde dagen verwijderen";

  if (error) {
    console.error(error);
    showRemoveError("Verwijderen lukte niet.");
    return;
  }

  if (!data || data.length === 0) {
    showRemoveError("Er is niets verwijderd. De lijst is opnieuw geladen; kies de datum nog een keer.");
    laadDagenVoorNaam();
    return;
  }

  $("removeModal").classList.remove("open");

  toast(`${data.length} ${data.length === 1 ? "dag" : "dagen"} van ${removeNaamGevonden} verwijderd.`);

  gekozen.clear();
  renderCalendar();
  updateSelected();
  laadResultaten();
};

async function verwijderOudeData() {
  if (!configured) return;

  const { error } = await db
    .from("beschikbaarheid")
    .delete()
    .lt("datum", todayISO());

  if (error) {
    console.error("Kon oude data niet verwijderen:", error);
  }
}

async function laadResultaten() {
  if (!configured) return;

  await verwijderOudeData();

  const { data, error } = await db
    .from("beschikbaarheid")
    .select("naam, datum");

  if (error) {
    console.error(error);
    return;
  }

  ruweData = data || [];

  bouwFilters();
  berekenResultaten();
}

function bouwFilters() {
  const namen = [...new Set(ruweData.map(row => row.naam))]
    .sort((a, b) => a.localeCompare(b));

  const dagen = [...new Set(ruweData.map(row => row.datum))]
    .sort();

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
      if (verbPersonen.has(naam)) {
        verbPersonen.delete(naam);
      } else {
        verbPersonen.add(naam);
      }

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
      if (verbDagen.has(iso)) {
        verbDagen.delete(iso);
      } else {
        verbDagen.add(iso);
      }

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

    if (!perDag[row.datum]) {
      perDag[row.datum] = new Set();
    }

    perDag[row.datum].add(row.naam);
  });

  alleResultaten = Object.entries(perDag)
    .map(([datum, namen]) => ({
      datum,
      namen: [...namen].sort((a, b) => a.localeCompare(b))
    }))
    .sort((a, b) => {
      return b.namen.length - a.namen.length || a.datum.localeCompare(b.datum);
    });

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
    : "Nog niemand heeft iets ingevuld.";

  $("legend").style.display = totaal ? "flex" : "none";

  const start = pagina * PER_PAGINA;
  const pageItems = alleResultaten.slice(start, start + PER_PAGINA);

  pageItems.forEach((item, index) => {
    const positie = start + index + 1;
    const tier = tierVan(item.namen.length);

    const div = document.createElement("div");
    div.className = "result";

    const pills = item.namen
      .map(naam => `<span class="name-pill">${esc(naam)}</span>`)
      .join("");

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

    window.scrollTo({
      top: $("results").offsetTop - 80,
      behavior: "smooth"
    });
  }
};

$("nextPage").onclick = () => {
  const pages = Math.ceil(alleResultaten.length / PER_PAGINA);

  if (pagina < pages - 1) {
    pagina++;
    renderResultaten();

    window.scrollTo({
      top: $("results").offsetTop - 80,
      behavior: "smooth"
    });
  }
};

$("refreshBtn").onclick = laadResultaten;

renderCalendar();
updateSelected();
laadResultaten();
