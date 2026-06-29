const SUPABASE_URL = "https://rdlkdglzfjniwamumucb.supabase.co";
const SUPABASE_KEY = "sb_publishable_AT7MYeDMdYFer6a8HL6LQA_P5_Itx3S";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentGame = null;
let players = [];
let teams = [];
let scores = [];
let modalResolve = null;

const savedGamesSection = document.getElementById("saved-games-section");
const savedGamesList = document.getElementById("saved-games-list");

const createGameSection = document.getElementById("create-game-section");
const playersSection = document.getElementById("players-section");
const scoreSection = document.getElementById("score-section");
const standingsSection = document.getElementById("standings-section");

const gameNameInput = document.getElementById("game-name");
const gameHolesInput = document.getElementById("game-holes");
const expectedPlayersInput = document.getElementById("expected-players");
const gameModeInput = document.getElementById("game-mode");
const teamSizeWrap = document.getElementById("team-size-wrap");
const teamSizeInput = document.getElementById("team-size");

const createGameBtn = document.getElementById("create-game-btn");
const activeGameName = document.getElementById("active-game-name");
const activeGameInfo = document.getElementById("active-game-info");
const shareLink = document.getElementById("share-link");
const scoreShareLink = document.getElementById("score-share-link");
const editPlayersBtn = document.getElementById("edit-players-btn");
const scorecardTable = document.getElementById("scorecard-table");

const editExpectedPlayersInput = document.getElementById("edit-expected-players");
const updateExpectedPlayersBtn = document.getElementById("update-expected-players-btn");

const playerNameInput = document.getElementById("player-name");
const addPlayerBtn = document.getElementById("add-player-btn");
const playersList = document.getElementById("players-list");
const playerCounter = document.getElementById("player-counter");

const teamChoiceActions = document.getElementById("team-choice-actions");
const randomTeamsBtn = document.getElementById("random-teams-btn");
const manualTeamsBtn = document.getElementById("manual-teams-btn");
const manualTeamBuilder = document.getElementById("manual-team-builder");

const teamsList = document.getElementById("teams-list");
const goScoreBtn = document.getElementById("go-score-btn");

const holeSelect = document.getElementById("hole-select");
const scoreList = document.getElementById("score-list");
const saveScoresBtn = document.getElementById("save-scores-btn");
const standingsList = document.getElementById("standings-list");

const toastContainer = document.getElementById("toast-container");
const modalBackdrop = document.getElementById("modal-backdrop");
const modalIcon = document.getElementById("modal-icon");
const modalTitle = document.getElementById("modal-title");
const modalMessage = document.getElementById("modal-message");
const modalInput = document.getElementById("modal-input");
const modalCancelBtn = document.getElementById("modal-cancel-btn");
const modalConfirmBtn = document.getElementById("modal-confirm-btn");

createGameBtn.addEventListener("click", createGame);
addPlayerBtn.addEventListener("click", addPlayer);
randomTeamsBtn.addEventListener("click", makeRandomTeams);
manualTeamsBtn.addEventListener("click", openManualTeams);
goScoreBtn.addEventListener("click", openScores);
saveScoresBtn.addEventListener("click", saveScores);
holeSelect.addEventListener("change", renderScoreInputs);
gameModeInput.addEventListener("change", toggleTeamSize);
updateExpectedPlayersBtn.addEventListener("click", updateExpectedPlayers);

if (editPlayersBtn) {
  editPlayersBtn.addEventListener("click", backToPlayers);
}

playerNameInput.addEventListener("keydown", event => {
  if (event.key === "Enter") addPlayer();
});

modalConfirmBtn.addEventListener("click", () => closeModal(true));
modalCancelBtn.addEventListener("click", () => closeModal(false));

modalBackdrop.addEventListener("click", event => {
  if (event.target === modalBackdrop) closeModal(false);
});

modalInput.addEventListener("keydown", event => {
  if (event.key === "Enter") closeModal(true);
});

init();

async function init() {
  toggleTeamSize();

  const gameId = new URLSearchParams(window.location.search).get("game");

  if (gameId) {
    await loadGame(gameId);
  } else {
    await loadSavedGames();
  }
}

function toggleTeamSize() {
  if (gameModeInput.value === "teams") {
    teamSizeWrap.classList.remove("hidden");
  } else {
    teamSizeWrap.classList.add("hidden");
  }
}

function getEffectiveMode() {
  if (!currentGame) return "solo";

  if (players.length <= 2) {
    return "solo";
  }

  return currentGame.mode;
}

function needsTeams() {
  const effectiveMode = getEffectiveMode();
  return effectiveMode === "duos" || effectiveMode === "teams";
}

function getTeamSize() {
  const effectiveMode = getEffectiveMode();

  if (effectiveMode === "duos") return 2;

  if (effectiveMode === "teams") {
    return Number(currentGame.team_size || 2);
  }

  return 1;
}

function getRequiredTeamCount() {
  if (!needsTeams()) return 0;

  return Math.ceil(players.length / getTeamSize());
}

async function loadSavedGames() {
  const { data, error } = await db
    .from("games")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error(error);
    savedGamesList.innerHTML = `<p class="error">Games laden is niet gelukt.</p>`;
    showToast("Games laden is niet gelukt.", "error");
    return;
  }

  if (!data || data.length === 0) {
    savedGamesList.innerHTML = `<p class="hint">Nog geen opgeslagen games.</p>`;
    return;
  }

  savedGamesList.innerHTML = "";

  data.forEach(game => {
    const btn = document.createElement("button");
    btn.className = "saved-game-btn";

    btn.innerHTML = `
      <span class="game-row">
        <strong>${escapeHtml(game.name)}</strong>
        <span>${game.holes} holes · ${modeLabel(game.mode)} · ${game.expected_players || "?"} spelers</span>
      </span>
    `;

    btn.onclick = () => {
      window.location.href = `?game=${game.id}`;
    };

    savedGamesList.appendChild(btn);
  });
}

async function createGame() {
  const name = gameNameInput.value.trim();
  const holes = Number(gameHolesInput.value);
  const expectedPlayers = Number(expectedPlayersInput.value);
  const mode = gameModeInput.value;

  let teamSize = 1;

  if (mode === "duos") {
    teamSize = 2;
  }

  if (mode === "teams") {
    teamSize = Number(teamSizeInput.value);
  }

  if (!name) {
    await showMessage("Vul eerst een naam voor het spel in.", "Naam ontbreekt");
    return;
  }

  if (!holes || holes < 1) {
    await showMessage("Vul een geldig aantal holes in.", "Aantal holes klopt niet");
    return;
  }

  if (!expectedPlayers || expectedPlayers < 1) {
    await showMessage("Vul een geldig aantal spelers in.", "Aantal spelers klopt niet");
    return;
  }

  if ((mode === "duos" || mode === "teams") && teamSize < 2) {
    await showMessage("Een team moet minimaal uit 2 personen bestaan.", "Teamgrootte klopt niet");
    return;
  }

  createGameBtn.disabled = true;
  createGameBtn.textContent = "Spel wordt gemaakt...";

  const { data, error } = await db
    .from("games")
    .insert({
      name,
      holes,
      mode,
      expected_players: expectedPlayers,
      team_size: teamSize
    })
    .select()
    .single();

  createGameBtn.disabled = false;
  createGameBtn.textContent = "Spel maken";

  if (error) {
    console.error(error);
    await showMessage("Spel maken is niet gelukt.", "Er ging iets mis");
    return;
  }

  window.location.href = `?game=${data.id}`;
}

async function loadGame(gameId) {
  const { data: game, error: gameError } = await db
    .from("games")
    .select("*")
    .eq("id", gameId)
    .single();

  if (gameError) {
    console.error(gameError);
    await showMessage("Game kon niet worden geladen.", "Niet gevonden");
    return;
  }

  currentGame = game;

  await reloadGameData();

  savedGamesSection.classList.add("hidden");
  createGameSection.classList.add("hidden");
  playersSection.classList.remove("hidden");
  scoreSection.classList.add("hidden");
  standingsSection.classList.add("hidden");

  updateActiveGameInfo();
  renderPlayers();
  renderTeams();
}

async function reloadGameData() {
  const { data: playerData, error: playerError } = await db
    .from("players")
    .select("*")
    .eq("game_id", currentGame.id)
    .order("created_at", { ascending: true });

  if (playerError) {
    console.error(playerError);
    showToast("Spelers laden is niet gelukt.", "error");
    return;
  }

  const { data: teamData, error: teamError } = await db
    .from("teams")
    .select("*")
    .eq("game_id", currentGame.id)
    .order("created_at", { ascending: true });

  if (teamError) {
    console.error(teamError);
    showToast("Teams laden is niet gelukt.", "error");
    return;
  }

  const { data: scoreData, error: scoreError } = await db
    .from("scores")
    .select("*")
    .eq("game_id", currentGame.id);

  if (scoreError) {
    console.error(scoreError);
    showToast("Scores laden is niet gelukt.", "error");
    return;
  }

  players = playerData || [];
  teams = teamData || [];
  scores = scoreData || [];
}

function updateActiveGameInfo() {
  activeGameName.textContent = currentGame.name;

  if (editExpectedPlayersInput) {
    editExpectedPlayersInput.value = currentGame.expected_players || players.length || 1;
  }

  let modeText = modeLabel(currentGame.mode);

  if (players.length <= 2) {
    modeText = "Iedereen apart";
  }

  activeGameInfo.textContent =
    `${currentGame.holes} holes · ${modeText} · ${players.length}/${currentGame.expected_players || "?"} spelers`;

  const url = `${window.location.origin}${window.location.pathname}?game=${currentGame.id}`;

  if (shareLink) {
    shareLink.href = url;
    shareLink.textContent = "Deellink kopiëren / sturen";
    shareLink.title = url;

    shareLink.onclick = async event => {
      event.preventDefault();
      await copyShareLink(url);
    };
  }

  if (scoreShareLink) {
    scoreShareLink.href = url;
    scoreShareLink.textContent = "Open / stuur door";
    scoreShareLink.title = url;

    scoreShareLink.onclick = async event => {
      event.preventDefault();
      await copyShareLink(url);
    };
  }
}

async function updateExpectedPlayers() {
  const newAmount = Number(editExpectedPlayersInput.value);

  if (!newAmount || newAmount < 1) {
    await showMessage("Vul een geldig aantal spelers in.", "Aantal klopt niet");
    return;
  }

  if (newAmount < players.length) {
    const doorgaan = await showConfirm(
      `Er staan nu al ${players.length} spelers in. Wil je het aantal toch op ${newAmount} zetten?`,
      "Aantal lager dan spelers"
    );

    if (!doorgaan) return;
  }

  const { error } = await db
    .from("games")
    .update({ expected_players: newAmount })
    .eq("id", currentGame.id);

  if (error) {
    console.error(error);
    await showMessage("Aantal spelers aanpassen is niet gelukt.", "Er ging iets mis");
    return;
  }

  currentGame.expected_players = newAmount;

  updateActiveGameInfo();
  renderPlayers();

  showToast("Aantal spelers is aangepast.", "success");
}

async function copyShareLink(url) {
  try {
    await navigator.clipboard.writeText(url);
    showToast("Deellink gekopieerd.", "success");
  } catch {
    await showMessage(url, "Kopieer deze deellink");
  }
}

async function addPlayer() {
  if (!currentGame) {
    await showMessage("Maak eerst een spel aan.", "Geen spel actief");
    return;
  }

  const name = playerNameInput.value.trim();

  if (!name) {
    await showMessage("Vul een spelernaam in.", "Naam ontbreekt");
    return;
  }

  if (currentGame.expected_players && players.length >= currentGame.expected_players) {
    await showMessage("Je hebt het ingestelde aantal spelers al bereikt.", "Maximum bereikt");
    return;
  }

  addPlayerBtn.disabled = true;
  addPlayerBtn.textContent = "Toevoegen...";

  const { data, error } = await db
    .from("players")
    .insert({
      game_id: currentGame.id,
      name
    })
    .select()
    .single();

  addPlayerBtn.disabled = false;
  addPlayerBtn.textContent = "Toevoegen";

  if (error) {
    console.error(error);
    await showMessage("Speler toevoegen is niet gelukt.", "Er ging iets mis");
    return;
  }

  players.push(data);
  playerNameInput.value = "";
  playerNameInput.focus();

  updateActiveGameInfo();
  renderPlayers();
  renderTeams();

  showToast(`${name} is toegevoegd.`, "success");
}

function renderPlayers() {
  playersList.innerHTML = "";

  playerCounter.textContent =
    `${players.length}/${currentGame.expected_players || "?"} spelers toegevoegd.`;

  if (players.length === 0) {
    playersList.innerHTML = `<p class="hint">Nog geen spelers toegevoegd.</p>`;
  } else {
    players.forEach((player, index) => {
      const team = teams.find(team => team.id === player.team_id);

      const item = document.createElement("div");
      item.className = "list-item player-edit-item";

      item.innerHTML = `
        <div class="player-edit-main">
          <strong>${index + 1}. ${escapeHtml(player.name)}</strong>
          <div class="player-team">${team && needsTeams() ? escapeHtml(team.name) : "Nog geen team"}</div>
        </div>

        <div class="player-actions">
          <button class="tiny-btn" onclick="editPlayerName('${player.id}')">Aanpassen</button>
          <button class="tiny-btn danger-tiny-btn" onclick="deletePlayer('${player.id}')">Verwijderen</button>
        </div>
      `;

      playersList.appendChild(item);
    });
  }

  if (!needsTeams()) {
    teamChoiceActions.classList.add("hidden");
    manualTeamBuilder.classList.add("hidden");
  } else {
    teamChoiceActions.classList.remove("hidden");
  }
}

async function editPlayerName(playerId) {
  const player = players.find(player => player.id === playerId);

  if (!player) {
    await showMessage("Speler niet gevonden.", "Niet gevonden");
    return;
  }

  const newName = await showPrompt("Nieuwe naam:", player.name, "Naam aanpassen");

  if (newName === null) return;

  const cleanName = newName.trim();

  if (!cleanName) {
    await showMessage("Naam mag niet leeg zijn.", "Naam ontbreekt");
    return;
  }

  const { error } = await db
    .from("players")
    .update({ name: cleanName })
    .eq("id", playerId);

  if (error) {
    console.error(error);
    await showMessage("Naam aanpassen is niet gelukt.", "Er ging iets mis");
    return;
  }

  await reloadGameData();

  updateActiveGameInfo();
  renderPlayers();
  renderTeams();

  if (!scoreSection.classList.contains("hidden")) renderScoreInputs();
  if (!standingsSection.classList.contains("hidden")) renderStandings();

  showToast("Naam is aangepast.", "success");
}

async function deletePlayer(playerId) {
  const player = players.find(player => player.id === playerId);

  if (!player) {
    await showMessage("Speler niet gevonden.", "Niet gevonden");
    return;
  }

  const zeker = await showConfirm(
    `Weet je zeker dat je ${player.name} wilt verwijderen? De scores van deze speler worden ook verwijderd.`,
    "Speler verwijderen"
  );

  if (!zeker) return;

  const { error } = await db
    .from("players")
    .delete()
    .eq("id", playerId);

  if (error) {
    console.error(error);
    await showMessage("Speler verwijderen is niet gelukt.", "Er ging iets mis");
    return;
  }

  await reloadGameData();

  updateActiveGameInfo();
  renderPlayers();
  renderTeams();

  if (!scoreSection.classList.contains("hidden")) renderScoreInputs();
  if (!standingsSection.classList.contains("hidden")) renderStandings();

  showToast(`${player.name} is verwijderd.`, "success");
}

async function makeRandomTeams() {
  if (!needsTeams()) {
    await showMessage("Bij 1 of 2 spelers speel je automatisch iedereen apart.", "Geen teams nodig");
    return;
  }

  if (players.length < 3) {
    await showMessage("Voor teams of duo’s heb je minimaal 3 spelers nodig.", "Te weinig spelers");
    return;
  }

  if (currentGame.expected_players && players.length < currentGame.expected_players) {
    const doorgaan = await showConfirm(
      "Nog niet alle spelers zijn toegevoegd. Toch random teams maken?",
      "Nog niet compleet"
    );

    if (!doorgaan) return;
  }

  const effectiveMode = getEffectiveMode();
  const teamSize = getTeamSize();

  if (effectiveMode === "teams" && players.length % teamSize !== 0) {
    const doorgaan = await showConfirm(
      `Met ${players.length} spelers en teams van ${teamSize} komen de teams niet gelijk uit. Je kunt hierna eventueel een handicap invullen. Wil je doorgaan?`,
      "Teams niet gelijk"
    );

    if (!doorgaan) return;
  }

  randomTeamsBtn.disabled = true;
  randomTeamsBtn.textContent = "Teams maken...";

  await deleteExistingTeams();

  const shuffled = shuffle([...players]);
  const teamCount = Math.ceil(shuffled.length / teamSize);

  const teamRows = [];

  for (let i = 1; i <= teamCount; i++) {
    teamRows.push({
      game_id: currentGame.id,
      name: `Team ${i}`,
      handicap: 0
    });
  }

  const { data: newTeams, error: teamError } = await db
    .from("teams")
    .insert(teamRows)
    .select();

  if (teamError) {
    console.error(teamError);
    await showMessage("Teams maken is niet gelukt.", "Er ging iets mis");
    randomTeamsBtn.disabled = false;
    randomTeamsBtn.textContent = "Random teams maken";
    return;
  }

  const updates = [];

  shuffled.forEach((player, index) => {
    const teamIndex = Math.floor(index / teamSize);
    const team = newTeams[teamIndex];

    updates.push(
      db
        .from("players")
        .update({ team_id: team.id })
        .eq("id", player.id)
    );
  });

  await Promise.all(updates);

  randomTeamsBtn.disabled = false;
  randomTeamsBtn.textContent = "Random teams maken";

  await reloadGameData();

  updateActiveGameInfo();
  renderPlayers();
  renderTeams();
  renderManualTeamBuilder();
  renderStandings();

  showToast("Random teams zijn gemaakt.", "success");
}

async function openManualTeams() {
  if (!needsTeams()) {
    await showMessage("Bij 1 of 2 spelers speel je automatisch iedereen apart.", "Geen teams nodig");
    return;
  }

  if (players.length < 3) {
    await showMessage("Voor teams of duo’s heb je minimaal 3 spelers nodig.", "Te weinig spelers");
    return;
  }

  const effectiveMode = getEffectiveMode();
  const teamSize = getTeamSize();

  if (effectiveMode === "teams" && players.length % teamSize !== 0) {
    const doorgaan = await showConfirm(
      `Met ${players.length} spelers en teams van ${teamSize} komen de teams niet gelijk uit. Je kunt zelf een handicap invullen, maar dat hoeft niet. Wil je doorgaan?`,
      "Teams niet gelijk"
    );

    if (!doorgaan) return;
  }

  await ensureManualTeamsExist();

  await reloadGameData();

  renderPlayers();
  renderTeams();
  renderManualTeamBuilder();

  manualTeamBuilder.classList.remove("hidden");
  manualTeamBuilder.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function ensureManualTeamsExist() {
  const requiredTeamCount = getRequiredTeamCount();

  if (teams.length === requiredTeamCount) {
    return;
  }

  await deleteExistingTeams();

  const teamRows = [];

  for (let i = 1; i <= requiredTeamCount; i++) {
    teamRows.push({
      game_id: currentGame.id,
      name: `Team ${i}`,
      handicap: 0
    });
  }

  const { error } = await db
    .from("teams")
    .insert(teamRows);

  if (error) {
    console.error(error);
    await showMessage("Teams klaarzetten is niet gelukt.", "Er ging iets mis");
  }
}

function renderManualTeamBuilder() {
  if (!needsTeams() || teams.length === 0) {
    manualTeamBuilder.innerHTML = "";
    manualTeamBuilder.classList.add("hidden");
    return;
  }

  const teamOptions = teams
    .map(team => `<option value="${team.id}">${escapeHtml(team.name)}</option>`)
    .join("");

  const teamSettings = teams.map((team, index) => {
    return `
      <div class="manual-team-card">
        <label for="team-name-${team.id}">Teamnaam</label>
        <input 
          id="team-name-${team.id}"
          class="manual-team-name"
          data-team-id="${team.id}"
          type="text"
          value="${escapeAttribute(team.name || `Team ${index + 1}`)}"
        >

        <label for="team-handicap-${team.id}">Handicap / strafpunten optioneel</label>
        <input 
          id="team-handicap-${team.id}"
          class="manual-team-handicap"
          data-team-id="${team.id}"
          type="number"
          min="0"
          value="${Number(team.handicap || 0)}"
        >
      </div>
    `;
  }).join("");

  const playerSettings = players.map(player => {
    const selectedTeamId = player.team_id || teams[0].id;

    const options = teams.map(team => {
      const selected = team.id === selectedTeamId ? "selected" : "";
      return `<option value="${team.id}" ${selected}>${escapeHtml(team.name)}</option>`;
    }).join("");

    return `
      <div class="manual-player-row">
        <strong>${escapeHtml(player.name)}</strong>
        <select class="manual-player-team" data-player-id="${player.id}">
          ${options || teamOptions}
        </select>
      </div>
    `;
  }).join("");

  manualTeamBuilder.innerHTML = `
    <div class="manual-builder-box">
      <div class="section-top manual-builder-top">
        <span class="step">Teams</span>
        <h2>Zelf teams kiezen</h2>
        <p class="hint">
          Kies per speler een team. Als een team minder spelers heeft, kun je optioneel handicap/strafpunten invullen. Laat dit op 0 als je geen handicap wilt gebruiken.
        </p>
      </div>

      <div class="manual-team-grid">
        ${teamSettings}
      </div>

      <div class="manual-player-list">
        ${playerSettings}
      </div>

      <button id="save-manual-teams-btn" class="secondary-btn">Zelf gekozen teams opslaan</button>
    </div>
  `;

  document
    .getElementById("save-manual-teams-btn")
    .addEventListener("click", saveManualTeams);
}

async function saveManualTeams() {
  const teamNameInputs = manualTeamBuilder.querySelectorAll(".manual-team-name");
  const handicapInputs = manualTeamBuilder.querySelectorAll(".manual-team-handicap");
  const playerSelects = manualTeamBuilder.querySelectorAll(".manual-player-team");

  const teamUpdates = [];

  teamNameInputs.forEach(input => {
    const teamId = input.dataset.teamId;
    const name = input.value.trim() || "Team";

    teamUpdates.push(
      db
        .from("teams")
        .update({ name })
        .eq("id", teamId)
    );
  });

  handicapInputs.forEach(input => {
    const teamId = input.dataset.teamId;
    const handicap = Number(input.value || 0);

    teamUpdates.push(
      db
        .from("teams")
        .update({ handicap })
        .eq("id", teamId)
    );
  });

  const playerUpdates = [];

  playerSelects.forEach(select => {
    const playerId = select.dataset.playerId;
    const teamId = select.value;

    playerUpdates.push(
      db
        .from("players")
        .update({ team_id: teamId })
        .eq("id", playerId)
    );
  });

  const results = await Promise.all([...teamUpdates, ...playerUpdates]);
  const hasError = results.some(result => result.error);

  if (hasError) {
    console.error(results);
    await showMessage("Zelf gekozen teams opslaan is niet gelukt.", "Er ging iets mis");
    return;
  }

  await reloadGameData();

  updateActiveGameInfo();
  renderPlayers();
  renderTeams();
  renderManualTeamBuilder();
  renderStandings();

  showToast("Zelf gekozen teams zijn opgeslagen.", "success");
}

async function deleteExistingTeams() {
  await db
    .from("players")
    .update({ team_id: null })
    .eq("game_id", currentGame.id);

  await db
    .from("teams")
    .delete()
    .eq("game_id", currentGame.id);
}

function renderTeams() {
  teamsList.innerHTML = "";

  if (!needsTeams()) {
    return;
  }

  if (teams.length === 0) {
    teamsList.innerHTML = `<p class="hint">Nog geen teams gemaakt.</p>`;
    return;
  }

  teams.forEach(team => {
    const teamPlayers = players.filter(player => player.team_id === team.id);
    const handicap = Number(team.handicap || 0);

    const card = document.createElement("div");
    card.className = "team-card";

    card.innerHTML = `
      <strong>${escapeHtml(team.name)}</strong>
      <span>${teamPlayers.map(player => escapeHtml(player.name)).join(", ") || "Geen spelers"}</span>
      ${handicap > 0 ? `<small>Handicap/strafpunten: +${handicap}</small>` : ""}
    `;

    teamsList.appendChild(card);
  });
}

async function openScores() {
  if (players.length === 0) {
    await showMessage("Voeg eerst minimaal één speler toe.", "Geen spelers");
    return;
  }

  if (currentGame.expected_players && players.length < currentGame.expected_players) {
    const doorgaan = await showConfirm(
      "Nog niet alle spelers zijn toegevoegd. Toch doorgaan naar scores?",
      "Nog niet compleet"
    );

    if (!doorgaan) return;
  }

  if (needsTeams() && teams.length === 0) {
    await showMessage("Maak eerst random teams of kies zelf teams.", "Teams ontbreken");
    return;
  }

  const playersWithoutTeam = players.filter(player => !player.team_id);

  if (needsTeams() && playersWithoutTeam.length > 0) {
    await showMessage("Niet alle spelers zitten in een team. Kies eerst random teams of sla zelf gekozen teams op.", "Teams niet compleet");
    return;
  }

  await reloadGameData();

  fillHoleSelect();

  playersSection.classList.add("hidden");
  scoreSection.classList.remove("hidden");
  standingsSection.classList.remove("hidden");

  updateActiveGameInfo();
  renderScoreInputs();
  renderStandings();

  scoreSection.scrollIntoView({ behavior: "smooth" });
}

function backToPlayers() {
  scoreSection.classList.add("hidden");
  standingsSection.classList.add("hidden");
  playersSection.classList.remove("hidden");

  playersSection.scrollIntoView({ behavior: "smooth" });
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

function renderScoreInputs() {
  scoreList.innerHTML = "";

  const holeNumber = Number(holeSelect.value);

  players.forEach(player => {
    const existingScore = scores.find(score => {
      return score.player_id === player.id && score.hole_number === holeNumber;
    });

    const team = teams.find(team => team.id === player.team_id);

    const item = document.createElement("div");
    item.className = "score-item";

    item.innerHTML = `
      <div>
        <strong>${escapeHtml(player.name)}</strong>
        <div class="score-meta">${needsTeams() && team ? escapeHtml(team.name) : "Iedereen apart"}</div>
      </div>
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
    await showMessage("Maak eerst een spel aan.", "Geen spel actief");
    return;
  }

  const holeNumber = Number(holeSelect.value);
  const inputs = scoreList.querySelectorAll("input");

  const rows = [];

  inputs.forEach(input => {
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
    await showMessage("Vul minimaal één score in.", "Geen score ingevuld");
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
  saveScoresBtn.textContent = "Scores opslaan / aanpassen";

  if (error) {
    console.error(error);
    await showMessage("Scores opslaan is niet gelukt.", "Er ging iets mis");
    return;
  }

  await reloadGameData();

  renderScoreInputs();
  renderStandings();

  showToast("Scores opgeslagen.", "success");
}

function renderStandings() {
  standingsList.innerHTML = "";

  if (scorecardTable) {
    scorecardTable.innerHTML = "";
  }

  if (!currentGame) return;

  renderScorecard();

  if (!needsTeams()) {
    renderSoloStandings();
  } else {
    renderTeamStandings();
  }
}

function renderScorecard() {
  if (!scorecardTable) return;

  const holes = [];

  for (let i = 1; i <= currentGame.holes; i++) {
    holes.push(i);
  }

  let rows = [];

  if (!needsTeams()) {
    rows = players.map(player => {
      return {
        name: player.name,
        sub: "",
        playerIds: [player.id],
        handicap: 0
      };
    });
  } else {
    rows = teams.map(team => {
      const teamPlayers = players.filter(player => player.team_id === team.id);

      return {
        name: team.name,
        sub: teamPlayers.map(player => player.name).join(", "),
        playerIds: teamPlayers.map(player => player.id),
        handicap: Number(team.handicap || 0)
      };
    });
  }

  const headerCells = holes
    .map(hole => `<th>H${hole}</th>`)
    .join("");

  const bodyRows = rows.map(row => {
    const holeCells = holes.map(hole => {
      const holeScores = scores.filter(score => {
        return row.playerIds.includes(score.player_id) && score.hole_number === hole;
      });

      const hasScore = holeScores.length > 0;

      const holeTotal = holeScores.reduce((sum, score) => {
        return sum + Number(score.score);
      }, 0);

      return `<td>${hasScore ? holeTotal : "-"}</td>`;
    }).join("");

    const scoreTotal = scores
      .filter(score => row.playerIds.includes(score.player_id))
      .reduce((sum, score) => sum + Number(score.score), 0);

    const total = scoreTotal + row.handicap;

    return `
      <tr>
        <th class="scorecard-name">
          ${escapeHtml(row.name)}
          ${row.sub ? `<small>${escapeHtml(row.sub)}</small>` : ""}
          ${row.handicap > 0 ? `<small>Handicap: +${row.handicap}</small>` : ""}
        </th>
        ${holeCells}
        <td class="scorecard-total">${total}</td>
      </tr>
    `;
  }).join("");

  scorecardTable.innerHTML = `
    <div class="scorecard-scroll">
      <table>
        <thead>
          <tr>
            <th>Naam</th>
            ${headerCells}
            <th>Totaal</th>
          </tr>
        </thead>
        <tbody>
          ${bodyRows}
        </tbody>
      </table>
    </div>
  `;
}

function renderSoloStandings() {
  const standings = players.map(player => {
    const total = scores
      .filter(score => score.player_id === player.id)
      .reduce((sum, score) => sum + Number(score.score), 0);

    return {
      name: player.name,
      total
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

function renderTeamStandings() {
  const standings = teams.map(team => {
    const teamPlayers = players.filter(player => player.team_id === team.id);
    const playerIds = teamPlayers.map(player => player.id);

    const scoreTotal = scores
      .filter(score => playerIds.includes(score.player_id))
      .reduce((sum, score) => sum + Number(score.score), 0);

    const handicap = Number(team.handicap || 0);
    const total = scoreTotal + handicap;

    return {
      name: team.name,
      players: teamPlayers.map(player => player.name),
      handicap,
      total
    };
  });

  standings.sort((a, b) => a.total - b.total);

  standings.forEach((team, index) => {
    const item = document.createElement("div");
    item.className = "standing-item";

    item.innerHTML = `
      <span class="standing-rank">${index + 1}</span>
      <span class="standing-main">
        <strong>${escapeHtml(team.name)}</strong>
        <div class="score-meta">
          ${team.players.map(escapeHtml).join(", ")}
          ${team.handicap > 0 ? ` · handicap +${team.handicap}` : ""}
        </div>
      </span>
      <span class="standing-score">${team.total}</span>
    `;

    standingsList.appendChild(item);
  });
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast-hide");
  }, 2200);

  setTimeout(() => {
    toast.remove();
  }, 2800);
}

function showMessage(message, title = "Melding") {
  return showModal({
    title,
    message,
    icon: "⛳",
    confirmText: "Oké",
    hideCancel: true
  });
}

function showConfirm(message, title = "Weet je het zeker?") {
  return showModal({
    title,
    message,
    icon: "⚠️",
    confirmText: "Ja",
    cancelText: "Annuleren",
    hideCancel: false
  });
}

function showPrompt(message, value = "", title = "Aanpassen") {
  return showModal({
    title,
    message,
    icon: "✏️",
    confirmText: "Opslaan",
    cancelText: "Annuleren",
    hideCancel: false,
    showInput: true,
    inputValue: value
  });
}

function showModal(options) {
  modalTitle.textContent = options.title || "Melding";
  modalMessage.textContent = options.message || "";
  modalIcon.textContent = options.icon || "⛳";

  modalConfirmBtn.textContent = options.confirmText || "Oké";
  modalCancelBtn.textContent = options.cancelText || "Annuleren";

  if (options.hideCancel) {
    modalCancelBtn.classList.add("hidden");
  } else {
    modalCancelBtn.classList.remove("hidden");
  }

  if (options.showInput) {
    modalInput.classList.remove("hidden");
    modalInput.value = options.inputValue || "";
  } else {
    modalInput.classList.add("hidden");
    modalInput.value = "";
  }

  modalBackdrop.classList.remove("hidden");

  setTimeout(() => {
    if (options.showInput) {
      modalInput.focus();
      modalInput.select();
    } else {
      modalConfirmBtn.focus();
    }
  }, 50);

  return new Promise(resolve => {
    modalResolve = result => {
      if (options.showInput) {
        resolve(result ? modalInput.value : null);
      } else {
        resolve(result);
      }
    };
  });
}

function closeModal(result) {
  modalBackdrop.classList.add("hidden");

  if (modalResolve) {
    modalResolve(result);
    modalResolve = null;
  }
}

function modeLabel(mode) {
  if (mode === "duos") return "Duo’s";
  if (mode === "teams") return "Teams";
  return "Iedereen apart";
}

function shuffle(array) {
  return array
    .map(value => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(item => item.value);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}

function escapeAttribute(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
