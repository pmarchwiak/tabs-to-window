function updateCount(tabId, isOnRemoved) {
  browser.tabs.query({})
  .then((tabs) => {
    let length = tabs.length;

    // onRemoved fires too early and the count is one too many.
    // see https://bugzilla.mozilla.org/show_bug.cgi?id=1396758
    if (isOnRemoved && tabId && tabs.map((t) => { return t.id; }).includes(tabId)) {
      length--;
    }

    browser.browserAction.setBadgeText({text: length.toString()});
    if (length > 2) {
      browser.browserAction.setBadgeBackgroundColor({'color': 'green'});
    } else {
      browser.browserAction.setBadgeBackgroundColor({'color': 'red'});
    }
  });
}

function createWindowAndMoveTabs(tabIds) {
  console.log(`creating a new window and moving tabs`);
  let creating = browser.windows.create();

  creating.then(
    (windowInfo) => {
      console.log(`created new window`);
      console.log(`now moving tab ids ${tabIds}`);
      let moving = browser.tabs.move(
        tabIds, {windowId: windowInfo.id, index: -1}
      );
    },
    (error) => console.log(`error: ${error}`));

}

function handleMessage(request, sender, sendResponse) {
  console.log(`A content script sent a message: ${request.action}`);
  if (request.action === 'tabs-move-new') {
    createWindowAndMoveTabs(request.tabIds);
  }
}

browser.runtime.onMessage.addListener(handleMessage);

browser.tabs.onRemoved.addListener(
  (tabId) => { updateCount(tabId, true);
});
browser.tabs.onCreated.addListener(
  (tabId) => { updateCount(tabId, false);
});
updateCount();
