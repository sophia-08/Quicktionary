let lastWord = "";
let lastKnownMouseX = 0;
let lastKnownMouseY = 0;
let highlightedElement = null;
let popupElement = null;
let popupStyleElement = null;
let userShortcut = { key: "q", modifiers: ["ctrl"] };

// Fetch the user-defined shortcut from storage
chrome.storage.sync.get("shortcut", function (data) {
  if (data.shortcut) {
    userShortcut = data.shortcut;
  }
});

// Listen for shortcut changes
chrome.storage.onChanged.addListener(function (changes, namespace) {
  if (namespace === "sync" && changes.shortcut) {
    userShortcut = changes.shortcut.newValue;
  }
});

// Track the last known mouse position
document.addEventListener(
  "mousemove",
  (e) => {
    lastKnownMouseX = e.clientX;
    lastKnownMouseY = e.clientY;

    // Add popup removal logic here
    if (highlightedElement && popupElement) {
      const highlightedRect = highlightedElement.getBoundingClientRect();
      const popupRect = popupElement.getBoundingClientRect();

      // Check if mouse is outside both the highlighted element and the popup
      if (
        !isMouseInElement(e, highlightedRect) &&
        !isMouseInElement(e, popupRect)
      ) {
        removeHighlight();
      }
    }
  },
  { passive: true }
);

// Helper function to check if mouse is inside an element
function isMouseInElement(mouseEvent, elementRect) {
  return (
    mouseEvent.clientX >= elementRect.left &&
    mouseEvent.clientX <= elementRect.right &&
    mouseEvent.clientY >= elementRect.top &&
    mouseEvent.clientY <= elementRect.bottom
  );
}

// Function to handle the dictionary lookup
function handleDictionaryLookup(x, y) {
  // Remove previous highlight if it exists
  removeHighlight();

  console.log("Last xy: ", x, y);

  // Use the provided mouse position
  const result = getWordAtPosition(x, y);

  if (result && result.word) {
    lastWord = result.word;

    // Highlight the word
    highlightWord(result.range);
  }
}

// Add event listener for double-click
document.addEventListener("dblclick", (e) => {
  handleDictionaryLookup(e.clientX, e.clientY);
});

document.addEventListener("keydown", (e) => {
  // Check if the pressed key combination matches the user-defined shortcut
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const modifiersPressed = userShortcut.modifiers.every(
    (mod) =>
      (mod === "ctrl" && (e.ctrlKey || (isMac && e.metaKey))) ||
      (mod === "shift" && e.shiftKey)
  );

  if (
    modifiersPressed &&
    e.key.toLowerCase() === userShortcut.key.toLowerCase()
  ) {
    e.preventDefault(); // Prevent default browser behavior for this key combination
    handleDictionaryLookup(lastKnownMouseX, lastKnownMouseY);
  }
});

function getWordAtPosition(x, y) {
  const range = document.caretRangeFromPoint(x, y);
  if (!range) return null;

  const textNode = range.startContainer;
  const offset = range.startOffset;

  if (textNode.nodeType !== Node.TEXT_NODE) return null;

  const text = textNode.textContent;
  let start = offset;
  let end = offset;

  // Find the start of the word
  while (start > 0 && /\w/.test(text[start - 1])) {
    start--;
  }

  // Find the end of the word
  while (end < text.length && /\w/.test(text[end])) {
    end++;
  }

  const word = text.slice(start, end);
  range.setStart(textNode, start);
  range.setEnd(textNode, end);

  return { word, range };
}

function highlightWord(range) {
  removeHighlight(); // Ensure any existing highlight is removed
  const highlight = document.createElement("span");
  highlight.className = "extension-highlight"; // Add a class for easier identification

  // Set theme-aware highlight color
  setThemeAwareHighlight(highlight);

  range.surroundContents(highlight);
  highlightedElement = highlight;

  // Create and position the popup
  createPopup(highlight);

  // Fetch the definition
  fetchDefinition(lastWord);
}

function setThemeAwareHighlight(element) {
  const bodyStyles = window.getComputedStyle(document.body);
  const isDarkTheme =
    bodyStyles.backgroundColor
      .match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i)
      .slice(1)
      .map(Number)
      .reduce((a, b) => a + b) < 382; // Threshold for considering it a dark theme

  if (isDarkTheme) {
    element.style.backgroundColor = "rgba(192, 192, 0, 0.4)"; // Dark yellow with transparency
    element.style.color = "#fff"; // White text for dark background
  } else {
    element.style.backgroundColor = "rgba(255, 255, 0, 0.3)"; // Light yellow with transparency
    element.style.color = "inherit"; // Inherit text color from parent
  }

  // Add a subtle outline for better visibility
  element.style.outline = isDarkTheme
    ? "1px solid rgba(255, 255, 0, 0.5)"
    : "1px solid rgba(0, 0, 0, 0.2)";
  element.style.borderRadius = "2px";
}

function removeHighlight() {
  if (highlightedElement) {
    const parent = highlightedElement.parentNode;
    while (highlightedElement.firstChild) {
      parent.insertBefore(highlightedElement.firstChild, highlightedElement);
    }
    parent.removeChild(highlightedElement);
    highlightedElement = null;
    removePopup(); // Remove the popup when removing the highlight
  }
}

function createPopup(highlightedElement) {
  removePopup(); // Remove any existing popup

  popupElement = document.createElement("div");
  popupElement.id = "extension-popup"; // Add an ID for styling
  popupElement.textContent = "Loading definition...";

  // Set theme-aware styles
  setThemeAwareStyles(popupElement);

  // Append the popup to the body to get its dimensions
  document.body.appendChild(popupElement);

  const rect = highlightedElement.getBoundingClientRect();
  const popupRect = popupElement.getBoundingClientRect();

  // Check if there's enough space below the highlighted element
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;

  let top, left;

  if (spaceBelow >= popupRect.height || spaceBelow > spaceAbove) {
    // Place popup below the highlighted element
    top = rect.bottom + window.scrollY;
    left = rect.left + window.scrollX;
  } else {
    // Place popup above the highlighted element
    top = rect.top + window.scrollY - popupRect.height;
    left = rect.left + window.scrollX;
  }

  // Ensure the popup doesn't go off-screen horizontally
  const rightEdge = left + popupRect.width;
  if (rightEdge > window.innerWidth) {
    left = window.innerWidth - popupRect.width;
  }

  // Set the position
  popupElement.style.left = `${Math.max(0, left)}px`;
  popupElement.style.top = `${Math.max(0, top)}px`;
}

// Get the bounding rectangles
// const highlightRect = highlightElement.getBoundingClientRect();
// const popupRect = popupElement.getBoundingClientRect();
// console.log("highlight:",  highlightRect);
// console.log("popup:",  popupRect);
// console.log("window:", window.scrollX, window.scrollY, window.innerWidth, window.innerHeight);
// }

function setThemeAwareStyles(element) {
  const bodyStyles = window.getComputedStyle(document.body);
  const isDarkTheme =
    bodyStyles.backgroundColor
      .match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i)
      .slice(1)
      .map(Number)
      .reduce((a, b) => a + b) < 382;

  // Remove existing style element if it exists
  if (popupStyleElement) {
    popupStyleElement.remove();
  }

  // Create a new style element
  popupStyleElement = document.createElement("style");

  popupStyleElement.textContent = `
    #extension-popup {
      position: absolute;
      padding: 10px;
      border-radius: 5px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      z-index: 1000;
      max-width: 500px;
      max-height: 300px;
      overflow-y: auto;
      line-height: 1.4;
      background-color: ${
        isDarkTheme ? "rgba(40, 40, 40, 0.95)" : "rgba(255, 255, 255, 0.95)"
      };
      color: ${isDarkTheme ? "#e0e0e0" : "#333"};
      border: 1px solid ${isDarkTheme ? "#555" : "#ccc"};
    }

    #extension-popup::-webkit-scrollbar {
      width: 8px;
    }
    #extension-popup::-webkit-scrollbar-track {
      background: ${isDarkTheme ? "#333" : "#f1f1f1"};
    }
    #extension-popup::-webkit-scrollbar-thumb {
      background: ${isDarkTheme ? "#666" : "#ccc"};
      border-radius: 4px;
    }
    #extension-popup::-webkit-scrollbar-thumb:hover {
      background: ${isDarkTheme ? "#888" : "#aaa"};
    }
    #extension-popup he2 {
      font-size: 1.5em;
      font-weight: bold;
      margin-top: 10px;
      margin-bottom: 5px;
      color: ${isDarkTheme ? "#4caf50" : "#2e7d32"}; // Green-ish
      border-bottom: 1px solid ${isDarkTheme ? "#555" : "#ccc"};
      padding-bottom: 3px;
      display: block;
    }

    #extension-popup he3 {
      font-size: 1.1em;
      font-weight: bold;
      margin-top: 10px;
      margin-bottom: 5px;
      color: ${isDarkTheme ? "#4caf50" : "#2e7d32"}; // Green-ish
      border-bottom: 1px solid ${isDarkTheme ? "#555" : "#ccc"};
      padding-bottom: 3px;
      display: block;
    }
  `;

  // Append the style element to the document head
  document.head.appendChild(popupStyleElement);
}

function removePopup() {
  if (popupElement) {
    popupElement.remove();
    popupElement = null;
  }
  if (popupStyleElement) {
    popupStyleElement.remove();
    popupStyleElement = null;
  }
}

// Function to handle API requests
function fetchDefinition(word) {
  const lowercaseWord = word.toLowerCase();
  fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${lowercaseWord}`)
    .then((response) => response.json())
    .then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        const entry = data[0];
        let definitionHTML =
          '<div style="display: flex; align-items: center; margin-bottom: 10px;">';
        definitionHTML += `<he2 style="margin-right: 10px;">${word}</he2>`;

        // Add phonetic element and play button after the word
        if (entry.phonetics && entry.phonetics.length > 0) {
          const phonetic = entry.phonetics.find((p) => p.text && p.audio);
          if (phonetic) {
            definitionHTML +=
              '<div style="display: flex; align-items: center;">';
            definitionHTML += `<span style="font-size: 0.9em; color: #666; margin-right: 5px;">${phonetic.text}</span>`;
            definitionHTML += `<button onclick="new Audio('${phonetic.audio}').play()" style="background: none; border: none; cursor: pointer; padding: 0; font-size: 1em; color: #4a4a4a; line-height: 1;">▶️</button>`;
            definitionHTML += "</div>";
          }
        }
        definitionHTML += "</div>";

        entry.meanings.forEach((meaning, index) => {
          definitionHTML += `<he3>${index + 1}. ${meaning.partOfSpeech}</he3>`;
          definitionHTML += "<ul>";
          meaning.definitions.forEach((def) => {
            definitionHTML += `<li><strong>Definition:</strong> ${def.definition}`;
            if (def.example) {
              definitionHTML += `<br><em>Example:</em> "${def.example}"`;
            }
            definitionHTML += "</li>";
          });
          definitionHTML += "</ul>";

          if (meaning.synonyms.length > 0) {
            definitionHTML += `<p><strong>Synonyms:</strong> ${meaning.synonyms.join(
              ", "
            )}</p>`;
          }
          if (meaning.antonyms.length > 0) {
            definitionHTML += `<p><strong>Antonyms:</strong> ${meaning.antonyms.join(
              ", "
            )}</p>`;
          }
        });

        updatePopupContent(definitionHTML);
      } else {
        updatePopupContent("Definition not found.");
      }
    })
    .catch((error) => {
      console.error("Error fetching definition:", error);
      updatePopupContent("Error fetching definition.");
    });
}
// Function to update the popup content
function updatePopupContent(content) {
  if (popupElement) {
    popupElement.innerHTML = content;


  const rect = highlightedElement.getBoundingClientRect();
  const popupRect = popupElement.getBoundingClientRect();

  // Check if there's enough space below the highlighted element
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;

  let top, left;

  if (spaceBelow >= popupRect.height || spaceBelow > spaceAbove) {
    // Place popup below the highlighted element
    top = rect.bottom + window.scrollY;
    left = rect.left + window.scrollX;
  } else {
    // Place popup above the highlighted element
    top = rect.top + window.scrollY - popupRect.height;
    left = rect.left + window.scrollX;
  }

  // Ensure the popup doesn't go off-screen horizontally
  const rightEdge = rect.right + popupRect.width;
  if (rightEdge >= window.innerWidth) {
    left = Math.min(left, window.innerWidth - 400);
  }

  // Set the position
  popupElement.style.left = `${Math.max(0, left)}px`;
  popupElement.style.top = `${Math.max(0, top)}px`;
  }
}
