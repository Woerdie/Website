const SUPABASE_URL = "https://rdlkdglzfjniwamumucb.supabase.co";
const SUPABASE_KEY = "sb_publishable_AT7MYeDMdYFer6a8HL6LQA_P5_Itx3S";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const STORAGE_KEY = "pubgolf_my_games";

let currentGame = null;
let players = [];
let teams = [];
let scores = [];
let modalResolve = null;
let realtimeChannel = null;
let refreshTimer = null;

let penaltyResolve = null;
let penaltyReasons = [];
let penaltyDraft = [];

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
const scoreModeInput = document.getElementById("score-mode");
const teamSizeWrap = document.getElementById("team-size-wrap");
const teamSizeInput = document.getElementById("team-size");

const createGameBtn = document.getElementById("create-game-btn");
const activeGameName = document.getElementById("active-game-name");
const activeGameInfo = document.getElementById("active-game-info");
const shareLink = document.getElementById("share-link");
const scoreShareLink = document.getElementById("score-share-link");
const scorecardTable = document.getElementById("scorecard-table");

const leaderBox = document.getElementById("leader-box");

const editExpectedPlayersInput = document.getElementById("edit-expected-players");
const updateExpectedPlayersBtn = document.getElementById("update-expected-players-btn");

const scoreModeEditWrap = document.getElementById("score-mode-edit-wrap");
const editScoreModeInput = document.getElementById("edit-score-mode");

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
const editPlayersBtn = document.getElementById("edit-players-btn");
const resetScoresBtn = document.getElementById("reset-scores-btn");
const deleteGameBtn = document.getElementById("delete-game-btn");
const endGameBtn = document.getElementById("end-game-btn");

const holeSelect = document.getElementById("hole-select");
const scoreList = document.getElementById("score-list");
const saveScoresBtn = document.getElementById("save-scores-btn");

const toastContainer = document.getElementById("toast-container");
const modalBackdrop = document.getElementById("modal-backdrop");
const modalIcon = document.getElementById("modal-icon");
const modalTitle = document.getElementById("modal-title");
const modalMessage = document.getElementById("modal-message");
const modalInput = document.getElementById("modal-input");
const modalCancelBtn = document.getElementById("modal-cancel-btn");
const modalConfirmBtn = document.getElementById("modal-confirm-btn");

const penaltyBackdrop = document.getElementById("penalty-backdrop");
const penaltyIcon = document.getElementById("penalty-icon");
const penaltyTitle = document.getElementById("penalty-title");
const penaltySubtitle = document.getElementById("penalty-subtitle");
const penaltyReasonList = document.getElementById("penalty-reason-list");
const penaltyNewReason = document.getElementById("penalty-new-reason");
const penaltyNewPoints = document.getElementById("penalty-new-points");
const penaltyAddBtn = document.getElementById("penalty-add-btn");
const penaltyTotal = document.getElementById("penalty-total");
const penaltyCancelBtn = document.getElementById("penalty-cancel-btn");
const penaltyConfirmBtn = document.getElementById("penalty-confirm-btn");

createGameBtn.addEventListener("click", createGame);
addPlayerBtn.addEventListener("click", addPlayer);
randomTeamsBtn.addEventListener("click", makeRandomTeams);
manualTeamsBtn.addEventListener("click", openManualTeams);
goScoreBtn.addEventListener("click", openScores);
saveScoresBtn.addEventListener("click", saveScores);
holeSelect.addEventListener("change", renderScoreInputs);
gameModeInput.addEventListener("change", toggleTeamSize);
updateExpectedPlayersBtn.addEventListener("click", updateExpectedPlayers);
editScoreModeInput.addEventListener("change", updateScoreMode);
resetScoresBtn.addEventListener("click", resetScores);
deleteGameBtn.addEventListener("click", deleteGame);
endGameBtn.addEventListener("click", endGame);

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

penaltyConfirmBtn.addEventListener("click", () => closePenaltyModal(true));
penaltyCancelBtn.addEventListener("click", () => closePenaltyModal(false));
penaltyAddBtn.addEventListener("click", addPenaltyReason);

penaltyBackdrop.addEventListener("click", event => {
  if (event.target === penaltyBackdrop) closePenaltyModal(false);
});

penaltyNewReason.addEventListener("keydown", event => {
  if (event.key === "Enter") addPenaltyReason();
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

/* Mijn games op dit apparaat (localStorage) */

function getMyGameIds() {
  try {
    const ids = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

function rememberGame(gameId) {
  const ids = getMyGameIds().filter(id => id !== gameId);
  ids.unshift(gameId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(0, 20)));
}

function forgetGame(gameId) {
  const ids = getMyGameIds().filter(id => id !== gameId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

function isEnded() {
  return Boolean(currentGame) && currentGame.status === "ended";
}

async function blockIfEnded() {
  if (!isEnded()) return false;

  await showMessage(
    "Dit spel is beëindigd. Je kunt geen wijzigingen meer maken.",
    "Spel afgelopen"
  );

  return true;
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

function useTeamScoreMode() {
  return needsTeams() && currentGame.score_mode === "team";
}

function hasUnevenTeams() {
  if (!needsTeams() || teams.length === 0) return false;

  const teamSizes = teams.map(team => {
    return players.filter(player => player.team_id === team.id).length;
  });

  const usedTeamSizes = teamSizes.filter(size => size > 0);

  if (usedTeamSizes.length <= 1) return false;

  return Math.max(...usedTeamSizes) !== Math.min(...usedTeamSizes);
}

function getScoreTargets() {
  if (useTeamScoreMode()) {
    return teams.map(team => {
      return {
        type: "team",
        id: team.id,
        name: team.name,
        sub: players
          .filter(player => player.team_id === team.id)
          .map(player => player.name)
          .join(", ")
      };
    });
  }

  return players.map(player => {
    const team = teams.find(team => team.id === player.team_id);

    return {
      type: "player",
      id: player.id,
      name: player.name,
      sub: needsTeams() && team ? team.name : ""
    };
  });
}

function getExistingScore(target, holeNumber) {
  return scores.find(score => {
    if (Number(score.hole_number) !== Number(holeNumber)) return false;

    if (target.type === "team") {
      return score.team_id === target.id;
    }

    return score.player_id === target.id;
  });
}

function isHoleComplete(holeNumber) {
  const targets = getScoreTargets();

  if (targets.length === 0) return false;

  return targets.every(target => {
    return Boolean(getExistingScore(target, holeNumber));
  });
}

function getFirstIncompleteHole() {
  for (let hole = 1; hole <= Number(currentGame.holes); hole++) {
    if (!isHoleComplete(hole)) {
      return hole;
    }
  }

  return null;
}

async function loadSavedGames() {
  const myIds = getMyGameIds();

  if (myIds.length === 0) {
    savedGamesList.innerHTML = `<p class="hint">Nog geen opgeslagen games op dit apparaat. Maak een spel aan of open een deellink.</p>`;
    return;
  }

  const { data, error } = await db
    .from("games")
    .select("*")
    .in("id", myIds)
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    console.error(error);
    savedGamesList.innerHTML = `<p class="error">Games laden is niet gelukt.</p>`;
    showToast("Games laden is niet gelukt.", "error");
    return;
  }

  // Verwijderde games opruimen uit localStorage
  const foundIds = (data || []).map(game => game.id);
  myIds
    .filter(id => !foundIds.includes(id))
    .forEach(id => forgetGame(id));

  if (!data || data.length === 0) {
    savedGamesList.innerHTML = `<p class="hint">Nog geen opgeslagen games op dit apparaat. Maak een spel aan of open een deellink.</p>`;
    return;
  }

  savedGamesList.innerHTML = "";

  data.forEach(game => {
    const btn = document.createElement("button");
    btn.className = "saved-game-btn";

    const status = game.status === "ended" ? "Afgelopen" : "Actief";

    btn.innerHTML = `
      <span class="game-row">
        <strong>${escapeHtml(game.name)}</strong>
        <span>${game.holes} holes · ${modeLabel(game.mode)} · ${game.expected_players || "?"} spelers · ${status}</span>
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
  const scoreMode = scoreModeInput.value;

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
      score_mode: scoreMode,
      expected_players: expectedPlayers,
      team_size: teamSize,
      status: "active"
    })
    .select()
    .single();

  createGameBtn.disabled = false;
  createGameBtn.textContent = "Spel maken";

  if (error) {
    console.error(error);
    await showMessage("Spel maken is niet gelukt. Check of je de SQL hebt uitgevoerd.", "Er ging iets mis");
    return;
  }

  rememberGame(data.id);

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
    forgetGame(gameId);
    await showMessage("Game kon niet worden geladen.", "Niet gevonden");
    return;
  }

  currentGame = game;

  rememberGame(game.id);

  await reloadGameData();

  subscribeRealtime();

  savedGamesSection.classList.add("hidden");
  createGameSection.classList.add("hidden");

  if (isEnded()) {
    // Afgelopen spel: alleen de eindstand tonen
    playersSection.classList.add("hidden");
    scoreSection.classList.add("hidden");
    standingsSection.classList.remove("hidden");

    updateActiveGameInfo();
    renderStandings();
    return;
  }

  playersSection.classList.remove("hidden");
  scoreSection.classList.add("hidden");
  standingsSection.classList.add("hidden");

  updateActiveGameInfo();
  renderPlayers();
  renderTeams();
}

/* Realtime sync */

function subscribeRealtime() {
  if (realtimeChannel) {
    db.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }

  realtimeChannel = db
    .channel(`game-${currentGame.id}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "scores", filter: `game_id=eq.${currentGame.id}` },
      scheduleRemoteRefresh
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "players", filter: `game_id=eq.${currentGame.id}` },
      scheduleRemoteRefresh
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "teams", filter: `game_id=eq.${currentGame.id}` },
      scheduleRemoteRefresh
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "games", filter: `id=eq.${currentGame.id}` },
      scheduleRemoteRefresh
    )
    .subscribe();
}

function scheduleRemoteRefresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(silentRefresh, 400);
}

async function silentRefresh() {
  if (!currentGame) return;

  const { data: game } = await db
    .from("games")
    .select("*")
    .eq("id", currentGame.id)
    .single();

  if (game) {
    currentGame = game;
  }

  await reloadGameData();

  updateActiveGameInfo();

  if (isEnded()) {
    playersSection.classList.add("hidden");
    scoreSection.classList.add("hidden");
    standingsSection.classList.remove("hidden");
    renderStandings();
    return;
  }

  if (!playersSection.classList.contains("hidden")) {
    renderPlayers();
    renderTeams();
  }

  if (!scoreSection.classList.contains("hidden")) {
    fillHoleSelect();
    renderScoreInputsPreservingEdits();
  }

  if (!standingsSection.classList.contains("hidden")) {
    renderStandings();
  }
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

  const { data: reasonData } = await db
    .from("penalty_reasons")
    .select("*")
    .eq("game_id", currentGame.id)
    .order("created_at", { ascending: true });

  players = playerData || [];
  teams = teamData || [];
  scores = scoreData || [];
  penaltyReasons = reasonData || [];
}

function updateActiveGameInfo() {
  activeGameName.textContent = currentGame.name;

  if (editExpectedPlayersInput) {
    editExpectedPlayersInput.value = currentGame.expected_players || players.length || 1;
  }

  // Score-modus wisselen alleen tonen als er teams zijn (duo's of teams)
  if (scoreModeEditWrap) {
    if (needsTeams()) {
      scoreModeEditWrap.classList.remove("hidden");
      editScoreModeInput.value = currentGame.score_mode || "player";
    } else {
      scoreModeEditWrap.classList.add("hidden");
    }
  }

  let modeText = modeLabel(currentGame.mode);

  if (players.length <= 2) {
    modeText = "Iedereen apart";
  }

  const scoreModeText = useTeamScoreMode() ? "scores per team" : "scores per speler";
  const statusText = currentGame.status === "ended" ? "afgelopen" : "actief";

  activeGameInfo.textContent =
    `${currentGame.holes} holes · ${modeText} · ${scoreModeText} · ${players.length}/${currentGame.expected_players || "?"} spelers · ${statusText}`;

  const url = `${window.location.origin}${window.location.pathname}?game=${currentGame.id}`;

  setupShareLink(shareLink, url);
  setupShareLink(scoreShareLink, url);
}

function setupShareLink(link, url) {
  if (!link) return;

  link.href = url;
  link.textContent = "Kopiëren";
  link.title = url;

  link.onclick = async event => {
    event.preventDefault();
    await shareGame(url);
  };
}

async function shareGame(url) {
  const text = `Doe mee met Pubgolf: ${url}`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: "Pubgolf scorekaart",
        text,
        url
      });
      return;
    } catch {
      // delen geannuleerd
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    showToast("Deellink gekopieerd.", "success");
  } catch {
    await showMessage(url, "Kopieer deze deellink");
  }
}

async function updateExpectedPlayers() {
  if (await blockIfEnded()) return;

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

async function updateScoreMode() {
  if (await blockIfEnded()) {
    editScoreModeInput.value = currentGame.score_mode || "player";
    return;
  }

  const newMode = editScoreModeInput.value;

  const { error } = await db
    .from("games")
    .update({ score_mode: newMode })
    .eq("id", currentGame.id);

  if (error) {
    console.error(error);
    editScoreModeInput.value = currentGame.score_mode || "player";
    await showMessage("Score-modus aanpassen is niet gelukt.", "Er ging iets mis");
    return;
  }

  currentGame.score_mode = newMode;

  updateActiveGameInfo();
  renderPlayers();
  renderTeams();

  if (!scoreSection.classList.contains("hidden")) renderScoreInputs();
  if (!standingsSection.classList.contains("hidden")) renderStandings();

  showToast(
    newMode === "team" ? "Scores tellen nu per team." : "Scores tellen nu per speler.",
    "success"
  );
}

async function addPlayer() {
  if (!currentGame) {
    await showMessage("Maak eerst een spel aan.", "Geen spel actief");
    return;
  }

  if (await blockIfEnded()) return;

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
          <div class="player-team">${team && needsTeams() ? escapeHtml(team.name) : ""}</div>
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
  if (await blockIfEnded()) return;

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
  if (await blockIfEnded()) return;

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
  if (await blockIfEnded()) return;

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

  const teamSize = getTeamSize();
  const unevenTeamsWillHappen = players.length % teamSize !== 0;

  if (unevenTeamsWillHappen) {
    const doorgaan = await showConfirm(
      `Met ${players.length} spelers en teams van ${teamSize} komen de teams niet gelijk uit. Je kunt straks handicap/strafpunten invullen om dit recht te trekken. Wil je doorgaan?`,
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
    randomTeamsBtn.textContent = "Random teams";
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
  randomTeamsBtn.textContent = "Random teams";

  await reloadGameData();

  updateActiveGameInfo();
  renderPlayers();
  renderTeams();
  renderManualTeamBuilder();
  renderStandings();

  if (hasUnevenTeams()) {
    manualTeamBuilder.classList.remove("hidden");

    await showMessage(
      "De teams zijn niet helemaal gelijk verdeeld. Je kunt hieronder bij 'Zelf teams kiezen' direct handicap/strafpunten invullen. Dit telt automatisch mee in de totaalstand.",
      "Handicap mogelijk nodig"
    );

    manualTeamBuilder.scrollIntoView({ behavior: "smooth", block: "start" });
  } else {
    showToast("Random teams zijn gemaakt.", "success");
  }
}

async function openManualTeams() {
  if (await blockIfEnded()) return;

  if (!needsTeams()) {
    await showMessage("Bij 1 of 2 spelers speel je automatisch iedereen apart.", "Geen teams nodig");
    return;
  }

  if (players.length < 3) {
    await showMessage("Voor teams of duo’s heb je minimaal 3 spelers nodig.", "Te weinig spelers");
    return;
  }

  const teamSize = getTeamSize();

  if (players.length % teamSize !== 0) {
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

function closeManualTeams() {
  manualTeamBuilder.classList.add("hidden");
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
          ${options}
        </select>
      </div>
    `;
  }).join("");

  manualTeamBuilder.innerHTML = `
    <div class="manual-builder-box">
      <div class="section-top manual-builder-top">
        <div class="section-top-split">
          <div>
            <span class="step">Teams</span>
            <h2>Zelf teams kiezen</h2>
            <p class="hint">
              Kies per speler een team. Handicap/strafpunten is optioneel en telt automatisch mee in de totaalstand.
            </p>
          </div>

          <button id="hide-manual-teams-btn" class="outline-btn small-action-btn">Verberg</button>
        </div>
      </div>

      <div class="manual-team-grid">
        ${teamSettings}
      </div>

      <div class="manual-player-list">
        ${playerSettings}
      </div>

      <div class="manual-actions">
        <button id="save-manual-teams-btn" class="secondary-btn">Zelf gekozen teams opslaan</button>
        <button id="collapse-manual-teams-btn" class="outline-btn small-action-btn">Klaar, inklappen</button>
      </div>
    </div>
  `;

  document
    .getElementById("save-manual-teams-btn")
    .addEventListener("click", saveManualTeams);

  document
    .getElementById("hide-manual-teams-btn")
    .addEventListener("click", closeManualTeams);

  document
    .getElementById("collapse-manual-teams-btn")
    .addEventListener("click", closeManualTeams);
}

async function saveManualTeams() {
  if (await blockIfEnded()) return;

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

  showToast("Zelf gekozen teams zijn opgeslagen en handicap telt mee.", "success");
}

async function adjustTeamHandicap(teamId) {
  if (await blockIfEnded()) return;

  const team = teams.find(team => team.id === teamId);

  if (!team) {
    await showMessage("Team niet gevonden.", "Niet gevonden");
    return;
  }

  const newHandicap = await showPrompt(
    `Handicap/strafpunten voor ${team.name}:`,
    String(Number(team.handicap || 0)),
    "Handicap aanpassen"
  );

  if (newHandicap === null) return;

  const cleanValue = Number(newHandicap);

  if (Number.isNaN(cleanValue)) {
    await showMessage("Vul een geldig getal in. Bijvoorbeeld 0, 1, 2 of -1.", "Geen geldig getal");
    return;
  }

  const { error } = await db
    .from("teams")
    .update({ handicap: cleanValue })
    .eq("id", teamId);

  if (error) {
    console.error(error);
    await showMessage("Handicap aanpassen is niet gelukt.", "Er ging iets mis");
    return;
  }

  await reloadGameData();

  updateActiveGameInfo();
  renderPlayers();
  renderTeams();
  renderManualTeamBuilder();
  renderStandings();

  showToast("Handicap is aangepast en telt mee.", "success");
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
      <div class="team-card-header">
        <strong>${escapeHtml(team.name)}</strong>
        <button class="tiny-btn" onclick="adjustTeamHandicap('${team.id}')">Handicap</button>
      </div>

      <span>${teamPlayers.map(player => escapeHtml(player.name)).join(", ") || "Geen spelers"}</span>
      <small>Handicap/strafpunten: ${handicap > 0 ? "+" : ""}${handicap}</small>
    `;

    teamsList.appendChild(card);
  });
}

async function openScores() {
  if (isEnded()) {
    playersSection.classList.add("hidden");
    scoreSection.classList.add("hidden");
    standingsSection.classList.remove("hidden");
    renderStandings();
    return;
  }

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

  fillHoleSelect(true);

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

function fillHoleSelect(selectFirstIncomplete = false) {
  const currentValue = holeSelect.value;

  holeSelect.innerHTML = "";

  for (let i = 1; i <= currentGame.holes; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = isHoleComplete(i) ? `Hole ${i} ✓` : `Hole ${i}`;
    holeSelect.appendChild(option);
  }

  if (selectFirstIncomplete) {
    const firstIncompleteHole = getFirstIncompleteHole();

    if (firstIncompleteHole !== null) {
      holeSelect.value = firstIncompleteHole;
      return;
    }
  }

  if (currentValue) {
    holeSelect.value = currentValue;
  }
}

function renderScoreInputs() {
  scoreList.innerHTML = "";

  const holeNumber = Number(holeSelect.value);
  const targets = getScoreTargets();

  targets.forEach(target => {
    const existingScore = getExistingScore(target, holeNumber);
    const bonusValue = existingScore ? Number(existingScore.bonus || 0) : 0;

    const item = document.createElement("div");
    item.className = "score-item score-control-item";

    item.innerHTML = `
      <div class="score-player-info">
        <strong>${escapeHtml(target.name)}</strong>
        ${target.sub ? `<div class="score-meta">${escapeHtml(target.sub)}</div>` : ""}
      </div>

      <div class="score-controls">
        <button class="score-step-btn" onclick="changeScoreValue('${target.type}', '${target.id}', -1)" aria-label="Score omlaag">−</button>
        <input 
          type="text"
          inputmode="numeric"
          pattern="[0-9]*"
          data-target-type="${target.type}"
          data-target-id="${target.id}"
          class="score-value-input"
          value="${existingScore ? existingScore.score : ""}"
          placeholder="Score"
        >
        <button class="score-step-btn" onclick="changeScoreValue('${target.type}', '${target.id}', 1)" aria-label="Score omhoog">+</button>
      </div>

      <div class="bonus-control">
        <button class="penalty-btn" onclick="openPenaltyModal('${target.type}', '${target.id}')">
          <span class="penalty-btn-icon">🍺</span>
          <span class="penalty-btn-label">Straf</span>
          <span class="penalty-btn-value ${bonusValue !== 0 ? "has-value" : ""}" data-bonus-badge data-target-type="${target.type}" data-target-id="${target.id}">${bonusValue > 0 ? "+" + bonusValue : bonusValue}</span>
        </button>
        <input 
          type="hidden"
          data-target-type="${target.type}"
          data-target-id="${target.id}"
          class="bonus-value-input"
          value="${bonusValue}"
        >
      </div>
    `;

    scoreList.appendChild(item);
  });
}

function setBonusValue(type, id, value) {
  const input = scoreList.querySelector(
    `.bonus-value-input[data-target-type="${type}"][data-target-id="${id}"]`
  );

  if (input) input.value = value;

  const badge = scoreList.querySelector(
    `[data-bonus-badge][data-target-type="${type}"][data-target-id="${id}"]`
  );

  if (badge) {
    badge.textContent = value > 0 ? "+" + value : value;
    badge.classList.toggle("has-value", Number(value) !== 0);
  }
}

function getBonusValue(type, id) {
  const input = scoreList.querySelector(
    `.bonus-value-input[data-target-type="${type}"][data-target-id="${id}"]`
  );

  return input ? Number(input.value || 0) : 0;
}

// Zelfde als renderScoreInputs, maar lokaal ingevulde (nog niet opgeslagen)
// waardes blijven staan bij een realtime update van iemand anders.
function renderScoreInputsPreservingEdits() {
  const edits = [];

  scoreList.querySelectorAll("input").forEach(input => {
    if (input.value !== input.defaultValue) {
      edits.push({
        isBonus: input.classList.contains("bonus-value-input"),
        type: input.dataset.targetType,
        id: input.dataset.targetId,
        value: input.value
      });
    }
  });

  renderScoreInputs();

  edits.forEach(edit => {
    if (edit.isBonus) {
      setBonusValue(edit.type, edit.id, Number(edit.value || 0));
    } else {
      const input = scoreList.querySelector(
        `.score-value-input[data-target-type="${edit.type}"][data-target-id="${edit.id}"]`
      );
      if (input) input.value = edit.value;
    }
  });
}

function changeScoreValue(type, id, amount) {
  const input = scoreList.querySelector(
    `.score-value-input[data-target-type="${type}"][data-target-id="${id}"]`
  );

  if (!input) return;

  const current = Number(input.value || 0);
  const next = Math.max(0, current + amount);

  input.value = next;
}

async function saveScores() {
  if (!currentGame) {
    await showMessage("Maak eerst een spel aan.", "Geen spel actief");
    return;
  }

  if (await blockIfEnded()) return;

  const holeNumber = Number(holeSelect.value);
  const scoreInputs = scoreList.querySelectorAll(".score-value-input");
  const targets = getScoreTargets();
  const rows = [];
  const bonusOnly = [];

  scoreInputs.forEach(input => {
    const targetType = input.dataset.targetType;
    const targetId = input.dataset.targetId;
    const value = input.value.trim();

    const bonusInput = scoreList.querySelector(
      `.bonus-value-input[data-target-type="${targetType}"][data-target-id="${targetId}"]`
    );

    const bonus = Number(bonusInput ? bonusInput.value || 0 : 0);

    if (value !== "") {
      rows.push({
        targetType,
        targetId,
        score: Number(value),
        bonus
      });
    } else if (bonus !== 0) {
      const target = targets.find(target => target.id === targetId);
      bonusOnly.push(target ? target.name : "onbekend");
    }
  });

  if (bonusOnly.length > 0) {
    const doorgaan = await showConfirm(
      `Bij ${bonusOnly.join(", ")} is wel bonus/straf ingevuld maar geen score. Die bonus wordt nog niet opgeslagen. Toch doorgaan met de rest?`,
      "Score ontbreekt"
    );

    if (!doorgaan) return;
  }

  if (rows.length === 0) {
    await showMessage("Vul minimaal één score in.", "Geen score ingevuld");
    return;
  }

  saveScoresBtn.disabled = true;
  saveScoresBtn.textContent = "Opslaan...";

  for (const row of rows) {
    const result = await upsertScore(row, holeNumber);

    if (result.error) {
      console.error(result.error);
      saveScoresBtn.disabled = false;
      saveScoresBtn.textContent = "Scores opslaan & volgende hole";
      await showMessage("Scores opslaan is niet gelukt.", "Er ging iets mis");
      return;
    }
  }

  saveScoresBtn.disabled = false;
  saveScoresBtn.textContent = "Scores opslaan & volgende hole";

  await reloadGameData();

  fillHoleSelect(true);
  renderScoreInputs();
  renderStandings();

  const firstIncompleteHole = getFirstIncompleteHole();

  if (firstIncompleteHole === null) {
    showToast("Scores opgeslagen. Alle holes zijn ingevuld.", "success");
  } else {
    showToast(`Scores opgeslagen. Nu naar hole ${firstIncompleteHole}.`, "success");
  }
}

function findExistingScoreRow(row, holeNumber) {
  let query = db
    .from("scores")
    .select("id")
    .eq("game_id", currentGame.id)
    .eq("hole_number", holeNumber)
    .limit(1);

  if (row.targetType === "team") {
    query = query.eq("team_id", row.targetId);
  } else {
    query = query.eq("player_id", row.targetId);
  }

  return query;
}

async function upsertScore(row, holeNumber) {
  const { data: existing, error: findError } = await findExistingScoreRow(row, holeNumber);

  if (findError) {
    return { error: findError };
  }

  const payload = {
    game_id: currentGame.id,
    hole_number: holeNumber,
    score: row.score,
    bonus: row.bonus,
    updated_at: new Date().toISOString()
  };

  if (row.targetType === "team") {
    payload.team_id = row.targetId;
    payload.player_id = null;
  } else {
    payload.player_id = row.targetId;
    payload.team_id = null;
  }

  if (existing && existing.length > 0) {
    return db
      .from("scores")
      .update(payload)
      .eq("id", existing[0].id);
  }

  const insertResult = await db
    .from("scores")
    .insert(payload);

  // Als iemand anders exact tegelijk dezelfde rij insertte (unique constraint),
  // dan alsnog updaten in plaats van een fout tonen.
  if (insertResult.error && insertResult.error.code === "23505") {
    const { data: retry, error: retryError } = await findExistingScoreRow(row, holeNumber);

    if (retryError) {
      return { error: retryError };
    }

    if (retry && retry.length > 0) {
      return db
        .from("scores")
        .update(payload)
        .eq("id", retry[0].id);
    }
  }

  return insertResult;
}

async function resetScores() {
  if (await blockIfEnded()) return;

  const zeker = await showConfirm(
    "Weet je zeker dat je alle scores wilt wissen? Spelers en teams blijven staan.",
    "Scores resetten"
  );

  if (!zeker) return;

  const { error } = await db
    .from("scores")
    .delete()
    .eq("game_id", currentGame.id);

  if (error) {
    console.error(error);
    await showMessage("Scores resetten is niet gelukt.", "Er ging iets mis");
    return;
  }

  await reloadGameData();

  fillHoleSelect(true);
  renderScoreInputs();
  renderStandings();

  showToast("Scores zijn gereset.", "success");
}

async function deleteGame() {
  const zeker = await showConfirm(
    "Weet je zeker dat je dit hele spel wilt verwijderen? Spelers, teams en scores worden ook verwijderd.",
    "Spel verwijderen"
  );

  if (!zeker) return;

  const { error } = await db
    .from("games")
    .delete()
    .eq("id", currentGame.id);

  if (error) {
    console.error(error);
    await showMessage("Spel verwijderen is niet gelukt.", "Er ging iets mis");
    return;
  }

  forgetGame(currentGame.id);

  showToast("Spel is verwijderd.", "success");

  setTimeout(() => {
    window.location.href = "./";
  }, 800);
}

async function endGame() {
  if (isEnded()) {
    await showMessage("Dit spel is al beëindigd.", "Spel afgelopen");
    return;
  }

  const standings = getStandings();

  if (standings.length === 0) {
    await showMessage("Er is nog geen stand om af te ronden.", "Geen eindstand");
    return;
  }

  const winner = standings[0];

  const zeker = await showConfirm(
    `Wil je het spel beëindigen? Winnaar op dit moment: ${winner.name} met ${winner.total} punten.`,
    "Spel beëindigen"
  );

  if (!zeker) return;

  const { error } = await db
    .from("games")
    .update({
      status: "ended",
      ended_at: new Date().toISOString()
    })
    .eq("id", currentGame.id);

  if (error) {
    console.error(error);
    await showMessage("Spel beëindigen is niet gelukt.", "Er ging iets mis");
    return;
  }

  currentGame.status = "ended";
  currentGame.ended_at = new Date().toISOString();

  // Vanaf nu alleen nog de eindstand tonen
  playersSection.classList.add("hidden");
  scoreSection.classList.add("hidden");
  standingsSection.classList.remove("hidden");

  updateActiveGameInfo();
  renderStandings();

  await showMessage(`🏆 Winnaar: ${winner.name} met ${winner.total} punten.`, "Eindstand");
}

function renderStandings() {
  if (scorecardTable) {
    scorecardTable.innerHTML = "";
  }

  if (!currentGame) return;

  renderLeaderBox();
  renderScorecard();
}

function renderLeaderBox() {
  const standings = getStandings();

  if (!leaderBox || standings.length === 0) {
    leaderBox.classList.add("hidden");
    leaderBox.innerHTML = "";
    return;
  }

  const leader = standings[0];
  const ended = isEnded();

  leaderBox.classList.remove("hidden");
  leaderBox.innerHTML = `
    <div>
      <span>${ended ? "Eindstand · Winnaar" : "Huidige leider"}</span>
      <strong>🏆 ${escapeHtml(leader.name)}</strong>
      <small>${leader.total} punten · laagste score wint</small>
    </div>
  `;
}

function getStandings() {
  if (!currentGame) return [];

  if (!needsTeams()) {
    return players.map(player => {
      const total = scores
        .filter(score => score.player_id === player.id)
        .reduce((sum, score) => sum + Number(score.score) + Number(score.bonus || 0), 0);

      return {
        name: player.name,
        sub: "",
        playerIds: [player.id],
        teamId: null,
        handicap: 0,
        scoreTotal: total,
        total
      };
    }).sort((a, b) => a.total - b.total);
  }

  return teams.map(team => {
    const teamPlayers = players.filter(player => player.team_id === team.id);
    const playerIds = teamPlayers.map(player => player.id);

    let scoreTotal = 0;

    if (useTeamScoreMode()) {
      scoreTotal = scores
        .filter(score => score.team_id === team.id)
        .reduce((sum, score) => sum + Number(score.score) + Number(score.bonus || 0), 0);
    } else {
      scoreTotal = scores
        .filter(score => playerIds.includes(score.player_id))
        .reduce((sum, score) => sum + Number(score.score) + Number(score.bonus || 0), 0);
    }

    const handicap = Number(team.handicap || 0);
    const total = scoreTotal + handicap;

    return {
      name: team.name,
      sub: teamPlayers.map(player => player.name).join(", "),
      playerIds,
      teamId: team.id,
      handicap,
      scoreTotal,
      total
    };
  }).sort((a, b) => a.total - b.total);
}

function renderScorecard() {
  if (!scorecardTable) return;

  const holes = [];

  for (let i = 1; i <= currentGame.holes; i++) {
    holes.push(i);
  }

  const rows = getStandings();

  const headerCells = holes
    .map(hole => `<th>H${hole}</th>`)
    .join("");

  const handicapHeader = needsTeams() ? "<th>Handicap</th>" : "";

  const bodyRows = rows.map((row, index) => {
    const holeCells = holes.map(hole => {
      const holeScores = scores.filter(score => {
        if (Number(score.hole_number) !== Number(hole)) return false;

        if (useTeamScoreMode()) {
          return score.team_id === row.teamId;
        }

        return row.playerIds.includes(score.player_id);
      });

      const hasScore = holeScores.length > 0;

      const holeTotal = holeScores.reduce((sum, score) => {
        return sum + Number(score.score) + Number(score.bonus || 0);
      }, 0);

      return `<td>${hasScore ? holeTotal : "-"}</td>`;
    }).join("");

    const handicapCell = needsTeams()
      ? `<td>${row.handicap > 0 ? "+" : ""}${row.handicap}</td>`
      : "";

    return `
      <tr>
        <th class="scorecard-name">
          <span class="scorecard-rank">${index + 1}</span>
          <span class="scorecard-player">
            ${escapeHtml(row.name)}
            ${row.sub ? `<small>${escapeHtml(row.sub)}</small>` : ""}
            ${row.handicap !== 0 ? `<small>Score ${row.scoreTotal} + handicap ${row.handicap > 0 ? "+" : ""}${row.handicap}</small>` : ""}
          </span>
        </th>
        ${holeCells}
        ${handicapCell}
        <td class="scorecard-total">${row.total}</td>
      </tr>
    `;
  }).join("");

  scorecardTable.innerHTML = `
    <div class="scorecard-scroll">
      <table>
        <thead>
          <tr>
            <th>Stand</th>
            ${headerCells}
            ${handicapHeader}
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

// ── Penalty / strafpunten ─────────────────────────────────────────

const DEFAULT_PENALTY_REASONS = [
  { label: "Glas gemorst", points: 1 },
  { label: "Glas laten vallen", points: 3 },
  { label: "Gelogen over slokken", points: 2 },
  { label: "Slok gemist", points: 1 },
  { label: "Te laat bij de hole", points: 1 }
];

function getPenaltyReasonList() {
  // Eigen (opgeslagen) redenen eerst, daarna de standaardlijst die er nog niet in zit
  const custom = penaltyReasons.map(reason => ({
    label: reason.label,
    points: Number(reason.points || 0),
    id: reason.id
  }));

  const customLabels = custom.map(reason => reason.label.toLowerCase());

  const defaults = DEFAULT_PENALTY_REASONS.filter(
    reason => !customLabels.includes(reason.label.toLowerCase())
  );

  return [...custom, ...defaults];
}

function openPenaltyModal(type, id) {
  const targets = getScoreTargets();
  const target = targets.find(t => t.id === id && t.type === type);

  const startBonus = getBonusValue(type, id);

  // Draft begint bij de huidige bonuswaarde, opgebouwd uit losse strafregels
  penaltyDraft = [];

  if (startBonus !== 0) {
    penaltyDraft.push({ label: "Huidige straf/bonus", points: startBonus, fixed: true });
  }

  penaltyTitle.textContent = "Strafpunten";
  penaltySubtitle.textContent = target ? target.name : "";

  renderPenaltyModal();

  penaltyNewReason.value = "";
  penaltyNewPoints.value = "1";

  penaltyBackdrop.classList.remove("hidden");

  penaltyResolve = async result => {
    penaltyBackdrop.classList.add("hidden");

    if (!result) return;

    const total = penaltyDraftTotal();
    setBonusValue(type, id, total);

    // Nieuw toegevoegde eigen redenen opslaan voor de volgende keer
    await persistNewPenaltyReasons();
  };
}

function penaltyDraftTotal() {
  return penaltyDraft.reduce((sum, item) => sum + Number(item.points || 0), 0);
}

function renderPenaltyModal() {
  const reasons = getPenaltyReasonList();

  const chips = reasons.map((reason, index) => {
    const count = penaltyDraft.filter(d => d.label === reason.label && !d.fixed).length;
    return `
      <button type="button" class="penalty-reason-chip ${count > 0 ? "active" : ""}" data-reason-index="${index}">
        <span class="penalty-reason-label">${escapeHtml(reason.label)}</span>
        <span class="penalty-reason-points">+${reason.points}</span>
        ${count > 0 ? `<span class="penalty-reason-count">${count}×</span>` : ""}
      </button>
    `;
  }).join("");

  const draftLines = penaltyDraft.length === 0
    ? `<p class="hint penalty-empty">Nog geen straf toegevoegd.</p>`
    : penaltyDraft.map((item, index) => `
        <div class="penalty-draft-row">
          <span>${escapeHtml(item.label)}</span>
          <span class="penalty-draft-points">${item.points > 0 ? "+" : ""}${item.points}</span>
          <button type="button" class="penalty-remove-btn" data-draft-index="${index}" aria-label="Verwijderen">×</button>
        </div>
      `).join("");

  penaltyReasonList.innerHTML = `
    <div class="penalty-chip-grid">${chips}</div>
    <div class="penalty-draft-list">${draftLines}</div>
  `;

  penaltyTotal.textContent = penaltyDraftTotal();

  penaltyReasonList.querySelectorAll(".penalty-reason-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const reason = reasons[Number(chip.dataset.reasonIndex)];
      penaltyDraft.push({ label: reason.label, points: Number(reason.points || 0) });
      renderPenaltyModal();
    });
  });

  penaltyReasonList.querySelectorAll(".penalty-remove-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      penaltyDraft.splice(Number(btn.dataset.draftIndex), 1);
      renderPenaltyModal();
    });
  });
}

function addPenaltyReason() {
  const label = penaltyNewReason.value.trim();
  const points = Number(penaltyNewPoints.value || 0);

  if (!label) {
    penaltyNewReason.focus();
    return;
  }

  // Direct toepassen in de draft én onthouden als nieuwe reden
  penaltyDraft.push({ label, points, isNew: true });

  penaltyNewReason.value = "";
  penaltyNewPoints.value = "1";
  penaltyNewReason.focus();

  renderPenaltyModal();
}

async function persistNewPenaltyReasons() {
  const existingLabels = penaltyReasons.map(r => r.label.toLowerCase());

  const seen = new Set();
  const toInsert = [];

  penaltyDraft
    .filter(item => item.isNew)
    .forEach(item => {
      const key = item.label.toLowerCase();
      if (existingLabels.includes(key) || seen.has(key)) return;
      seen.add(key);
      toInsert.push({
        game_id: currentGame.id,
        label: item.label,
        points: Number(item.points || 0)
      });
    });

  if (toInsert.length === 0) return;

  const { error } = await db
    .from("penalty_reasons")
    .insert(toInsert);

  if (error) {
    // Tabel bestaat misschien nog niet; niet blokkerend
    console.warn("Penalty-reden opslaan overgeslagen:", error.message);
    return;
  }

  await reloadGameData();
}

function closePenaltyModal(result) {
  if (penaltyResolve) {
    const resolve = penaltyResolve;
    penaltyResolve = null;
    resolve(result);
  }
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
