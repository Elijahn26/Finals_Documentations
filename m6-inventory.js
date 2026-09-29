
// MODULE 6 - Production Inventory Management

const m6user = startPage("m6");

// Whose history is showing. null means every item.
let historyItemId = null;

if (m6user !== null) {
  showItems();
  showServices();
  fillServicePicker();
  showRecipeEditor();
  showMoves();
}


// Services table.

function showServices() {
  const services = load("services");
  let html = "";

  for (let i = 0; i < services.length; i++) {
    const service = services[i];
    const kind = service.isEvent ? "Event" : "Print / product";
    const recipeCount = service.recipe ? service.recipe.length : 0;
    const choiceCount = service.modifications ? service.modifications.length : 0;

    html = html +
      "<tr>" +
      "<td class='grey'>" + safe(service.id) + "</td>" +
      "<td><strong>" + safe(service.name) + "</strong>" +
        "<div class='small grey'>" + safe(service.unit) + "</div></td>" +
      "<td>" + kind + "</td>" +
      "<td class='right'>" + money(service.price) + "</td>" +
      "<td class='right'>" + recipeCount + "</td>" +
      "<td class='right'>" + choiceCount + "</td>" +
      "<td><button class='small' onclick=\"editService('" +
        service.id + "')\">Edit recipe</button></td>" +
      "</tr>";
  }

  document.getElementById("serviceRows").innerHTML = html;
}


function editService(serviceId) {
  document.getElementById("recipeService").value = serviceId;
  showRecipeEditor();
  document.getElementById("recipeService").focus();
}


// Materials table.

function showItems() {
  const items = load("items");
  let html = "";
  let lowCount = 0;
  let totalValue = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    // Work out the level word for this item.
    let level = "<span class='tag good'>OK</span>";
    if (item.stock <= 0) {
      level = "<span class='tag bad'>EMPTY</span>";
    } else if (item.stock <= item.lowAt) {
      level = "<span class='tag warn'>LOW</span>";
    }

    const value = item.stock * item.price;
    totalValue = totalValue + value;

    html = html +
      "<tr>" +
      "<td class='grey'>" + safe(item.id) + "</td>" +
      "<td><a href='#' onclick=\"showHistoryFor('" + item.id +
        "'); return false;\">" + safe(item.name) + "</a></td>" +
      "<td class='grey'>" + safe(item.unit) + "</td>" +
      "<td class='right'>" + item.stock + "</td>" +
      "<td class='right'><a href='#' onclick=\"editLowAt('" + item.id +
        "'); return false;\">" + item.lowAt + "</a></td>" +
      "<td class='right'><a href='#' onclick=\"editPrice('" + item.id +
        "'); return false;\">" + money(item.price) + "</a></td>" +
      "<td class='right grey'>" + money(value) + "</td>" +
      "<td>" + level + "</td>" +
      "<td>" +
        "<button class='small green' onclick=\"moveStock('" + item.id +
          "','IN')\">In</button> " +
        "<button class='small red' onclick=\"moveStock('" + item.id +
          "','OUT')\">Out</button>" +
      "</td>" +
      "</tr>";
  }

  document.getElementById("itemRows").innerHTML = html;

  // LOOP that checks every item against its own low number.
  const lowItems = whichAreLow();
  lowCount = lowItems.length;

  document.getElementById("cardItems").textContent = items.length;
  document.getElementById("cardLow").textContent = lowCount;
  document.getElementById("cardValue").textContent = money(totalValue);

  showLowList(lowItems);
}


// Goes through EVERY item and collects the ones that are low.
function whichAreLow() {
  const items = load("items");
  let low = [];

  for (let i = 0; i < items.length; i++) {
    if (items[i].stock <= items[i].lowAt) {
      low = appendList(low, items[i]);
    }
  }

  // INSERTION SORT: the one furthest below its limit goes first.
  for (let i = 1; i < low.length; i++) {
    const holding = low[i];
    const holdingShort = holding.lowAt - holding.stock;
    let j = i - 1;

    while (j >= 0 && (low[j].lowAt - low[j].stock) < holdingShort) {
      low[j + 1] = low[j];
      j = j - 1;
    }
    low[j + 1] = holding;
  }

  return low;
}


function showLowList(lowItems) {
  let html = "";

  for (let i = 0; i < lowItems.length; i++) {
    html = html + "<div class='msg warn'><strong>" + safe(lowItems[i].name) +
           "</strong><br>" + lowItems[i].stock + " " + safe(lowItems[i].unit) +
           " left, order more under " + lowItems[i].lowAt + "</div>";
  }

  if (html === "") {
    html = "<p class='grey small'>Everything is above its low-stock number.</p>";
  }
  document.getElementById("lowArea").innerHTML = html;
}


// Change prices and thresholds.

function editPrice(itemId) {
  const item = findById("items", itemId);

  const typed = prompt("New price for " + item.name + " (per " + item.unit + "):",
                       item.price);
  if (typed === null) {
    return;
  }

  const newPrice = Number(typed);
  if (isNaN(newPrice) || newPrice < 0) {
    alert("Please type a number.");
    return;
  }

  updateRow("items", itemId, { price: newPrice });
  showItems();
}


function editLowAt(itemId) {
  const item = findById("items", itemId);

  const typed = prompt("Warn when " + item.name + " goes under:", item.lowAt);
  if (typed === null) {
    return;
  }

  const newLow = Number(typed);
  if (isNaN(newLow) || newLow < 0) {
    alert("Please type a number.");
    return;
  }

  updateRow("items", itemId, { lowAt: newLow });
  showItems();
}


function moveStock(itemId, kind) {
  const item = findById("items", itemId);

  let question = "How much came in?";
  if (kind === "OUT") {
    question = "How much was used?";
  }

  const typed = prompt(item.name + "\nIn stock now: " + item.stock +
                       " " + item.unit + "\n\n" + question, "1");
  if (typed === null) {
    return;
  }

  const amount = Number(typed);
  if (isNaN(amount) || amount <= 0) {
    alert("Please type a number bigger than zero.");
    return;
  }

  if (kind === "OUT" && amount > item.stock) {
    alert("There is only " + item.stock + " " + item.unit + " left.");
    return;
  }

  let newStock = item.stock + amount;
  if (kind === "OUT") {
    newStock = item.stock - amount;
  }

  updateRow("items", itemId, { stock: newStock });

  addRow("stockmoves", {
    id: makeId("MOV"),
    itemId: itemId,
    kind: kind,
    qty: amount,
    why: "Entered by hand",
    who: m6user.name,
    time: today()
  });

  // Check every item again and warn if this one is now low.
  const low = whichAreLow();
  for (let i = 0; i < low.length; i++) {
    if (low[i].id === itemId) {
      alert("LOW STOCK\n\n" + item.name + " is now " + newStock + " " +
            item.unit + ", which is at or under " + item.lowAt + ".");
    }
  }

  showItems();
  showMoves();
}


function addNewItem() {
  const name = prompt("Name of the material:");
  if (name === null || name.trim() === "") {
    return;
  }

  const unit = prompt("Unit (piece, sheet, sq ft, ml):", "piece");
  if (unit === null) {
    return;
  }

  const stock = Number(prompt("How many do we have now?", "0"));
  const lowAt = Number(prompt("Warn when it goes under:", "10"));
  const price = Number(prompt("Price for one:", "0"));

  if (isNaN(stock) || isNaN(lowAt) || isNaN(price)) {
    alert("The numbers were not right, please try again.");
    return;
  }

  addRow("items", {
    id: makeId("ITM"),
    name: name.trim(),
    unit: unit.trim(),
    stock: stock,
    lowAt: lowAt,
    price: price
  });

  showItems();
  showRecipeEditor();
}


// Stock movement history.

// Click an item's name to see only its own history.
function showHistoryFor(itemId) {
  historyItemId = itemId;
  showMoves();
}


function showAllHistory() {
  historyItemId = null;
  showMoves();
}


/* Show one item's history or the newest shop-wide movements. */
function showMoves() {
  const moves = load("stockmoves");
  let html = "";
  let shown = 0;
  let totalIn = 0;
  let totalOut = 0;

  let limit = 12;
  if (historyItemId !== null) {
    limit = moves.length;       // one item: show its whole history
  }

  // Go backwards so the newest is first.
  for (let i = moves.length - 1; i >= 0; i--) {
    if (shown >= limit) {
      break;
    }

    // The filter: skip moves that belong to other items.
    if (historyItemId !== null && moves[i].itemId !== historyItemId) {
      continue;
    }

    // ADDING-UP LOOP for this item's totals.
    if (moves[i].kind === "IN") {
      totalIn = totalIn + moves[i].qty;
    } else {
      totalOut = totalOut + moves[i].qty;
    }

    const item = findById("items", moves[i].itemId);
    let itemName = moves[i].itemId;
    if (item !== null) {
      itemName = item.name;
    }

    let tag = "<span class='tag good'>IN</span>";
    if (moves[i].kind === "OUT") {
      tag = "<span class='tag bad'>OUT</span>";
    }

    // The reason is an order number when the order used it up.
    html = html + "<tr><td class='small'>" + showDate(moves[i].time) + "</td>" +
           "<td class='small'>" + safe(itemName) +
             "<br><span class='grey'>" + safe(moves[i].why) + "</span></td>" +
           "<td>" + tag + "</td>" +
           "<td class='right'>" + moves[i].qty + "</td></tr>";
    shown = shown + 1;
  }

  if (html === "") {
    html = "<tr><td colspan='4' class='grey'>Nothing yet.</td></tr>";
  }
  document.getElementById("moveRows").innerHTML = html;

  // The heading says whose history this is.
  const title = document.getElementById("moveTitle");
  const info = document.getElementById("moveInfo");

  if (historyItemId === null) {
    title.textContent = "Recent stock movements";
    info.innerHTML = "<span class='small grey'>Click an item's name to see " +
                     "its own history.</span>";
  } else {
    const item = findById("items", historyItemId);
    let name = historyItemId;
    let unit = "";
    if (item !== null) {
      name = item.name;
      unit = " " + item.unit;
    }
    title.textContent = "History of " + name;
    info.innerHTML = "<span class='small'>Used " + totalOut + safe(unit) +
                     ", received " + totalIn + safe(unit) + "</span> " +
                     "<a href='#' class='small' onclick='showAllHistory(); " +
                     "return false;'>show every item</a>";
  }
}


// Recipe editor.

function fillServicePicker() {
  const services = load("services");
  let html = "";

  for (let i = 0; i < services.length; i++) {
    html = html + "<option value='" + services[i].id + "'>" +
           safe(services[i].name) + "</option>";
  }
  document.getElementById("recipeService").innerHTML = html;

  // The dropdown of materials we can add.
  const items = load("items");
  let itemHtml = "";
  for (let i = 0; i < items.length; i++) {
    itemHtml = itemHtml + "<option value='" + items[i].id + "'>" +
               safe(items[i].name) + " (" + safe(items[i].unit) + ")</option>";
  }
  document.getElementById("newRecipeItem").innerHTML = itemHtml;

}


function chosenService() {
  return findById("services", document.getElementById("recipeService").value);
}


function showRecipeEditor() {
  const service = chosenService();
  if (service === null) {
    return;
  }

  let html = "";
  for (let i = 0; i < service.recipe.length; i++) {
    const item = findById("items", service.recipe[i].itemId);
    let name = service.recipe[i].itemId;
    let unit = "";
    if (item !== null) {
      name = item.name;
      unit = " " + item.unit;
    }

    html = html +
      "<tr><td>" + safe(name) + "</td>" +
      "<td class='right'>" + service.recipe[i].qty + safe(unit) + "</td>" +
      "<td><button class='small red' onclick=\"removeFromRecipe(" + i +
        ")\">Remove</button></td></tr>";
  }

  if (html === "") {
    html = "<tr><td colspan='3' class='grey'>No materials set yet.</td></tr>";
  }
  document.getElementById("recipeRows").innerHTML = html;

  document.getElementById("servicePriceNow").innerHTML =
    "Now " + money(service.price) + " " + safe(service.unit);

  let kindText = "This is a printing job.";
  if (service.isEvent === true) {
    kindText = "This is an event service, so it uses the event steps.";
  }
  document.getElementById("serviceKind").textContent = kindText;

  showModifications();
}


// Modification choices for Module 5.

function showModifications() {
  const service = chosenService();
  let html = "";

  for (let i = 0; i < service.modifications.length; i++) {
    const mod = service.modifications[i];

    let adds = "<span class='grey'>nothing</span>";
    if (mod.addPrice > 0) {
      adds = "+" + money(mod.addPrice);
    }

    // Spell out every swap: "Glossy Photo Paper A4 -> Matte Photo Paper A4"
    let swap = "<span class='grey'>nothing</span>";
    const swaps = mod.swaps || [];
    if (swaps.length > 0) {
      swap = "";
      for (let k = 0; k < swaps.length; k++) {
        const was = findById("items", swaps[k].from);
        const now = findById("items", swaps[k].to);
        if (was === null || now === null) {
          continue;
        }
        if (k > 0) {
          swap = swap + "<br>";
        }
        swap = swap + safe(was.name) + " &rarr; <strong>" +
               safe(now.name) + "</strong>";
        if (Number(swaps[k].qty) > 0) {
          swap = swap + " (" + swaps[k].qty + " per unit)";
        }
      }
    }

    // The first choice is the plain one, so it stays.
    let removeButton = "<button class='small red' onclick=\"removeModification(" +
                       i + ")\">Remove</button>";
    if (i === 0) {
      removeButton = "<span class='small grey'>the plain choice</span>";
    }

    html = html +
      "<tr><td><a href='#' onclick=\"renameModification(" + i +
        "); return false;\">" + safe(mod.name) + "</a></td>" +
      "<td class='right'><a href='#' onclick=\"repriceModification(" + i +
        "); return false;\">" + adds + "</a></td>" +
      "<td class='small'>" + swap + "</td>" +
      "<td>" + removeButton + "</td></tr>";
  }

  if (html === "") {
    html = "<tr><td colspan='4' class='grey'>No choices yet.</td></tr>";
  }
  document.getElementById("modRows").innerHTML = html;

  fillSwapPickers();
}


// Material swaps for a modification.

function fillSwapPickers() {
  const service = chosenService();

  // Which choice are we editing the swaps of?
  let modHtml = "";
  for (let i = 0; i < service.modifications.length; i++) {
    modHtml = modHtml + "<option value='" + i + "'>" +
              safe(service.modifications[i].name) + "</option>";
  }
  document.getElementById("swapMod").innerHTML = modHtml;

  showSwaps();
}


/* Show one swap row for each recipe material. */
function showSwaps() {
  const service = chosenService();
  const spot = Number(document.getElementById("swapMod").value);
  const mod = service.modifications[spot];

  if (mod === undefined) {
    document.getElementById("swapRows").innerHTML = "";
    return;
  }

  const swaps = mod.swaps || [];
  let html = "";

  for (let i = 0; i < service.recipe.length; i++) {
    const material = findById("items", service.recipe[i].itemId);
    if (material === null) {
      continue;
    }

    // Does this choice swap this material? LINEAR SEARCH.
    let swappedTo = null;
    let swapQty = service.recipe[i].qty;
    for (let k = 0; k < swaps.length; k++) {
      if (swaps[k].from === material.id) {
        swappedTo = findById("items", swaps[k].to);
        if (Number(swaps[k].qty) > 0) {
          swapQty = Number(swaps[k].qty);
        }
      }
    }

    // The "With" column, and the buttons that go beside it.
    let withText = "<span class='grey'>none</span>";
    let buttons = "<button class='small' onclick=\"changeSwap('" +
                  material.id + "')\">Change</button>";

    if (swappedTo !== null) {
      withText = "<strong>" + safe(swappedTo.name) + "</strong>";
      buttons = buttons + " <button class='small grey' onclick=\"defaultSwap('" +
                material.id + "')\">Default</button>";
    }

    html = html +
      "<tr><td>" + safe(material.name) + "</td>" +
      "<td>" + withText + "</td>" +
      "<td class='right'>" + swapQty + " " + safe(material.unit) +
        " <button class='small' onclick=\"setSwapQuantity('" +
        material.id + "')\">Set</button></td>" +
      "<td>" + buttons + "</td></tr>";
  }

  if (html === "") {
    html = "<tr><td colspan='4' class='grey'>" +
           "Give this service a recipe first.</td></tr>";
  }
  document.getElementById("swapRows").innerHTML = html;
}


// Asks which material to use instead, then saves it.
function changeSwap(fromId) {
  const service = chosenService();
  const spot = Number(document.getElementById("swapMod").value);
  const mod = service.modifications[spot];
  const from = findById("items", fromId);

  // Build a numbered list of the materials to pick from.
  const items = load("items");
  let question = "Use what instead of " + from.name + "?\n\n";

  for (let i = 0; i < items.length; i++) {
    question = question + (i + 1) + " - " + items[i].name + "\n";
  }
  question = question + "\nType the number:";

  const typed = prompt(question);
  if (typed === null) {
    return;
  }

  const choice = Number(typed);
  if (isNaN(choice) || choice < 1 || choice > items.length) {
    alert("Please type one of the numbers in the list.");
    return;
  }

  const to = items[choice - 1];
  if (mod.swaps === undefined) {
    mod.swaps = [];
  }

  // Already swapping this one? Then just point it somewhere else.
  for (let i = 0; i < mod.swaps.length; i++) {
    if (mod.swaps[i].from === fromId) {
      mod.swaps[i].to = to.id;
      updateRow("services", service.id, { modifications: service.modifications });
      showModifications();
      return;
    }
  }

  const recipe = service.recipe;
  let defaultQty = 1;
  for (let i = 0; i < recipe.length; i++) {
    if (recipe[i].itemId === fromId) {
      defaultQty = recipe[i].qty;
    }
  }
  const typedQty = prompt("How much " + to.unit + " per service unit?", defaultQty);
  if (typedQty === null) {
    return;
  }
  const qty = Number(typedQty);
  if (isNaN(qty) || qty <= 0) {
    alert("Please type a quantity bigger than zero.");
    return;
  }

  mod.swaps = appendList(mod.swaps, { from: fromId, to: to.id, qty: qty });
  updateRow("services", service.id, { modifications: service.modifications });
  showModifications();
}


function setSwapQuantity(fromId) {
  const service = chosenService();
  const spot = Number(document.getElementById("swapMod").value);
  const mod = service.modifications[spot];
  const recipe = service.recipe;
  let defaultQty = 1;

  for (let i = 0; i < recipe.length; i++) {
    if (recipe[i].itemId === fromId) {
      defaultQty = recipe[i].qty;
    }
  }
  for (let i = 0; i < (mod.swaps || []).length; i++) {
    if (mod.swaps[i].from === fromId && Number(mod.swaps[i].qty) > 0) {
      defaultQty = mod.swaps[i].qty;
    }
  }

  const typed = prompt("How much material per service unit?", defaultQty);
  if (typed === null) {
    return;
  }
  const qty = Number(typed);
  if (isNaN(qty) || qty <= 0) {
    alert("Please type a quantity bigger than zero.");
    return;
  }

  if (mod.swaps === undefined) {
    mod.swaps = [];
  }
  for (let i = 0; i < mod.swaps.length; i++) {
    if (mod.swaps[i].from === fromId) {
      mod.swaps[i].qty = qty;
      updateRow("services", service.id, { modifications: service.modifications });
      showModifications();
      return;
    }
  }
  mod.swaps = appendList(mod.swaps, { from: fromId, to: fromId, qty: qty });
  updateRow("services", service.id, { modifications: service.modifications });
  showModifications();
}


// Puts one row back to "none", so the recipe material is used as it is.
function defaultSwap(fromId) {
  const service = chosenService();
  const spot = Number(document.getElementById("swapMod").value);
  const mod = service.modifications[spot];

  const kept = [];
  for (let i = 0; i < mod.swaps.length; i++) {
    if (mod.swaps[i].from !== fromId) {
      kept[kept.length] = mod.swaps[i];
    }
  }

  mod.swaps = kept;
  updateRow("services", service.id, { modifications: service.modifications });
  showModifications();
}


function addToRecipe() {
  const service = chosenService();
  const itemId = document.getElementById("newRecipeItem").value;
  const qty = Number(document.getElementById("newRecipeQty").value);

  if (isNaN(qty) || qty <= 0) {
    alert("Please type how much is used.");
    return;
  }

  // Already in the recipe? Then just change the amount.
  const recipe = service.recipe;
  for (let i = 0; i < recipe.length; i++) {
    if (recipe[i].itemId === itemId) {
      recipe[i].qty = qty;
      updateRow("services", service.id, { recipe: recipe });
      showRecipeEditor();
      return;
    }
  }

  recipe[recipe.length] = { itemId: itemId, qty: qty };
  updateRow("services", service.id, { recipe: recipe });
  showRecipeEditor();
}


function removeFromRecipe(spot) {
  const service = chosenService();
  const goneId = service.recipe[spot].itemId;
  const recipe = [];

  for (let i = 0; i < service.recipe.length; i++) {
    if (i !== spot) {
      recipe[recipe.length] = service.recipe[i];
    }
  }

  /* Remove swaps for materials removed from the recipe. */
  const mods = service.modifications;
  for (let m = 0; m < mods.length; m++) {
    const kept = [];
    const swaps = mods[m].swaps || [];
    for (let k = 0; k < swaps.length; k++) {
      if (swaps[k].from !== goneId) {
        kept[kept.length] = swaps[k];
      }
    }
    mods[m].swaps = kept;
  }

  updateRow("services", service.id, { recipe: recipe, modifications: mods });
  showRecipeEditor();
}


function addModification() {
  const service = chosenService();
  const name = document.getElementById("newModName").value.trim();
  const price = Number(document.getElementById("newModPrice").value);

  if (name === "") {
    alert("Please type a name for the choice.");
    return;
  }
  if (isNaN(price) || price < 0) {
    alert("The extra cost must be a number.");
    return;
  }

  // LINEAR SEARCH so we do not add the same name twice.
  const mods = service.modifications;
  for (let i = 0; i < mods.length; i++) {
    if (mods[i].name === name) {
      alert("There is already a choice called " + name + ".");
      return;
    }
  }

  // A new choice starts with no swaps. Set them in the table below.
  mods[mods.length] = { name: name, addPrice: price, swaps: [] };
  updateRow("services", service.id, { modifications: mods });

  document.getElementById("newModName").value = "";
  document.getElementById("newModPrice").value = "0";
  showModifications();
}


function renameModification(spot) {
  const service = chosenService();
  const mods = service.modifications;

  const typed = prompt("New name for this choice:", mods[spot].name);
  if (typed === null || typed.trim() === "") {
    return;
  }

  mods[spot].name = typed.trim();
  updateRow("services", service.id, { modifications: mods });
  showModifications();
}


function repriceModification(spot) {
  const service = chosenService();
  const mods = service.modifications;

  const typed = prompt("How much extra does \"" + mods[spot].name +
                       "\" cost?", mods[spot].addPrice);
  if (typed === null) {
    return;
  }

  const price = Number(typed);
  if (isNaN(price) || price < 0) {
    alert("Please type a number.");
    return;
  }

  mods[spot].addPrice = price;
  updateRow("services", service.id, { modifications: mods });
  showModifications();
}


function removeModification(spot) {
  const service = chosenService();

  if (spot === 0) {
    alert("The first choice is the plain one and cannot be removed.");
    return;
  }
  if (confirm("Remove this choice?") === false) {
    return;
  }

  const kept = [];
  for (let i = 0; i < service.modifications.length; i++) {
    if (i !== spot) {
      kept[kept.length] = service.modifications[i];
    }
  }

  updateRow("services", service.id, { modifications: kept });
  showModifications();
}


// Add and remove services.

function addService() {
  const name = document.getElementById("newServiceName").value.trim();
  const unit = document.getElementById("newServiceUnit").value;
  const price = Number(document.getElementById("newServicePrice").value);
  const isEvent = document.getElementById("newServiceEvent").checked;

  if (name === "") {
    return showServiceError("Please type the service name.");
  }
  if (isNaN(price) || price < 0) {
    return showServiceError("The price must be a number.");
  }

  // LINEAR SEARCH so two services cannot share a name.
  const services = load("services");
  for (let i = 0; i < services.length; i++) {
    if (services[i].name.toLowerCase() === name.toLowerCase()) {
      return showServiceError("There is already a service called " + name + ".");
    }
  }

  const newId = makeId("SVC");

  addRow("services", {
    id: newId,
    name: name,
    unit: unit,
    price: price,
    isEvent: isEvent,
    recipe: [],
    // Every service needs one plain choice so the dropdown is never empty.
    modifications: [{ name: "Standard", addPrice: 0, swaps: [] }]
  });

  document.getElementById("newServiceName").value = "";
  document.getElementById("newServicePrice").value = "0";
  document.getElementById("newServiceEvent").checked = false;
  document.getElementById("serviceError").className = "msg bad hide";

  // Show the new one straight away so its recipe can be filled in.
  fillServicePicker();
  document.getElementById("recipeService").value = newId;
  showRecipeEditor();
}


function removeService() {
  const service = chosenService();
  const services = load("services");

  // The shop must be left with at least one service to sell.
  if (services.length <= 1) {
    alert("This is the only service left, so it cannot be removed.");
    return;
  }

  /* Show how many past orders used the service before deleting it. */
  const orders = load("orders");
  let usedBy = 0;

  for (let i = 0; i < orders.length; i++) {
    for (let k = 0; k < orders[i].items.length; k++) {
      if (orders[i].items[k].service === service.name) {
        usedBy = usedBy + 1;
      }
    }
  }

  let question = "Remove the service " + service.name + "?";
  if (usedBy > 0) {
    question = question + "\n\n" + usedBy + " past order line(s) used it. " +
               "Those orders keep their own record and will not change, but " +
               "the service will no longer be on the Service Request & Order Intake list.";
  }

  if (confirm(question) === false) {
    return;
  }

  deleteRow("services", service.id);

  fillServicePicker();
  showRecipeEditor();
}


function showServiceError(message) {
  const box = document.getElementById("serviceError");
  box.textContent = message;
  box.className = "msg bad";
}


function changeServicePrice() {
  const service = chosenService();

  const typed = prompt("New price for " + service.name +
                       " (" + service.unit + "):", service.price);
  if (typed === null) {
    return;
  }

  const newPrice = Number(typed);
  if (isNaN(newPrice) || newPrice < 0) {
    alert("Please type a number.");
    return;
  }

  updateRow("services", service.id, { price: newPrice });
  showRecipeEditor();
}
