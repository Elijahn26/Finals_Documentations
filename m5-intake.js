//   MODULE 5 - Service Request & Order Intake


const staff = startPage("m5");

window.addEventListener("afterprint", function () {
  document.body.classList.remove("print-receipt-mode");
});

function printReceipt() {
  document.body.classList.add("print-receipt-mode");
  window.print();
}

// The services added so far, before the order is saved.
let basket = [];

if (staff !== null) {
  document.getElementById("staffLabel").textContent = staff.name;
  document.getElementById("dueBox").value = dayFromNow(7);
  fillServiceList();
  serviceChanged();
  updateBasket();
  showOrderList();
}


// Service and modification controls.

function fillServiceList() {
  const services = load("services");
  let html = "";

  for (let i = 0; i < services.length; i++) {
    html = html + "<option value='" + services[i].id + "'>" +
           safe(services[i].name) + " - " + money(services[i].price) +
           " " + safe(services[i].unit) + "</option>";
  }

  document.getElementById("serviceBox").innerHTML = html;
}


// The service the cashier picked. LINEAR SEARCH.
function pickedService() {
  const wanted = document.getElementById("serviceBox").value;
  const services = load("services");

  for (let i = 0; i < services.length; i++) {
    if (services[i].id === wanted) {
      return services[i];
    }
  }
  return null;
}


// When the service changes, refill the one Modification dropdown.
function serviceChanged() {
  const service = pickedService();
  if (service === null) {
    return;
  }

  let html = "";
  for (let i = 0; i < service.modifications.length; i++) {
    const mod = service.modifications[i];

    // Show the extra cost in the dropdown so the cashier can see it.
    let extra = "";
    if (mod.addPrice > 0) {
      extra = " (+" + money(mod.addPrice) + ")";
    }

    html = html + "<option value='" + i + "'>" +
           safe(mod.name) + extra + "</option>";
  }

  if (html === "") {
    html = "<option value='-1'>No modification</option>";
  }

  document.getElementById("modBox").innerHTML = html;
  updateItemPrice();
}


// The modification chosen right now.
function pickedModification() {
  const service = pickedService();
  const spot = Number(document.getElementById("modBox").value);

  if (service === null || spot < 0 || !service.modifications[spot]) {
    return { name: "Standard", addPrice: 0 };
  }
  return service.modifications[spot];
}


// Price the current service line.

function updateItemPrice() {
  const service = pickedService();
  if (service === null) {
    return;
  }

  const mod = pickedModification();
  const quantity = Number(document.getElementById("quantityBox").value) || 0;

  const each = service.price + mod.addPrice;
  const total = each * quantity;

  let sum = money(service.price);
  if (mod.addPrice > 0) {
    sum = sum + " + " + money(mod.addPrice);
  }

  document.getElementById("itemPriceLine").innerHTML =
    sum + " = <strong>" + money(each) + "</strong> each" +
    " &times; " + quantity + " = <strong>" + money(total) + "</strong>";

  showRecipe(service, mod, quantity);
}


// Calculate the service recipe.

function showRecipe(service, mod, quantity) {
  const needed = materialsNeeded(service, mod, quantity);
  let html = "";

  for (let i = 0; i < needed.length; i++) {
    const item = findById("items", needed[i].itemId);
    if (item === null) {
      continue;
    }

    let stockText = item.stock + " " + item.unit;
    if (item.stock < needed[i].qty) {
      stockText = "<span class='tag bad'>only " + item.stock + "</span>";
    }

    // Show the original material when a swap was used.
    let swapNote = "";
    const original = service.recipe[i].itemId;
    if (original !== needed[i].itemId) {
      const was = findById("items", original);
      if (was !== null) {
        swapNote = "<br><span class='small grey'>instead of " +
                   safe(was.name) + "</span>";
      }
    }

    html = html +
      "<tr><td>" + safe(item.name) + swapNote + "</td>" +
      "<td class='right'>" + needed[i].qty + " " + safe(item.unit) + "</td>" +
      "<td>" + stockText + "</td></tr>";
  }

  if (html === "") {
    html = "<tr><td colspan='3' class='grey'>This service has no recipe.</td></tr>";
  }
  document.getElementById("recipeRows").innerHTML = html;
}


/* Calculate materials after applying modification swaps. */
function materialsNeeded(service, mod, quantity) {
  const list = [];

  for (let i = 0; i < service.recipe.length; i++) {
    let itemId = service.recipe[i].itemId;

    // Does this choice swap this material for another one?
    const swaps = mod.swaps || [];
    for (let s = 0; s < swaps.length; s++) {
      if (swaps[s].from === itemId) {
        itemId = swaps[s].to;
      }
    }

    list[list.length] = {
      itemId: itemId,
      qty: getSwapQuantity(service.recipe[i].qty, swaps, service.recipe[i].itemId) * quantity
    };
  }

  return list;
}


function getSwapQuantity(defaultQty, swaps, fromId) {
  for (let i = 0; i < swaps.length; i++) {
    if (swaps[i].from === fromId && Number(swaps[i].qty) > 0) {
      return Number(swaps[i].qty);
    }
  }
  return defaultQty;
}


// Add and remove basket lines.

function addItem() {
  const service = pickedService();
  const mod = pickedModification();
  const quantity = Number(document.getElementById("quantityBox").value) || 0;
  const errorBox = document.getElementById("itemError");

  if (quantity < 1) {
    errorBox.textContent = "Quantity must be at least 1.";
    errorBox.className = "msg bad";
    return;
  }

  const each = service.price + mod.addPrice;

  basket = appendList(basket, {
    serviceId: service.id,
    service: service.name,
    modification: mod.name,
    quantity: quantity,
    unitPrice: each,
    lineTotal: each * quantity
  });

  errorBox.className = "msg bad hide";
  document.getElementById("quantityBox").value = "1";
  updateItemPrice();
  updateBasket();
}


function removeItem(spot) {
  const kept = [];
  for (let i = 0; i < basket.length; i++) {
    if (i !== spot) {
      kept[kept.length] = basket[i];
    }
  }
  basket = kept;
  updateBasket();
}


function clearBasket() {
  basket = [];
  updateBasket();
}


// Calculate the order total.

function basketTotal() {
  // ADDING-UP LOOP over every service in the order.
  let total = 0;
  for (let i = 0; i < basket.length; i++) {
    total = total + basket[i].lineTotal;
  }
  return total;
}


function updateBasket() {
  let html = "";

  for (let i = 0; i < basket.length; i++) {
    const line = basket[i];
    html = html +
      "<tr><td>" + safe(line.service) + "</td>" +
      "<td class='small grey'>" + safe(line.modification) + "</td>" +
      "<td class='right'>" + line.quantity + "</td>" +
      "<td class='right'>" + money(line.unitPrice) + "</td>" +
      "<td class='right'>" + money(line.lineTotal) + "</td>" +
      "<td><button class='small red' onclick=\"removeItem(" + i +
        ")\">Remove</button></td></tr>";
  }

  if (html === "") {
    html = "<tr><td colspan='6' class='grey'>" +
           "Nothing added yet. Use step 2.</td></tr>";
  }
  document.getElementById("basketRows").innerHTML = html;

  // The totals underneath.
  let total = basketTotal();

  let totalsHtml = "<tr><td>Normal total</td><td class='right'>" +
                   money(total) + "</td></tr>";

  const typed = document.getElementById("ownPrice").value;
  if (typed !== "" && Number(typed) >= 0) {
    total = Number(typed);
    totalsHtml = totalsHtml + "<tr><td class='grey'>Own price used</td>" +
                 "<td class='right'>" + money(total) + "</td></tr>";
  }

  const paid = Number(document.getElementById("paidBox").value) || 0;

  totalsHtml = totalsHtml +
    "<tr><td><strong>Total</strong></td><td class='right'><strong>" +
      money(total) + "</strong></td></tr>" +
    "<tr><td>Paid now</td><td class='right'>" + money(paid) + "</td></tr>" +
    "<tr><td>Balance</td><td class='right'>" + money(total - paid) + "</td></tr>";

  document.getElementById("totalRows").innerHTML = totalsHtml;
}


// Save the order.

function saveOrder() {
  const name = document.getElementById("clientName").value.trim();
  const errorBox = document.getElementById("orderError");

  if (name === "") {
    errorBox.textContent = "Please type the customer name.";
    errorBox.className = "msg bad";
    return;
  }
  if (basket.length === 0) {
    errorBox.textContent = "Add at least one service to the order first.";
    errorBox.className = "msg bad";
    return;
  }

  let total = basketTotal();
  const typed = document.getElementById("ownPrice").value;
  if (typed !== "" && Number(typed) >= 0) {
    total = Number(typed);
  }

  let paid = Number(document.getElementById("paidBox").value) || 0;
  if (paid > total) {
    paid = total;
  }

  // Combine all material needs before checking stock.
  const allNeeded = [];
  let isEvent = false;

  for (let i = 0; i < basket.length; i++) {
    const service = findById("services", basket[i].serviceId);
    if (service === null) {
      continue;
    }
    // A service marked as an event uses the event steps in Module 3.
    if (service.isEvent === true) {
      isEvent = true;
    }

    // Find the modification object again by its name.
    let mod = { name: basket[i].modification, addPrice: 0 };
    for (let m = 0; m < service.modifications.length; m++) {
      if (service.modifications[m].name === basket[i].modification) {
        mod = service.modifications[m];
      }
    }

    const needed = materialsNeeded(service, mod, basket[i].quantity);
    for (let n = 0; n < needed.length; n++) {
      allNeeded[allNeeded.length] = needed[n];
    }
  }

  // Add up the same material used by more than one service.
  const combined = [];
  for (let i = 0; i < allNeeded.length; i++) {
    let found = null;
    for (let c = 0; c < combined.length; c++) {
      if (combined[c].itemId === allNeeded[i].itemId) {
        found = combined[c];
      }
    }
    if (found === null) {
      combined[combined.length] = { itemId: allNeeded[i].itemId, qty: allNeeded[i].qty };
    } else {
      found.qty = found.qty + allNeeded[i].qty;
    }
  }

  // Warn about anything short.
  let short = "";
  for (let i = 0; i < combined.length; i++) {
    const item = findById("items", combined[i].itemId);
    if (item !== null && item.stock < combined[i].qty) {
      short = short + "\n" + item.name + ": need " + combined[i].qty +
              ", have " + item.stock;
    }
  }
  if (short !== "") {
    if (confirm("There is not enough of some materials:" + short +
                "\n\nSave the order anyway?") === false) {
      return;
    }
  }

  const orderId = makeId("ORD");
  const clientCode = makeCode();

  addRow("orders", {
    id: orderId,
    code: clientCode,
    client: name,
    contact: document.getElementById("clientPhone").value.trim(),
    items: basket,
    notes: document.getElementById("notesBox").value.trim(),
    price: total,
    paid: paid,
    due: document.getElementById("dueBox").value,
    status: "In Progress",
    staffName: staff.name,          // the person signed in, no dropdown
    madeOn: today()
  });

  // Take the materials out of stock.
  useUpMaterials(combined, orderId);

  // Start the job progress list. Module 3 reads this table to draw it.
  let kind = "print";
  if (isEvent === true) {
    kind = "event";
  }
  if (findById("workflows", orderId) === null) {
    addRow("workflows", {
      id: orderId,
      title: kind,
      steps: makeJobSteps(kind)
    });
  }

  showReceipt(orderId, clientCode, name, basket, total, paid);

  const done = document.getElementById("orderDone");
  done.innerHTML = "Order <strong>" + orderId + "</strong> saved with " +
    basket.length + " service(s).<br>" +
    "Give the customer this code, it is on their receipt: " +
    "<strong style='font-size:18px'>" + clientCode + "</strong>";
  done.className = "msg good";
  errorBox.className = "msg bad hide";

  basket = [];
  document.getElementById("clientName").value = "";
  document.getElementById("clientPhone").value = "";
  document.getElementById("notesBox").value = "";
  document.getElementById("ownPrice").value = "";
  document.getElementById("paidBox").value = "0";
  updateBasket();
  showOrderList();
}


/* Build the steps for a new print or event job. */
function makeJobSteps(kind) {
  let names = ["Designing", "Printing", "Finishing", "Ready for Pickup"];
  if (kind === "event") {
    names = ["Preparation", "Transport", "Setup", "Execution",
             "Teardown", "Return"];
  }

  const steps = [];
  for (let i = 0; i < names.length; i++) {
    let status = "Waiting";
    if (i === 0) {
      status = "Doing";      // the first step starts straight away
    }
    steps[steps.length] = { name: names[i], status: status, doneOn: null, extra: false };
  }
  return steps;
}


// Subtracts each material and writes it in the stock history.
function useUpMaterials(needed, orderId) {
  for (let i = 0; i < needed.length; i++) {
    const item = findById("items", needed[i].itemId);
    if (item === null) {
      continue;
    }

    let left = item.stock - needed[i].qty;
    if (left < 0) {
      left = 0;
    }

    updateRow("items", item.id, { stock: left });

    addRow("stockmoves", {
      id: makeId("MOV"),
      itemId: item.id,
      kind: "OUT",
      qty: needed[i].qty,
      why: orderId,
      who: staff.name,
      time: today()
    });
  }
}


// Build the receipt.

function showReceipt(id, code, name, lines, total, paid) {
  document.getElementById("receiptBox").className = "box";

  let itemHtml = "";
  for (let i = 0; i < lines.length; i++) {
    itemHtml = itemHtml +
      "<tr><td>" + safe(lines[i].service) +
      "<br><span class='small grey'>" + safe(lines[i].modification) +
      " &middot; " + lines[i].quantity + " x " + money(lines[i].unitPrice) +
      "</span></td>" +
      "<td class='right'>" + money(lines[i].lineTotal) + "</td></tr>";
  }

  document.getElementById("receiptArea").innerHTML =
    "<p style='text-align:center'>" +
    "<img src='../assets/logo.png' style='width:60px'><br>" +
    "<strong>CL Prints &amp; Photography</strong><br>" +
    "<span class='small'>0377 Provincial Road, Caingin, San Rafael, Bulacan<br>" +
    "clprintservices@gmail.com<br>" +
    "0922 315 3856 &middot; 0963 726 2331 &middot; 0943 305 4747</span></p>" +
    "<table>" +
    "<tr><td>Order</td><td class='right'>" + safe(id) + "</td></tr>" +
    "<tr><td>Customer</td><td class='right'>" + safe(name) + "</td></tr>" +
    "</table>" +
    "<table style='margin-top:8px'>" + itemHtml +
    "<tr><td><strong>Total</strong></td><td class='right'><strong>" +
      money(total) + "</strong></td></tr>" +
    "<tr><td>Paid</td><td class='right'>" + money(paid) + "</td></tr>" +
    "<tr><td>Balance</td><td class='right'>" + money(total - paid) +
      "</td></tr></table>" +
    "<p style='text-align:center; border:2px dashed #6164AB; border-radius:6px;" +
    " padding:10px; margin-top:12px'>" +
    "Follow your order online<br>" +
    "<strong style='font-family:monospace; font-size:22px; letter-spacing:2px'>" +
    safe(code) + "</strong><br>" +
    "<span class='small'>Open client.html and type this code</span></p>" +
    "<p class='small' style='text-align:center'>Served by " + safe(staff.name) + "</p>";
}


/* ---------- the list of orders ---------- */

function showOrderList() {
  const orders = load("orders");

  // SELECTION SORT: newest order first.
  for (let i = 0; i < orders.length - 1; i++) {
    let newest = i;
    for (let j = i + 1; j < orders.length; j++) {
      if (orders[j].id > orders[newest].id) {
        newest = j;
      }
    }
    const keep = orders[i];
    orders[i] = orders[newest];
    orders[newest] = keep;
  }

  let html = "";
  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    const balance = orderBalance(order);

    let payButton = "<span class='grey'>-</span>";
    if (balance > 0) {
      payButton = "<button class='small' onclick=\"takePayment('" +
                  order.id + "')\">Receive</button>";
    }

    html = html +
      "<tr>" +
      "<td>" + safe(order.id) + "</td>" +
      "<td><strong class='mono'>" + safe(order.code) + "</strong></td>" +
      "<td>" + safe(order.client) + "</td>" +
      "<td class='small'>" + safe(orderServiceList(order)) + "</td>" +
      "<td class='right'>" + orderTotalPieces(order) + "</td>" +
      "<td class='right'>" + money(order.price) + "</td>" +
      "<td class='right'>" + money(balance) + "</td>" +
      "<td>" + safe(order.status) + "</td>" +
      "<td>" + payButton + "</td>" +
      "</tr>";
  }

  document.getElementById("orderRows").innerHTML = html;
}


function takePayment(orderId) {
  const order = findById("orders", orderId);
  const balance = orderBalance(order);

  const typed = prompt("Balance is " + money(balance) +
                       ".\nHow much did they pay?", balance);
  if (typed === null) {
    return;
  }

  let amount = Number(typed);
  if (amount <= 0) {
    alert("Please type a number bigger than zero.");
    return;
  }
  if (amount > balance) {
    amount = balance;
  }

  updateRow("orders", orderId, { paid: order.paid + amount });
  showOrderList();
}
