// ===== Константы и переменные =====
const RECENT_THRESHOLD = 5 * 1000;
const LAST_VIEW_KEY = "anki_last_viewed";
const CARD_STORAGE_KEY = "anki_cards";

let cards = [];
let currentIndex = 0;
let currentCard = null;
let remembered = 0;
let notRemembered = 0;
let isDone = false;
let showFirstMeaningOnly = false;

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
const viewToggle      = document.getElementById("viewToggle");
const viewToggleLabel = document.getElementById("viewToggleLabel");

const wordsListModalBox = document.getElementById("wordsListModalBox");
const layout1Btn = document.getElementById("layout1Btn");
const layout2Btn = document.getElementById("layout2Btn");
const layout3Btn = document.getElementById("layout3Btn");

let wordsListLayout = 1; // 1: single, 2: two-column, 3: three-column

// ===== Утилиты =====
const getLocal = (key, fallback = {}) => JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
const setLocal = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const removeClass = (el, cls) => el.classList.remove(cls);
const addClass = (el, cls) => el.classList.add(cls);

// ===== Работа с карточками =====

function showCard() {
    const now = Date.now();
    const lastViewed = getLocal(LAST_VIEW_KEY);
    const successStreak = getLocal("anki_success_streak");
  
    // Фильтруем доступные карточки (не более 3-х повторов и с учётом таймаута)
    const availableCards = cards.filter(card => {
      const streak = successStreak[card.phrase] || 0;
      if (streak >= 3) return false;
      const lastTime = lastViewed[card.phrase];
      const waitTime = 12 * 60 * 60 * 1000; // 12 часов
      return !lastTime || now - lastTime > waitTime;
    });
  
    // Если карточек нет — заканчиваем сессию
    if (availableCards.length === 0) {
      finishSession();
      return;
    }
  
    // Выбираем случайную карточку и сохраняем индекс
    const card = availableCards[Math.floor(Math.random() * availableCards.length)];
    currentCard = card;
    currentIndex = cards.findIndex(c => c.phrase === card.phrase);
  
    // Если стоит флаг showFirstMeaningOnly и есть хотя бы один перевод —
    // показываем переводы[0], иначе — показываем original phrase
    if (showFirstMeaningOnly && Array.isArray(card.meanings) && card.meanings.length) {
      phraseEl.textContent = card.meanings[0];
    } else {
      phraseEl.textContent = card.phrase;
    }
  
    // Очищаем список дополнительных значений
    meaningsEl.innerHTML = "";
  
    // Обновляем счётчик карточек и отображаем детали
    counterEl.textContent = `Card ${cards.length - availableCards.length + 1} of ${cards.length}`;
    removeClass(counterEl, "hidden");
    removeClass(counterEl.parentElement, "lowered");
    removeClass(showDetailsBtn, "hidden");
    requestAnimationFrame(() => removeClass(showDetailsBtn, "invisible"));
  
    isDone = false;
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
  const lastViewed = getLocal(LAST_VIEW_KEY, {});
  const streaks = getLocal("anki_success_streak", {});
  let content = "";
  if (allCards.length === 0) {
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
      content = allCards.map(card => {
        const lastTime = lastViewed[card.phrase];
        const formatted = lastTime ? new Date(lastTime).toLocaleString() : "";
        const status = getStatus(card);
        return `
          <div class=\"border p-2 rounded shadow-sm bg-gray-50 mb-2 flex items-center justify-between\">
            <div>
              <p><strong>${card.phrase}</strong></p>
              <p class=\"text-gray-600\">${(card.meanings || []).join(", ")}</p>
              ${formatted ? `<p class=\"text-xs text-gray-500 mt-1\">Last seen: ${formatted}</p>` : ""}
            </div>
            <span class=\"ml-4 px-2 py-0.5 rounded text-xs font-semibold border ${status.color}\">${status.label}</span>
          </div>
        `;
      }).join("");
      wordsListContent.className = "max-h-[60vh] overflow-y-auto space-y-2 text-sm transition-all duration-300";
      wordsListModalBox.className = "bg-white p-6 rounded shadow-xl w-[90%] max-w-md relative transition-all duration-300";
    } else {
      // 2 or 3 columns
      const cols = wordsListLayout;
      content = `<div class=\"grid gap-3 ${cols === 2 ? 'grid-cols-2' : 'grid-cols-3'}\">` +
        allCards.map(card => {
          const lastTime = lastViewed[card.phrase];
          const formatted = lastTime ? new Date(lastTime).toLocaleString() : "";
          const status = getStatus(card);
          return `
            <div class=\"border p-2 rounded shadow-sm bg-gray-50 flex items-center justify-between\">
              <div>
                <p><strong>${card.phrase}</strong></p>
                <p class=\"text-gray-600\">${(card.meanings || []).join(", ")}</p>
                ${formatted ? `<p class=\"text-xs text-gray-500 mt-1\">Last seen: ${formatted}</p>` : ""}
              </div>
              <span class=\"ml-4 px-2 py-0.5 rounded text-xs font-semibold border ${status.color}\">${status.label}</span>
            </div>
          `;
        }).join("") + "</div>";
      wordsListContent.className = `max-h-[60vh] overflow-y-auto text-sm transition-all duration-300 ${cols === 2 ? 'space-y-0' : 'space-y-0'}`;
      wordsListModalBox.className = `bg-white p-6 rounded shadow-xl w-[98%] ${cols === 2 ? 'max-w-2xl' : 'max-w-4xl'} relative transition-all duration-300`;
    }
  }
  wordsListContent.innerHTML = content;
}

function setWordsListLayout(layout) {
  wordsListLayout = layout;
  // Highlight active button with a border and shadow
  [layout1Btn, layout2Btn, layout3Btn].forEach((btn, idx) => {
    if (btn) {
      if (idx + 1 === layout) {
        btn.classList.add('ring-2', 'ring-indigo-500', 'border-indigo-600', 'bg-indigo-50', 'shadow');
        btn.classList.remove('bg-gray-100', 'border-gray-300');
      } else {
        btn.classList.remove('ring-2', 'ring-indigo-500', 'border-indigo-600', 'bg-indigo-50', 'shadow');
        btn.classList.add('bg-gray-100', 'border-gray-300');
      }
    }
  });
  renderWordsList();
}

function openWordsListModal() {
  setWordsListLayout(wordsListLayout); // render and highlight
  wordsListModal.classList.remove("hidden");
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
  
    // — Обработчик клика вне sidebar-ов
    document.addEventListener("click", (e) => {
      if (!infoSidebar.contains(e.target) && !showDetailsBtn.contains(e.target)) {
        closeSidebar();
      }
      if (
        menuSidebar.classList.contains("open") &&
        !menuSidebar.contains(e.target) &&
        !menuToggle.contains(e.target)
      ) {
        toggleMenu(false);
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

  // — View Mode ON/OFF
  if (viewToggle && viewToggleLabel) {
    viewToggle.addEventListener("change", () => {
      showFirstMeaningOnly = viewToggle.checked;
      viewToggleLabel.textContent = showFirstMeaningOnly ? "ON" : "OFF";
      showCard();
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
if (isDone || !currentCard) return;
saveLastViewed(currentCard);
saveStreak(currentCard, isRemembered);

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
const allCards = getLocal(CARD_STORAGE_KEY, []);
const streaks = {};

allCards.forEach(card => {
    streaks[card.phrase] = 3;
});

setLocal("anki_success_streak", streaks);
showToast("✅ All words marked as completed!");
setTimeout(() => location.reload(), 800);
}

// ===== Инициализация =====

function init() {
const savedCards = getLocal(CARD_STORAGE_KEY, []);
const lastViewed = getLocal(LAST_VIEW_KEY);
const successStreak = getLocal("anki_success_streak");
const now = Date.now();

cardArea.classList.remove("hidden");

cards = savedCards.filter(card => {
    const streak = successStreak[card.phrase] || 0;
    if (streak >= 3) return false;
    const lastTime = lastViewed[card.phrase];
    const waitTime = 12 * 60 * 60 * 1000;
    return !lastTime || now - lastTime > waitTime;
});

if (cards.length > 0) {
    showCard();
} else {
    finishSession();
}

attachEventListeners();
}

document.addEventListener("DOMContentLoaded", init);
