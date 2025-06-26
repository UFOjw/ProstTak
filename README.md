# Anki Trainer

A lightweight, browser-based flashcard trainer inspired by Anki. It allows you to load custom card decks in JSON format, practice remembering phrases and their meanings, and import/export your data.

## Features

* **Add Cards:** Paste a JSON array of cards to build your deck.
* **Spaced Repetition:** Cards repeat with a 12-hour interval and up to 3 successful recalls before they retire.
* **Learning Modes:** Toggle between showing the original phrase or its first meaning.
* **Progress Tracking:** View counts of remembered vs. not remembered and session progress.
* **Details Sidebar:** View card metadata including level, frequency, examples, translations, and synonyms.
* **Word List & Menu:** Browse all cards and reset training or adjust options.
* **Data Persistence:** Stores cards, recall streaks, and last-view timestamps in localStorage.
* **Import/Export:** Backup and restore your entire training data as JSON.

## Demo

GIF demo placeholder.

## Installation

1. Clone or download this repository to your Nginx web root directory.
2. Configure your Nginx server block. For example:

```nginx
server {
    listen 8080;
    server_name localhost;

    root   your_root;
    index  index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

3. Reload or restart Nginx:

```bash
sudo nginx -s reload
```

4. Open your browser and navigate to `http://localhost:8080` to access the Anki Trainer.

## Usage

1. Open `index.html` in your browser (or via local server).
2. Click **Show Add Cards Form** and paste your JSON card data.
3. Click **Load Cards** to start your session.
4. Use **I Remember** / **I Don't Remember** to record your answers.
5. Click **Show Details** to open the sidebar with additional card information.
6. Open the **Menu (\u2630)** to:

   * Reset training progress
   * View the full word list
   * Adjust settings in **Options**
   * Use **Export** to download a JSON backup of your localStorage
   * Use **Import** to restore from a previously saved JSON file

## JSON Card Data Format

Cards should be provided as a JSON array, where each card object has the following shape:

```json
[
  {
    "phrase": "acquaint",
    "meanings": ["познакомить", "ознакомить", "ввести в курс"],
    "examples": ["Let me acquaint you with our process..."],
    "exampleTranslations": ["Позвольте познакомить вас с нашим процессом..."],
    "synonyms": ["introduce"]
  }
]
```

### Field Descriptions

* **phrase** (string): the term or word in your native language.
* **meanings** (array): list of possible translations or definitions.
* **examples** (array, optional): example sentences.
* **exampleTranslations** (array, optional): translations of examples.
* **synonyms** (array, optional): related words.

## Configuration

* **Spaced Interval:** Fixed at 12 hours before a card reappears.
* **Max Recall Attempts:** 3 successful recalls retire a card.
* **View Mode:** Toggle "Show first meaning" in **Options**.

To customize behavior, modify constants in `main.js`:

```javascript
const WAIT_TIME = 12 * 60 * 60 * 1000; // interval between reviews
const MAX_STREAK = 3;                  // number of successful recalls
```

## Contributing

Contributions and suggestions are welcome. Please fork the repository and open a pull request.

## License

Distributed under the MIT License.
