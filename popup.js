document.addEventListener("DOMContentLoaded", function () {
  var keyInput = document.getElementById("key");
  var modifierSelect = document.getElementById("modifier");
  var saveButton = document.getElementById("save");
  var isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;

  // Hide/show options based on platform
  if (isMac) {
    var altOption = modifierSelect.querySelector(".windows-only");
    if (altOption) {
      altOption.style.display = "none";
    }
  } else {
    var optionOption = modifierSelect.querySelector(".mac-only");
    if (optionOption) {
      optionOption.style.display = "none";
    }
  }

  // Load current shortcut
  chrome.storage.sync.get("shortcut", function (data) {
    if (data.shortcut) {
      keyInput.value = data.shortcut.key;
      modifierSelect.value = data.shortcut.modifier;
    }
  });

  // Save new shortcut
  saveButton.addEventListener("click", function () {
    var newKey = keyInput.value.toLowerCase();
    var modifier = modifierSelect.value;
    if (newKey) {
      var shortcut = {
        key: newKey,
        modifier: modifier,
      };
      chrome.storage.sync.set({ shortcut: shortcut }, function () {
        window.close();
      });
    }
  });
});
