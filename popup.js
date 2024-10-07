document.addEventListener("DOMContentLoaded", function () {
  var shortcutInput = document.getElementById("shortcut");
  var saveButton = document.getElementById("save");

  // Load current shortcut
  chrome.storage.sync.get("shortcut", function (data) {
    shortcutInput.value = data.shortcut || "q";
  });

  // Save new shortcut
  saveButton.addEventListener("click", function () {
    var newShortcut = shortcutInput.value.toLowerCase();
    if (newShortcut) {
      chrome.storage.sync.set({ shortcut: newShortcut }, function () {
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
