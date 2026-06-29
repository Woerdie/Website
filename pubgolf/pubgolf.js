const SUPABASE_URL = "https://rdlkdglzfjniwamumucb.supabase.co";
const SUPABASE_KEY = "sb_publishable_AT7MYeDMdYFer6a8HL6LQA_P5_Itx3S";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentGame = null;
let players = [];
let scores = [];

const createGameSection = document.getElementById("create-game-section");
const playersSection = document.getElementById("players-section");
const scoreSection = document.getElementById("score-section");
const standingsSection = document.getElementById("standings-section");

const gameNameInput = document.getElementById("game-name");
const gameHolesInput = document.getElementById("game-holes");
const gameModeInput = document.getElementById("game-mode");

const createGameBtn = document.getElementById("create-game-btn");
const activeGameName = document.getElementById("active-game-name");
const activeGameInfo = document.getElementById("active-game-info");

const playerNameInput = document.getElementById("player-name");
const addPlayerBtn = document.getElementById("add-player-btn");
const playersList = document.getElementById("players-list");
const goScoreBtn = document.getElementById("go-score-btn");

const holeSelect = document.getElementById("hole-select");
const scoreList = document.getElementById("score-list");
const saveScoresBtn = document.getElementById("save-scores-btn");

const standingsList = document.getElementById("standings-list");

createGameBtn.addEventListener("click", createGame);
addPlayerBtn.addEventListener("click", addPlayer);
goScoreBtn.addEventListener("click", openScores);
saveScoresBtn.addEventListener("click", saveScores);
holeSelect.addEventListener("change", renderScoreInputs);

playerNameInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    addPlayer();
  }
});

async function createGame() {
  const name = gameNameInput.value.trim();
  const holes = Number(gameHolesInput.value);
  const mode = gameModeInput.value;

  if (!name) {
    alert("Vul eerst een naam voor het spel in.");
    return;
  }

  if (!holes || holes < 1) {
    alert("Vul een geldig aantal holes in.");
    return;
  }

  createGameBtn.disabled = true;
  createGameBtn.textContent = "Spel wordt gemaakt...";

  const { data, error } = await db
    .from("games")
    .insert({
      name: name,
      holes: holes,
      mode: mode
    })
    .select()
    .single();

  createGameBtn.disabled = false;
  createGameBtn.textContent = "Spel maken";

  if (error) {
    console.error(error);
    alert("Er ging iets mis bij het maken van het spel.");
    return;
  }

  currentGame = data;
  players = [];
  scores = [];

  updateActiveGameInfo();

  createGameSection.classList.add("hidden");
  playersSection.classList.remove("hidden");
  scoreSection.classList.add("hidden");
  standingsSection.classList.add("hidden");

  renderPlayers();
}

async function addPlayer() {
  if (!currentGame) {
    alert("Maak eerst een spel aan.");
    return;
  }

  const name = playerNameInput.value.trim();

  if (!name) {
    alert("Vul een spelernaam in.");
    return;
  }

  addPlayerBtn.disabled = true;
  addPlayerBtn.textContent = "Toevoegen...";

  const { data, error } = await db
    .from("players")
    .insert({
      game_id: currentGame.id,
      name: name
    })
    .select()
    .single();

  addPlayerBtn.disabled = false;
  addPlayerBtn.textContent = "Toevoegen";

  if (error) {
    console.error(error);
    alert("Speler toevoegen is niet gelukt.");
    return;
  }

  players.push(data);
  playerNameInput.value = "";
  playerNameInput.focus();

  renderPlayers();
}

function renderPlayers() {
  playersList.innerHTML = "";

  if (players.length === 0) {
    playersList.innerHTML = `<p class="hint">Nog geen spelers toegevoegd.</p>`;
    return;
  }

  players.forEach((player, index) => {
    const item = document.createElement("div");
    item.className = "list-item";

    item.innerHTML = `
      <strong>${index + 1}. ${escapeHtml(player.name)}</strong>
      <span>Speler</span>
    `;

    playersList.appendChild(item);
  });
}

function updateActiveGameInfo() {
  activeGameName.textContent = currentGame.name;

  const modeText = currentGame.mode === "teams" ? "Teams" : "Iedereen apart";

  activeGameInfo.textContent = `${currentGame.holes} holes · ${modeText}`;
}

async function openScores() {
  if (players.length === 0) {
    alert("Voeg eerst minimaal één speler toe.");
    return;
  }

  await loadScores();

  fillHoleSelect();

  playersSection.classList.remove("hidden");
  scoreSection.classList.remove("hidden");
  standingsSection.classList.remove("hidden");

  renderScoreInputs();
  renderStandings();

  scoreSection.scrollIntoView({ behavior: "smooth" });
}

function fillHoleSelect() {
  holeSelect.innerHTML = "";

  for (let i = 1; i <= currentGame.holes; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = `Hole ${i}`;
    holeSelect.appendChild(option);
  }
}

async function loadScores() {
  const { data, error } = await db
    .from("scores")
    .select("*")
    .eq("game_id", currentGame.id);

  if (error) {
    console.error(error);
    alert("Scores laden is niet gelukt.");
    return;
  }

  scores = data || [];
}

function renderScoreInputs() {
  scoreList.innerHTML = "";

  const holeNumber = Number(holeSelect.value);

  players.forEach((player) => {
    const existingScore = scores.find((score) => {
      return score.player_id === player.id && score.hole_number === holeNumber;
    });

    const item = document.createElement("div");
    item.className = "score-item";

    item.innerHTML = `
      <strong>${escapeHtml(player.name)}</strong>
      <input 
        type="number" 
        min="0" 
        inputmode="numeric"
        data-player-id="${player.id}" 
        value="${existingScore ? existingScore.score : ""}" 
        placeholder="Score"
      >
    `;

    scoreList.appendChild(item);
  });
}

async function saveScores() {
  if (!currentGame) {
    alert("Maak eerst een spel aan.");
    return;
  }

  const holeNumber = Number(holeSelect.value);
  const inputs = scoreList.querySelectorAll("input");

  const rows = [];

  inputs.forEach((input) => {
    const playerId = input.dataset.playerId;
    const value = input.value.trim();

    if (value !== "") {
      rows.push({
        game_id: currentGame.id,
        player_id: playerId,
        hole_number: holeNumber,
        score: Number(value),
        updated_at: new Date().toISOString()
      });
    }
  });

  if (rows.length === 0) {
    alert("Vul minimaal één score in.");
    return;
  }

  saveScoresBtn.disabled = true;
  saveScoresBtn.textContent = "Opslaan...";

  const { error } = await db
    .from("scores")
    .upsert(rows, {
      onConflict: "player_id,hole_number"
    });

  saveScoresBtn.disabled = false;
  saveScoresBtn.textContent = "Scores opslaan";

  if (error) {
    console.error(error);
    alert("Scores opslaan is niet gelukt.");
    return;
  }

  await loadScores();
  renderScoreInputs();
  renderStandings();

  alert("Scores opgeslagen.");
}

function renderStandings() {
  standingsList.innerHTML = "";

  const standings = players.map((player) => {
    const total = scores
      .filter((score) => score.player_id === player.id)
      .reduce((sum, score) => sum + Number(score.score), 0);

    return {
      id: player.id,
      name: player.name,
      total: total
    };
  });

  standings.sort((a, b) => a.total - b.total);

  standings.forEach((player, index) => {
    const item = document.createElement("div");
    item.className = "standing-item";

    item.innerHTML = `
      <span class="standing-rank">${index + 1}</span>
      <span class="standing-main">
        <strong>${escapeHtml(player.name)}</strong>
      </span>
      <span class="standing-score">${player.total}</span>
    `;

    standingsList.appendChild(item);
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
