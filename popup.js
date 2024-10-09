document.addEventListener("DOMContentLoaded", function () {
  var keyInput = document.getElementById("key");
  var ctrlCheckbox = document.getElementById("ctrlModifier");
  var shiftCheckbox = document.getElementById("shiftModifier");
  var saveButton = document.getElementById("save");

  // Load current shortcut
  chrome.storage.sync.get("shortcut", function (data) {
    if (data.shortcut) {
      keyInput.value = data.shortcut.key;
      ctrlCheckbox.checked = data.shortcut.modifiers.includes("ctrl");
      shiftCheckbox.checked = data.shortcut.modifiers.includes("shift");
    }
  });

  // Save new shortcut
  saveButton.addEventListener("click", function () {
    var newKey = keyInput.value.toLowerCase();
    var modifiers = [];
    if (ctrlCheckbox.checked) modifiers.push("ctrl");
    if (shiftCheckbox.checked) modifiers.push("shift");

    if (newKey) {
      var shortcut = {
        key: newKey,
        modifiers: modifiers,
      };
      chrome.storage.sync.set({ shortcut: shortcut }, function () {
        window.close();
      });
    }
  });
});
