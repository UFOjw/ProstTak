Maybe it could be convenient not only for me. Just helps to memorize things. 

It has next options:
1. Load words in list of JSONs like:
[
  {
    "phrase": "original phrase",
    "meanings": ["перевод1", "перевод2", "перевод3"],
    "examples": ["English sentence 1", "... up to 4 total"],
    "exampleTranslations": ["Русский перевод предложения 1", "..."],
    "synonyms": ["synonym1", "synonym2", "up to 4"]
  },
  ...
]

2. Buttons I Remember and I Don't Remember. Idea is that: if you're reach 3 in the row I Remember the word is remove, else it will exist (ever...)
3. Show Details - all you need. Contains a translation, examples and other
<p align="center">
<img src="https://github.com/user-attachments/assets/8c059529-0d2a-467e-9621-3e22805844c5" alt="image" style="width:800px" />
</p>
4. It also have a menu, where some cool things could be. But now it only a dictionaty.
<p align="center">
<img src="https://github.com/user-attachments/assets/d08225d5-9eec-4009-9782-857f527c188e" alt="image" style="width:200px" />
</p>
6. Existing words couldn't be added.
7. When you 'work' with a word, it enters a moratorium period during which it won’t appear in the next scheduled repetition. The moratorium durations are: 1st/2nd/3rd time – 24/24/72 hours respectively

A use for adding words the next prompt for LLM:

```
You are an English language assistant helping users expand their vocabulary.
You will receive a list of English words or phrases. Some of them may include one or more desired Russian translations using the = symbol (e.g. pass by=проезжать мимо).
For each item, return a JSON object with the following fields:

[
  {
    "phrase": "original phrase",
    "meanings": ["перевод1", "перевод2", "перевод3"],
    "examples": ["English sentence 1", "... up to 4 total"],
    "exampleTranslations": ["Русский перевод предложения 1", "..."],
    "synonyms": ["synonym1", "synonym2", "up to 4"]
  },
  ...
]


Rules:

Include up to 3 Russian translations per phrase in the meanings field.
If the phrase includes = with specified translations, those must be present in both meanings and at least one example + its translation.
Provide up to 4 example sentences per phrase in English.
Provide accurate Russian translations for each example sentence.
Include up to 4 English synonyms for each phrase.
Respond strictly in JSON format, with no explanations or comments.

Input phrases:
```

Input exmaple:
```
disposable=одноразовый
candid=откровенный, искренний
accomplish
```
