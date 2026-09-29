// Home page.

const me = startPage("home");

if (me !== null) {
  document.getElementById("greeting").textContent =
    "Welcome back, " + me.name + ".";
  showCards();
  showJobs();
  showEvents();
  showAlerts();
}


// The four number cards at the top.
function showCards() {
  const orders = load("orders");
  const items = load("items");

  // ACCUMULATOR LOOPS: add things up one at a time.
  let openJobs = 0;
  let paid = 0;
  let owed = 0;

  for (let i = 0; i < orders.length; i++) {
    if (orders[i].status !== "Released") {
      openJobs = openJobs + 1;
    }
    paid = paid + orders[i].paid;
    owed = owed + (orders[i].price - orders[i].paid);
  }

  // COUNTING LOOP: how many items are low?
  let low = 0;
  for (let i = 0; i < items.length; i++) {
    if (items[i].stock <= items[i].lowAt) {
      low = low + 1;
    }
  }

  document.getElementById("cardJobs").textContent = openJobs;
  document.getElementById("cardPaid").textContent = money(paid);
  document.getElementById("cardOwed").textContent = money(owed);
  document.getElementById("cardLow").textContent = low;
}


// The table of jobs still being worked on.
function showJobs() {
  const orders = load("orders");
  let html = "";

  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    if (order.status === "Released") {
      continue;
    }

    const balance = order.price - order.paid;
    let balanceText = "<span class='grey'>paid</span>";
    if (balance > 0) {
      balanceText = money(balance);
    }

    html = html +
      "<tr>" +
      "<td>" + safe(order.id) + "</td>" +
      "<td>" + safe(order.client) + "</td>" +
      "<td>" + safe(orderSummary(order)) + "</td>" +
      "<td>" + showDate(order.due) + "</td>" +
      "<td><span class='tag blue'>" + safe(order.status) + "</span></td>" +
      "<td class='right'>" + balanceText + "</td>" +
      "</tr>";
  }

  if (html === "") {
    html = "<tr><td colspan='6' class='grey'>No open jobs.</td></tr>";
  }
  document.getElementById("jobRows").innerHTML = html;
}


// Events that have not happened yet.
function showEvents() {
  const bookings = load("bookings");
  const now = today();
  let html = "";

  for (let i = 0; i < bookings.length; i++) {
    if (bookings[i].startDate >= now && bookings[i].status !== "Completed") {
      html = html +
        "<tr><td>" + safe(bookings[i].client) + "</td>" +
        "<td>" + showDate(bookings[i].startDate) + "</td></tr>";
    }
  }

  if (html === "") {
    html = "<tr><td colspan='2' class='grey'>Nothing booked.</td></tr>";
  }
  document.getElementById("eventRows").innerHTML = html;
}


// Warnings about low stock and late tasks.
function showAlerts() {
  const items = load("items");
  const tasks = load("tasks");
  const now = today();
  let html = "";

  // Which items are low?
  let lowNames = "";
  for (let i = 0; i < items.length; i++) {
    if (items[i].stock <= items[i].lowAt) {
      if (lowNames !== "") {
        lowNames = lowNames + ", ";
      }
      lowNames = lowNames + items[i].name;
    }
  }
  if (lowNames !== "") {
    html = html + "<div class='msg warn'>Low stock: " + safe(lowNames) + "</div>";
  }

  // Which tasks are late?
  let lateCount = 0;
  for (let i = 0; i < tasks.length; i++) {
    if (tasks[i].status === "Open" && tasks[i].due < now) {
      lateCount = lateCount + 1;
    }
  }
  if (lateCount > 0) {
    html = html + "<div class='msg bad'>" + lateCount + " task(s) are late.</div>";
  }

  if (html === "") {
    html = "<p class='grey small'>Everything looks fine.</p>";
  }
  document.getElementById("alertArea").innerHTML = html;
}


function resetDemo() {
  if (confirm("Delete everything and put the sample data back?")) {
    resetEverything();
    setUser(me);
    window.location.reload();
  }
}
