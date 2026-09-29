// Module 9: release labels and handover records.

const m9user = startPage("m9");
let labelFor = null;

if (m9user !== null) {
  showWaiting();
  showReleased();
}


// How much is still owed on an order.
function balanceOf(order) {
  return order.price - order.paid;
}


// Code 39 lookup table and barcode renderer.

const CODE39 = {
  "0": "nnnwwnwnn", "1": "wnnwnnnnw", "2": "nnwwnnnnw", "3": "wnwwnnnnn",
  "4": "nnnwwnnnw", "5": "wnnwwnnnn", "6": "nnwwwnnnn", "7": "nnnwnnwnw",
  "8": "wnnwnnwnn", "9": "nnwwnnwnn",

  "A": "wnnnnwnnw", "B": "nnwnnwnnw", "C": "wnwnnwnnn", "D": "nnnnwwnnw",
  "E": "wnnnwwnnn", "F": "nnwnwwnnn", "G": "nnnnnwwnw", "H": "wnnnnwwnn",
  "I": "nnwnnwwnn", "J": "nnnnwwwnn", "K": "wnnnnnnww", "L": "nnwnnnnww",
  "M": "wnwnnnnwn", "N": "nnnnwnnww", "O": "wnnnwnnwn", "P": "nnwnwnnwn",
  "Q": "nnnnnnwww", "R": "wnnnnnwwn", "S": "nnwnnnwwn", "T": "nnnnwnwwn",
  "U": "wwnnnnnnw", "V": "nwwnnnnnw", "W": "wwwnnnnnn", "X": "nwnnwnnnw",
  "Y": "wwnnwnnnn", "Z": "nwwnwnnnn",

  "-": "nwnnnnwnw", ".": "wwnnnnwnn", " ": "nwwnnnwnn", "$": "nwnwnwnnn",
  "/": "nwnwnnnwn", "+": "nwnnnwnwn", "%": "nnnwnwnwn",

  // The scanner needs this at both ends to know where the code starts
  // and stops. It is never part of the text itself.
  "*": "nwnnwnwnn"
};

const NARROW = 2;      // pixels
const WIDE = 6;        // three times the narrow one, as Code 39 requires
const BAR_HEIGHT = 55;


// Build barcode stripes for text.
function makeBarcode(text) {
  // Code 39 only knows capitals, so "ord-001" and "ORD-001" scan the same.
  const wanted = "*" + String(text).toUpperCase() + "*";

  let stripes = "";

  // LOOP over every character of the text.
  for (let i = 0; i < wanted.length; i++) {
    const pattern = CODE39[wanted[i]];

    // A character we cannot draw is skipped rather than drawn wrongly,
    // because a wrong stripe would make the whole label unscannable.
    if (pattern === undefined) {
      continue;
    }

    // LOOP over the 9 elements of this character.
    for (let e = 0; e < pattern.length; e++) {
      let width = NARROW;
      if (pattern[e] === "w") {
        width = WIDE;
      }

      // Even positions are the black bars, odd ones the white gaps.
      let colour = "#fff";
      if (e % 2 === 0) {
        colour = "#000";
      }

      stripes = stripes + "<div style='width:" + width + "px;height:" +
                BAR_HEIGHT + "px;background:" + colour + "'></div>";
    }

    // Every character is separated by one narrow white gap.
    stripes = stripes + "<div style='width:" + NARROW + "px;height:" +
              BAR_HEIGHT + "px;background:#fff'></div>";
  }

  // Keep barcode colors when printing.
  return "<div style='display:flex;justify-content:center;background:#fff;" +
         "padding:8px 0;-webkit-print-color-adjust:exact;" +
         "print-color-adjust:exact'>" + stripes + "</div>";
}


function showWaiting() {
  const orders = load("orders");
  const wantWords = document.getElementById("m9Search").value;
  let html = "";

  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];

    if (order.status === "Released") {
      continue;
    }

    // LINEAR SEARCH over order number, customer and services.
    const haystack = order.id + " " + order.client + " " +
                     orderServiceList(order) + " " + order.status;
    if (matchText(haystack, wantWords) === false) {
      continue;
    }

    const owed = balanceOf(order);

    let owedText = "<span class='tag good'>paid</span>";
    if (owed > 0) {
      owedText = "<span class='tag bad'>" + money(owed) + "</span>";
    }

    html = html +
      "<tr><td>" + safe(order.id) + "</td>" +
      "<td>" + safe(order.client) + "</td>" +
      "<td class='small'>" + safe(orderServiceList(order)) + "</td>" +
      "<td class='right'>" + owedText + "</td>" +
      "<td>" + safe(order.status) + "</td>" +
      "<td><button class='small' onclick=\"makeLabel('" + order.id +
        "')\">Label</button></td></tr>";
  }

  if (html === "") {
    let why = "Nothing waiting.";
    if (wantWords.trim() !== "") {
      why = "No waiting orders match the search.";
    }
    html = "<tr><td colspan='6' class='grey'>" + why + "</td></tr>";
  }
  document.getElementById("waitingRows").innerHTML = html;
}


/* SENTINEL LINEAR SEARCH for one exact order number.
   The wanted id is put on the end of the list first (the "sentinel"),
   so the loop is sure to stop and only needs ONE test per step instead
   of two (no "i < length" check). rows is a fresh copy from load(),
   so adding the sentinel never touches the saved table. */
function sentinelSearch(rows, wantedId) {
  const n = rows.length;
  rows[n] = { id: wantedId };

  let i = 0;
  while (rows[i].id !== wantedId) {
    i = i + 1;
  }

  if (i < n) {
    return i;          // a real order
  }
  return -1;           // we only reached the sentinel
}


// Typed or scanned from the barcode on a label.
function scanOrder() {
  const wanted = document.getElementById("m9ScanBox").value.toUpperCase().trim();
  const box = document.getElementById("m9ScanResult");
  if (wanted === "") {
    return;
  }

  const orders = load("orders");
  const spot = sentinelSearch(orders, wanted);

  if (spot === -1) {
    box.className = "msg bad";
    box.textContent = "No order " + wanted + ".";
    return;
  }
  if (orders[spot].status === "Released") {
    box.className = "msg warn";
    box.textContent = wanted + " was already collected.";
    return;
  }
  box.className = "msg good";
  box.textContent = "Found " + wanted + " at position " + (spot + 1) + ".";
  makeLabel(orders[spot].id);
}


function clearM9Search() {
  document.getElementById("m9Search").value = "";
  document.getElementById("m9ScanBox").value = "";
  document.getElementById("m9ScanResult").className = "hide";
  showWaiting();
  showReleased();
}


/* ---------- the label ---------- */

function makeLabel(orderId) {
  labelFor = orderId;
  const order = findById("orders", orderId);

  document.getElementById("labelArea").innerHTML =
    "<div style='border:2px dashed #333; padding:14px; border-radius:6px'>" +
    "<p style='text-align:center; margin-top:0'>" +
    "<img src='../assets/logo.png' style='width:40px'><br>" +
    "<strong>CL Prints &amp; Photography</strong><br>" +
    "<span class='small'>0377 Provincial Road, Caingin, San Rafael, Bulacan<br>" +
    "0922 315 3856</span></p>" +
    "<table>" +
    "<tr><td class='grey'>Customer</td><td><strong>" + safe(order.client) +
      "</strong></td></tr>" +
    "<tr><td class='grey'>Order</td><td><strong>" + safe(order.id) +
      "</strong></td></tr>" +
    "<tr><td class='grey'>Items</td><td>" + labelItems(order) + "</td></tr>" +
    "<tr><td class='grey'>Pieces</td><td>" + orderTotalPieces(order) +
      "</td></tr>" +
    "<tr><td class='grey'>Phone</td><td>" + safe(order.contact) + "</td></tr>" +
    "</table>" +
    /* The scannable code. The Order ID is printed underneath it as well,
       so the label can still be read by eye if no scanner is around. */
    "<div style='border-top:2px solid #333; padding-top:10px'>" +
    makeBarcode(order.id) +
    "<p style='text-align:center; margin:4px 0 0'>" +
    "<span style='font-family:monospace; font-size:18px; letter-spacing:3px'>" +
    safe(order.id) + "</span></p></div>" +
    "</div>";

  showHandover(order);
}


// Lists every service on the order for the label.
function labelItems(order) {
  let html = "";
  for (let i = 0; i < order.items.length; i++) {
    if (i > 0) {
      html = html + "<br>";
    }
    html = html + safe(order.items[i].service) + " x" + order.items[i].quantity +
           "<br><span class='small grey'>" +
           safe(order.items[i].modification) + "</span>";
  }
  return html;
}


/* ---------- the handover form ---------- */

function showHandover(order) {
  const owed = balanceOf(order);
  const area = document.getElementById("handoverArea");

  // THE CHECK. No form at all while money is owed.
  if (owed > 0) {
    area.innerHTML =
      "<div class='msg bad'><strong>Cannot release yet.</strong><br>" +
      safe(order.client) + " still owes " + money(owed) + ".</div>" +
      "<button onclick=\"payTheRest('" + order.id + "')\">" +
      "Receive " + money(owed) + "</button>";
    return;
  }

  area.innerHTML =
    "<div class='msg good'>Fully paid, this order can go out.</div>" +
    "<label for='howBox'>Pickup or delivery</label>" +
    "<select id='howBox'><option>Pickup</option><option>Delivery</option></select>" +
    "<label for='whoBox2'>Name of the person collecting</label>" +
    "<input type='text' id='whoBox2'>" +
    "<label for='addressBox'>Delivery address (if delivered)</label>" +
    "<input type='text' id='addressBox'>" +
    "<button class='green' onclick=\"confirmRelease('" + order.id + "')\">" +
    "Confirm release</button>";
}


function payTheRest(orderId) {
  const order = findById("orders", orderId);
  const owed = balanceOf(order);

  const typed = prompt("How much did they pay?", owed);
  if (typed === null) {
    return;
  }

  let amount = Number(typed);
  if (amount <= 0) {
    alert("Please type a number bigger than zero.");
    return;
  }
  if (amount > owed) {
    amount = owed;
  }

  updateRow("orders", orderId, { paid: order.paid + amount });

  makeLabel(orderId);
  showWaiting();
}


function confirmRelease(orderId) {
  const person = document.getElementById("whoBox2").value.trim();

  if (person === "") {
    alert("Please write who collected the order.");
    return;
  }

  // Check the money again, in case it changed in another tab.
  const order = findById("orders", orderId);
  if (balanceOf(order) > 0) {
    alert("This order still has money owing.");
    showHandover(order);
    return;
  }

  addRow("releases", {
    id: makeId("REL"),
    orderId: orderId,
    how: document.getElementById("howBox").value,
    person: person,
    address: document.getElementById("addressBox").value.trim(),
    time: new Date().toISOString(),
    staffName: m9user.name
  });

  updateRow("orders", orderId, { status: "Released" });

  // Every step of the job is finished once it goes out.
  const job = findById("workflows", orderId);
  if (job !== null) {
    for (let i = 0; i < job.steps.length; i++) {
      if (job.steps[i].status !== "Done") {
        job.steps[i].status = "Done";
        job.steps[i].doneOn = new Date().toISOString();
      }
    }
    updateRow("workflows", orderId, { steps: job.steps });
  }

  alert("Order " + orderId + " released to " + person + ".");

  labelFor = null;
  document.getElementById("labelArea").innerHTML =
    "<p class='grey'>Pick an order on the left.</p>";
  document.getElementById("handoverArea").innerHTML = "";

  showWaiting();
  showReleased();
}


/* ---------- the list of collected orders ---------- */

function showReleased() {
  const releases = load("releases");
  const wantWords = document.getElementById("m9Search").value;
  let html = "";

  // Backwards so the newest is first.
  for (let i = releases.length - 1; i >= 0; i--) {
    const haystack = releases[i].orderId + " " + releases[i].how + " " +
                     releases[i].person;
    if (matchText(haystack, wantWords) === false) {
      continue;
    }

    html = html +
      "<tr><td class='small'>" + showDateTime(releases[i].time) + "</td>" +
      "<td>" + safe(releases[i].orderId) + "</td>" +
      "<td>" + safe(releases[i].how) + "</td>" +
      "<td>" + safe(releases[i].person) + "</td></tr>";
  }

  if (html === "") {
    let why = "Nothing collected yet.";
    if (releases.length > 0) {
      why = "No collected orders match the search.";
    }
    html = "<tr><td colspan='4' class='grey'>" + why + "</td></tr>";
  }
  document.getElementById("releaseRows").innerHTML = html;
}
