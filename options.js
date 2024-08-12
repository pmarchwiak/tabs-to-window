async function saveOptions(e) {
  e.preventDefault();
  await browser.storage.local.set({
    truncate: document.querySelector("#truncate").checked,
    truncateOpenTag: document.querySelector("#truncate-open-tag").value,
    truncateCloseTag: document.querySelector("#truncate-close-tag").value,
    truncateLength: document.querySelector("#truncate-length").value,
  });
  console.log(`options saved`)
  browser.runtime.sendMessage({action:"optionsSaved"});
}

async function restoreOptions() {
  let res = await browser.storage.local.get(['truncate', 'truncateOpenTag', 'truncateCloseTag', 'truncateLength']);

  let doTruncate = res.truncate || false;
  document.querySelector("#truncate").checked = doTruncate;
  document.querySelector("#truncate-open-tag").value = res.truncateOpenTag || '[';
  document.querySelector("#truncate-close-tag").value = res.truncateOpenTag || ']';
  document.querySelector("#truncate-length").value = res.truncateLength || 40;

  enableDisableTruncate(doTruncate);
}

async function truncateCheckboxChanged() {
  enableDisableTruncate(this.checked);
}

async function enableDisableTruncate(enable) {
  if (enable) {
    document.querySelector("#truncate-open-tag").disabled = false;
    document.querySelector("#truncate-close-tag").disabled = false;
    document.querySelector("#truncate-length").disabled = false;
  }
  else {
    document.querySelector("#truncate-open-tag").disabled = true;
    document.querySelector("#truncate-close-tag").disabled = true;
    document.querySelector("#truncate-length").disabled = true; 
  }
}

document.querySelector("#truncate").addEventListener('change', truncateCheckboxChanged);
document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);