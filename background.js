function onMenuCreated(id) {
  console.log(`menu created with id ${id}`);
}

async function refreshTabMenu(details) {
  console.log('refreshTabMenu called');
  browser.menus.create(
    {
      id: "left-new",
      title: "Move Tabs to Left to New Window",
      // title: browser.i18n.getMessage("menuItemRemoveMe"),
      contexts: ["tab"],
    },
    onMenuCreated,
  );

  browser.menus.create(
    {
      id: "right-new",
      title: "Move Tabs to Right to New Window",
      // title: browser.i18n.getMessage("menuItemRemoveMe"),
      contexts: ["tab"],
    },
    onMenuCreated,
  );

  browser.menus.create(
    {
      id: "left-parent",
      title: "Move Tabs to Left to Existing Window",
      // title: browser.i18n.getMessage("menuItemRemoveMe"),
      contexts: ["tab"],
    },
    onMenuCreated,
  );
  
  browser.menus.create(
    {
      id: "right-parent",
      title: "Move Tabs to Right to Existing Window",
      // title: browser.i18n.getMessage("menuItemRemoveMe"),
      contexts: ["tab"],
    },
    onMenuCreated,
  );

  browser.menus.create(
    {
      id: "all-parent",
      title: "Move All Tabs to Existing Window",
      // title: browser.i18n.getMessage("menuItemRemoveMe"),
      contexts: ["tab"],
    },
    onMenuCreated,
  );

  let options = await browser.storage.local.get(['truncate', 'truncateOpenTag', 'truncateCloseTag', 'truncateLength']);
  console.log(`read options: ${JSON.stringify(options)}`)
  let truncateWindowTitles = options.truncate || false;
  let windowTitleOpeningTag = options.truncateOpenTag;
  let windowTitleClosingTag = options.truncateCloseTag;
  let windowTitleMaxLength = options.truncateLength || 0;
 
  browser.windows.getAll({populate: false, windowTypes: ["normal"],})
    .then(
      (windows) => {
        let nonFocusedWindows = windows.filter((window) => !window.focused);
        console.log(`found ${nonFocusedWindows.length} non focused windows`);
        for (const window of nonFocusedWindows) {

          // Simplify window titles when used with the Window Title extension
          let windowTitle = window.title;
          if (truncateWindowTitles) {
            console.log("truncating...")
            if (windowTitleOpeningTag && windowTitle.startsWith(windowTitleOpeningTag)) {
              let end = windowTitle.indexOf(windowTitleClosingTag);
              if (end > 0) {
                windowTitle = windowTitle.slice(0, end + 1);
              }
            }
            if (windowTitleMaxLength > 0 && windowTitle.length > windowTitleMaxLength) {
              windowTitle = windowTitle.slice(0, windowTitleMaxLength) + "...";
            }
          }

          browser.menus.create(
            {
              id: `right-window-${window.id}`,
              parentId: "right-parent",
              title: windowTitle,
              contexts: ["tab"],
            }
          );

          browser.menus.create(
            {
              id: `left-window-${window.id}`,
              parentId: "left-parent",
              title: windowTitle,
              contexts: ["tab"],
            }
          );

          browser.menus.create(
            {
              id: `all-window-${window.id}`,
              parentId: "all-parent",
              title: windowTitle,
              contexts: ["tab"],
            }
          );
        }
      }, 
      (error) => console.log(`failed to get windows during menu creation`)
    );
}

function moveTabsToNewWindow(tabIds) {
  console.log(`creating a new window and moving tabs`);
  let firstTabId = tabIds[0];
  let creating = browser.windows.create({tabId: firstTabId});

  creating.then(
    (windowInfo) => {
      console.log(`created new window with ${firstTabId}`);
      
      if (tabIds.length > 1) {
        let otherTabIds = tabIds.slice(1);
        console.log(`now moving other tab ids ${otherTabIds}`);
        let moving = browser.tabs.move(
          otherTabIds, {windowId: windowInfo.id, index: -1}
        );
      }
    },
    (error) => console.log(`error: ${error}`));
}

function moveTabsToWindow(tabIds, windowId) {
  browser.tabs.move(
    tabIds, {windowId, index: -1}
  ); 
}

function onMenuItemClicked(menusOnClickData) {
  console.log(`menu item clicked: ${menusOnClickData.menuItemId}, ${JSON.stringify(menusOnClickData)}`)
  let menuItemId = menusOnClickData.menuItemId;
  let pageUrl = menusOnClickData.pageUrl;
  let querying = browser.tabs.query({currentWindow: true});
  let tabIds = [];

  // Check if we're moving to an existing window
  let targetWindowId;
  if (menuItemId.startsWith('right-window') || 
      menuItemId.startsWith('left-window') || 
      menuItemId.startsWith('all-window')) {
    // Match one or more digits at the end of the string
    const idMatch = menuItemId.match(/\d+$/);
    if (idMatch) {
      targetWindowId = parseInt(idMatch[0], 10);
    }
  }

  querying.then(
    (tabs) => {
      console.log(`found ${tabs.length} tabs in window`);

      // is there a better way to identify which tab had it's menu clicked??
      // this method won't work well if there are multiple duplicate tabs open..
      let clickedTab = tabs.find((tab) => tab.url === pageUrl);
      console.log(`found clicked tab ${clickedTab.id}`)

      let tabsToMove;
      if (menuItemId.startsWith("right")) {
        tabsToMove = tabs.filter((tab) => tab.index > clickedTab.index);
      }
      else if (menuItemId.startsWith("left")) {
        tabsToMove = tabs.filter((tab) => tab.index < clickedTab.index);
      }
      else if (menuItemId.startsWith("all")) {
        tabsToMove = tabs;
      }

      if (tabsToMove) {
        console.log(`found ${tabsToMove.length} tabs to move`);
        tabIds = tabsToMove.map((tab) => tab.id);
      }
      console.log(`tab ids: ${JSON.stringify(tabIds)}`);

      if (tabIds && tabIds.length > 0) {
        if (targetWindowId) {
          moveTabsToWindow(tabIds, targetWindowId)
        }
        else {
          moveTabsToNewWindow(tabIds);
        }
      }
    }
  );
}

async function onMessageReceived(msg) {
  console.log(`received msg ${JSON.stringify(msg)}`);
  if (msg.action && msg.action === 'optionsSaved') {
    refreshTabMenu(null);
  }
}

browser.menus.onClicked.addListener(onMenuItemClicked);
browser.runtime.onMessage.addListener(onMessageReceived);
browser.runtime.onInstalled.addListener(refreshTabMenu);
browser.windows.onCreated.addListener(refreshTabMenu);
browser.windows.onFocusChanged.addListener(refreshTabMenu);
browser.windows.onRemoved.addListener(refreshTabMenu);