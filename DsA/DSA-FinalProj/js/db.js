
// Shared localStorage database helpers.


// Every key starts with "clpp_" so we don't clash with other sites.
const PREFIX = "clpp_";

function appendList(list, value) {
  const next = [];
  for (let i = 0; i < list.length; i++) {
    next[i] = list[i];
  }
  next[next.length] = value;
  return next;
}

function cutLast(list) {
  if (list.length === 0) {
    return [];
  }
  const next = [];
  for (let i = 0; i < list.length - 1; i++) {
    next[i] = list[i];
  }
  return next;
}


class LogStack {
  constructor(rows) {
    this.pile = [];

    if (rows) {
      for (let i = 0; i < rows.length; i++) {
        this.pile[this.pile.length] = rows[i];
      }
    }
  }

  // PUSH: the new action goes on top.
  push(entry) {
    this.pile = appendList(this.pile, entry);
  }

  // POP: take the newest action back off.
  pop() {
    if (this.isEmpty()) {
      return null;
    }
    const top = this.pile[this.pile.length - 1];
    this.pile = cutLast(this.pile);
    return top;
  }

  // PEEK: the last thing that happened, without removing it.
  peek() {
    if (this.isEmpty()) {
      return null;
    }
    return this.pile[this.pile.length - 1];
  }

  isEmpty() {
    return this.pile.length === 0;
  }

  size() {
    return this.pile.length;
  }

  /* Read the pile from the top down without disturbing it, which is what
     the audit table needs to show the newest line first. */
  newestFirst() {
    const list = [];
    for (let i = this.pile.length - 1; i >= 0; i--) {
      list[list.length] = this.pile[i];
    }
    return list;
  }
}

// Build the stack from what is saved.
function loadLogStack() {
  return new LogStack(load("logs"));
}

// Load and save tables.

// Read a table. Always gives back an array.
function load(name) {
  const text = localStorage.getItem(PREFIX + name);
  if (text === null) {
    return [];
  }
  return JSON.parse(text);
}

// Save a table.
function save(name, rows) {
  try {
    localStorage.setItem(PREFIX + name, JSON.stringify(rows));
    return true;
  } catch (err) {
    alert("Storage is full. Delete some design drafts in Digital Proofing.");
    return false;
  }
}


// Find and change records.

// LINEAR SEARCH: look at every row until we find the id.
function findById(name, id) {
  const rows = load(name);
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].id === id) {
      return rows[i];
    }
  }
  return null;
}

// Add a new row, then write a log entry.
function addRow(name, row) {
  const rows = load(name);
  const updated = appendList(rows, row);
  save(name, updated);
  addLog("Added", name, row.id,
         "Added a new " + tableLabel(name) + " (" + row.id + ").");
  return row;
}

// Change some fields on one row, then write a log entry.
function updateRow(name, id, changes) {
  const rows = load(name);
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].id === id) {
      for (const key in changes) {
        rows[i][key] = changes[key];
      }
      save(name, rows);
      addLog("Updated", name, id,
             "Updated " + tableLabel(name) + " (" + id + "); changed " +
             changeList(changes) + ".");
      return rows[i];
    }
  }
  return null;
}

// Remove one row, then write a log entry.
function deleteRow(name, id) {
  const rows = load(name);
  const kept = [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].id !== id) {
      kept[kept.length] = rows[i];
    }
  }
  save(name, kept);
  addLog("Deleted", name, id,
         "Permanently deleted " + tableLabel(name) + " (" + id + ").");
}

function tableLabel(name) {
  return name.endsWith("s") ? name.slice(0, -1) : name;
}

function changeList(changes) {
  let fields = "";
  for (const key in changes) {
    if (fields !== "") {
      fields = fields + ", ";
    }
    fields = fields + key;
  }
  return fields;
}


// Create sequential IDs.

// makeId("ORD") gives "ORD-001", then "ORD-002", and so on.
function makeId(prefix) {
  const counters = load("counters");

  for (let i = 0; i < counters.length; i++) {
    if (counters[i].prefix === prefix) {
      counters[i].number = counters[i].number + 1;
      save("counters", counters);
      return prefix + "-" + padNumber(counters[i].number);
    }
  }

  // First time we use this prefix.
  const nextCounters = appendList(counters, { prefix: prefix, number: 1 });
  save("counters", nextCounters);
  return prefix + "-001";
}

// 1 becomes "001", 25 becomes "025"
function padNumber(n) {
  let text = String(n);
  while (text.length < 3) {
    text = "0" + text;
  }
  return text;
}

// Create an eight-character customer code.
function makeCode() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let i = 0; i < 8; i++) {
    // A dash after the first four characters.
    if (i === 4) {
      code = code + "-";
    }
    const spot = Math.floor(Math.random() * letters.length);
    code = code + letters[spot];
  }

  return code;
}

// Normalize a customer code for comparison.
function cleanCode(text) {
  let tidy = "";
  const upper = String(text).toUpperCase();

  for (let i = 0; i < upper.length; i++) {
    const letter = upper[i];
    // Keep only letters and numbers.
    if ((letter >= "A" && letter <= "Z") || (letter >= "0" && letter <= "9")) {
      tidy = tidy + letter;
    }
  }

  return tidy;
}


// Write activity log entries.

// Called by addRow, updateRow and deleteRow, so every change is recorded
// without each module having to remember to do it.
function addLog(action, table, recordId, message) {
  const user = getUser();
  const stack = loadLogStack();

  if (message === undefined || message === "") {
    message = action + " " + table + " (" + recordId + ").";
  }

  const entry = {
    id: "LOG-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
    userId: user ? user.id : "SYSTEM",
    userName: user ? user.name : "System",
    action: action,
    table: table,
    recordId: recordId,
    message: message,
    time: new Date().toISOString()
  };

  // PUSH the new action onto the pile and save the whole stack.
  stack.push(entry);

  localStorage.setItem(PREFIX + "logs", JSON.stringify(stack.pile));
}


/* ---------- who is signed in ---------- */

function getUser() {
  const text = localStorage.getItem(PREFIX + "user");
  if (text === null) {
    return null;
  }
  return JSON.parse(text);
}

function setUser(user) {
  localStorage.setItem(PREFIX + "user", JSON.stringify(user));
}

function clearUser() {
  localStorage.removeItem(PREFIX + "user");
}


// This is a browser-side demo hash, not production security. (polynomial rolling hash)
function hashPassword(text) {
  let total = 0;
  for (let i = 0; i < text.length; i++) {
    total = total * 31 + text.charCodeAt(i);
    total = total % 1000000007;
  }
  return "h" + total;
}


// Shared display helpers.

// 1234.5 becomes "P1,234.50"
function money(amount) {
  const number = Number(amount) || 0;
  return "₱" + number.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// "2026-09-02" becomes "Sep 2, 2026"
function showDate(text) {
  if (!text) {
    return "-";
  }
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const parts = text.slice(0, 10).split("-");
  return months[Number(parts[1]) - 1] + " " + Number(parts[2]) + ", " + parts[0];
}

// Shows the date and the time.
function showDateTime(text) {
  if (!text) {
    return "-";
  }
  const when = new Date(text);
  return showDate(text) + " " + when.toLocaleTimeString("en-PH",
    { hour: "numeric", minute: "2-digit" });
}

// Today as "2026-09-02"
function today() {
  return dayFromNow(0);
}

// dayFromNow(7) gives the date one week from today.
function dayFromNow(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const month = padTwo(date.getMonth() + 1);
  const day = padTwo(date.getDate());
  return date.getFullYear() + "-" + month + "-" + day;
}

function padTwo(n) {
  if (n < 10) {
    return "0" + n;
  }
  return String(n);
}

// Puts text safely inside HTML so quotes and < > do not break the page.
function safe(text) {
  if (text === null || text === undefined) {
    return "";
  }
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}


/* SHARED SEARCH HELPER (Modules 2, 3, 7-12).
   BRUTE-FORCE SUBSTRING SEARCH: slide "wanted" along "text" one start
   position at a time and compare letter by letter. Not case sensitive.
   Returns true when "wanted" appears anywhere inside "text". */
function matchText(text, wanted) {
  const hay = String(text || "").toLowerCase();
  const needle = String(wanted || "").toLowerCase().trim();

  if (needle === "") {
    return true;
  }
  if (needle.length > hay.length) {
    return false;
  }

  for (let start = 0; start <= hay.length - needle.length; start++) {
    let matches = true;
    for (let offset = 0; offset < needle.length; offset++) {
      if (hay[start + offset] !== needle[offset]) {
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


// Helpers for orders containing several service lines.

// "Tarpaulin" for one item, or "Invitation + 1 more" for two.
function orderSummary(order) {
  if (!order.items || order.items.length === 0) {
    return "-";
  }
  if (order.items.length === 1) {
    return order.items[0].service;
  }
  return order.items[0].service + " + " + (order.items.length - 1) + " more";
}

// "Invitation, Sticker" - every service on the order.
function orderServiceList(order) {
  let text = "";
  for (let i = 0; i < order.items.length; i++) {
    if (i > 0) {
      text = text + ", ";
    }
    text = text + order.items[i].service;
  }
  return text;
}

// Adds up how many pieces are on the whole order. A COUNTING LOOP.
function orderTotalPieces(order) {
  let total = 0;
  for (let i = 0; i < order.items.length; i++) {
    total = total + order.items[i].quantity;
  }
  return total;
}

// How much is still to pay on an order.
function orderBalance(order) {
  return order.price - order.paid;
}
