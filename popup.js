document.addEventListener("DOMContentLoaded", function () {
  var keyInput = document.getElementById("key");
  var modifierSelect = document.getElementById("modifier");
  var saveButton = document.getElementById("save");

  // Load current shortcut
  chrome.storage.sync.get("shortcut", function (data) {
    if (data.shortcut) {
      keyInput.value = data.shortcut.key;
      modifierSelect.value = data.shortcut.ctrlKey
        ? "ctrl"
        : data.shortcut.altKey
        ? "alt"
        : "shift";
    }
  });

  // Save new shortcut
  saveButton.addEventListener("click", function () {
    var newKey = keyInput.value.toLowerCase();
    var modifier = modifierSelect.value;
    if (newKey) {
      var shortcut = {
        key: newKey,
        ctrlKey: modifier === "ctrl",
        altKey: modifier === "alt",
        shiftKey: modifier === "shift",
      };
      chrome.storage.sync.set({ shortcut: shortcut }, function () {
        // Change button text to "Saved!"
        saveButton.textContent = "Saved!";
        saveButton.disabled = true;

        // Close the popup after a short delay
        setTimeout(function () {
          window.close();
        }, 500); // 500 ms delay
      });
    }
  });
});
