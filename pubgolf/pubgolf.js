const SUPABASE_URL = "https://rdlkdglzfjniwamumucb.supabase.co";
const SUPABASE_KEY = "sb_publishable_AT7MYeDMdYFer6a8HL6LQA_P5_Itx3S";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentGame = null;
let players = [];
let teams = [];
let scores = [];

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

const playerNameInput = document.getElementById("player-name");
const addPlayerBtn = document.getElementById("add-player-btn");
const playersList = document.getElementById("players-list");
const playerCounter = document.getElementById("player-counter");
const randomTeamsBtn = document.getElementById("random-teams-btn");
const teamsList = document.getElementById("teams-list");
const goScoreBtn = document.getElementById("go-score-btn");

const holeSelect = document.getElementById("hole-select");
const scoreList = document.getElementById("score-list");
const saveScoresBtn = document.getElementById("save-scores-btn");

const standingsList = document.getElementById("standings-list");

createGameBtn.addEventListener("click", createGame);
addPlayerBtn.addEventListener("click", addPlayer);
randomTeamsBtn.addEventListener("click", makeRandomTeams);
goScoreBtn.addEventListener("click", openScores);
saveScoresBtn.addEventListener("click", saveScores);
holeSelect.addEventListener("change", renderScoreInputs);

gameModeInput.addEventListener("change", toggleTeamSize);
playerNameInput.addEventListener("keydown", event => {
  if (event.key === "Enter") addPlayer();
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

async function loadSavedGames() {
  const { data, error } = await db
    .from("games")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error(error);
    savedGamesList.innerHTML = `<p class="error">Games laden is niet gelukt.</p>`;
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
    alert("Vul eerst een naam voor het spel in.");
    return;
  }

  if (!holes || holes < 1) {
    alert("Vul een geldig aantal holes in.");
    return;
  }

  if (!expectedPlayers || expectedPlayers < 1) {
    alert("Vul een geldig aantal spelers in.");
    return;
  }

  if ((mode === "duos" || mode === "teams") && teamSize < 2) {
    alert("Een team moet minimaal uit 2 personen bestaan.");
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
    alert("Spel maken is niet gelukt.");
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
    alert("Game kon niet worden geladen.");
    return;
  }

  currentGame = game;

  await reloadGameData();

  savedGamesSection.classList.add("hidden");
  createGameSection.classList.add("hidden");
  playersSection.classList.remove("hidden");

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
    alert("Spelers laden is niet gelukt.");
    return;
  }

  const { data: teamData, error: teamError } = await db
    .from("teams")
    .select("*")
    .eq("game_id", currentGame.id)
    .order("created_at", { ascending: true });

  if (teamError) {
    console.error(teamError);
    alert("Teams laden is niet gelukt.");
    return;
  }

  const { data: scoreData, error: scoreError } = await db
    .from("scores")
    .select("*")
    .eq("game_id", currentGame.id);

  if (scoreError) {
    console.error(scoreError);
    alert("Scores laden is niet gelukt.");
    return;
  }

  players = playerData || [];
  teams = teamData || [];
  scores = scoreData || [];
}

function updateActiveGameInfo() {
  activeGameName.textContent = currentGame.name;

  activeGameInfo.textContent =
    `${currentGame.holes} holes · ${modeLabel(currentGame.mode)} · ${players.length}/${currentGame.expected_players || "?"} spelers`;

  const url = `${window.location.origin}${window.location.pathname}?game=${currentGame.id}`;
  shareLink.textContent = `Deellink: ${url}`;
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

  if (currentGame.expected_players && players.length >= currentGame.expected_players) {
    alert("Je hebt het ingestelde aantal spelers al bereikt.");
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
    alert("Speler toevoegen is niet gelukt.");
    return;
  }

  players.push(data);
  playerNameInput.value = "";
  playerNameInput.focus();

  updateActiveGameInfo();
  renderPlayers();
  renderTeams();
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
      item.className = "list-item";

      item.innerHTML = `
        <div>
          <strong>${index + 1}. ${escapeHtml(player.name)}</strong>
          <div class="player-team">${team ? escapeHtml(team.name) : "Nog geen team"}</div>
        </div>
        <span>Speler</span>
      `;

      playersList.appendChild(item);
    });
  }

  if (currentGame.mode === "solo") {
    randomTeamsBtn.classList.add("hidden");
  } else {
    randomTeamsBtn.classList.remove("hidden");
  }
}

async function makeRandomTeams() {
  if (currentGame.mode === "solo") {
    alert("Random teams zijn niet nodig bij solo.");
    return;
  }

  if (players.length < 2) {
    alert("Voeg eerst minimaal 2 spelers toe.");
    return;
  }

  if (currentGame.expected_players && players.length < currentGame.expected_players) {
    const doorgaan = confirm("Nog niet alle spelers zijn toegevoegd. Toch random teams maken?");
    if (!doorgaan) return;
  }

  randomTeamsBtn.disabled = true;
  randomTeamsBtn.textContent = "Teams maken...";

  await deleteExistingTeams();

  const shuffled = shuffle([...players]);
  const teamSize = currentGame.mode === "duos" ? 2 : Number(currentGame.team_size || 2);
  const teamCount = Math.ceil(shuffled.length / teamSize);

  const teamRows = [];

  for (let i = 1; i <= teamCount; i++) {
    teamRows.push({
      game_id: currentGame.id,
      name: `Team ${i}`
    });
  }

  const { data: newTeams, error: teamError } = await db
    .from("teams")
    .insert(teamRows)
    .select();

  if (teamError) {
    console.error(teamError);
    alert("Teams maken is niet gelukt.");
    randomTeamsBtn.disabled = false;
    randomTeamsBtn.textContent = "Random teams maken";
    return;
  }

  const updates = [];

  shuffled.forEach((player, index) => {
    const teamIndex = index % newTeams.length;
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
  renderStandings();

  alert("Random teams zijn gemaakt.");
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

  if (currentGame.mode === "solo") {
    return;
  }

  if (teams.length === 0) {
    teamsList.innerHTML = `<p class="hint">Nog geen teams gemaakt.</p>`;
    return;
  }

  teams.forEach(team => {
    const teamPlayers = players.filter(player => player.team_id === team.id);

    const card = document.createElement("div");
    card.className = "team-card";

    card.innerHTML = `
      <strong>${escapeHtml(team.name)}</strong>
      <span>${teamPlayers.map(player => escapeHtml(player.name)).join(", ") || "Geen spelers"}</span>
    `;

    teamsList.appendChild(card);
  });
}

async function openScores() {
  if (players.length === 0) {
    alert("Voeg eerst minimaal één speler toe.");
    return;
  }

  if (currentGame.expected_players && players.length < currentGame.expected_players) {
    const doorgaan = confirm("Nog niet alle spelers zijn toegevoegd. Toch doorgaan naar scores?");
    if (!doorgaan) return;
  }

  if (currentGame.mode !== "solo" && teams.length === 0) {
    alert("Maak eerst random teams.");
    return;
  }

  await reloadGameData();

  fillHoleSelect();

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
        <div class="score-meta">${team ? escapeHtml(team.name) : "Solo"}</div>
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
    alert("Maak eerst een spel aan.");
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
  saveScoresBtn.textContent = "Scores opslaan / aanpassen";

  if (error) {
    console.error(error);
    alert("Scores opslaan is niet gelukt.");
    return;
  }

  await reloadGameData();

  renderScoreInputs();
  renderStandings();

  alert("Scores opgeslagen.");
}

function renderStandings() {
  standingsList.innerHTML = "";

  if (!currentGame) return;

  if (currentGame.mode === "solo") {
    renderSoloStandings();
  } else {
    renderTeamStandings();
  }
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

    const total = scores
      .filter(score => playerIds.includes(score.player_id))
      .reduce((sum, score) => sum + Number(score.score), 0);

    return {
      name: team.name,
      players: teamPlayers.map(player => player.name),
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
        <div class="score-meta">${team.players.map(escapeHtml).join(", ")}</div>
      </span>
      <span class="standing-score">${team.total}</span>
    `;

    standingsList.appendChild(item);
  });
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
