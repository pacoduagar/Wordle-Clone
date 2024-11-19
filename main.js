const WORD_LENGTH = 5;
const FLIP_ANIMATION_DURATION = 500;
const DANCE_ANIMATION_DURATION = 500;
const keyboard = document.querySelector("[data-keyboard]");
const alertContainer = document.querySelector("[data-alert-container]");
const guessGrid = document.querySelector("[data-guess-grid]");
const offsetFromDate = new Date(2022, 0, 1);
const msOffset = Date.now() - offsetFromDate;
const dayOffset = Math.floor(msOffset / 1000 / 60 / 60 / 24);

let targetWords = [];
let dictionary = [];
let targetWord;
let language = "english"; // Default to English

// Load JSON files and initialize the game
loadJSON();

// Add event listener for the "Toggle Language" button
document.querySelector("[data-toggle-language]").addEventListener("click", toggleLanguage);

function loadJSON() {
  // Determine which files to load based on the current language
  const targetWordsFile = language === "english" ? "./JSON/targetWords.json" : "./JSON/palabrasObjetivo.json";
  const dictionaryFile = language === "english" ? "./JSON/dictionary.json" : "./JSON/diccionario.json";

  Promise.all([
    fetch(targetWordsFile).then((response) => {
      if (!response.ok) throw new Error(`Failed to load ${targetWordsFile}`);
      return response.json();
    }),
    fetch(dictionaryFile).then((response) => {
      if (!response.ok) throw new Error(`Failed to load ${dictionaryFile}`);
      return response.json();
    }),
  ])
    .then(([loadedTargetWords, loadedDictionary]) => {
      targetWords = loadedTargetWords;
      dictionary = loadedDictionary;
      targetWord = targetWords[dayOffset % targetWords.length];
      resetGame(); // Reset the game when new data is loaded
      startInteraction();
    })
    .catch((error) => {
      console.error("Error loading JSON files:", error);
      showAlert("Error loading game data. Please try again later.");
    });
}

function toggleLanguage(e) {
  language = language === "english" ? "spanish" : "english";
  showAlert(`Switched to ${language === "english" ? "English" : "Spanish"}`, 2000);

  e.target.blur(); // Remove focus from the button to avoid accidental triggers
  // Show or hide the Ñ key
  const nKey = document.getElementById("key-n");
  const tecladoEspanol = document.getElementById("teclado");
  if (language === "spanish") {
    nKey.style.display = 'block'; // Show Ñ key
    tecladoEspanol.style.gridTemplateColumns = 'repeat(21, minmax(auto, 1.25em))';
  } else {
    tecladoEspanol.style.gridTemplateColumns = 'repeat(20, minmax(auto, 1.25em))';

    nKey.style.display = 'none';  // Hide Ñ key
  } 
  stopInteraction();
  loadJSON();
}

document.querySelector('[data-toggle-theme]').addEventListener('click', (e) => {
  document.body.classList.toggle('light-mode');
  e.target.blur();
});


function resetGame() {
  // Clear the guess grid and reset keyboard styles
  guessGrid.querySelectorAll("[data-letter]").forEach((tile) => {
    tile.textContent = "";
    delete tile.dataset.state;
    delete tile.dataset.letter;
  });

  keyboard.querySelectorAll("[data-key]").forEach((key) => {
    key.classList.remove("correct", "wrong-location", "wrong");
  });
}

// Start interaction listeners
function startInteraction() {
  document.addEventListener("click", handleMouseClick);
  document.addEventListener("keydown", handleKeyPress);
}

function stopInteraction() {
  document.removeEventListener("click", handleMouseClick);
  document.removeEventListener("keydown", handleKeyPress);
}

function handleMouseClick(e) {
  if (e.target.matches("[data-key]")) {
    pressKey(e.target.dataset.key);
    return;
  }

  if (e.target.matches("[data-enter]")) {
    submitGuess();
    return;
  }

  if (e.target.matches("[data-delete]")) {
    deleteKey();
    return;
  }
}

function handleKeyPress(e) {
  const key = e.key.toLowerCase();

  if (key === "enter") {
    submitGuess();
    return;
  }

  if (key === "backspace" || key === "delete") {
    deleteKey();
    return;
  }

  // Allow typing "ñ" when in Spanish
  if (language === "spanish" && key === "ñ") {
    pressKey(key);
    return;
  }

  if (key.match(/^[a-z]$/)) {
    pressKey(key);
    return;
  }
}



function pressKey(key) {
  const activeTiles = getActiveTiles();
  if (activeTiles.length >= WORD_LENGTH) return;
  const nextTile = guessGrid.querySelector(":not([data-letter])");
  nextTile.dataset.letter = key.toLowerCase();
  nextTile.textContent = key;
  nextTile.dataset.state = "active";
}

function deleteKey() {
  const activeTiles = getActiveTiles();
  const lastTile = activeTiles[activeTiles.length - 1];
  if (lastTile == null) return;
  lastTile.textContent = "";
  delete lastTile.dataset.state;
  delete lastTile.dataset.letter;
}

function submitGuess() {
  const activeTiles = [...getActiveTiles()];
  if (activeTiles.length !== WORD_LENGTH) {
    showAlert("Not enough letters");
    shakeTiles(activeTiles);
    return;
  }

  const guess = activeTiles.reduce((word, tile) => {
    return word + tile.dataset.letter;
  }, "");

  if (!dictionary.includes(guess)) {
    showAlert("Not in word list");
    shakeTiles(activeTiles);
    return;
  }

  stopInteraction();
  activeTiles.forEach((...params) => flipTile(...params, guess));
}

function flipTile(tile, index, array, guess) {
  const letter = tile.dataset.letter;
  const key = keyboard.querySelector(`[data-key="${letter}"i]`);
  setTimeout(() => {
    tile.classList.add("flip");
  }, (index * FLIP_ANIMATION_DURATION) / 2);

  tile.addEventListener(
    "transitionend",
    () => {
      tile.classList.remove("flip");
      if (targetWord[index] === letter) {
        tile.dataset.state = "correct";
        key.classList.add("correct");
      } else if (targetWord.includes(letter)) {
        tile.dataset.state = "wrong-location";
        key.classList.add("wrong-location");
      } else {
        tile.dataset.state = "wrong";
        key.classList.add("wrong");
      }

      if (index === array.length - 1) {
        tile.addEventListener(
          "transitionend",
          () => {
            startInteraction();
            checkWinLose(guess, array);
          },
          { once: true }
        );
      }
    },
    { once: true }
  );
}

function getActiveTiles() {
  return guessGrid.querySelectorAll('[data-state="active"]');
}

function showAlert(message, duration = 1000) {
  const alert = document.createElement("div");
  alert.textContent = message;
  alert.classList.add("alert");
  alertContainer.prepend(alert);
  if (duration == null) return;

  setTimeout(() => {
    alert.classList.add("hide");
    alert.addEventListener("transitionend", () => {
      alert.remove();
    });
  }, duration);
}

function shakeTiles(tiles) {
  tiles.forEach((tile) => {
    tile.classList.add("shake");
    tile.addEventListener(
      "animationend",
      () => {
        tile.classList.remove("shake");
      },
      { once: true }
    );
  });
}

function checkWinLose(guess, tiles) {
  if (guess === targetWord) {
    showAlert("You Win", 5000);
    danceTiles(tiles);
    stopInteraction();
    return;
  }

  const remainingTiles = guessGrid.querySelectorAll(":not([data-letter])");
  if (remainingTiles.length === 0) {
    showAlert(targetWord.toUpperCase(), null);
    stopInteraction();
  }
}

function danceTiles(tiles) {
  tiles.forEach((tile, index) => {
    setTimeout(() => {
      tile.classList.add("dance");
      tile.addEventListener(
        "animationend",
        () => {
          tile.classList.remove("dance");
        },
        { once: true }
      );
    }, (index * DANCE_ANIMATION_DURATION) / 5);
  });
}
