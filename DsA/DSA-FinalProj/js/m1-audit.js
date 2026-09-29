//   MODULE 1 - System Auditing & Activity Logs


const m1user = startPage("m1");

if (m1user !== null) {
  fillPickers();
  showLog();
}


// Fills the two dropdowns with the people and actions in the log.
function fillPickers() {
  const logs = load("logs");

  let people = [];
  let actions = [];

  for (let i = 0; i < logs.length; i++) {
    let havePerson = false;
    for (let p = 0; p < people.length; p++) {
      if (people[p] === logs[i].userName) {
        havePerson = true;
      }
    }
    if (havePerson === false) {
      people = appendList(people, logs[i].userName);
    }

    let haveAction = false;
    for (let a = 0; a < actions.length; a++) {
      if (actions[a] === logs[i].action) {
        haveAction = true;
      }
    }
    if (haveAction === false) {
      actions = appendList(actions, logs[i].action);
    }
  }

  let peopleHtml = "<option value=''>Everyone</option>";
  for (let i = 0; i < people.length; i++) {
    peopleHtml = peopleHtml + "<option>" + safe(people[i]) + "</option>";
  }
  document.getElementById("whoBox").innerHTML = peopleHtml;

  let actionHtml = "";
  for (let i = 0; i < actions.length; i++) {
    actionHtml = actionHtml +
      "<label class='action-check'><input type='checkbox' " +
      "name='actionFilter' value='" + safe(actions[i]) + "' checked " +
      "onchange='showLog()'> " + safe(actions[i]) + "</label>";
  }
  document.getElementById("actionFilters").innerHTML = actionHtml;
}


function showLog() {
  const logs = load("logs");

  const wantPerson = document.getElementById("whoBox").value;
  const actionCategory = document.getElementById("actionCategory").value;
  const actionBoxes = document.querySelectorAll(
    "input[name='actionFilter']:checked"
  );
  const fromDate = document.getElementById("fromDate").value;
  const toDate = document.getElementById("toDate").value;
  const wantWords = document.getElementById("textBox").value.toLowerCase().trim();

  /* THE SEARCH LOOP.
     Look at every line and keep the ones that match all the boxes. */
  let found = [];

  for (let i = 0; i < logs.length; i++) {
    const line = logs[i];

    if (wantPerson !== "" && line.userName !== wantPerson) {
      continue;
    }
    let actionSelected = false;
    for (let a = 0; a < actionBoxes.length; a++) {
      if (actionBoxes[a].value === line.action) {
        actionSelected = true;
      }
    }
    if (actionSelected === false) {
      continue;
    }
    if (actionCategory !== "" && getActionCategory(line.action) !== actionCategory) {
      continue;
    }

    const lineDate = line.time.slice(0, 10);
    if (fromDate !== "" && lineDate < fromDate) {
      continue;
    }
    if (toDate !== "" && lineDate > toDate) {
      continue;
    }

    if (wantWords !== "") {
      const haystack = (line.recordId + " " + line.table + " " +
                        line.userId + " " + line.action + " " +
                        (line.message || "")).toLowerCase();
      if (containsText(haystack, wantWords) === false) {
        continue;
      }
    }

    found = appendList(found, line);
  }

  // Show the newest first by going backwards.
  let html = "";
  let shown = 0;

  for (let i = found.length - 1; i >= 0; i--) {
    if (shown >= 200) {
      break;
    }

    html = html +
      "<tr><td class='small'>" + showDateTime(found[i].time) + "</td>" +
      "<td class='small'>" + safe(found[i].userId) + "</td>" +
      "<td>" + safe(found[i].userName) + "</td>" +
      "<td><span class='tag blue'>" + safe(found[i].action) + "</span></td>" +
      "<td class='small'>" + safe(found[i].table) + "</td>" +
      "<td class='small'>" + safe(found[i].recordId) + "</td>" +
      "<td class='small'>" + safe(found[i].message || "No details recorded.") +
      "</td></tr>";

    shown = shown + 1;
  }

  if (html === "") {
    html = "<tr><td colspan='7' class='grey'>" +
           "Nothing matches. Use the other modules and come back.</td></tr>";
  }
  document.getElementById("logRows").innerHTML = html;

  // COUNTING LOOP for how many happened today.
  const now = today();
  let todayCount = 0;
  for (let i = 0; i < logs.length; i++) {
    if (logs[i].time.slice(0, 10) === now) {
      todayCount = todayCount + 1;
    }
  }

  document.getElementById("cardTotal").textContent = logs.length;
  document.getElementById("cardToday").textContent = todayCount;
  document.getElementById("cardShown").textContent = found.length;
}


function clearSearch() {
  document.getElementById("whoBox").value = "";
  document.getElementById("actionCategory").value = "";
  document.getElementById("fromDate").value = "";
  document.getElementById("toDate").value = "";
  document.getElementById("textBox").value = "";
  selectAllActions();
  showLog();
}


function containsText(text, wanted) {
  if (wanted === "") {
    return true;
  }
  if (wanted.length > text.length) {
    return false;
  }

  for (let start = 0; start <= text.length - wanted.length; start++) {
    let matches = true;
    for (let offset = 0; offset < wanted.length; offset++) {
      if (text[start + offset] !== wanted[offset]) {
        matches = false;
        break;
      }
    }
    if (matches === true) {
      return true;
    }
  }
  return false;
}


function getActionCategory(action) {
  if (action === "Added" || action === "Updated" || action === "Deleted") {
    return "record";
  }
  if (action === "Signed in" || action === "Changed access" ||
      action === "Reset access") {
    return "access";
  }
  if (action === "Client opened") {
    return "client";
  }
  return "record";
}


function selectAllActions() {
  const actionBoxes = document.querySelectorAll("input[name='actionFilter']");
  for (let i = 0; i < actionBoxes.length; i++) {
    actionBoxes[i].checked = true;
  }
  showLog();
}


function clearAllActions() {
  const actionBoxes = document.querySelectorAll("input[name='actionFilter']");
  for (let i = 0; i < actionBoxes.length; i++) {
    actionBoxes[i].checked = false;
  }
  showLog();
}
