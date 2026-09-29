// Module 2: event bookings and equipment availability.

const m2user = startPage("m2");

let shownMonth = new Date();
let pickedDay = today();

if (m2user !== null) {
  drawCalendar();
  showFreeList();
  showBookingList();
  fillGearTable();
  fillEventTypes();
  showEquipmentList();
  showEventTypeList();

  document.getElementById("bStart").value = today();
  document.getElementById("bEnd").value = today();
}


/* ---------- building the 2D array ---------- */

// Makes the list of dates between two days.
function daysBetween(startDate, endDate) {
  let list = [];
  const walker = new Date(startDate);
  const last = new Date(endDate);

  while (walker <= last) {
    const month = padTwo(walker.getMonth() + 1);
    const day = padTwo(walker.getDate());
    list = appendList(list, walker.getFullYear() + "-" + month + "-" + day);
    walker.setDate(walker.getDate() + 1);
  }

  return list;
}


// Check whether a booking uses equipment.
function holdsEquipment(status) {
  return status === "Booked" || status === "Completed";
}


// Build the day-by-equipment availability grid.
function buildGrid(days, skipId) {
  const equipment = load("equipment");
  const bookings = load("bookings");

  // Start with a grid full of zeros.
  const grid = [];
  for (let d = 0; d < days.length; d++) {
    const row = [];
    for (let e = 0; e < equipment.length; e++) {
      row[row.length] = 0;
    }
    grid[grid.length] = row;
  }

  // Add every booking into the grid.
  for (let b = 0; b < bookings.length; b++) {
    const booking = bookings[b];

    if (holdsEquipment(booking.status) === false) {
      continue;
    }
    if (skipId !== undefined && booking.id === skipId) {
      continue;
    }

    for (let d = 0; d < days.length; d++) {
      // Is this day inside the booking?
      if (days[d] < booking.startDate || days[d] > booking.endDate) {
        continue;
      }

      for (let g = 0; g < booking.gear.length; g++) {
        const column = equipmentColumn(equipment, booking.gear[g].id);
        if (column !== -1) {
          grid[d][column] = grid[d][column] + booking.gear[g].qty;
        }
      }
    }
  }

  return grid;
}


// Which column belongs to this equipment? LINEAR SEARCH.
function equipmentColumn(equipment, equipmentId) {
  for (let i = 0; i < equipment.length; i++) {
    if (equipment[i].id === equipmentId) {
      return i;
    }
  }
  return -1;
}


/* ---------- the calendar ---------- */

function drawCalendar() {
  const year = shownMonth.getFullYear();
  const month = shownMonth.getMonth();

  const monthNames = ["January", "February", "March", "April", "May", "June",
                      "July", "August", "September", "October", "November",
                      "December"];
  document.getElementById("monthName").textContent =
    monthNames[month] + " " + year;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const bookings = load("bookings");

  let html = "<tr>";

  // Empty boxes before the 1st.
  for (let i = 0; i < firstDay; i++) {
    html = html + "<td></td>";
  }

  let column = firstDay;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateText = year + "-" + padTwo(month + 1) + "-" + padTwo(day);

    let style = "";
    if (dateText === today()) {
      style = " class='today'";
    }

    html = html + "<td" + style + " onclick=\"pickDay('" + dateText + "')\">" +
           "<strong>" + day + "</strong>";

    // Any events on this day?
    for (let b = 0; b < bookings.length; b++) {
      // A rejected or cancelled booking is not happening, so it is not
      // drawn on the calendar at all.
      if (bookings[b].status === "Rejected" ||
          bookings[b].status === "Cancelled") {
        continue;
      }

      if (dateText >= bookings[b].startDate && dateText <= bookings[b].endDate) {
        let eventStyle = "event";
        if (bookings[b].status === "Pending") {
          eventStyle = "event pending";
        }
        if (bookings[b].status === "Completed") {
          eventStyle = "event completed";
        }
        html = html + "<span class='" + eventStyle + "'>" +
               safe(bookings[b].client) + "</span>";
      }
    }

    html = html + "</td>";

    column = column + 1;
    if (column === 7) {
      html = html + "</tr><tr>";
      column = 0;
    }
  }

  html = html + "</tr>";
  document.getElementById("calendarBody").innerHTML = html;
}


function changeMonth(step) {
  shownMonth.setMonth(shownMonth.getMonth() + step);
  drawCalendar();
}


function pickDay(dateText) {
  pickedDay = dateText;
  showFreeList();
}


// Shows what is free on the day we clicked.
function showFreeList() {
  const equipment = load("equipment");
  const grid = buildGrid([pickedDay]);   // just one day, so one row

  document.getElementById("dayTitle").textContent = showDate(pickedDay);

  let html = "";
  for (let i = 0; i < equipment.length; i++) {
    const out = grid[0][i];               // reading the 2D array
    const free = equipment[i].total - out;

    let freeText = "<strong>" + free + "</strong>";
    if (free === 0) {
      freeText = "<span class='tag bad'>0</span>";
    }

    html = html +
      "<tr><td>" + safe(equipment[i].name) + "</td>" +
      "<td class='right grey'>" + equipment[i].total + "</td>" +
      "<td class='right'>" + out + "</td>" +
      "<td class='right'>" + freeText + "</td></tr>";
  }

  document.getElementById("freeRows").innerHTML = html;
}


/* ---------- the booking form ---------- */

function fillGearTable() {
  const equipment = load("equipment");
  let html = "";

  for (let i = 0; i < equipment.length; i++) {
    html = html +
      "<tr><td>" + safe(equipment[i].name) + "</td>" +
      "<td class='right grey'>" + equipment[i].total + "</td>" +
      "<td><input type='number' class='gearBox' data-id='" + equipment[i].id +
        "' value='0' min='0' max='" + equipment[i].total + "'></td></tr>";
  }

  document.getElementById("gearRows").innerHTML = html;
}


// Create the steps for an event booking.
function makeEventSteps() {
  const names = ["Preparation", "Transport", "Setup", "Execution",
                 "Teardown", "Return"];

  let steps = [];
  for (let i = 0; i < names.length; i++) {
    let status = "Waiting";
    if (i === 0) {
      status = "Doing";      // the first step starts straight away
    }
    steps = appendList(steps, { name: names[i], status: status, doneOn: null, extra: false });
  }
  return steps;
}


function saveBooking() {
  const name = document.getElementById("bClient").value.trim();
  const startDate = document.getElementById("bStart").value;
  let endDate = document.getElementById("bEnd").value;

  if (name === "") {
    showBookError("Please type the customer name.");
    return;
  }
  if (startDate === "") {
    showBookError("Please pick a start date.");
    return;
  }
  if (endDate === "") {
    endDate = startDate;
  }
  if (endDate < startDate) {
    showBookError("The end date is before the start date.");
    return;
  }

  // What did they ask for?
  let wanted = [];
  const boxes = document.querySelectorAll(".gearBox");
  for (let i = 0; i < boxes.length; i++) {
    const howMany = Number(boxes[i].value) || 0;
    if (howMany > 0) {
      wanted = appendList(wanted, { id: boxes[i].getAttribute("data-id"), qty: howMany });
    }
  }

  /* Check every booking day and requested item before approving. */
  const days = daysBetween(startDate, endDate);
  const grid = buildGrid(days);
  const equipment = load("equipment");

  let problems = "";

  for (let w = 0; w < wanted.length; w++) {
    const column = equipmentColumn(equipment, wanted[w].id);
    const owned = equipment[column].total;

    for (let d = 0; d < days.length; d++) {
      const alreadyOut = grid[d][column];       // reading the 2D array

      if (alreadyOut + wanted[w].qty > owned) {
        problems = problems + "<br>" + safe(equipment[column].name) +
                   " on " + showDate(days[d]) + ": you asked for " +
                   wanted[w].qty + " but only " + (owned - alreadyOut) +
                   " is free.";
      }
    }
  }

  if (problems !== "") {
    showBookError("<strong>Booking refused, not enough equipment.</strong>" +
                  problems);
    return;
  }

  // All clear, save it.
  const eventId = makeId("EVT");
  const clientCode = makeCode();

  addRow("bookings", {
    id: eventId,
    code: clientCode,
    client: name,
    contact: document.getElementById("bPhone").value.trim(),
    startDate: startDate,
    endDate: endDate,
    place: document.getElementById("bPlace").value.trim(),
    kind: document.getElementById("bKind").value,
    // New booking requests start as Pending.
    status: "Pending",
    gear: wanted
  });

  // Start the job progress list. Module 3 reads this table to draw it.
  if (findById("workflows", eventId) === null) {
    addRow("workflows", {
      id: eventId,
      title: "event",
      steps: makeEventSteps()
    });
  }

  const done = document.getElementById("bookDone");
  done.innerHTML = "Request saved as <strong>" + eventId + "</strong>, " +
                   "waiting for approval. " +
                   "Customer code: <strong>" + clientCode + "</strong>";
  done.className = "msg good";
  document.getElementById("bookError").className = "msg bad hide";

  document.getElementById("bClient").value = "";
  fillGearTable();
  drawCalendar();
  showFreeList();
  showBookingList();
}


function showBookError(message) {
  const box = document.getElementById("bookError");
  box.innerHTML = message;
  box.className = "msg bad";
}


/* ---------- the list of bookings ---------- */

function showBookingList() {
  const bookings = load("bookings");

  // SELECTION SORT: soonest event first.
  for (let i = 0; i < bookings.length - 1; i++) {
    let soonest = i;
    for (let j = i + 1; j < bookings.length; j++) {
      if (bookings[j].startDate < bookings[soonest].startDate) {
        soonest = j;
      }
    }
    const keep = bookings[i];
    bookings[i] = bookings[soonest];
    bookings[soonest] = keep;
  }

  const wantWords = document.getElementById("m2Search").value.toLowerCase().trim();
  const fromDay = document.getElementById("m2FromDay").value;

  // The list is sorted now, so BINARY SEARCH can find where the date starts.
  let startAt = 0;
  if (fromDay !== "") {
    startAt = firstOnOrAfter(bookings, fromDay);
  }

  let html = "";
  let shown = 0;
  for (let i = startAt; i < bookings.length; i++) {
    const booking = bookings[i];

    // LINEAR SEARCH over the words on each booking.
    const haystack = booking.id + " " + booking.code + " " + booking.client +
                     " " + booking.kind + " " + booking.status;
    if (matchText(haystack, wantWords) === false) {
      continue;
    }
    shown = shown + 1;

    let dates = showDate(booking.startDate);
    if (booking.endDate !== booking.startDate) {
      dates = dates + " to " + showDate(booking.endDate);
    }

    html = html +
      "<tr><td>" + safe(booking.id) + "<br>" +
        "<span class='small grey'>" + safe(booking.kind) + "</span></td>" +
      "<td><strong>" + safe(booking.code) + "</strong></td>" +
      "<td>" + safe(booking.client) + "</td>" +
      "<td class='small'>" + dates + "</td>" +
      "<td>" + statusTag(booking.status) + "</td>" +
      "<td>" + statusButtons(booking) + "</td></tr>";
  }

  if (html === "") {
    let why = "No bookings yet.";
    if (bookings.length > 0) {
      why = "No bookings match the search.";
    }
    html = "<tr><td colspan='6' class='grey'>" + why + "</td></tr>";
  }
  document.getElementById("bookingRows").innerHTML = html;
  document.getElementById("m2Count").textContent =
    shown + " of " + bookings.length + " bookings shown";
}


/* BINARY SEARCH on bookings already sorted by startDate.
   Returns the index of the first booking that starts on or after "day",
   or bookings.length when every booking is earlier. Each step halves
   the part of the list that is still being looked at. */
function firstOnOrAfter(bookings, day) {
  let low = 0;
  let high = bookings.length;       // one past the end

  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (bookings[middle].startDate < day) {
      low = middle + 1;             // answer is to the right
    } else {
      high = middle;                // middle could be the answer
    }
  }
  return low;
}


function clearM2Search() {
  document.getElementById("m2Search").value = "";
  document.getElementById("m2FromDay").value = "";
  showBookingList();
}


// The status in the same colours the calendar uses.
function statusTag(status) {
  let colour = "blue";
  if (status === "Pending") {
    colour = "warn";
  }
  if (status === "Completed") {
    colour = "good";
  }
  if (status === "Rejected" || status === "Cancelled") {
    colour = "bad";
  }
  return "<span class='tag " + colour + "'>" + safe(status) + "</span>";
}


// Owner approval and rejection actions.
function statusButtons(booking) {
  if (booking.status === "Pending") {
    return "<button class='small green' onclick=\"approveBooking('" +
           booking.id + "')\">Approve</button> " +
           "<button class='small red' onclick=\"rejectBooking('" +
           booking.id + "')\">Reject</button>";
  }

  if (booking.status === "Booked") {
    return "<button class='small' onclick=\"completeBooking('" +
           booking.id + "')\">Mark done</button>";
  }

  return "<span class='small grey'>-</span>";
}


/* Recheck equipment before approving a pending booking. */
function approveBooking(bookingId) {
  const booking = findById("bookings", bookingId);
  const equipment = load("equipment");

  const days = daysBetween(booking.startDate, booking.endDate);

  // Leave this booking itself out, or it would count against its own request.
  const grid = buildGrid(days, bookingId);

  let problems = "";

  for (let w = 0; w < booking.gear.length; w++) {
    const column = equipmentColumn(equipment, booking.gear[w].id);
    if (column === -1) {
      // The equipment was deleted from the list after the request came in.
      problems = problems + "<br>One item on this request no longer exists.";
      continue;
    }

    const owned = equipment[column].total;

    for (let d = 0; d < days.length; d++) {
      const alreadyOut = grid[d][column];

      if (alreadyOut + booking.gear[w].qty > owned) {
        problems = problems + "<br>" + safe(equipment[column].name) +
                   " on " + showDate(days[d]) + ": needs " +
                   booking.gear[w].qty + " but only " + (owned - alreadyOut) +
                   " is free.";
      }
    }
  }

  if (problems !== "") {
    showBookError("<strong>Cannot approve " + safe(bookingId) +
                  ", the equipment is no longer free.</strong>" + problems);
    return;
  }

  updateRow("bookings", bookingId, { status: "Booked" });

  const done = document.getElementById("bookDone");
  done.innerHTML = "<strong>" + safe(bookingId) + "</strong> approved. " +
                   "The equipment is now set aside for those dates.";
  done.className = "msg good";
  document.getElementById("bookError").className = "msg bad hide";

  refreshAfterStatusChange();
}


function rejectBooking(bookingId) {
  if (confirm("Reject booking " + bookingId + "?") === false) {
    return;
  }

  updateRow("bookings", bookingId, { status: "Rejected" });

  const done = document.getElementById("bookDone");
  done.innerHTML = "<strong>" + safe(bookingId) + "</strong> was rejected. " +
                   "Its equipment is free again.";
  done.className = "msg good";

  refreshAfterStatusChange();
}


function completeBooking(bookingId) {
  updateRow("bookings", bookingId, { status: "Completed" });
  refreshAfterStatusChange();
}


// Everything that has to be redrawn once a status changes.
function refreshAfterStatusChange() {
  drawCalendar();
  showFreeList();
  showBookingList();
}


// Owner settings for equipment and event types.

// Fills the "Kind of event" dropdown from the database.
function fillEventTypes() {
  const types = load("eventtypes");
  let html = "";

  for (let i = 0; i < types.length; i++) {
    html = html + "<option>" + safe(types[i].name) + "</option>";
  }

  if (html === "") {
    html = "<option>Event</option>";
  }
  document.getElementById("bKind").innerHTML = html;
}


function showEventTypeList() {
  const types = load("eventtypes");
  let html = "";

  for (let i = 0; i < types.length; i++) {
    html = html +
      "<tr><td><a href='#' onclick=\"renameEventType('" + types[i].id +
        "'); return false;\">" + safe(types[i].name) + "</a></td>" +
      "<td><button class='small red' onclick=\"removeEventType('" +
        types[i].id + "')\">Remove</button></td></tr>";
  }

  if (html === "") {
    html = "<tr><td colspan='2' class='grey'>None yet.</td></tr>";
  }
  document.getElementById("typeRows").innerHTML = html;
}


function addEventType() {
  const name = document.getElementById("newTypeName").value.trim();

  if (name === "") {
    alert("Please type the kind of event.");
    return;
  }

  // LINEAR SEARCH so we do not add the same one twice.
  const types = load("eventtypes");
  for (let i = 0; i < types.length; i++) {
    if (types[i].name === name) {
      alert("That kind of event is already on the list.");
      return;
    }
  }

  addRow("eventtypes", { id: makeId("ETP"), name: name });

  document.getElementById("newTypeName").value = "";
  fillEventTypes();
  showEventTypeList();
}


function renameEventType(typeId) {
  const type = findById("eventtypes", typeId);

  const typed = prompt("New name:", type.name);
  if (typed === null || typed.trim() === "") {
    return;
  }

  updateRow("eventtypes", typeId, { name: typed.trim() });
  fillEventTypes();
  showEventTypeList();
}


function removeEventType(typeId) {
  if (confirm("Remove this kind of event from the list?") === false) {
    return;
  }

  deleteRow("eventtypes", typeId);
  fillEventTypes();
  showEventTypeList();
}


/* ---------- the equipment list ---------- */

function showEquipmentList() {
  const equipment = load("equipment");
  let html = "";

  for (let i = 0; i < equipment.length; i++) {
    html = html +
      "<tr><td><a href='#' onclick=\"renameEquipment('" + equipment[i].id +
        "'); return false;\">" + safe(equipment[i].name) + "</a></td>" +
      "<td class='right'><a href='#' onclick=\"changeEquipmentCount('" +
        equipment[i].id + "'); return false;\">" + equipment[i].total +
        "</a></td>" +
      "<td><button class='small red' onclick=\"removeEquipment('" +
        equipment[i].id + "')\">Remove</button></td></tr>";
  }

  if (html === "") {
    html = "<tr><td colspan='3' class='grey'>No equipment yet.</td></tr>";
  }
  document.getElementById("equipmentRows").innerHTML = html;
}


function addEquipment() {
  const name = document.getElementById("newGearName").value.trim();
  const count = Number(document.getElementById("newGearCount").value);

  if (name === "") {
    alert("Please type the equipment name.");
    return;
  }
  if (isNaN(count) || count < 1) {
    alert("How many do we own? Please type a number.");
    return;
  }

  addRow("equipment", { id: makeId("EQP"), name: name, total: count });

  document.getElementById("newGearName").value = "";
  document.getElementById("newGearCount").value = "1";
  refreshEquipment();
}


function renameEquipment(equipmentId) {
  const gear = findById("equipment", equipmentId);

  const typed = prompt("New name:", gear.name);
  if (typed === null || typed.trim() === "") {
    return;
  }

  updateRow("equipment", equipmentId, { name: typed.trim() });
  refreshEquipment();
}


function changeEquipmentCount(equipmentId) {
  const gear = findById("equipment", equipmentId);

  const typed = prompt("How many " + gear.name + " does the shop own?",
                       gear.total);
  if (typed === null) {
    return;
  }

  const count = Number(typed);
  if (isNaN(count) || count < 0) {
    alert("Please type a number.");
    return;
  }

  /* Warn if the new equipment count breaks an existing booking. */
  const bookings = load("bookings");
  let biggestBooked = 0;

  for (let b = 0; b < bookings.length; b++) {
    if (bookings[b].status === "Cancelled") {
      continue;
    }
    for (let g = 0; g < bookings[b].gear.length; g++) {
      if (bookings[b].gear[g].id === equipmentId &&
          bookings[b].gear[g].qty > biggestBooked) {
        biggestBooked = bookings[b].gear[g].qty;
      }
    }
  }

  if (count < biggestBooked) {
    if (confirm("One booking already asks for " + biggestBooked + " of these.\n" +
                "Setting it to " + count + " means that booking no longer fits.\n\n" +
                "Change it anyway?") === false) {
      return;
    }
  }

  updateRow("equipment", equipmentId, { total: count });
  refreshEquipment();
}


function removeEquipment(equipmentId) {
  // Do not remove something a booking is still using.
  const bookings = load("bookings");

  for (let b = 0; b < bookings.length; b++) {
    if (bookings[b].status === "Cancelled" || bookings[b].status === "Completed") {
      continue;
    }
    for (let g = 0; g < bookings[b].gear.length; g++) {
      if (bookings[b].gear[g].id === equipmentId) {
        alert("Booking " + bookings[b].id + " still uses this equipment, " +
              "so it cannot be removed.");
        return;
      }
    }
  }

  if (confirm("Remove this equipment?") === false) {
    return;
  }

  deleteRow("equipment", equipmentId);
  refreshEquipment();
}


// Everything that has to be redrawn after the equipment list changes.
function refreshEquipment() {
  showEquipmentList();
  fillGearTable();
  showFreeList();
}
