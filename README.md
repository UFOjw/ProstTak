# Anki Trainer

Lightweight, browser-based flashcard trainer inspired by Anki. Everything runs in the browser (Tailwind CDN, no build step) and saves to `localStorage`.

## Features

- **Card input & backups:** Paste a JSON array to add cards. Export/import the entire localStorage backup, plus per-group JSON export/import.
- **Training modes:** Default spaced repetition (12h wait, 3 correct recalls to retire). Group drills ignore streaks/waits and show every word in the selected group once.
- **Answer experience:** Toggle “Show first meaning”, optional 30s/60s answer timer, details sidebar with level/frequency/examples/synonyms.
- **Word library:** Search, paginate (100/page), sort by active status or last seen (asc/desc), switch 1/2/3-column layouts, mark words active/inactive, add words to groups.
- **Groups management:** Create/rename/delete groups, add words manually or from the word list, import/export a single group, start a group drill (URL hash persists mode).
- **Daily statistics:** Modal shows today’s new words, reviewed count, remember rate, mastered count (streak ≥3), and total cards.

## Installation

No build is required. Any static hosting works:

1) Download or clone the repo.  
2) Open `index.html` directly, or serve the folder with any static server (Nginx/Apache/VS Code Live Server/etc.).  
3) Visit the page in your browser.

Example Nginx server block:

```nginx
server {
    listen 8080;
    server_name localhost;
    root   /path/to/anki-cards-live;
    index  index.html;
}
```

## Usage

1. **Load cards:** Click **Show Add Cards Form**, paste your JSON array, then **Load Cards** (duplicates are skipped).
2. **Train:** Use **I Remember** / **I Don't Remember**. **Show Details** opens the sidebar. Spaced repetition waits 12h and retires after 3 correct answers.
3. **Options:** In **Menu → Options**, toggle “Show first meaning” and set answer speed (Off/30s/60s). Timer auto-skips as “Don’t remember”.
4. **Words list:** **Menu → Show All Words** to search, sort (active/last seen, asc/desc), change layout (1/2/3 columns), paginate, mark active/inactive, or add to a group.
5. **Groups:** **Menu → Groups** to create/rename/delete, start a group drill, import/export a group, or add words manually. Exit a drill via the group badge.
6. **Backups:** Use **Export** / **Import** under the add-cards form to backup/restore all stored data. Group-level import/export is inside **Groups → Manage**.
7. **Stats:** **Menu → Statistics** shows today’s counts and remember rate; stats reset daily.

## JSON card format

Provide an array of objects; only `phrase` is required. The app accepts either `meaning` (string) or `meanings` (array) plus optional metadata used in the sidebar.

```json
[
  {
    "phrase": "acquaint",
    "meanings": ["познакомить", "ознакомить", "ввести в курс"],
    "examples": ["Let me acquaint you with our process..."],
    "exampleTranslations": ["Позвольте познакомить вас с нашим процессом..."],
    "synonyms": ["introduce"],
    "level": 7,
    "frequency": 5
  }
]
```

- `phrase` (string, required): the prompt text.
- `meaning` (string) or `meanings` (array): translations/definitions.
- `examples` / `exampleTranslations` (arrays, optional).
- `synonyms` (array, optional).
- `level` and `frequency` (numbers 0–10, optional): shown as progress bars in the sidebar.

## Behavior notes

- Local data keys include cards, streaks, last-seen times, daily stats, settings, and group metadata; everything is stored in `localStorage` of the current browser.
- Group drills ignore wait times and streaks so you can review a whole group in one go.
- Marking a word as inactive (Used/Unused toggle) removes it from training until reactivated.

## License

Distributed under the MIT License.
