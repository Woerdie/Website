const SUPABASE_URL = "https://rdlkdglzfjniwamumucb.supabase.co";
const SUPABASE_KEY = "sb_publishable_AT7MYeDMdYFer6a8HL6LQA_P5_Itx3S";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const STORAGE_KEY = "pubgolf_my_games";
const STEP_KEY = "pubgolf_current_step";

let currentGame = null;
let players = [];
let teams = [];
let scores = [];
let modalResolve = null;
let realtimeChannel = null;
let refreshTimer = null;

// Dom selecties
const loadingScreen = document.getElementById("loading-screen");
const savedGamesSection = document.getElementById("saved-games-section");
const savedGamesList = document.getElementById("saved-games-list");
const createGameSection = document.getElementById("create-game-section");
const playersSection = document.getElementById("players-section");
const scoreSection = document.getElementById("score-section");
const standingsSection = document.getElementById("standings-section");
const activeGameBox = document.getElementById("active-game-box");

const gameNameInput = document.getElementById("game-name");
const gameHolesInput = document.getElementById("game-holes");
const expectedPlayersInput = document.getElementById("expected-players");
const gameModeInput = document.getElementById("game-mode");
const scoreModeInput = document.getElementById("score-mode");
const runtimeScoreModeInput = document.getElementById("runtime-score-mode");
const teamSizeWrap = document.getElementById("team-size-wrap");
const teamSizeInput = document.getElementById("team-size");

const createGameBtn = document.getElementById("create-game-btn");
const activeGameName = document.getElementById("active-game-name");
const activeGameInfo = document.getElementById("active-game-info");
const shareLink = document.getElementById("share-link");
const scoreShareLink = document.getElementById("score-share-link");
const scorecardTable = document.getElementById("scorecard-table");
const leaderBox = document.getElementById("leader-box");

const playerNameInput = document.getElementById("player-name");
const addPlayerBtn = document.getElementById("add-player-btn");
const playersList = document.getElementById("players-list");
const playerCounter = document.getElementById("player-counter");

const teamChoiceActions = document.getElementById("team-choice-actions");
const randomTeamsBtn = document.getElementById("random-teams-btn");
const manualTeamsBtn = document.getElementById("manual-teams-btn");
const manualTeamBuilder = document.getElementById("manual-team-builder");

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
const modalCustomContent = document.getElementById("modal-custom-content");
const modalInput = document.getElementById("modal-input");
const modalCancelBtn = document.getElementById("modal-cancel-btn");
const modalConfirmBtn = document.getElementById("modal-confirm-btn");

// Bindings
createGameBtn.addEventListener("click", createGame);
addPlayerBtn.addEventListener("click", addPlayer);
randomTeamsBtn.addEventListener("click", makeRandomTeams);
manualTeamsBtn.addEventListener("click", openManualTeams);
goScoreBtn.addEventListener("click", openScores);
saveScoresBtn.addEventListener("click", saveScores);
holeSelect.addEventListener("change", renderScoreInputs);
gameModeInput.addEventListener("change", toggleTeamSize);
resetScoresBtn.addEventListener("click", resetScores);
deleteGameBtn.addEventListener("click", deleteGame);
endGameBtn.addEventListener("click", endGame);
editPlayersBtn.addEventListener("click", backToPlayers);
runtimeScoreModeInput.addEventListener("change", updateRuntimeScoreMode);

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

const PUBGOLF_PENALTIES = [
    { text: "Rietje gebruikt / verkeerd gedronken (+1)", value: 1 },
    { text: "Lying / Liegen over aantal slokken (+2)", value: 2 },
    { text: "Gemorst of drank achtergelaten (+2)", value: 2 },
    { text: "Verkeerde volgorde of valse start (+3)", value: 3 },
    { text: "Glas laten vallen / Breuk (+5)", value: 5 },
    { text: "Kotser / Spugen / Opgeven (+10)", value: 10 }
];

init();

async function init() {
    toggleTeamSize();
    const gameId = new URLSearchParams(window.location.search).get("game");
    if (gameId) {
        await loadGame(gameId);
    } else {
        createGameSection.classList.remove("hidden");
        savedGamesSection.classList.remove("hidden");
        await loadSavedGames();
    }
    
    // Verberg het laadscherm pas als alles volledig klaar staat
    hideLoadingScreen();
}

function hideLoadingScreen() {
    if (loadingScreen) {
        loadingScreen.classList.add("fade-out");
        // Haal het na de animatie helemaal uit de DOM structuur zodat knoppen klikbaar zijn
        setTimeout(() => {
            loadingScreen.style.display = "none";
        }, 400);
    }
}

function toggleTeamSize() {
    if (gameModeInput.value === "teams") {
        teamSizeWrap.classList.remove("hidden");
    } else {
        teamSizeWrap.classList.add("hidden");
    }
}

function getMyGameIds() {
    try {
        const ids = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return Array.isArray(ids) ? ids : [];
    } catch { return []; }
}

function rememberGame(gameId) {
    const ids = getMyGameIds().filter(id => id !== gameId);
    ids.unshift(gameId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(0, 20)));
}

function forgetGame(gameId) {
    const ids = getMyGameIds().filter(id => id !== gameId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    localStorage.removeItem(STEP_KEY);
}

function isEnded() {
    return Boolean(currentGame) && currentGame.status === "ended";
}

async function blockIfEnded() {
    if (!isEnded()) return false;
    await showMessage("Dit spel is beëindigd. Je kunt geen wijzigingen meer maken.", "Spel afgelopen");
    return true;
}

function getEffectiveMode() {
    if (!currentGame) return "solo";
    if (players.length <= 2) return "solo";
    return currentGame.mode;
}

function setSavedStep(stepName) {
    localStorage.setItem(STEP_KEY, stepName);
}

function needsTeams() {
    const effectiveMode = getEffectiveMode();
    return effectiveMode === "duos" || effectiveMode === "teams";
}

function getTeamSize() {
    const effectiveMode = getEffectiveMode();
    if (effectiveMode === "duos") return 2;
    if (effectiveMode === "teams") return Number(currentGame.team_size || 2);
    return 1;
}

function getRequiredTeamCount() {
    if (!needsTeams()) return 0;
    return Math.ceil(players.length / getTeamSize());
}

function useTeamScoreMode() {
    return needsTeams() && currentGame.score_mode === "team";
}

function getScoreTargets() {
    if (useTeamScoreMode()) {
        return teams.map(team => ({
            type: "team",
            id: team.id,
            name: team.name,
            sub: players.filter(p => p.team_id === team.id).map(p => p.name).join(", ")
        }));
    }
    return players.map(player => {
        const team = teams.find(t => t.id === player.team_id);
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
        return target.type === "team" ? score.team_id === target.id : score.player_id === target.id;
    });
}

function isHoleComplete(holeNumber) {
    const targets = getScoreTargets();
    if (targets.length === 0) return false;
    return targets.every(target => Boolean(getExistingScore(target, holeNumber)));
}

function getFirstIncompleteHole() {
    for (let hole = 1; hole <= Number(currentGame.holes); hole++) {
        if (!isHoleComplete(hole)) return hole;
    }
    return null;
}

function modeLabel(mode) {
    if (mode === "solo") return "Iedereen apart";
    if (mode === "duos") return "Duo's";
    if (mode === "teams") return "Teams";
    return mode;
}

async function loadSavedGames() {
    const myIds = getMyGameIds();
    if (myIds.length === 0) {
        savedGamesList.innerHTML = `<p style="color:#666; font-style:italic;">Nog geen opgeslagen games op dit apparaat.</p>`;
        return;
    }

    const { data, error } = await db.from("games").select("*").in("id", myIds).order("created_at", { ascending: false }).limit(12);
    if (error) {
        savedGamesList.innerHTML = `<p style="color:var(--danger-color);">Games laden mislukt.</p>`;
        return;
    }

    const foundIds = (data || []).map(g => g.id);
    myIds.filter(id => !foundIds.includes(id)).forEach(id => forgetGame(id));

    if (!data || data.length === 0) {
        savedGamesList.innerHTML = `<p style="color:#666; font-style:italic;">Geen spellen gevonden.</p>`;
        return;
    }

    savedGamesList.innerHTML = "";
    data.forEach(game => {
        const btn = document.createElement("button");
        btn.style.width = "100%";
        btn.style.textAlign = "left";
        btn.style.background = "#fff";
        btn.style.border = "1px solid var(--border-color)";
        btn.style.marginBottom = "8px";
        btn.style.display = "block";

        const status = game.status === "ended" ? "Afgelopen" : "Actief";
        btn.innerHTML = `<strong>${escapeHtml(game.name)}</strong><br><span style="font-size:0.8rem; color:#666;">${game.holes} holes · ${modeLabel(game.mode)} · ${status}</span>`;
        btn.onclick = () => window.location.href = `?game=${game.id}`;
        savedGamesList.appendChild(btn);
    });
}

async function createGame() {
    const name = gameNameInput.value.trim();
    const holes = Number(gameHolesInput.value);
    const expectedPlayers = Number(expectedPlayersInput.value);
    const mode = gameModeInput.value;
    const scoreMode = scoreModeInput.value;

    let teamSize = mode === "duos" ? 2 : (mode === "teams" ? Number(teamSizeInput.value) : 1);

    if (!name) return showMessage("Vul eerst een naam voor het spel in.", "Naam ontbreekt");
    if (!holes || holes < 1) return showMessage("Vul een geldig aantal holes in.", "Holes incorrect");

    createGameBtn.disabled = true;
    const { data, error } = await db.from("games").insert({
        name, holes, mode, score_mode: scoreMode, expected_players: expectedPlayers, team_size: teamSize, status: "active"
    }).select().single();

    if (error) {
        createGameBtn.disabled = false;
        return showMessage("Spel maken mislukt.", "Fout");
    }

    rememberGame(data.id);
    setSavedStep("players");
    window.location.href = `?game=${data.id}`;
}

async function loadGame(gameId) {
    const { data: game, error } = await db.from("games").select("*").eq("id", gameId).single();
    if (error) {
        forgetGame(gameId);
        return showMessage("Game kon niet worden geladen.", "Niet gevonden");
    }

    currentGame = game;
    rememberGame(game.id);
    await reloadGameData();
    subscribeRealtime();

    savedGamesSection.classList.add("hidden");
    createGameSection.classList.add("hidden");
    activeGameBox.classList.remove("hidden");

    runtimeScoreModeInput.value = currentGame.score_mode;

    if (isEnded()) {
        playersSection.classList.add("hidden");
        scoreSection.classList.add("hidden");
        standingsSection.classList.remove("hidden");
        updateActiveGameInfo();
        renderStandings();
        return;
    }

    const savedStep = localStorage.getItem(STEP_KEY);
    
    if (savedStep === "scores") {
        playersSection.classList.add("hidden");
        scoreSection.classList.remove("hidden");
        standingsSection.classList.remove("hidden");
        fillHoleSelect(true);
        renderScoreInputs();
    } else {
        playersSection.classList.remove("hidden");
        scoreSection.classList.add("hidden");
        standingsSection.classList.add("hidden");
        renderPlayers();
        renderTeams();
    }

    updateActiveGameInfo();
    renderStandings();
}

function subscribeRealtime() {
    if (realtimeChannel) db.removeChannel(realtimeChannel);
    realtimeChannel = db.channel(`game-${currentGame.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "scores", filter: `game_id=eq.${currentGame.id}` }, scheduleRemoteRefresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "players", filter: `game_id=eq.${currentGame.id}` }, scheduleRemoteRefresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "teams", filter: `game_id=eq.${currentGame.id}` }, scheduleRemoteRefresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "games", filter: `id=eq.${currentGame.id}` }, scheduleRemoteRefresh)
        .subscribe();
}

function scheduleRemoteRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(silentRefresh, 400);
}

async function silentRefresh() {
    if (!currentGame) return;
    const { data: game } = await db.from("games").select("*").eq("id", currentGame.id).single();
    if (game) currentGame = game;

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
        fillHoleSelect(false);
        renderScoreInputs();
    }

    if (!standingsSection.classList.contains("hidden")) {
        renderStandings();
    }
}

async function updateRuntimeScoreMode() {
    if (await blockIfEnded()) return;
    const newScoreMode = runtimeScoreModeInput.value;

    const { error } = await db.from("games").update({ score_mode: newScoreMode }).eq("id", currentGame.id);
    if (error) {
        showToast("Telling aanpassen mislukt", "error");
        runtimeScoreModeInput.value = currentGame.score_mode;
        return;
    }
    currentGame.score_mode = newScoreMode;
    showToast("Score-telling aangepast!", "success");
    await silentRefresh();
}

async function reloadGameData() {
    const pRes = await db.from("players").select("*").eq("game_id", currentGame.id).order("created_at", { ascending: true });
    const tRes = await db.from("teams").select("*").eq("game_id", currentGame.id).order("created_at", { ascending: true });
    const sRes = await db.from("scores").select("*").eq("game_id", currentGame.id);

    players = pRes.data || [];
    teams = tRes.data || [];
    scores = sRes.data || [];
}

function updateActiveGameInfo() {
    activeGameName.textContent = currentGame.name;
    const modeText = players.length <= 2 ? "Iedereen apart" : modeLabel(currentGame.mode);
    const scoreModeText = useTeamScoreMode() ? "per team" : "per speler";
    activeGameInfo.textContent = `${currentGame.holes} holes · ${modeText} (${scoreModeText}) · ${players.length} speler(s)`;

    const url = `${window.location.origin}${window.location.pathname}?game=${currentGame.id}`;
    shareLink.onclick = (e) => { e.preventDefault(); shareGame(url); };
    scoreShareLink.onclick = (e) => { e.preventDefault(); shareGame(url); };
}

async function shareGame(url) {
    if (navigator.share) {
        try { await navigator.share({ title: "Pubgolf", url }); return; } catch {}
    }
    try {
        await navigator.clipboard.writeText(url);
        showToast("Deellink gekopieerd!", "success");
    } catch {
        await showMessage(url, "Kopieer link");
    }
}

async function addPlayer() {
    if (await blockIfEnded()) return;
    const name = playerNameInput.value.trim();
    if (!name) return showMessage("Vul een naam in.", "Fout");

    addPlayerBtn.disabled = true;
    const { data, error } = await db.from("players").insert({ game_id: currentGame.id, name }).select().single();
    addPlayerBtn.disabled = false;

    if (error) return showToast("Speler toevoegen mislukt", "error");

    players.push(data);
    playerNameInput.value = "";
    playerNameInput.focus();
    renderPlayers();
    renderTeams();
}

function renderPlayers() {
    playersList.innerHTML = "";
    playerCounter.textContent = `${players.length} spelers aangemeld.`;

    if (players.length === 0) {
        playersList.innerHTML = `<p style="color:#999; font-style:italic;">Nog geen spelers.</p>`;
        teamChoiceActions.classList.add("hidden");
        return;
    }

    teamChoiceActions.classList.toggle("hidden", !needsTeams());

    players.forEach((player, i) => {
        const team = teams.find(t => t.id === player.team_id);
        const item = document.createElement("div");
        item.style.display = "flex";
        item.style.justify = "space-between";
        item.style.padding = "8px 0";
        item.style.borderBottom = "1px solid #eee";
        item.innerHTML = `
            <div><strong>${i+1}. ${escapeHtml(player.name)}</strong> <span style="font-size:0.8rem; color:gray;">${team && needsTeams() ? `[${team.name}]` : ''}</span></div>
            <div><button style="min-height:30px; height:30px; padding:2px 8px; font-size:0.8rem;" onclick="deletePlayer('${player.id}')">X</button></div>
        `;
        playersList.appendChild(item);
    });
}

async function deletePlayer(id) {
    if (await blockIfEnded()) return;
    await db.from("players").delete().eq("id", id);
    await silentRefresh();
}

async function deleteExistingTeams() {
    if(teams.length > 0) {
        const teamIds = teams.map(t => t.id);
        await db.from("players").update({ team_id: null }).in("team_id", teamIds);
        await db.from("teams").delete().in("id", teamIds);
    }
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

async function makeRandomTeams() {
    if (await blockIfEnded()) return;
    randomTeamsBtn.disabled = true;
    await deleteExistingTeams();

    const teamSize = getTeamSize();
    const shuffled = shuffle([...players]);
    const teamCount = Math.ceil(shuffled.length / teamSize);
    const teamRows = [];

    for (let i = 1; i <= teamCount; i++) teamRows.push({ game_id: currentGame.id, name: `Team ${i}`, handicap: 0 });
    const { data: newTeams, error } = await db.from("teams").insert(teamRows).select();

    if (error) { randomTeamsBtn.disabled = false; return showToast("Fout bij teams", "error"); }

    const updates = shuffled.map((player, idx) => {
                const tId = newTeams[Math.floor(idx / teamSize)].id;
                return db.from("players").update({ team_id: tId }).eq("id", player.id);
            });

    await Promise.all(updates);
    randomTeamsBtn.disabled = false;
    await silentRefresh();
    showToast("Random teams gegenereerd!", "success");
}

async function openManualTeams() {
    if (await blockIfEnded()) return;
    await ensureManualTeamsExist();
    await reloadGameData();
    renderManualTeamBuilder();
    manualTeamBuilder.classList.remove("hidden");
}

async function ensureManualTeamsExist() {
    const req = getRequiredTeamCount();
    if (teams.length === req) return;
    await deleteExistingTeams();
    const rows = [];
    for (let i = 1; i <= req; i++) rows.push({ game_id: currentGame.id, name: `Team ${i}`, handicap: 0 });
    await db.from("teams").insert(rows);
}

function renderManualTeamBuilder() {
    if (teams.length === 0) return;
    let html = `<h3>Zelf teams indelen</h3>`;
    players.forEach(p => {
        let options = teams.map(t => `<option value="${t.id}" ${p.team_id===t.id?'selected':''}>${t.name}</option>`).join('');
        html += `<div style="margin-bottom:8px;"><span>${escapeHtml(p.name)}:</span> <select data-pid="${p.id}" class="m-team-sel">${options}</select></div>`;
    });
    html += `<button id="save-m-teams" class="primary-btn" style="width:100%;">Teams opslaan</button>`;
    manualTeamBuilder.innerHTML = html;
    document.getElementById("save-m-teams").addEventListener("click", saveManualTeams);
}

async function saveManualTeams() {
    const selects = manualTeamBuilder.querySelectorAll(".m-team-sel");
    const updates = Array.from(selects).map(sel => {
        return db.from("players").update({ team_id: sel.value }).eq("id", sel.dataset.pid);
    });
    await Promise.all(updates);
    manualTeamBuilder.classList.add("hidden");
    await silentRefresh();
}

function openScores() {
    setSavedStep("scores");
    playersSection.classList.add("hidden");
    scoreSection.classList.remove("hidden");
    standingsSection.classList.remove("hidden");
    fillHoleSelect(true);
    renderScoreInputs();
    renderStandings();
}

function backToPlayers() {
    setSavedStep("players");
    scoreSection.classList.add("hidden");
    standingsSection.classList.add("hidden");
    playersSection.classList.remove("hidden");
}

function fillHoleSelect(selectFirstIncomplete = false) {
    const currentVal = holeSelect.value;
    holeSelect.innerHTML = "";
    for (let i = 1; i <= Number(currentGame.holes); i++) {
        const opt = document.createElement("option");
        opt.value = i;
        opt.textContent = `Hole ${i} ${isHoleComplete(i) ? '✓' : ''}`;
        holeSelect.appendChild(opt);
    }
    if (selectFirstIncomplete) {
        const first = getFirstIncompleteHole();
        if (first) holeSelect.value = first;
    } else if (currentVal) {
        holeSelect.value = currentVal;
    }
}

function renderScoreInputs() {
    const hole = holeSelect.value;
    scoreList.innerHTML = "";
    const targets = getScoreTargets();

    if (targets.length === 0) {
        scoreList.innerHTML = "<p>Voeg eerst spelers of teams toe.</p>";
        return;
    }

    targets.forEach(tgt => {
        const existing = getExistingScore(tgt, hole);
        const baseScore = existing ? existing.score : 0;

        const row = document.createElement("div");
        row.className = "score-row";
        row.innerHTML = `
            <div class="score-info">
                <strong>${escapeHtml(tgt.name)}</strong>
                <div class="sub-text">${escapeHtml(tgt.sub)}</div>
            </div>
            <div class="score-controls">
                <button type="button" class="btn btn-calc" onclick="adjustInput('${tgt.id}', -1)">-</button>
                <input type="number" id="input-${tgt.id}" class="score-input-box" value="${baseScore}" data-id="${tgt.id}">
                <button type="button" class="btn btn-calc" onclick="adjustInput('${tgt.id}', 1)">+</button>
                <button type="button" class="btn btn-penalty" title="Strafpunt toevoegen" onclick="openPenaltyModal('${tgt.id}')">⚠️</button>
            </div>
        `;
        scoreList.appendChild(row);
    });
}

function adjustInput(id, val) {
    const inp = document.getElementById(`input-${id}`);
    if (inp) {
        let current = Number(inp.value) || 0;
        inp.value = Math.max(0, current + val);
    }
}

function openPenaltyModal(targetId) {
    modalIcon.textContent = "⚠️";
    modalTitle.textContent = "Straf uitdelen";
    modalMessage.textContent = "Kies een overtreding om strafpunten direct toe te voegen aan deze hole score:";
    modalInput.classList.add("hidden");
    
    let html = `<div style="display:flex; flex-direction:column; gap:8px;">`;
    PUBGOLF_PENALTIES.forEach(p => {
        html += `<button class="outline-btn" style="text-align:left; justify-content:flex-start;" onclick="applyPenalty('${targetId}', ${p.value})">${p.text}</button>`;
    });
    html += `</div>`;
    modalCustomContent.innerHTML = html;
    
    modalCancelBtn.classList.remove("hidden");
    modalConfirmBtn.classList.add("hidden");
    modalBackdrop.classList.remove("hidden");
}

function applyPenalty(targetId, value) {
    const inp = document.getElementById(`input-${targetId}`);
    if (inp) {
        let current = Number(inp.value) || 0;
        inp.value = current + value;
        showToast(`+${value} strafpunten toegevoegd!`, "success");
    }
    closeModal(false);
}

async function saveScores() {
    if (await blockIfEnded()) return;
    saveScoresBtn.disabled = true;
    const hole = Number(holeSelect.value);
    const inputs = scoreList.querySelectorAll(".score-input-box");
    const upserts = [];

    inputs.forEach(inp => {
        const tId = inp.dataset.id;
        const scoreVal = Number(inp.value) || 0;
        if (scoreVal <= 0) return;

        const isTeam = useTeamScoreMode();
        const existing = scores.find(s => s.hole_number === hole && (isTeam ? s.team_id === tId : s.player_id === tId));

        const row = {
            game_id: currentGame.id,
            hole_number: hole,
            score: scoreVal,
            team_id: isTeam ? tId : null,
            player_id: isTeam ? null : tId
        };
        if (existing) row.id = existing.id;
        upserts.push(db.from("scores").upsert(row));
    });

    await Promise.all(upserts);
    saveScoresBtn.disabled = false;
    showToast("Scores succesvol opgeslagen!", "success");
    await silentRefresh();
}

function renderStandings() {
    leaderBox.innerHTML = "";
    scorecardTable.innerHTML = "";

    const targets = getScoreTargets();
    const totalHoles = Number(currentGame.holes);

    const leaderboard = targets.map(tgt => {
        let total = 0;
        const holeScores = {};
        for (let h = 1; h <= totalHoles; h++) {
            const sc = scores.find(s => s.hole_number === h && (tgt.type === "team" ? s.team_id === tgt.id : s.player_id === tgt.id));
            if (sc) {
                total += sc.score;
                holeScores[h] = sc.score;
            } else {
                holeScores[h] = "-";
            }
        }
        return { ...tgt, total, holeScores };
    }).sort((a, b) => a.total - b.total);

    if (leaderboard.length > 0 && leaderboard[0].total > 0) {
        leaderBox.textContent = `👑 Koploper: ${leaderboard[0].name} (${leaderboard[0].total} slokken)`;
    } else {
        leaderBox.textContent = "Nog geen scores ingevuld.";
    }

    let thead = `<tr><th>Deelnemer</th>`;
    for (let h = 1; h <= totalHoles; h++) thead += `<th>H${h}</th>`;
    thead += `<th>Totaal</th></tr>`;

    let tbody = "";
    leaderboard.forEach(row => {
        tbody += `<tr><td style="text-align:left; font-weight:bold;">${escapeHtml(row.name)}</td>`;
        for (let h = 1; h <= totalHoles; h++) {
            tbody += `<td>${row.holeScores[h]}</td>`;
        }
        tbody += `<td style="font-weight:bold; background:#f8f9fa;">${row.total}</td></tr>`;
    });

    scorecardTable.innerHTML = thead + tbody;
}

async function resetScores() {
    if (await blockIfEnded()) return;
    if (!await showConfirm("Weet je zeker dat je ALLE scores van dit spel wilt wissen?", "Scores resetten")) return;
    await db.from("scores").delete().eq("game_id", currentGame.id);
    await silentRefresh();
}

async function endGame() {
    if (await blockIfEnded()) return;
    if (!await showConfirm("Wil je het spel definitief beëindigen?", "Spel beëindigen")) return;
    await db.from("games").update({ status: "ended" }).eq("id", currentGame.id);
    await silentRefresh();
}

async function deleteGame() {
    if (!await showConfirm("Weet je zeker dat je dit hele spel wilt verwijderen?", "Spel verwijderen")) return;
    forgetGame(currentGame.id);
    await db.from("games").delete().eq("id", currentGame.id);
    window.location.href = window.location.pathname;
}

function showToast(msg, type="success") {
    const t = document.createElement("div");
    t.style.background = type === "success" ? "#2e7d32" : "#d32f2f";
    t.style.color = "white";
    t.style.padding = "12px 20px";
    t.style.borderRadius = "8px";
    t.style.marginBottom = "8px";
    t.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
    t.textContent = msg;
    toastContainer.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

function showMessage(msg, title="Informatie") {
    return new Promise(resolve => {
        modalIcon.textContent = "ℹ️";
        modalTitle.textContent = title;
        modalMessage.textContent = msg;
        modalCustomContent.innerHTML = "";
        modalInput.classList.add("hidden");
        modalCancelBtn.classList.add("hidden");
        modalConfirmBtn.classList.remove("hidden");
        modalBackdrop.classList.remove("hidden");
        modalResolve = resolve;
    });
}

function showConfirm(msg, title="Weet je het zeker?") {
    return new Promise(resolve => {
        modalIcon.textContent = "❓";
        modalTitle.textContent = title;
        modalMessage.textContent = msg;
        modalCustomContent.innerHTML = "";
        modalInput.classList.add("hidden");
        modalCancelBtn.classList.remove("hidden");
        modalConfirmBtn.classList.remove("hidden");
        modalBackdrop.classList.remove("hidden");
        modalResolve = resolve;
    });
}

function closeModal(result) {
    modalBackdrop.classList.add("hidden");
    if (modalResolve) {
        const res = modalResolve;
        modalResolve = null;
        res(result);
    }
}

function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
