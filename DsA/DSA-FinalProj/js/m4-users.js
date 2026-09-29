//   MODULE 4 - User Management & Access Control

const m4user = startPage("m4");

// Friendly names for the page codes across the top of the grid.
const PAGE_NAMES = {
  home: "Home",
  m1: "01 System Auditing & Activity Logs",
  m2: "02 Event Booking Calendar & Equipment Availability",
  m3: "03 Service Workflow Progression & Order Tracking",
  m4: "04 User Management & Access Control",
  m5: "05 Service Request & Order Intake",
  m6: "06 Production Inventory Management",
  m7: "07 Digital Proofing & Client Approval",
  m8: "08 Task Assignment & Staff Workload",
  m9: "09 Release & Dispatch Labeling",
  m10: "10 Internal Feedback & Service Review",
  m11: "11 Expense & Financial Reporting",
  m12: "12 Event Photo Gallery & Client Retrieval"
};

if (m4user !== null) {
  removeExpiredUsers();
  showUsers();
  showPermissionGrid();
}


// Account list.

function removeExpiredUsers() {
  const users = load("users");
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 2);

  for (let i = 0; i < users.length; i++) {
    const disabledOn = new Date(users[i].disabledSince);

    if (users[i].active === false &&
        users[i].disabledSince !== null &&
        users[i].disabledSince !== undefined &&
        isNaN(disabledOn.getTime()) === false &&
        disabledOn <= cutoff) {
      deleteRow("users", users[i].id);
    }
  }
}

function showUsers() {
  const users = load("users");
  let html = "";

  for (let i = 0; i < users.length; i++) {
    const user = users[i];

    let onOff = "<span class='tag good'>Yes</span>";
    let switchWord = "Turn off";
    if (user.active === false) {
      onOff = "<span class='tag bad'>No</span>";
      switchWord = "Turn on";

      if (user.disabledSince !== null && user.disabledSince !== undefined) {
        const disabledOn = new Date(user.disabledSince);
        const deletionOn = new Date(disabledOn);
        deletionOn.setFullYear(deletionOn.getFullYear() + 2);
        onOff = onOff +
          "<div class='small grey'>Turned off: " +
          disabledOn.toLocaleDateString() + "</div>" +
          "<div class='small grey'>Deleted on: " +
          deletionOn.toLocaleDateString() + "</div>";
      } else {
        onOff = onOff +
          "<div class='small grey'>Deletion date unavailable</div>";
      }
    }

    // You cannot switch off your own account.
    let switchButton = "<button class='small grey' onclick=\"switchUser('" +
                       user.id + "')\">" + switchWord + "</button>";
    if (user.id === m4user.id) {
      switchButton = "<span class='small grey'>this is you</span>";
    }

    html = html +
      "<tr>" +
      "<td><a href='#' onclick=\"editName('" + user.id + "'); return false;\">" +
        safe(user.name) + "</a>" +
        "<div class='small grey'>" + safe(user.id) + "</div></td>" +
      "<td><a href='#' onclick=\"editUsername('" + user.id +
        "'); return false;\">" + safe(user.username) + "</a></td>" +
      "<td>" + makeRolePicker(user) + "</td>" +
      "<td>" + onOff + "</td>" +
      "<td>" +
        "<button class='small' onclick=\"newPassword('" + user.id +
          "')\">Password</button> " + switchButton +
      "</td></tr>";
  }

  document.getElementById("userRows").innerHTML = html;
}


// A dropdown so the Owner can change somebody's role.
function makeRolePicker(user) {
  const roles = ["Owner", "Staff", "Designer"];

  // You cannot change your own role, or you could lock yourself out.
  if (user.id === m4user.id) {
    return safe(user.role) + "<div class='small grey'>your own role</div>";
  }

  let html = "<select onchange=\"changeRole('" + user.id + "', this.value)\">";

  for (let i = 0; i < roles.length; i++) {
    let chosen = "";
    if (roles[i] === user.role) {
      chosen = " selected";
    }
    html = html + "<option" + chosen + ">" + roles[i] + "</option>";
  }

  return html + "</select>";
}


// Account changes.

function editName(userId) {
  const user = findById("users", userId);

  const typed = prompt("Full name:", user.name);
  if (typed === null || typed.trim() === "") {
    return;
  }

  updateRow("users", userId, { name: typed.trim() });

  // If we renamed ourselves, the menu should say the new name.
  if (userId === m4user.id) {
    m4user.name = typed.trim();
    setUser(m4user);
    showUserBox(m4user);
  }

  showUsers();
}


function editUsername(userId) {
  const user = findById("users", userId);

  const typed = prompt("Username for signing in:", user.username);
  if (typed === null || typed.trim() === "") {
    return;
  }

  const wanted = typed.trim().toLowerCase();

  // LINEAR SEARCH so two people cannot share a username.
  const users = load("users");
  for (let i = 0; i < users.length; i++) {
    if (users[i].username === wanted && users[i].id !== userId) {
      alert("Somebody else already uses that username.");
      return;
    }
  }

  updateRow("users", userId, { username: wanted });
  showUsers();
}


function changeRole(userId, newRole) {
  updateRow("users", userId, { role: newRole });
  showUsers();
}


function switchUser(userId) {
  const user = findById("users", userId);

  // Do not let the last Owner be turned off.
  if (user.active === true && user.role === "Owner") {
    const users = load("users");
    let owners = 0;

    for (let i = 0; i < users.length; i++) {
      if (users[i].role === "Owner" && users[i].active === true) {
        owners = owners + 1;
      }
    }

    if (owners <= 1) {
      alert("This is the only Owner left. Make someone else an Owner first.");
      return;
    }
  }

  const changes = { active: !user.active };
  if (changes.active === false) {
    changes.disabledSince = new Date().toISOString();
  } else {
    changes.disabledSince = null;
  }

  updateRow("users", userId, changes);
  showUsers();
}


function newPassword(userId) {
  const user = findById("users", userId);

  const typed = prompt("New password for " + user.name + ":");
  if (typed === null) {
    return;
  }
  if (typed.length < 4) {
    alert("Please use at least 4 letters or numbers.");
    return;
  }

  updateRow("users", userId, { password: hashPassword(typed) });
  alert("Password changed for " + user.name + ".");
}


function addUser() {
  const name = document.getElementById("newName").value.trim();
  const username = document.getElementById("newUsername").value.trim().toLowerCase();
  const role = document.getElementById("newRole").value;
  const password = document.getElementById("newPassword").value;
  const errorBox = document.getElementById("addError");

  if (name === "") {
    return showAddError("Please type the full name.");
  }
  if (username === "") {
    return showAddError("Please type a username.");
  }
  if (password.length < 4) {
    return showAddError("The password needs at least 4 letters or numbers.");
  }

  // LINEAR SEARCH to make sure the username is free.
  const users = load("users");
  for (let i = 0; i < users.length; i++) {
    if (users[i].username === username) {
      return showAddError("That username is already used.");
    }
  }

  addRow("users", {
    id: makeId("USR"),
    name: name,
    username: username,
    password: hashPassword(password),
    role: role,
    active: true
  });

  document.getElementById("newName").value = "";
  document.getElementById("newUsername").value = "";
  document.getElementById("newPassword").value = "";
  errorBox.className = "msg bad hide";

  showUsers();
}


function showAddError(message) {
  const errorBox = document.getElementById("addError");
  errorBox.textContent = message;
  errorBox.className = "msg bad";
}


// Role permission grid.

function showPermissionGrid() {
  const grid = getPermissions();

  // The first row of the array holds the page names.
  let headHtml = "<th>Role</th>";

  for (let c = 1; c < grid[0].length; c++) {
    const code = grid[0][c];
    headHtml = headHtml + "<th class='small'>" + safe(PAGE_NAMES[code]) + "</th>";
  }
  document.getElementById("permHead").innerHTML = headHtml;

  // Every row after the first is one role.
  let bodyHtml = "";

  for (let r = 1; r < grid.length; r++) {
    const role = grid[r][0];
    bodyHtml = bodyHtml + "<tr><td><strong>" + safe(role) + "</strong></td>";

    for (let c = 1; c < grid[r].length; c++) {
      const page = grid[0][c];

      let ticked = "";
      if (grid[r][c] === 1) {
        ticked = " checked";
      }

      // Owners must keep access to the Users page.
      let locked = "";
      let hint = "";
      if (role === "Owner" && page === "m4") {
        locked = " disabled";
        hint = "<div class='small grey'>fixed</div>";
      }

      bodyHtml = bodyHtml +
        "<td style='text-align:center'>" +
        "<input type='checkbox'" + ticked + locked +
        " style='width:auto'" +
        " onchange=\"tickBox('" + safe(role) + "','" + safe(page) +
        "', this.checked)\">" + hint + "</td>";
    }

    bodyHtml = bodyHtml + "</tr>";
  }

  document.getElementById("permRows").innerHTML = bodyHtml;
}


function tickBox(role, page, allowed) {
  setPermission(role, page, allowed);

  let word = "can no longer";
  if (allowed === true) {
    word = "can now";
  }

  const box = document.getElementById("permMessage");
  box.textContent = role + " " + word + " open " + PAGE_NAMES[page] + ".";
  box.className = "msg good";

  // Refresh the menu if the current role changed.
  if (role === m4user.role) {
    hideBlockedLinks(m4user);
    markCurrentLink("m4");
  }
}


function putAccessBack() {
  if (confirm("Put every role's access back to how it started?") === false) {
    return;
  }

  resetPermissions();
  showPermissionGrid();
  hideBlockedLinks(m4user);
  markCurrentLink("m4");

  const box = document.getElementById("permMessage");
  box.textContent = "Access has been put back to normal.";
  box.className = "msg good";
}
