// Module 11: income, expenses, and profit.

const m11user = startPage("m11");

if (m11user !== null) {
  document.getElementById("fromDate").value = dayFromNow(-30);
  document.getElementById("toDate").value = today();
  document.getElementById("eDate").value = today();
  showReport();
}


function showReport() {
  const from = document.getElementById("fromDate").value;
  const to = document.getElementById("toDate").value;

  const income = incomeBetween(from, to);
  const expenses = expensesBetween(from, to);

  // ADDING-UP LOOP for the money that came in.
  let totalIn = 0;
  for (let i = 0; i < income.length; i++) {
    totalIn = totalIn + income[i].paid;
  }

  // ADDING-UP LOOP for the money that went out.
  let totalOut = 0;
  for (let i = 0; i < expenses.length; i++) {
    totalOut = totalOut + expenses[i].amount;
  }

  const profit = totalIn - totalOut;      // one subtraction

  // How much are customers still to pay us?
  const orders = load("orders");
  let owed = 0;
  for (let i = 0; i < orders.length; i++) {
    owed = owed + orderBalance(orders[i]);
  }

  document.getElementById("cardIn").textContent = money(totalIn);
  document.getElementById("cardOut").textContent = money(totalOut);
  document.getElementById("cardProfit").textContent = money(profit);
  document.getElementById("cardOwed").textContent = money(owed);

  showServiceTotals(income, totalIn);
  drawFinanceChart(totalIn, totalOut, profit);
  showIncomeTable(income, totalIn);
  showExpenseTable(expenses, totalOut);
  showSummary(from, to, totalIn, totalOut, profit);
}


// Draw a simple comparison chart.
function drawFinanceChart(totalIn, totalOut, profit) {
  const area = document.getElementById("financeChart");
  const values = [totalIn, totalOut, Math.abs(profit)];
  let biggest = 0;

  for (let i = 0; i < values.length; i++) {
    if (values[i] > biggest) {
      biggest = values[i];
    }
  }

  if (biggest === 0) {
    area.innerHTML = "<p class='grey small'>Nothing to chart in these dates.</p>";
    return;
  }

  const labels = ["Money in", "Money out", "Profit"];
  const colours = ["#3f8f68", "#c45b5b", profit >= 0 ? "#6164AB" : "#a84a4a"];
  let html = "";

  for (let i = 0; i < labels.length; i++) {
    const width = (values[i] / biggest) * 100;
    const shown = i === 2 && profit < 0 ? "-" + money(values[i]) : money(values[i]);

    html = html +
      "<div style='margin-bottom:8px'>" +
      "<div class='small' style='display:flex;justify-content:space-between'>" +
      "<span>" + labels[i] + "</span><span class='grey'>" + shown + "</span></div>" +
      "<div style='background:#eee;border-radius:3px;overflow:hidden'>" +
      "<div style='width:" + width.toFixed(1) + "%;height:14px;background:" +
      colours[i] + ";border-radius:3px;-webkit-print-color-adjust:exact;" +
      "print-color-adjust:exact'></div></div></div>";
  }

  area.innerHTML = html;
}


// Orders that were paid inside the dates.
function incomeBetween(from, to) {
  const orders = load("orders");
  let list = [];

  for (let i = 0; i < orders.length; i++) {
    if (orders[i].paid <= 0) {
      continue;
    }
    if (from !== "" && orders[i].madeOn < from) {
      continue;
    }
    if (to !== "" && orders[i].madeOn > to) {
      continue;
    }
    list = appendList(list, orders[i]);
  }

  return list;
}


function expensesBetween(from, to) {
  const expenses = load("expenses");
  let list = [];

  for (let i = 0; i < expenses.length; i++) {
    if (from !== "" && expenses[i].date < from) {
      continue;
    }
    if (to !== "" && expenses[i].date > to) {
      continue;
    }
    list = appendList(list, expenses[i]);
  }

  return list;
}


// Group paid income by service, proportional to each line's price.
function showServiceTotals(income, totalIn) {
  let groups = [];

  for (let i = 0; i < income.length; i++) {
    const order = income[i];

    // What the whole order was worth before any discount.
    let orderWorth = 0;
    for (let k = 0; k < order.items.length; k++) {
      orderWorth = orderWorth + order.items[k].lineTotal;
    }

    for (let k = 0; k < order.items.length; k++) {
      const line = order.items[k];

      // This service's share of what the customer actually paid.
      let share = 0;
      if (orderWorth > 0) {
        share = (line.lineTotal / orderWorth) * order.paid;
      }

      // LINEAR SEARCH for a group we already started.
      let found = null;
      for (let g = 0; g < groups.length; g++) {
        if (groups[g].service === line.service) {
          found = groups[g];
        }
      }

      if (found === null) {
        groups = appendList(groups, { service: line.service, total: share, count: 1 });
      } else {
        found.total = found.total + share;
        found.count = found.count + 1;
      }
    }
  }

  // SELECTION SORT: biggest earner first.
  for (let i = 0; i < groups.length - 1; i++) {
    let biggest = i;
    for (let j = i + 1; j < groups.length; j++) {
      if (groups[j].total > groups[biggest].total) {
        biggest = j;
      }
    }
    const keep = groups[i];
    groups[i] = groups[biggest];
    groups[biggest] = keep;
  }

  let html = "";
  for (let i = 0; i < groups.length; i++) {
    let name = safe(groups[i].service);
    if (i === 0) {
      name = "<strong>" + name + "</strong> <span class='tag good'>best</span>";
    }

    html = html + "<tr><td>" + name + "</td>" +
           "<td class='right'>" + groups[i].count + "</td>" +
           "<td class='right'>" + money(groups[i].total) + "</td></tr>";
  }

  if (html === "") {
    html = "<tr><td colspan='3' class='grey'>Nothing in these dates.</td></tr>";
  }
  document.getElementById("serviceRows").innerHTML = html;

  drawServiceChart(groups);
}


// Draw sorted service totals as percentage-width bars.
function drawServiceChart(groups) {
  const area = document.getElementById("serviceChart");

  if (groups.length === 0) {
    area.innerHTML = "<p class='grey small'>Nothing to chart in these dates.</p>";
    return;
  }

  const biggest = groups[0].total;
  let html = "";

  // LOOP that draws one bar per service.
  for (let i = 0; i < groups.length; i++) {
    // How wide should this bar be compared with the biggest one?
    let width = 0;
    if (biggest > 0) {
      width = (groups[i].total / biggest) * 100;
    }

    // The top earner is filled in solid so it stands out.
    let colour = "#9fa1cd";
    if (i === 0) {
      colour = "#6164AB";
    }

    html = html +
      "<div style='margin-bottom:8px'>" +
      "<div class='small' style='display:flex;justify-content:space-between'>" +
      "<span>" + safe(groups[i].service) + "</span>" +
      "<span class='grey'>" + money(groups[i].total) + "</span></div>" +
      "<div style='background:#eee;border-radius:3px;overflow:hidden'>" +
      "<div style='width:" + width.toFixed(1) + "%;height:14px;background:" +
      colour + ";border-radius:3px;-webkit-print-color-adjust:exact;" +
      "print-color-adjust:exact'></div></div></div>";
  }

  area.innerHTML = html;
}


function showIncomeTable(income, totalIn) {
  let html = "";
  let shownTotal = 0;

  for (let i = 0; i < income.length; i++) {
    const words = income[i].id + " " + income[i].client + " " +
                  orderServiceList(income[i]);
    if (moneyRowMatches(words, income[i].paid) === false) {
      continue;
    }
    shownTotal = shownTotal + income[i].paid;

    html = html +
      "<tr><td>" + showDate(income[i].madeOn) + "</td>" +
      "<td>" + safe(income[i].id) + "</td>" +
      "<td>" + safe(income[i].client) +
        "<br><span class='small grey'>" + safe(orderServiceList(income[i])) +
        "</span></td>" +
      "<td class='right'>" + money(income[i].paid) + "</td></tr>";
  }

  if (html === "") {
    let why = "Nothing in these dates.";
    if (income.length > 0) {
      why = "Nothing matches the search.";
    }
    html = "<tr><td colspan='4' class='grey'>" + why + "</td></tr>";
  } else {
    let label = "Total";
    if (shownTotal !== totalIn) {
      label = "Total of matches";
    }
    html = html + "<tr><td colspan='3' class='right'><strong>" + label +
           "</strong></td>" +
           "<td class='right'><strong>" + money(shownTotal) + "</strong></td></tr>";
  }

  document.getElementById("incomeRows").innerHTML = html;
}


function showExpenseTable(expenses, totalOut) {
  let html = "";
  let shownTotal = 0;

  for (let i = 0; i < expenses.length; i++) {
    const words = expenses[i].kind + " " + expenses[i].note;
    if (moneyRowMatches(words, expenses[i].amount) === false) {
      continue;
    }
    shownTotal = shownTotal + expenses[i].amount;

    html = html +
      "<tr><td>" + showDate(expenses[i].date) + "</td>" +
      "<td>" + safe(expenses[i].kind) + "</td>" +
      "<td>" + safe(expenses[i].note) + "</td>" +
      "<td class='right'>" + money(expenses[i].amount) + "</td>" +
      "<td><button class='small red' onclick=\"removeExpense('" +
        expenses[i].id + "')\">Delete</button></td></tr>";
  }

  if (html === "") {
    let why = "Nothing in these dates.";
    if (expenses.length > 0) {
      why = "Nothing matches the search.";
    }
    html = "<tr><td colspan='5' class='grey'>" + why + "</td></tr>";
  } else {
    let label = "Total";
    if (shownTotal !== totalOut) {
      label = "Total of matches";
    }
    html = html + "<tr><td colspan='3' class='right'><strong>" + label +
           "</strong></td>" +
           "<td class='right'><strong>" + money(shownTotal) + "</strong></td>" +
           "<td></td></tr>";
  }

  document.getElementById("expenseRows").innerHTML = html;
}


/* RANGE + WORD SEARCH for one money row. The amount must sit inside the
   min-max range (an empty box means no limit) and the words must appear
   in the row's text. The date range was already applied by
   incomeBetween() and expensesBetween(). */
function moneyRowMatches(text, amount) {
  const minText = document.getElementById("m11Min").value;
  const maxText = document.getElementById("m11Max").value;

  if (minText !== "" && amount < Number(minText)) {
    return false;
  }
  if (maxText !== "" && amount > Number(maxText)) {
    return false;
  }
  return matchText(text, document.getElementById("m11Search").value);
}


function clearM11Search() {
  document.getElementById("m11Search").value = "";
  document.getElementById("m11Min").value = "";
  document.getElementById("m11Max").value = "";
  showReport();
}


function showSummary(from, to, totalIn, totalOut, profit) {
  document.getElementById("summaryArea").innerHTML =
    "<p style='text-align:center'>" +
    "<img src='../assets/logo.png' style='width:50px'><br>" +
    "<strong>CL Prints &amp; Photography</strong><br>" +
    "<span class='small'>" + showDate(from) + " to " + showDate(to) +
    "</span></p>" +
    "<table>" +
    "<tr><td>Money in</td><td class='right'>" + money(totalIn) + "</td></tr>" +
    "<tr><td>Money out</td><td class='right'>" + money(totalOut) + "</td></tr>" +
    "<tr><td><strong>Profit</strong></td><td class='right'><strong>" +
      money(profit) + "</strong></td></tr>" +
    "</table>";
}


function addExpense() {
  const amount = Number(document.getElementById("eAmount").value);
  const note = document.getElementById("eNote").value.trim();

  if (isNaN(amount) || amount <= 0) {
    alert("Please type how much it cost.");
    return;
  }
  if (note === "") {
    alert("Please say what it was for.");
    return;
  }

  addRow("expenses", {
    id: makeId("EXP"),
    kind: document.getElementById("eKind").value,
    amount: amount,
    date: document.getElementById("eDate").value,
    note: note
  });

  document.getElementById("eAmount").value = "";
  document.getElementById("eNote").value = "";
  showReport();
}


function removeExpense(expenseId) {
  if (confirm("Delete this expense?")) {
    deleteRow("expenses", expenseId);
    showReport();
  }
}


function showAllTime() {
  document.getElementById("fromDate").value = "2000-01-01";
  document.getElementById("toDate").value = "2099-12-31";
  showReport();
}
