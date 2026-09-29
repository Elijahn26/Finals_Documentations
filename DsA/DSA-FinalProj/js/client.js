// Customer page: code lookup, orders, proofs, photos, and messages.

// Which order or event the customer opened.
let openJob = null;
let openKind = "";   // "order" or "event"


// Pressing Enter works too.
document.getElementById("codeBox").onkeydown = function (event) {
  if (event.key === "Enter") {
    checkCode();
  }
};


// Look up the customer's code.

function checkCode() {
  // Normalize the code before searching.
  const typed = cleanCode(document.getElementById("codeBox").value);

  if (typed === "") {
    showCodeError("Please type your code.");
    return;
  }

  // LINEAR SEARCH through the orders.
  const orders = load("orders");
  for (let i = 0; i < orders.length; i++) {
    if (cleanCode(orders[i].code) === typed) {
      openJob = orders[i];
      openKind = "order";
      showOrder();
      return;
    }
  }

  // LINEAR SEARCH through the events.
  const bookings = load("bookings");
  for (let i = 0; i < bookings.length; i++) {
    if (cleanCode(bookings[i].code) === typed) {
      openJob = bookings[i];
      openKind = "event";
      showOrder();
      return;
    }
  }

  // Do not reveal other customers' details.
  showCodeError("We could not find that code. Please check your receipt.");
}


function showCodeError(message) {
  const box = document.getElementById("codeError");
  box.textContent = message;
  box.className = "msg bad";
}


// Show the customer's information.

function showOrder() {
  document.getElementById("codeScreen").className = "hide";
  document.getElementById("orderScreen").className = "";

    addLog("Client opened", openKind, openJob.id,
      "Client opened " + openKind + " " + openJob.id + ".");

  showDetails();
  showSteps();
  showProof();
  showPhotos();
  showOldMessages();
}


// The table of order details.
function showDetails() {
  document.getElementById("orderTitle").textContent =
    "Hello, " + openJob.client;

  let html = "";

  if (openKind === "order") {
    const balance = openJob.price - openJob.paid;

    // One line for each service on the order.
    let itemRows = "";
    for (let i = 0; i < openJob.items.length; i++) {
      const line = openJob.items[i];
      itemRows = itemRows +
        "<tr><td class='grey'>" + (i === 0 ? "What we are making" : "") + "</td>" +
        "<td><strong>" + safe(line.service) + "</strong>" +
        "<br><span class='small grey'>" + safe(line.modification) +
        " &middot; " + line.quantity + " x " + money(line.unitPrice) +
        "</span></td></tr>";
    }

    html =
      row("Order number", openJob.id) +
      itemRows +
      row("Ready by", showDate(openJob.due)) +
      row("Total price", money(openJob.price)) +
      row("Already paid", money(openJob.paid)) +
      row("Still to pay", money(balance), true);
  } else {
    html =
      row("Event number", openJob.id) +
      row("Event", openJob.kind) +
      row("Date", showDate(openJob.startDate)) +
      row("Place", openJob.place) +
      row("Status", openJob.status);
  }

  document.getElementById("orderDetails").innerHTML = html;
}

// Makes one line of the details table.
// Pass true for bold to make the value stand out.
function row(label, value, bold) {
  let shown = safe(value);
  if (bold === true) {
    shown = "<strong>" + shown + "</strong>";
  }
  return "<tr><td class='grey' style='width:150px'>" + label + "</td>" +
         "<td>" + shown + "</td></tr>";
}


// The progress steps, read from the Module 3 workflow.
function showSteps() {
  const job = findById("workflows", openJob.id);
  const area = document.getElementById("stepArea");

  if (job === null) {
    area.innerHTML = "<p class='grey'>We have not started this yet.</p>";
    document.getElementById("stepNote").textContent = "";
    return;
  }

  let html = "";
  let nowAt = "";

  for (let i = 0; i < job.steps.length; i++) {
    const step = job.steps[i];
    let style = "step";

    if (step.status === "Done") {
      style = "step done";
    }
    if (step.status === "Doing") {
      style = "step now";
      nowAt = step.name;
    }

    html = html + "<div class='" + style + "'>" + safe(step.name) + "</div>";
  }

  area.innerHTML = html;

  if (nowAt === "") {
    document.getElementById("stepNote").textContent =
      "All finished. Thank you!";
  } else {
    document.getElementById("stepNote").textContent =
      "We are working on: " + nowAt;
  }
}


// The newest design draft, if the designer uploaded one.
function showProof() {
  const proof = findById("proofs", openJob.id);
  const box = document.getElementById("proofBox");
  const area = document.getElementById("clientProof");

  if (proof === null || proof.versions.length === 0) {
    box.className = "box hide";
    return;
  }

  box.className = "box";

  // The newest version is the last one in the list (top of the stack).
  const newest = proof.versions[proof.versions.length - 1];

  area.innerHTML =
    "<div id='proofArea'><img src='" + newest.picture + "' alt='Design'></div>" +
    "<p class='small grey'>Version " + proof.versions.length +
    " &middot; sent " + showDateTime(newest.time) + "</p>" +
    "<p>Status: <span class='tag " + proofColour(proof.status) + "'>" +
    safe(proof.status) + "</span></p>";

  // Only let them approve while it is still waiting.
  if (proof.status !== "Approved") {
    area.innerHTML = area.innerHTML +
      "<button class='green' onclick='approveDesign()'>Approve this design</button> " +
      "<button class='grey' onclick='askChanges()'>Ask for changes</button>";
  }
}

// Return the version currently shown to the customer.
function shownProofVersion() {
  const proof = findById("proofs", openJob.id);

  if (proof === null || proof.versions.length === 0) {
    return null;
  }
  return proof.versions.length - 1;
}


function proofColour(status) {
  if (status === "Approved") {
    return "good";
  }
  if (status === "Changes asked") {
    return "warn";
  }
  return "blue";
}


function approveDesign() {
  if (confirm("Approve this design so we can start printing?") === false) {
    return;
  }

  updateRow("proofs", openJob.id, {
    status: "Approved",
    approvedBy: openJob.client,
    approvedOn: new Date().toISOString()
  });

  // Tell Module 3 the design part is finished.
  finishDesignStep(openJob.id);

  alert("Thank you! We will start printing.");
  showSteps();
  showProof();
}


function askChanges() {
  const what = prompt("What would you like us to change?");
  if (what === null || what.trim() === "") {
    return;
  }

  updateRow("proofs", openJob.id, { status: "Changes asked" });

  addRow("feedback", {
    id: makeId("FB"),
    jobId: openJob.id,
    client: openJob.client,
    stars: 0,
    message: "Design change request: " + what.trim(),
    versionIndex: shownProofVersion(),
    time: new Date().toISOString()
  });

  alert("Thank you, we will send a new design soon.");
  showProof();
  showOldMessages();
}


// Marks the "Designing" step as done. Kept here so the customer page
// does not need the whole Module 3 file.
function finishDesignStep(jobId) {
  const job = findById("workflows", jobId);
  if (job === null) {
    return;
  }

  for (let i = 0; i < job.steps.length; i++) {
    if (job.steps[i].name === "Designing") {
      job.steps[i].status = "Done";
      job.steps[i].doneOn = new Date().toISOString();

      // The next step becomes the one we are doing.
      if (i + 1 < job.steps.length) {
        job.steps[i + 1].status = "Doing";
      }
    }
  }
  updateRow("workflows", jobId, { steps: job.steps });
}


// Event photos, only for the matching event folder.
function showPhotos() {
  const box = document.getElementById("photoBox");
  const area = document.getElementById("clientPhotos");

  // LINEAR SEARCH of the photos table for this event.
  const rows = loadPhotoTable();
  let album = null;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].id === openJob.id) {
      album = rows[i];
    }
  }

  if (album === null || album.files.length === 0) {
    box.className = "box hide";
    return;
  }

  box.className = "box";

  let html = "";
  // LOOP that builds the file path for each photo.
  for (let i = 0; i < album.files.length; i++) {
    const path = "photos/" + openJob.id + "/" + album.files[i];
    html = html +
      "<div>" +
      "<a href='" + path + "' target='_blank'>" +
      "<img src='" + path + "' alt='Photo'></a>" +
      "<br>" + safe(album.files[i]) +
      "<br><a href='" + path + "' download class='saveOne'>Save</a>" +
      "</div>";
  }

  area.innerHTML =
    "<p><button onclick='saveAllPhotos()'>Save all " + album.files.length +
    " photos</button></p>" + html;
}


// Start downloads for every photo link.
function saveAllPhotos() {
  const links = document.querySelectorAll("#clientPhotos a.saveOne");

  for (let i = 0; i < links.length; i++) {
    // A small gap between each one, because some browsers ignore
    // downloads that all start in the same instant.
    setTimeout(function () {
      links[i].click();
    }, i * 300);
  }
}


/* ---------- messages ---------- */

function sendFeedback() {
  const text = document.getElementById("fbText").value.trim();

  if (text === "") {
    alert("Please type your message first.");
    return;
  }

  addRow("feedback", {
    id: makeId("FB"),
    jobId: openJob.id,
    client: openJob.client,
    stars: Number(document.getElementById("fbStars").value),
    message: text,
    versionIndex: shownProofVersion(),
    time: new Date().toISOString()
  });

  document.getElementById("fbText").value = "";

  const done = document.getElementById("feedbackDone");
  done.textContent = "Thank you! Your message has been sent.";
  done.className = "msg good";

  showOldMessages();
}


// Shows only this customer's own messages.
function showOldMessages() {
  const all = load("feedback");
  let html = "";

  for (let i = 0; i < all.length; i++) {
    if (all[i].jobId === openJob.id) {
      let stars = "";
      if (all[i].stars > 0) {
        stars = " <span class='tag'>" + all[i].stars + " / 5</span>";
      }
      html = html +
        "<div class='msg info'>" + safe(all[i].message) + stars +
        "<br><span class='small'>" + showDateTime(all[i].time) + "</span></div>";
    }
  }

  if (html !== "") {
    html = "<h3>Messages you sent</h3>" + html;
  }
  document.getElementById("pastMessages").innerHTML = html;
}


function signOutClient() {
  openJob = null;
  document.getElementById("orderScreen").className = "hide";
  document.getElementById("codeScreen").className = "";
  document.getElementById("codeBox").value = "";
  document.getElementById("codeError").className = "msg bad hide";
}
