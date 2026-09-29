// Default role permissions.
const PERMISSION_DEFAULTS = [
  ["role",     "home", "m1", "m2", "m3", "m4", "m5", "m6", "m7", "m8", "m9", "m10", "m11", "m12"],
  ["Owner",         1,    1,    1,    1,    1,    1,    1,    1,    1,    1,     1,     1,     1],
  ["Staff",         1,    0,    1,    1,    0,    1,    1,    0,    1,    1,     0,     0,     1],
  ["Designer",      1,    0,    0,    1,    0,    0,    0,    1,    1,    0,     0,     0,     1]
];


// Load the permission grid.
function getPermissions() {
  const saved = load("permissions");

  if (saved.length === 0) {
    save("permissions", PERMISSION_DEFAULTS);
    return PERMISSION_DEFAULTS;
  }
  return saved;
}


// Find a page column.
function pageColumn(grid, page) {
  for (let c = 1; c < grid[0].length; c++) {
    if (grid[0][c] === page) {
      return c;
    }
  }
  return -1;
}


// Find a role row.
function roleRow(grid, role) {
  for (let r = 1; r < grid.length; r++) {
    if (grid[r][0] === role) {
      return r;
    }
  }
  return -1;
}


// Check page access.
function canOpen(role, page) {
  const grid = getPermissions();

  const column = pageColumn(grid, page);
  const row = roleRow(grid, role);

  if (column === -1 || row === -1) {
    return false;
  }
  return grid[row][column] === 1;
}


// Change one permission.
function setPermission(role, page, allowed) {
  const grid = getPermissions();

  const column = pageColumn(grid, page);
  const row = roleRow(grid, role);

  if (column === -1 || row === -1) {
    return false;
  }

  if (allowed === true) {
    grid[row][column] = 1;
  } else {
    grid[row][column] = 0;
  }

  save("permissions", grid);
    const accessWord = allowed === true ? "can now open" : "can no longer open";
    addLog("Changed access", "permissions", role + " / " + page,
      role + " " + accessWord + " the " + page + " page.");
  return true;
}


// Reset permissions.
function resetPermissions() {
  save("permissions", PERMISSION_DEFAULTS);
    addLog("Reset access", "permissions", "all roles",
      "Restored page access to the default permissions for every role.");
}


// Start a protected page.
function startPage(page) {
  const user = getUser();

  // Redirect signed-out users.
  if (user === null) {
    window.location.href = backToRoot() + "index.html";
    return null;
  }

  // Redirect blocked users.
  if (canOpen(user.role, page) === false) {
    alert("Sorry, a " + user.role + " cannot open this page.");
    window.location.href = backToRoot() + "home.html";
    return null;
  }

  showUserBox(user);
  hideBlockedLinks(user);
  markCurrentLink(page);
  return user;
}

// Get the path back to the root.
function backToRoot() {
  if (window.location.pathname.indexOf("/modules/") === -1) {
    return "";
  }
  return "../";
}

// Show the signed-in user.
function showUserBox(user) {
  const box = document.getElementById("signedInBox");
  if (box !== null) {
    box.innerHTML = "<strong>" + safe(user.name) + "</strong><br>" +
                    safe(user.role);
  }
}

// Hide blocked menu links.
function hideBlockedLinks(user) {
  const links = document.querySelectorAll("#menu a[data-page]");
  for (let i = 0; i < links.length; i++) {
    const page = links[i].getAttribute("data-page");
    if (canOpen(user.role, page) === false) {
      links[i].className = "hide";
    }
  }
}

// Mark the current page.
function markCurrentLink(page) {
  const link = document.querySelector('#menu a[data-page="' + page + '"]');
  if (link !== null) {
    link.className = "here";
  }
}

// Sign out.
function signOut() {
  clearUser();
  window.location.href = backToRoot() + "index.html";
}
