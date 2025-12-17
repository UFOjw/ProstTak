// ===== Константы и переменные =====
const RECENT_THRESHOLD = 5 * 1000;
const LAST_VIEW_KEY = "anki_last_viewed";
const CARD_STORAGE_KEY = "anki_cards";
const STATS_KEY = "anki_new_words_by_day";

// === Groups feature ===
const GROUPS_KEY = "anki_groups";
const WORD_META_KEY = "anki_word_meta"; // по карте слова: { groups: [], pinned?: bool }

let currentMode = 'all';     // 'all' | 'group'
let currentGroupId = null;   // id активной группы

let cards = [];
let currentIndex = 0;
let currentCard = null;
let remembered = 0;
let notRemembered = 0;
let isDone = false;
let showFirstMeaningOnly = false;
let wordsPerPage = 100;          // Текущее число слов на странице
let currentPage = 1;             // Текущая страница
let settingsMode = 0;            // 0 — Display, 1 — Sorting, 2 — Page Size
let sortType = 'used';           // 'used' или 'lastSeen'
let sortOrder = 'desc';          // 'desc' или 'asc' (направление сортировки)
let isEditMode = true;
let seenInGroup = new Set(); // для отслеживания просмотренных слов в группе

// ===== DOM Элементы =====
const loadBtn = document.getElementById("loadBtn");
const input = document.getElementById("jsonInput");
const cardArea = document.getElementById("cardArea");
const toggleFormBtn = document.getElementById("toggleFormBtn");
const formContainer = document.getElementById("formContainer");

const phraseEl = document.getElementById("cardPhrase");
const meaningsEl = document.getElementById("cardMeanings");
const counterEl = document.getElementById("cardCounter");
const rememberedEl = document.getElementById("rememberedCount");
const notRememberedEl = document.getElementById("notRememberedCount");
const showDetailsBtn = document.getElementById("showDetailsBtn");

const infoSidebar = document.getElementById("infoSidebar");
const sidebarContent = document.getElementById("sidebarContent");
const closeSidebarBtn = document.getElementById("closeSidebarBtn");

const menuToggle = document.getElementById("menuToggle");
const menuSidebar = document.getElementById("menuSidebar");
const closeMenuBtn = document.getElementById("closeMenuBtn");
const showWordsListBtn = document.getElementById("showWordsListBtn");
const closeWordsListBtn = document.getElementById("closeWordsListBtn");
const wordsListModal = document.getElementById("wordsListModal");
const wordsListContent = document.getElementById("wordsListContent");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const resetProgressBtn = document.getElementById("resetProgressBtn");

const optionsBtn = document.getElementById("optionsBtn");
const optionsModal = document.getElementById("optionsModal");
const closeOptionsBtn = document.getElementById("closeOptionsBtn");
const viewToggle = document.getElementById("viewToggle");
const viewToggleLabel = document.getElementById("viewToggleLabel");

const wordsListModalBox = document.getElementById("wordsListModalBox");
const layout1Btn = document.getElementById("layout1Btn");
const layout2Btn = document.getElementById("layout2Btn");
const layout3Btn = document.getElementById("layout3Btn");

let wordsListLayout = 1; // 1: single, 2: two-column, 3: three-column

const openGroupsBtn = document.getElementById("openGroupsBtn");
const groupsModal = document.getElementById("groupsModal");
const closeGroupsBtn = document.getElementById("closeGroupsBtn");
const newGroupNameInp = document.getElementById("newGroupName");
const createGroupBtn = document.getElementById("createGroupBtn");
const groupsListEl = document.getElementById("groupsList");
const groupBadgeEl = document.getElementById("groupBadge");

// ===== Утилиты =====
const getLocal = (key, fallback = {}) => JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
const setLocal = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const removeClass = (el, cls) => el.classList.remove(cls);
const addClass = (el, cls) => el.classList.add(cls);

const DAILY_STATS_KEY = "anki_daily_stats";
const SETTINGS_KEY = "anki_user_settings";

function getGroups() { return getLocal(GROUPS_KEY, []); }
function setGroups(arr) { setLocal(GROUPS_KEY, arr); }

function getWordMeta() { return getLocal(WORD_META_KEY, {}); }
function setWordMeta(m) { setLocal(WORD_META_KEY, m); }

function getDailyStats() {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const stats = getLocal(DAILY_STATS_KEY, {});
  if (stats.date !== today) {
    // Новый день — сбрасываем статистику
    const fresh = {
      date: today,
      newWords: 0,
      reviewed: 0,
      remembered: 0,
    };
    setLocal(DAILY_STATS_KEY, fresh);
    return fresh;
  }
  return stats;
}

function updateDailyStats(updates = {}) {
  const stats = getDailyStats();
  const newStats = { ...stats, ...updates };
  setLocal(DAILY_STATS_KEY, newStats);
  return newStats;
}

function isMobileDevice() {
  return /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent);
}

// Получить дату в формате YYYY-MM-DD
function getTodayDateStr() {
  return new Date().toISOString().slice(0, 10);
}

// Получить список новых слов за сегодня
function getTodaysNewWords() {
  const stats = getLocal(STATS_KEY, {});
  const today = getTodayDateStr();
  return stats[today] || [];
}

// Добавить новое слово в статистику за сегодня
function addNewWordToday(phrase) {
  const stats = getLocal(STATS_KEY, {});
  const today = getTodayDateStr();
  if (!stats[today]) stats[today] = [];
  if (!stats[today].includes(phrase)) {
    stats[today].push(phrase);
    setLocal(STATS_KEY, stats);
  }
}

// Сбросить счётчик если день сменился
function resetNewWordsIfDayChanged() {
  const stats = getLocal(STATS_KEY, {});
  const today = getTodayDateStr();
  // Если день сменился — оставляем только сегодняшний ключ
  const keys = Object.keys(stats);
  if (keys.length > 0 && !keys.includes(today)) {
    setLocal(STATS_KEY, { [today]: [] });
  }
}

function openGroupsModal() {
  renderGroupsList();
  groupsModal.classList.remove("hidden");
}
function closeGroupsModal() {
  groupsModal.classList.add("hidden");
}

function renderGroupsList() {
  const groups = getGroups();

  if (!groups.length) {
    groupsListEl.innerHTML = `<p class="text-gray-500">No groups yet.</p>`;
    return;
  }

  groupsListEl.innerHTML = groups.map(g => `
    <div class="group-item border rounded p-2 flex items-center justify-between">
      <!-- Левая часть: название группы -->
      <div class="flex items-center gap-2 min-w-0 flex-1">
        <span class="inline-block w-3 h-3 rounded-full" style="background:${g.color || '#a78bfa'}"></span>
        <span class="truncate font-medium text-gray-800">${g.name}</span>
      </div>

      <!-- Правая часть: кнопки -->
      <div class="flex items-center gap-2 flex-shrink-0 justify-end">
        <button data-id="${g.id}" 
                class="start-group bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded text-xs font-semibold">
          Start drill
        </button>

        <div class="relative">
          <button data-id="${g.id}" 
                  class="manage-group bg-gray-200 hover:bg-gray-300 text-gray-800 px-2 py-1 rounded text-xs font-semibold">
            ⋮ Manage
          </button>
          <div class="group-menu hidden absolute right-0 mt-1 bg-white border rounded shadow z-10 w-36 text-sm">
            <button data-id="${g.id}" class="rename-group w-full text-left px-3 py-1 hover:bg-gray-50">✏️ Rename</button>
            <button data-id="${g.id}" class="manual-add w-full text-left px-3 py-1 hover:bg-gray-50">➕ Add manually</button>
            <button data-id="${g.id}" class="import-group w-full text-left px-3 py-1 hover:bg-gray-50">📥 Import JSON</button>
            <button data-id="${g.id}" class="export-group w-full text-left px-3 py-1 hover:bg-gray-50">📤 Export JSON</button>
          </div>
        </div>

        <button data-id="${g.id}" 
                class="delete-group border px-2 py-1 rounded text-xs text-rose-700 border-rose-300 hover:bg-rose-50">
          Delete
        </button>
      </div>
    </div>
  `).join("");

  // Обработчики
  groupsListEl.querySelectorAll(".start-group")
    .forEach(b => b.onclick = () => startGroupDrill(b.dataset.id));

  groupsListEl.querySelectorAll(".delete-group")
    .forEach(b => b.onclick = () => deleteGroup(b.dataset.id));

  // Меню Manage
  groupsListEl.querySelectorAll(".manage-group").forEach(btn => {
    btn.onclick = () => {
      const menu = btn.parentElement.querySelector(".group-menu");
      document.querySelectorAll(".group-menu").forEach(m => m.classList.add("hidden"));
      menu.classList.toggle("hidden");
    };
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".manage-group") && !e.target.closest(".group-menu")) {
      document.querySelectorAll(".group-menu").forEach(m => m.classList.add("hidden"));
    }
  });

  // Действия в Manage
  groupsListEl.querySelectorAll(".rename-group")
    .forEach(b => b.onclick = () => renameGroup(b.dataset.id));
  groupsListEl.querySelectorAll(".manual-add")
    .forEach(b => b.onclick = () => openGroupManualAdd(b.dataset.id));
  groupsListEl.querySelectorAll(".import-group")
    .forEach(b => b.onclick = () => importWordsToGroup(b.dataset.id));
  groupsListEl.querySelectorAll(".export-group")
    .forEach(b => b.onclick = () => exportGroupJSON(b.dataset.id));
}

function openGroupManualAdd(groupId) {
  const textarea = document.createElement("textarea");
  textarea.rows = 10;
  textarea.placeholder = 'Paste JSON data here...';
  textarea.className = "w-full border rounded p-2 text-sm mt-2";

  const modal = document.createElement("div");
  modal.className = "fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50";
  modal.innerHTML = `
    <div class="bg-white p-6 rounded shadow-xl w-[90%] max-w-md relative">
      <button class="absolute top-3 right-4 text-gray-500 hover:text-gray-700 text-2xl leading-none">&times;</button>
      <h2 class="text-lg font-bold mb-2">Add words manually</h2>
    </div>
  `;
  const box = modal.querySelector("div");
  box.appendChild(textarea);

  const btnRow = document.createElement("div");
  btnRow.className = "flex justify-end gap-2 mt-3";
  btnRow.innerHTML = `
    <button class="cancel bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded">Cancel</button>
    <button class="apply bg-purple-700 hover:bg-purple-800 text-white px-3 py-1 rounded">Add</button>
  `;
  box.appendChild(btnRow);

  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector(".cancel").onclick = close;
  modal.querySelector(".absolute").onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };

  modal.querySelector(".apply").onclick = () => {
    try {
      const words = JSON.parse(textarea.value);
      if (!Array.isArray(words)) throw new Error();
      const allCards = getLocal(CARD_STORAGE_KEY, []);
      const meta = getWordMeta();
      const streaks = getLocal("anki_success_streak", {});
      let added = 0;
      words.forEach(word => {
        if (!word.phrase) return;
        if (!allCards.find(c => c.phrase === word.phrase)) {
          allCards.push(word);
        }
        streaks[word.phrase] = 3;
        meta[word.phrase] = meta[word.phrase] || { groups: [], pinned: false };
        if (!meta[word.phrase].groups.includes(groupId)) meta[word.phrase].groups.push(groupId);
        added++;
      });
      setLocal(CARD_STORAGE_KEY, allCards);
      setLocal("anki_success_streak", streaks);
      setWordMeta(meta);
      showToast(`✅ Added ${added} words to group`);
      close();
    } catch {
      alert("Invalid JSON format");
    }
  };
}

function exportGroupJSON(groupId) {
  const meta = getWordMeta();
  const cards = getLocal(CARD_STORAGE_KEY, []);
  const groupSet = new Set(
    Object.entries(meta)
      .filter(([, m]) => (m.groups || []).includes(groupId))
      .map(([phrase]) => phrase)
  );
  const exportCards = cards.filter(c => groupSet.has(c.phrase));
  const blob = new Blob([JSON.stringify(exportCards, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `group_${groupId}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importWordsToGroup(groupId) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";

  input.onchange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const words = JSON.parse(reader.result);
        if (!Array.isArray(words)) throw new Error("Invalid JSON");

        const allCards = getLocal(CARD_STORAGE_KEY, []);
        const meta = getWordMeta();
        const streaks = getLocal("anki_success_streak", {});

        let added = 0;

        words.forEach(word => {
          if (!word.phrase) return;
          // Добавляем в общий список, если ещё нет
          if (!allCards.find(c => c.phrase === word.phrase)) {
            allCards.push(word);
          }

          // Помечаем как "unused"
          streaks[word.phrase] = 3;

          // Добавляем в группу
          meta[word.phrase] = meta[word.phrase] || { groups: [], pinned: false };
          if (!meta[word.phrase].groups.includes(groupId)) {
            meta[word.phrase].groups.push(groupId);
          }

          added++;
        });

        setLocal(CARD_STORAGE_KEY, allCards);
        setLocal("anki_success_streak", streaks);
        setWordMeta(meta);

        showToast(`✅ Imported ${added} words to group`);
      } catch (err) {
        alert("❌ Invalid JSON format");
        console.error(err);
      }
    };

    reader.readAsText(file);
  };

  input.click();
}

function addGroup(name, color = '#a78bfa') {
  const groups = getGroups();
  const id = 'g_' + Date.now();
  groups.push({ id, name: name.trim(), color });
  setGroups(groups);
  return id;
}

function renameGroup(groupId) {
  const arr = getGroups();
  const g = arr.find(x => x.id === groupId);
  if (!g) return;

  const newName = prompt("Enter new name:", g.name);
  if (!newName) return;

  g.name = newName.trim();
  setGroups(arr);
  renderGroupsList();
}

function deleteGroup(id) {
  if (!confirm("Delete this group?")) return;
  // убрать из групп и слово-мета
  const groups = getGroups().filter(g => g.id !== id);
  setGroups(groups);
  const meta = getWordMeta();
  Object.keys(meta).forEach(p => {
    meta[p].groups = (meta[p].groups || []).filter(gid => gid !== id);
  });
  setWordMeta(meta);
  renderGroupsList();
}

function startGroupDrill(groupId) {
  currentMode = 'group';
  currentGroupId = groupId;
  seenInGroup = new Set(); // сброс списка просмотренных
  // зафиксируем в URL-хэше (чтобы Back/Reload вели себя ожидаемо)
  location.hash = `#mode=group&g=${encodeURIComponent(groupId)}`;
  closeGroupsModal();
  updateGroupBadge();
  buildTrainingPoolAndShow();
}

function exitGroupDrill() {
  currentMode = 'all';
  currentGroupId = null;
  location.hash = `#mode=all`;
  updateGroupBadge();
  buildTrainingPoolAndShow();
}

function updateGroupBadge() {
  if (currentMode === 'group') {
    const g = getGroups().find(x => x.id === currentGroupId);
    const name = g ? g.name : '—';
    groupBadgeEl.textContent = `Group: ${name}  (Exit)`;
    groupBadgeEl.classList.add('active');
    groupBadgeEl.classList.remove('hidden');
    groupBadgeEl.style.cursor = 'pointer';
  } else {
    groupBadgeEl.classList.remove('active');
    groupBadgeEl.classList.add('hidden');
    groupBadgeEl.style.cursor = 'default';
  }
}
groupBadgeEl && (groupBadgeEl.onclick = () => exitGroupDrill());


// ===== Работа с карточками =====

function showCard() {
  const now = Date.now();
  const lastViewed = getLocal(LAST_VIEW_KEY);
  const successStreak = getLocal("anki_success_streak");

  // Фильтруем доступные карточки (не более 3-х повторов и с учётом таймаута)
  let availableCards;

  if (currentMode === 'group') {
    // В групповом режиме — показываем только непоказанные ещё слова
    availableCards = cards.filter(c => !seenInGroup.has(c.phrase));
  } else {
    // Обычный режим с фильтрацией по streak/time
    availableCards = cards.filter(card => {
      const streak = (getLocal("anki_success_streak")[card.phrase] || 0);
      if (streak >= 3) return false;
      const lastTime = (getLocal(LAST_VIEW_KEY)[card.phrase]);
      const waitTime = 12 * 60 * 60 * 1000;
      return !lastTime || Date.now() - lastTime > waitTime;
    });
  }


  // Если карточек нет — заканчиваем сессию
  if (availableCards.length === 0) {
    finishSession();
    return;
  }

  // Выбираем случайную карточку и сохраняем индекс
  const card = availableCards[Math.floor(Math.random() * availableCards.length)];
  currentCard = card;
  currentIndex = cards.findIndex(c => c.phrase === card.phrase);

  if (currentMode === 'group') {
    seenInGroup.add(card.phrase); // запоминаем, что слово уже показывали
  }

  // === Применяем настройку "Show first meaning" ===
  const settings = getLocal("anki_user_settings", {});
  const showFirstMeaning = settings.showFirstMeaning === true;

  // Если включен режим "первый перевод" — показываем его вместо слова
  if (showFirstMeaning && Array.isArray(card.meanings) && card.meanings.length) {
    phraseEl.textContent = card.meanings[0];
  } else if (showFirstMeaning && typeof card.meaning === "string" && card.meaning.includes(",")) {
    phraseEl.textContent = card.meaning.split(",")[0].trim();
  } else {
    phraseEl.textContent = card.phrase;
  }

  // очищаем список переводов
  meaningsEl.innerHTML = "";

  // Обновляем счётчик карточек и отображаем детали
  counterEl.textContent = `Card ${cards.length - availableCards.length + 1} of ${cards.length}`;
  removeClass(counterEl, "hidden");
  removeClass(counterEl.parentElement, "lowered");
  removeClass(showDetailsBtn, "hidden");
  requestAnimationFrame(() => removeClass(showDetailsBtn, "invisible"));

  isDone = false;
  applyAnswerTimer();
}


function finishSession() {
  phraseEl.innerHTML = `<span class="text-2xl font-bold text-gray-800 mt-[12px] block">Done!</span>`;
  meaningsEl.innerHTML = "";
  counterEl.classList.add('hidden');
  counterEl.parentElement.classList.add('lowered');
  addClass(showDetailsBtn, 'invisible');
  setTimeout(() => addClass(showDetailsBtn, 'hidden'), 300);
  isDone = true;
}

function saveLastViewed(card) {
  const lastViewed = getLocal(LAST_VIEW_KEY);
  lastViewed[card.phrase] = Date.now();
  setLocal(LAST_VIEW_KEY, lastViewed);
}

function saveStreak(card, isRemembered) {
  const streaks = getLocal("anki_success_streak");
  let streak = streaks[card.phrase] || 0;

  if (isRemembered) {
    streak++;
    if (streak >= 3) {
      cards = cards.filter(c => c.phrase !== card.phrase);
      setLocal(CARD_STORAGE_KEY, cards);
      delete streaks[card.phrase];
      setLocal("anki_success_streak", streaks);
      currentCard = null;
      return;
    }
  } else {
    streak = 0;
  }
  streaks[card.phrase] = streak;
  setLocal("anki_success_streak", streaks);
}

// ===== Сайдбар с деталями карточки =====

function showSidebar(card) {
  sidebarContent.innerHTML = generateSidebarContent(card);
  removeClass(infoSidebar, 'hidden');
  requestAnimationFrame(() => addClass(infoSidebar, 'open'));
}

function closeSidebar() {
  removeClass(infoSidebar, 'open');
  setTimeout(() => addClass(infoSidebar, 'hidden'), 300);
}

function generateSidebarContent(card) {
  const createProgressBar = (label, color, value) => `
    <div class="w-full">
    <div class="text-[10px] text-gray-500 mb-1 text-right">${label}</div>
    <div class="p-[2px] bg-white border border-gray-300 rounded-full">
        <div class="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div class="absolute inset-0 flex z-10">
            ${'<div class="flex-1 border-r border-white"></div>'.repeat(9)}
            <div class="flex-1"></div>
        </div>
        <div class="absolute inset-0 flex justify-between items-center z-20 -mt-1">
            ${[0, 10].map(i => `
            <div class="h-2 w-[1px] ${color}-800 opacity-100"
                style="left: ${i * 10}%; position: absolute; transform: translateX(-50%);">
            </div>
            `).join('')}
        </div>
        <div class="h-2 ${color}-600 rounded-full transition-all duration-300 z-0"
            style="width: ${(Math.min(value || 0, 10)) * 10}%"></div>
        </div>
    </div>
    </div>
`;

  return `
    <div class="space-y-4 text-sm text-gray-800 leading-relaxed">
    <div>
        <div class="flex justify-between items-center">
        <div>
            <h3 class="font-semibold text-indigo-700">Phrase</h3>
            <p class="text-xl font-bold text-gray-700">${card.phrase}</p>
        </div>
        <div class="flex flex-col gap-1 items-end ml-4 min-w-[140px]">
            ${createProgressBar('Level', 'bg-indigo', card.level)}
            ${createProgressBar('Frequency', 'bg-emerald', card.frequency)}
        </div>
        </div>
    </div>
    ${generateSidebarSection('Meanings', (card.meanings || []).join(', '))}
    ${generateListSection('Examples', card.examples)}
    ${generateListSection('Example Translations', card.exampleTranslations)}
    ${generateSidebarSection('Synonyms', (card.synonyms || []).join(', '))}
    </div>
`;
}

function generateSidebarSection(title, content) {
  return `
    <div class="border-t pt-4 mt-4">
    <h3 class="font-semibold text-indigo-700">${title}</h3>
    <p class="text-gray-800">${content}</p>
    </div>
`;
}

function generateListSection(title, list = []) {
  if (!list.length) return '';
  return `
    <div class="border-t pt-4 mt-4">
    <h3 class="text-sm font-semibold text-indigo-600 mb-2">${title}</h3>
    <div class="bg-indigo-50 border-l-4 border-indigo-400 px-4 py-3 rounded space-y-1 text-gray-700 text-sm">
        ${list.map(item => `<p>• ${item}</p>`).join('')}
    </div>
    </div>
`;
}

// ===== Тосты =====

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast bg-yellow-200 border border-yellow-400 text-yellow-900 px-4 py-2 rounded shadow flex justify-between items-center min-w-[200px]";
  toast.innerHTML = `
    <span>${message}</span>
    <button class="ml-4 text-xl leading-none" onclick="this.parentElement.remove()">&times;</button>
`;
  document.getElementById("toastContainer").appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

// ===== Меню =====

function toggleMenu(open) {
  if (open) {
    removeClass(menuSidebar, 'hidden');
    setTimeout(() => addClass(menuSidebar, 'open'), 10);
  } else {
    removeClass(menuSidebar, 'open');
    setTimeout(() => addClass(menuSidebar, 'hidden'), 300);
  }
}

function renderWordsList() {
  const allCards = getLocal(CARD_STORAGE_KEY, []);
  const searchTerm = document.getElementById("searchInput")?.value?.trim().toLowerCase() || "";
  let filteredCards = allCards;

  if (searchTerm) {
    filteredCards = allCards.filter(c =>
      c.phrase.toLowerCase().includes(searchTerm) ||
      (c.meanings && c.meanings.some(m => m.toLowerCase().includes(searchTerm)))
    );
  }
  const totalPages = Math.ceil(filteredCards.length / wordsPerPage);

  if (sortType === 'used') {
    filteredCards.sort((a, b) => {
      const aUsed = (getLocal("anki_success_streak")[a.phrase] || 0) < 3 ? 1 : 0;
      const bUsed = (getLocal("anki_success_streak")[b.phrase] || 0) < 3 ? 1 : 0;
      return sortOrder === 'desc' ? bUsed - aUsed : aUsed - bUsed;
    });
  } else if (sortType === 'lastSeen') {
    const lastViewed = getLocal(LAST_VIEW_KEY, {});
    filteredCards.sort((a, b) => {
      const aSeen = lastViewed[a.phrase] || 0;
      const bSeen = lastViewed[b.phrase] || 0;
      if (aSeen === 0 && bSeen === 0) return 0;
      if (aSeen === 0) return sortOrder === 'desc' ? -1 : 1;
      if (bSeen === 0) return sortOrder === 'desc' ? 1 : -1;
      return sortOrder === 'desc' ? bSeen - aSeen : aSeen - bSeen;
    });
  }

  const start = (currentPage - 1) * wordsPerPage;
  const end = start + wordsPerPage;
  const cardsToShow = filteredCards.slice(start, end);
  const lastViewed = getLocal(LAST_VIEW_KEY, {});
  const streaks = getLocal("anki_success_streak", {});
  let content = "";
  if (filteredCards.length === 0) {
    content = `<p class=\"text-gray-500\">No words added yet.</p>`;
  } else {
    const getStatus = (card) => {
      const streak = streaks[card.phrase] || 0;
      if (streak >= 3) {
        return { label: 'Unused', color: 'bg-gray-200 text-gray-600 border-gray-300' };
      } else {
        return { label: 'Used', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' };
      }
    };
    if (wordsListLayout === 1) {
      content = cardsToShow.map(card => {
        const lastTime = lastViewed[card.phrase];
        const formatted = lastTime ? new Date(lastTime).toLocaleString() : "";
        const status = getStatus(card);
        return `
          <div class="border p-2 rounded shadow-sm bg-gray-50 mb-2">
            <div class="flex items-center justify-between">
              <div>
                <p><strong>${card.phrase}</strong></p>
                <p class="text-gray-600">${(card.meanings || []).join(", ")}</p>
                ${formatted ? `<p class="text-xs text-gray-500 mt-1">Last seen: ${formatted}</p>` : ""}
              </div>
              <span class="ml-4 px-2 py-0.5 rounded text-xs font-semibold border ${status.color}">
                ${status.label}
              </span>
            </div>
            <button
              data-phrase="${card.phrase}"
              class="mt-2 inline-flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-md border shadow-sm transition toggle-used-btn
                ${status.label === 'Used'
            ? 'bg-rose-100 text-rose-700 border-rose-300 hover:bg-rose-200'
            : 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200'}"
            >
              ${status.label === 'Used' ? '🙈 Mark Unused' : '👁️ Mark Used'}
            </button>
            <button
              data-phrase="${card.phrase}"
              class="mt-2 ml-2 inline-flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-md border shadow-sm transition add-to-group-btn">
              ➕ Add to group
            </button>
          </div>
        `;
      }).join("");
      wordsListContent.className = "max-h-[60vh] overflow-y-auto space-y-2 text-sm transition-all duration-300";
      wordsListModalBox.className = "bg-white p-6 rounded shadow-xl w-[90%] max-w-md relative transition-all duration-300";
    } else {
      // 2 or 3 columns
      const cols = wordsListLayout;
      content = `<div class="grid gap-3 ${cols === 2 ? 'grid-cols-2' : 'grid-cols-3'}">` +
        cardsToShow.map(card => {
          const lastTime = lastViewed[card.phrase];
          const formatted = lastTime ? new Date(lastTime).toLocaleString() : "";
          const status = getStatus(card);
          return `
          <div class="border p-2 rounded shadow-sm bg-gray-50 flex flex-col justify-between h-full">
            <div>
              <div class="flex items-start justify-between">
                <div>
                  <p><strong>${card.phrase}</strong></p>
                  <p class="text-gray-600">${(card.meanings || []).join(", ")}</p>
                  ${formatted ? `<p class="text-xs text-gray-500 mt-1">Last seen: ${formatted}</p>` : ""}
                </div>
                <span class="ml-2 px-2 py-0.5 rounded text-xs font-semibold border ${status.color}">
                  ${status.label}
                </span>
              </div>
            </div>
            <div class="flex gap-2 mt-3 pt-2 border-t ${!isEditMode ? 'hidden' : ''}">
              <button
                data-phrase="${card.phrase}"
                class="toggle-used-btn flex-1 text-xs font-medium px-2 py-1 rounded-md border shadow-sm transition
                  ${status.label === 'Used'
              ? 'bg-rose-100 text-rose-700 border-rose-300 hover:bg-rose-200'
              : 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200'}">
                ${status.label === 'Used' ? '🙈 Mark Unused' : '👁️ Mark Used'}
              </button>
              <button
                data-phrase="${card.phrase}"
                class="add-to-group-btn flex-1 text-xs font-medium px-2 py-1 rounded-md border shadow-sm transition hover:bg-gray-100">
                ➕ Add to group
              </button>
            </div>
          </div>
        `;
        }).join("") + "</div>";

      wordsListContent.className = `max-h-[60vh] overflow-y-auto text-sm transition-all duration-300 ${cols === 2 ? 'space-y-0' : 'space-y-0'}`;
      wordsListModalBox.className = `bg-white p-6 rounded shadow-xl w-[98%] ${cols === 2 ? 'max-w-2xl' : 'max-w-4xl'} relative transition-all duration-300`;
    }
  }
  wordsListContent.innerHTML = content;

  wordsListContent.querySelectorAll(".add-to-group-btn").forEach(btn => {
    btn.onclick = () => openAddToGroupModal(btn.getAttribute("data-phrase"));
  });

  // Привязка событий к кнопкам "Mark as Used/Unused"
  document.querySelectorAll('.toggle-used-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const phrase = btn.getAttribute('data-phrase');
      const streaks = getLocal("anki_success_streak", {});
      streaks[phrase] = (streaks[phrase] || 0) >= 3 ? 0 : 3;
      setLocal("anki_success_streak", streaks);
      renderWordsList();
    });
  });
  renderPagination(totalPages);
}

function renderSettingsPanel() {
  const panel = document.getElementById("settingsPanel");
  panel.innerHTML = '';
  panel.className = "flex items-center justify-between relative w-full mb-4 min-h-[44px]";

  // Левая стрелка
  const leftWrap = document.createElement("div");
  leftWrap.className = "flex-1 flex justify-start";
  const left = document.createElement("button");
  left.id = "settingsLeftArrow";
  left.className = "arrow-btn";
  left.innerHTML = `<svg class="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>`;
  left.addEventListener("click", () => switchSettingsMode(-1));
  leftWrap.appendChild(left);

  // Центр (absolute)
  const center = document.createElement("div");
  center.id = "settingsCenter";
  center.className = "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-2 justify-center";
  if (settingsMode === 0) {
    center.appendChild(layout1Btn);
    center.appendChild(layout2Btn);
    center.appendChild(layout3Btn);
  } else if (settingsMode === 1) {
    center.appendChild(createSortIconBtn('used'));
    center.appendChild(createSortTimeIconBtn('lastSeen'));
  }

  // Правая стрелка
  const rightWrap = document.createElement("div");
  rightWrap.className = "flex-1 flex justify-end";
  const right = document.createElement("button");
  right.id = "settingsRightArrow";
  right.className = "arrow-btn";
  right.innerHTML = `<svg class="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>`;
  right.addEventListener("click", () => switchSettingsMode(1));
  rightWrap.appendChild(right);

  // Добавляем
  panel.appendChild(leftWrap);
  panel.appendChild(center);
  panel.appendChild(rightWrap);
}

function createSortIconBtn(type) {
  const btn = document.createElement('button');
  let btnClass = 'icon-btn';
  if (sortType === type) btnClass += ' active';
  btn.className = btnClass;

  if (type === 'used') {
    const img = document.createElement('img');
    // --- определяем нужную иконку по состоянию ---
    let icon = '';
    if (sortType === 'used') {
      // Активное состояние
      icon = sortOrder === 'desc'
        ? 'icons/vis_up_active.png'
        : 'icons/vis_down_active.png';
    } else {
      // Неактивное состояние
      icon = sortOrder === 'desc'
        ? 'icons/vis_up_inactive.png'
        : 'icons/vis_down_inactive.png';
    }
    img.src = icon;
    img.alt = 'Used';
    img.className = 'w-6 h-6';
    btn.appendChild(img);

    btn.onclick = () => {
      // Если кнопка уже активна — просто меняем порядок сортировки
      if (sortType === 'used') {
        sortOrder = sortOrder === 'desc' ? 'asc' : 'desc';
      } else {
        // Если была неактивна — включаем сортировку used и порядок desc
        sortType = 'used';
        sortOrder = 'desc';
      }
      renderSettingsPanel();
      renderWordsList();
    };
  }

  return btn;
}

function createSortTimeIconBtn(type) {
  const btn = document.createElement('button');
  let btnClass = 'icon-btn';
  if (sortType === type) btnClass += ' active';
  btn.className = btnClass;

  if (type === 'lastSeen') {
    const img = document.createElement('img');
    // --- определяем нужную иконку по состоянию ---
    let icon = '';
    if (sortType === 'lastSeen') {
      // Активное состояние
      icon = sortOrder === 'desc'
        ? 'icons/time_down_active.png'
        : 'icons/time_up_active.png';
    } else {
      // Неактивное состояние
      icon = sortOrder === 'desc'
        ? 'icons/time_down_inactive.png'
        : 'icons/time_up_inactive.png';
    }
    img.src = icon;
    img.alt = 'By Time';
    img.className = 'w-6 h-6';
    btn.appendChild(img);

    btn.onclick = () => {
      // Если кнопка уже активна — просто меняем порядок сортировки
      if (sortType === 'lastSeen') {
        sortOrder = sortOrder === 'desc' ? 'asc' : 'desc';
      } else {
        // Если была неактивна — включаем сортировку lastSeen и порядок desc
        sortType = 'lastSeen';
        sortOrder = 'desc';
      }
      renderSettingsPanel();
      renderWordsList();
    };
  }

  return btn;
}

function setWordsListLayout(layout) {
  wordsListLayout = layout;
  [layout1Btn, layout2Btn, layout3Btn].forEach((btn, idx) => {
    if (btn) {
      btn.classList.toggle('active', idx + 1 === layout);
    }
  });
  renderWordsList();
}


function switchSettingsMode(direction) {
  const maxMode = isMobileDevice() ? 1 : 1; // только до 1
  settingsMode += direction;
  if (settingsMode < 0) settingsMode = maxMode;
  if (settingsMode > maxMode) settingsMode = 0;
  renderSettingsPanel();
}

function openWordsListModal() {
  renderSettingsPanel();
  setWordsListLayout(wordsListLayout); // render and highlight
  wordsListModal.classList.remove("hidden");

  // Обновление поиска в реальном времени
  const searchInput = document.getElementById("searchInput");
  if (searchInput && !searchInput.dataset.bound) { // чтобы не дублировался
    searchInput.addEventListener("input", () => {
      currentPage = 1;
      renderWordsList();
    });
    searchInput.dataset.bound = "true";
  }
}

function closeWordsListModal() {
  wordsListModal.classList.add("hidden");
}

// ===== Экспорт / Импорт =====

function exportData() {
  const allData = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    allData[key] = localStorage.getItem(key);
  }

  const blob = new Blob([JSON.stringify(allData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "anki_backup.json";
  link.click();

  URL.revokeObjectURL(url);
}

function importData() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";

  input.onchange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        for (const [key, value] of Object.entries(data)) {
          localStorage.setItem(key, value);
        }
        alert("✅ Данные успешно импортированы!");
        location.reload();
      } catch (err) {
        alert("❌ Ошибка при чтении файла");
        console.error(err);
      }
    };
    reader.readAsText(file);
  };

  input.click();
}

// ==== Add to Group Modal ====
const addToGroupModal = document.getElementById("addToGroupModal");
const closeAddToGroupBtn = document.getElementById("closeAddToGroupBtn");
const addToGroupWord = document.getElementById("addToGroupWord");
const addToGroupList = document.getElementById("addToGroupList");
let pendingPhrase = null;

function openAddToGroupModal(phrase) {
  const groups = getGroups();
  if (groups.length === 0) {
    alert("Create a group first (Menu → Groups).");
    return;
  }
  pendingPhrase = phrase;
  addToGroupWord.textContent = `Add “${phrase}” to which group?`;
  addToGroupList.innerHTML = groups.map(g => `
    <button data-id="${g.id}"
      class="w-full text-left px-4 py-2 border rounded flex items-center gap-2 hover:bg-purple-50 transition">
      <span class="inline-block w-3 h-3 rounded-full" style="background:${g.color || '#a78bfa'}"></span>
      <span>${g.name}</span>
    </button>
  `).join("");
  addToGroupModal.classList.remove("hidden");
}

addToGroupList.addEventListener("click", e => {
  if (e.target.closest("button[data-id]")) {
    const btn = e.target.closest("button[data-id]");
    const groupId = btn.getAttribute("data-id");
    const groups = getGroups();
    const g = groups.find(x => x.id === groupId);
    const meta = getWordMeta();
    meta[pendingPhrase] = meta[pendingPhrase] || { groups: [], pinned: false };
    if (!meta[pendingPhrase].groups.includes(groupId)) {
      meta[pendingPhrase].groups.push(groupId);
      setWordMeta(meta);
      const streaks = getLocal("anki_success_streak", {});
      streaks[pendingPhrase] = 3;
      setLocal("anki_success_streak", streaks);
      showToast(`Added to group “${g.name}”`);
    }
    addToGroupModal.classList.add("hidden");
  }
});

closeAddToGroupBtn.addEventListener("click", () => addToGroupModal.classList.add("hidden"));
addToGroupModal.addEventListener("click", e => {
  if (e.target === addToGroupModal) addToGroupModal.classList.add("hidden");
});

// ===== Подключение событий =====

function attachEventListeners() {
  // — Работа с формой добавления карточек
  toggleFormBtn.addEventListener("click", () => {
    formContainer.classList.toggle("hidden");
    toggleFormBtn.textContent = formContainer.classList.contains("hidden")
      ? "Show Add Cards Form"
      : "Hide Add Cards Form";
  });
  loadBtn.addEventListener("click", handleLoadCards);

  // — Дерево карточки и ответы
  showDetailsBtn.addEventListener("click", () => showSidebar(cards[currentIndex]));
  closeSidebarBtn.addEventListener("click", closeSidebar);
  document.getElementById("rememberBtn").addEventListener("click", () => handleAnswer(true));
  document.getElementById("dontRememberBtn").addEventListener("click", () => handleAnswer(false));

  // — Меню слева
  menuToggle.addEventListener("click", () => toggleMenu(true));
  closeMenuBtn.addEventListener("click", () => toggleMenu(false));
  showWordsListBtn.addEventListener("click", openWordsListModal);

  // — Экспорт/импорт и сброс прогресса
  exportBtn.addEventListener("click", exportData);
  importBtn.addEventListener("click", importData);
  resetProgressBtn.addEventListener("click", resetProgress);

  // — Обработчик клика вне infoSidebar (меню теперь не закрываем)
  document.addEventListener("click", (e) => {
    if (!infoSidebar.contains(e.target) && !showDetailsBtn.contains(e.target)) {
      closeSidebar();
    }
  });

  // ====== Options Modal ======
  const optionsBtn = document.getElementById("optionsBtn");
  const optionsModal = document.getElementById("optionsModal");
  const closeOptionsBtn = document.getElementById("closeOptionsBtn");

  if (optionsBtn && optionsModal && closeOptionsBtn) {
    // Открыть модалку
    optionsBtn.addEventListener("click", () => {
      optionsModal.classList.remove("hidden");
    });
    // Закрыть по кнопке
    closeOptionsBtn.addEventListener("click", () => {
      optionsModal.classList.add("hidden");
    });
    // Закрыть по клику на полупрозрачный фон
    optionsModal.addEventListener("click", (e) => {
      if (e.target === optionsModal) {
        optionsModal.classList.add("hidden");
      }
    });
  }

  // ====== Options Controls ======

  // Загружаем сохранённые настройки
  loadSettings();

  // Переключатель "Show first meaning"
  const viewToggle = document.getElementById("viewToggle");
  if (viewToggle) {
    viewToggle.addEventListener("change", () => {
      saveSettings({ showFirstMeaning: viewToggle.checked });

      // 🔁 Обновляем текст текущей карточки без выбора новой
      const phraseEl = document.getElementById("phrase");
      if (!phraseEl || !currentCard) return;

      const settings = getLocal("anki_user_settings", {});
      const showFirstMeaning = settings.showFirstMeaning === true;

      if (showFirstMeaning) {
        if (currentCard.meaning && typeof currentCard.meaning === "string" && currentCard.meaning.includes(",")) {
          phraseEl.textContent = currentCard.meaning.split(",")[0].trim();
        } else {
          phraseEl.textContent = currentCard.meaning || currentCard.phrase;
        }
      } else {
        phraseEl.textContent = currentCard.phrase;
      }
    });
  }

  // Обработка кнопок Answer Speed
  document.querySelectorAll(".speed-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const selected = btn.dataset.speed;
      saveSettings({ answerSpeed: selected });
      loadSettings(); // обновляем подсветку выбранного режима
    });
  });

  // — View Mode ON/OFF
  if (viewToggle) {
    viewToggle.addEventListener("change", () => {
      saveSettings({ showFirstMeaning: viewToggle.checked });

      // 🔁 Обновляем текст текущей карточки без выбора новой
      const phraseEl = document.getElementById("cardPhrase");
      if (!phraseEl || !currentCard) return;

      const settings = getLocal("anki_user_settings", {});
      const showFirstMeaning = settings.showFirstMeaning === true;

      if (showFirstMeaning) {
        if (Array.isArray(currentCard.meanings) && currentCard.meanings.length) {
          phraseEl.textContent = currentCard.meanings[0];
        } else if (typeof currentCard.meaning === "string" && currentCard.meaning.includes(",")) {
          phraseEl.textContent = currentCard.meaning.split(",")[0].trim();
        } else {
          phraseEl.textContent = currentCard.meaning || currentCard.phrase;
        }
      } else {
        phraseEl.textContent = currentCard.phrase;
      }
    });
  }

  if (closeWordsListBtn && wordsListModal) {
    closeWordsListBtn.addEventListener("click", closeWordsListModal);
    wordsListModal.addEventListener("click", (e) => {
      if (e.target === wordsListModal) {
        closeWordsListModal();
      }
    });
  }

  if (layout1Btn && layout2Btn && layout3Btn) {
    layout1Btn.addEventListener("click", () => setWordsListLayout(1));
    layout2Btn.addEventListener("click", () => setWordsListLayout(2));
    layout3Btn.addEventListener("click", () => setWordsListLayout(3));
  }

  const showStatsBtn = document.getElementById("showStatsBtn");
  const statsModal = document.getElementById("statsModal");
  const closeStatsBtn = document.getElementById("closeStatsBtn");
  const statsContent = document.getElementById("statsContent");

  if (showStatsBtn && statsModal && closeStatsBtn && statsContent) {
    showStatsBtn.addEventListener("click", () => {
      const daily = getDailyStats();
      const totalCards = getLocal(CARD_STORAGE_KEY, []).length;
      const streaks = getLocal("anki_success_streak", {});
      const mastered = Object.values(streaks).filter(v => v >= 3).length;

      const rememberRate = daily.reviewed > 0
        ? Math.round((daily.remembered / daily.reviewed) * 100)
        : 0;

      document.getElementById("statNewWords").textContent = daily.newWords;
      document.getElementById("statReviewed").textContent = daily.reviewed;
      document.getElementById("statRememberRate").textContent = `${rememberRate}%`;
      document.getElementById("statMastered").textContent = mastered;
      document.getElementById("statTotal").textContent = totalCards;

      statsModal.classList.remove("hidden");
    });

    closeStatsBtn.addEventListener("click", () => {
      statsModal.classList.add("hidden");
    });
    statsModal.addEventListener("click", (e) => {
      if (e.target === statsModal) {
        statsModal.classList.add("hidden");
      }
    });
  }

}

// === Settings logic ===
function loadSettings() {
  const defaults = { showFirstMeaning: false, answerSpeed: "off" };
  const settings = { ...defaults, ...getLocal("anki_user_settings", {}) };

  // Тумблер "Show first meaning"
  const viewToggle = document.getElementById("viewToggle");
  if (viewToggle) viewToggle.checked = settings.showFirstMeaning;

  // Подсветка активной скорости
  document.querySelectorAll(".speed-btn").forEach(btn => {
    const active = btn.dataset.speed === settings.answerSpeed;
    btn.classList.toggle("bg-indigo-600", active);
    btn.classList.toggle("text-white", active);
  });

  return settings;
}

function saveSettings(partial) {
  const current = getLocal("anki_user_settings", {});
  const updated = { ...current, ...partial };
  setLocal("anki_user_settings", updated);
}

function applyAnswerTimer() {
  const settings = getLocal("anki_user_settings", {});
  if (settings.answerSpeed && settings.answerSpeed !== "off") {
    clearTimeout(window.answerTimer);
    window.answerTimer = setTimeout(() => {
      handleAnswer(false);
      showToast(`⏳ Time's up (${settings.answerSpeed}s)!`);
    }, Number(settings.answerSpeed) * 1000);
  } else {
    clearTimeout(window.answerTimer);
  }
}


function handleLoadCards() {
  try {
    const newCards = JSON.parse(input.value);
    if (!Array.isArray(newCards)) throw new Error();

    const existing = getLocal(CARD_STORAGE_KEY, []);
    const existingPhrases = new Set(existing.map(c => c.phrase));
    const duplicatePhrases = newCards.filter(c => existingPhrases.has(c.phrase)).map(c => c.phrase);
    const filteredNewCards = newCards.filter(c => !existingPhrases.has(c.phrase));

    const updatedCards = [...existing, ...filteredNewCards];
    setLocal(CARD_STORAGE_KEY, updatedCards);

    if (filteredNewCards.length > 0) {
      cards = updatedCards;
      remembered = 0;
      notRemembered = 0;
      rememberedEl.textContent = 0;
      notRememberedEl.textContent = 0;
      cardArea.classList.remove("hidden");
      showCard();
    }

    if (duplicatePhrases.length > 0) {
      showToast("Already added: " + duplicatePhrases.join(", "));
    }
  } catch {
    alert("Invalid JSON format");
  }
}

function handleAnswer(isRemembered) {
  clearTimeout(window.answerTimer);

  if (isDone || !currentCard) return;

  const daily = getDailyStats();
  updateDailyStats({
    reviewed: daily.reviewed + 1,
    remembered: daily.remembered + (isRemembered ? 1 : 0),
  });

  const lastViewed = getLocal(LAST_VIEW_KEY, {});

  // Добавляем в статистику только если не в режиме группы
  if (currentMode !== 'group') {
    if (!lastViewed[currentCard.phrase] && !getTodaysNewWords().includes(currentCard.phrase)) {
      addNewWordToday(currentCard.phrase);
    }
  }

  if (currentMode !== 'group') {
    updateDailyStats({ newWords: getDailyStats().newWords + 1 });
  }

  // Сохраняем прогресс (streak и время) только в обычном режиме
  if (currentMode !== 'group') {
    saveLastViewed(currentCard);
    saveStreak(currentCard, isRemembered);
  }

  // Обновляем счётчики внутри сессии (группы или обычной)
  if (isRemembered) {
    remembered++;
    rememberedEl.textContent = remembered;
  } else {
    notRemembered++;
    notRememberedEl.textContent = notRemembered;
  }

  closeSidebar();
  showCard();
}

function resetProgress() {
  if (!confirm("Mark all words as learned and finish the training?")) return;

  const cards = getLocal(CARD_STORAGE_KEY, []);

  // 1️⃣ Устанавливаем всем словам streak = 3 → они считаются выученными
  const streaks = {};
  cards.forEach(c => {
    streaks[c.phrase] = 3;
  });
  setLocal("anki_success_streak", streaks);

  // 2️⃣ Очищаем дополнительную статистику
  localStorage.removeItem("anki_last_viewed");
  localStorage.removeItem("anki_daily_stats");
  localStorage.removeItem("anki_new_words_by_day");

  // 3️⃣ Сбрасываем локальные переменные
  remembered = cards.length;
  notRemembered = 0;
  isDone = true;
  currentCard = null;

  // 4️⃣ Обновляем интерфейс
  document.getElementById("rememberedCount").textContent = remembered;
  document.getElementById("notRememberedCount").textContent = 0;

  const phraseEl = document.getElementById("cardPhrase");
  const meaningsEl = document.getElementById("cardMeanings");
  const counterEl = document.getElementById("cardCounter");
  const showDetailsBtn = document.getElementById("showDetailsBtn");

  phraseEl.innerHTML = `<span class="text-2xl font-bold text-gray-800 mt-[12px] block">Done!</span>`;
  meaningsEl.innerHTML = "";
  counterEl.classList.add("hidden");
  counterEl.parentElement.classList.add("lowered");
  showDetailsBtn.classList.add("invisible");
  setTimeout(() => showDetailsBtn.classList.add("hidden"), 300);

  // 5️⃣ Перерисовываем список слов (все “Unused” исчезнут из тренировки)
  renderWordsList();

  // 6️⃣ Показываем уведомление
  showToast("✅ All words marked as learned. Training completed!");
}

// ===== Инициализация =====

function buildTrainingPool() {
  const savedCards = getLocal(CARD_STORAGE_KEY, []);

  // если активен режим группы
  if (currentMode === 'group' && currentGroupId) {
    const meta = getWordMeta();
    const groupSet = new Set(
      Object.entries(meta)
        .filter(([, m]) => (m.groups || []).includes(currentGroupId))
        .map(([phrase]) => phrase)
    );

    // показываем все слова группы, игнорируя streak и таймеры
    return savedCards.filter(c => groupSet.has(c.phrase));
  }

  // обычный режим
  const lastViewed = getLocal(LAST_VIEW_KEY);
  const successStreak = getLocal("anki_success_streak");
  const now = Date.now();
  const WAIT_TIME = 12 * 60 * 60 * 1000;

  return savedCards.filter(card => {
    const streak = successStreak[card.phrase] || 0;
    if (streak >= 3) return false;
    const lastTime = lastViewed[card.phrase];
    return !lastTime || now - lastTime > WAIT_TIME;
  });
}

function buildTrainingPoolAndShow() {
  // Если начинаем новую сессию группы — сбрасываем просмотренные слова
  if (currentMode === 'group') {
    seenInGroup = new Set();
  }

  cards = buildTrainingPool();     // получаем список слов под текущий режим
  remembered = 0;
  notRemembered = 0;
  rememberedEl.textContent = 0;
  notRememberedEl.textContent = 0;
  cardArea.classList.remove("hidden");

  if (cards.length > 0) {
    showCard(); // показываем первую карточку
  } else {
    finishSession(); // если нет слов — показываем сообщение об окончании
  }
}

function readModeFromHash() {
  const h = location.hash || '';
  if (h.includes('mode=group')) {
    const m = /[?&#]g=([^&]+)/.exec(h);
    currentMode = 'group';
    currentGroupId = m ? decodeURIComponent(m[1]) : null;
  } else {
    currentMode = 'all';
    currentGroupId = null;
  }
  updateGroupBadge(); // показывает бейдж "Group: adjectives"
}

function init() {
  resetNewWordsIfDayChanged();

  cardArea.classList.remove("hidden");
  readModeFromHash();
  buildTrainingPoolAndShow();

  window.addEventListener('hashchange', () => {
    readModeFromHash();
    buildTrainingPoolAndShow();
  });

  attachEventListeners();
}

openGroupsBtn && (openGroupsBtn.onclick = openGroupsModal);
closeGroupsBtn && (closeGroupsBtn.onclick = closeGroupsModal);
createGroupBtn && (createGroupBtn.onclick = () => {
  const n = (newGroupNameInp.value || '').trim();
  if (!n) return;
  addGroup(n);
  newGroupNameInp.value = '';
  renderGroupsList();
});

document.addEventListener("DOMContentLoaded", init);

function renderPagination(totalPages) {
  const pagination = document.getElementById('pagination');
  if (!pagination) return;
  pagination.innerHTML = '';
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.className = 'icon-btn icon-btn--small' + (i === currentPage ? ' active' : '');
    btn.textContent = i;
    btn.style.margin = '0 2px';
    btn.onclick = () => {
      currentPage = i;
      renderWordsList();
    };
    pagination.appendChild(btn);
  }
}
