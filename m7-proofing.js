// Module 7 uses a stack for design versions.

class DraftStack {
  constructor() {
    this.pile = [];
  }

  add(draft) {
    this.pile = appendList(this.pile, draft);
  }

  takeTop() {
    if (this.isEmpty()) {
      return null;
    }
    const last = this.pile[this.pile.length - 1];
    this.pile = cutLast(this.pile);
    return last;
  }

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

  newestFirst() {
    const list = [];
    for (let i = this.pile.length - 1; i >= 0; i--) {
      list[list.length] = this.pile[i];
    }
    return list;
  }

  /* STACK SEARCH from the top down. Looks at the newest draft first and
     works towards the oldest, so the first hit is the latest match.
     Returns how deep it is (0 = top), or -1 when nothing matches. */
  searchFromTop(words) {
    let depth = 0;
    for (let i = this.pile.length - 1; i >= 0; i--) {
      const draft = this.pile[i];
      const haystack = draft.note + " " + draft.by + " " + draft.time + " " +
                       showDateTime(draft.time);
      if (matchText(haystack, words) === true) {
        return depth;
      }
      depth = depth + 1;
    }
    return -1;
  }
}

function appendList(list, value) {
  const next = [];
  for (let i = 0; i < list.length; i++) {
    next[i] = list[i];
  }
  next[next.length] = value;
  return next;
}



// How small we make the picture before saving it.
const BIGGEST_SIDE = 800;
const BIGGEST_FILE = 2000000;    // 2MB


const m7user = startPage("m7");
let openOrderId = null;
let lookingAt = 0;               // 0 means the newest

if (m7user !== null) {
  showOrderList();
  showProof();
}


// Gets the proof record, making an empty one if there is none yet.
function getProof(orderId) {
  let proof = findById("proofs", orderId);

  if (proof === null) {
    proof = {
      id: orderId,
      status: "Waiting",
      versions: []
    };
    addRow("proofs", proof);
  }
  return proof;
}


function showOrderList() {
  const orders = load("orders");
  const wantWords = document.getElementById("m7OrderSearch").value;
  let html = "";

  for (let i = 0; i < orders.length; i++) {
    if (openOrderId === null) {
      openOrderId = orders[i].id;
    }

    const proof = findById("proofs", orders[i].id);
    let status = "Waiting";
    if (proof !== null) {
      status = proof.status;
    }

    // LINEAR SEARCH over order number, customer and proof status.
    const haystack = orders[i].id + " " + orders[i].client + " " + status;
    if (matchText(haystack, wantWords) === false) {
      continue;
    }

    html = html +
      "<tr><td><a href='#' onclick=\"openOrder('" + orders[i].id +
      "'); return false;\">" + safe(orders[i].id) + "</a><br>" +
      "<span class='small grey'>" + safe(orders[i].client) + "</span></td>" +
      "<td class='small'>" + safe(status) + "</td></tr>";
  }

  if (html === "") {
    let why = "No orders yet.";
    if (orders.length > 0) {
      why = "No orders match the search.";
    }
    html = "<tr><td colspan='2' class='grey'>" + why + "</td></tr>";
  }
  document.getElementById("orderList").innerHTML = html;
}


function openOrder(orderId) {
  openOrderId = orderId;
  lookingAt = 0;
  document.getElementById("m7FindResult").textContent = "";
  showProof();
}


function showProof() {
  if (openOrderId === null) {
    return;
  }

  const order = findById("orders", openOrderId);
  const proof = getProof(openOrderId);

  // Build the stack from what was saved.
  const stack = new DraftStack();
  for (let i = 0; i < proof.versions.length; i++) {
    stack.add(proof.versions[i]);
  }

  document.getElementById("proofTitle").textContent =
    order.id + "  " + order.client;

  let tagStyle = "blue";
  if (proof.status === "Approved") {
    tagStyle = "good";
  }
  if (proof.status === "Changes asked") {
    tagStyle = "warn";
  }

  document.getElementById("proofStatus").innerHTML =
    "<span class='tag " + tagStyle + "'>" + safe(proof.status) + "</span> " +
    "<span class='small grey'>Customer code: " + safe(order.code) + "</span>";

  // Show the picture we are looking at.
  const newestFirst = stack.newestFirst();
  const area = document.getElementById("proofArea");

  if (newestFirst.length === 0) {
    area.innerHTML = "<p>No design sent yet.</p>";
    document.getElementById("proofInfo").textContent = "";
  } else {
    if (lookingAt >= newestFirst.length) {
      lookingAt = 0;
    }
    const showing = newestFirst[lookingAt];
    area.innerHTML = "<img src='" + showing.picture + "' alt='Design'>";

    let topText = "";
    if (lookingAt === 0) {
      topText = " (top of the stack)";
    }
    document.getElementById("proofInfo").textContent =
      "Version " + (newestFirst.length - lookingAt) + topText +
      " sent by " + showing.by + " on " + showDateTime(showing.time) +
      ". " + showing.note;
  }

  // Hide the buttons once it is approved.
  if (proof.status === "Approved") {
    document.getElementById("uploadArea").className = "hide";
  } else {
    document.getElementById("uploadArea").className = "";
  }

  showVersionList(newestFirst);
  showCustomerMessages();
}


/* Show feedback for the selected design version. */
function showCustomerMessages() {
  const all = load("feedback");
  const proof = getProof(openOrderId);

  // Convert the newest-first position to the stored version index.
  const viewing = proof.versions.length - 1 - lookingAt;

  let html = "";
  let hidden = 0;

  // Go backwards so the newest message is at the top.
  for (let i = all.length - 1; i >= 0; i--) {
    if (all[i].jobId !== openOrderId) {
      continue;
    }

    // Written about a different draft? Then it belongs on that one.
    if (all[i].versionIndex !== undefined && all[i].versionIndex !== null &&
        all[i].versionIndex !== viewing) {
      hidden = hidden + 1;
      continue;
    }

    // A change request starts with those words, so colour it differently.
    let style = "msg info";
    if (all[i].message.indexOf("Design change request:") === 0) {
      style = "msg warn";
    }

    let score = "";
    if (all[i].stars > 0) {
      score = " <span class='tag'>" + all[i].stars + " / 5</span>";
    }

    html = html +
      "<div class='" + style + "'>" + safe(all[i].message) + score +
      "<br><span class='small'>" + showDateTime(all[i].time) + "</span></div>";
  }

  if (html === "") {
    html = "<p class='grey small'>" +
           "The customer has not sent anything about this version.</p>";
  }

  // Point the designer at the other versions rather than leaving them
  // wondering where an earlier comment went.
  if (hidden > 0) {
    html = html + "<p class='small grey'>" + hidden +
           " more message(s) are on the other versions.</p>";
  }

  document.getElementById("customerSaid").innerHTML = html;
}


function showVersionList(newestFirst) {
  const wantWords = document.getElementById("m7VersionSearch").value;
  let html = "";

  for (let i = 0; i < newestFirst.length; i++) {
    const haystack = newestFirst[i].note + " " + newestFirst[i].by + " " +
                     newestFirst[i].time + " " + showDateTime(newestFirst[i].time);
    if (matchText(haystack, wantWords) === false) {
      continue;
    }

    let topTag = "";
    if (i === 0) {
      topTag = " <span class='tag blue'>TOP</span>";
    }

    html = html +
      "<tr><td><a href='#' onclick=\"lookAt(" + i + "); return false;\">" +
      "Version " + (newestFirst.length - i) + "</a>" + topTag +
      "<br><span class='small grey'>" + safe(newestFirst[i].note) + "</span></td></tr>";
  }

  if (html === "") {
    let why = "Nothing sent yet.";
    if (newestFirst.length > 0) {
      why = "No version matches the search.";
    }
    html = "<tr><td class='grey'>" + why + "</td></tr>";
  }
  document.getElementById("versionList").innerHTML = html;
}


// Redraw just the version list while typing (the picture stays put).
function showVersionsOnly() {
  if (openOrderId === null) {
    return;
  }
  const proof = getProof(openOrderId);
  const stack = new DraftStack();
  for (let i = 0; i < proof.versions.length; i++) {
    stack.add(proof.versions[i]);
  }
  showVersionList(stack.newestFirst());
}


// Jump the viewer to the newest version whose note matches.
function findVersion() {
  if (openOrderId === null) {
    return;
  }
  const proof = getProof(openOrderId);
  const stack = new DraftStack();
  for (let i = 0; i < proof.versions.length; i++) {
    stack.add(proof.versions[i]);
  }

  const words = document.getElementById("m7VersionSearch").value;
  const box = document.getElementById("m7FindResult");
  if (words.trim() === "") {
    box.textContent = "Type some words to search for first.";
    return;
  }
  const depth = stack.searchFromTop(words);
  if (depth === -1) {
    box.textContent = "No version matches.";
    return;
  }
  box.textContent = "Found " + depth + " below the top of the stack.";
  lookAt(depth);
}


function clearM7Search() {
  document.getElementById("m7OrderSearch").value = "";
  document.getElementById("m7VersionSearch").value = "";
  document.getElementById("m7FindResult").textContent = "";
  showOrderList();
  showProof();
}


function lookAt(spot) {
  lookingAt = spot;
  showProof();
}


/* ---------- sending a new draft ---------- */

function sendDraft() {
  const chooser = document.getElementById("pictureBox");
  const errorBox = document.getElementById("upError");

  if (chooser.files.length === 0) {
    errorBox.textContent = "Please choose a picture first.";
    errorBox.className = "msg bad";
    return;
  }

  const file = chooser.files[0];

  if (file.size > BIGGEST_FILE) {
    errorBox.textContent = "That picture is too big. Please keep it under 2MB.";
    errorBox.className = "msg bad";
    return;
  }

  // Read the file, then shrink it.
  const reader = new FileReader();

  reader.onload = function () {
    const picture = new Image();

    picture.onload = function () {
      const smallPicture = shrinkPicture(picture);

      const proof = getProof(openOrderId);

      // Build the stack, push the new one on top, then save.
      const stack = new DraftStack();
      for (let i = 0; i < proof.versions.length; i++) {
        stack.add(proof.versions[i]);
      }

      stack.add({
        picture: smallPicture,
        note: document.getElementById("noteBox").value.trim(),
        by: m7user.name,
        time: new Date().toISOString()
      });

      updateRow("proofs", openOrderId, {
        versions: stack.pile,
        status: "Waiting"
      });

      document.getElementById("noteBox").value = "";
      chooser.value = "";
      errorBox.className = "msg bad hide";
      lookingAt = 0;
      showProof();
      showOrderList();
    };

    picture.src = reader.result;
  };

  reader.readAsDataURL(file);
}


// Draws the picture smaller onto a canvas and gives back the text version.
function shrinkPicture(picture) {
  let width = picture.width;
  let height = picture.height;

  // Make the longest side BIGGEST_SIDE, keeping the shape.
  if (width > height && width > BIGGEST_SIDE) {
    height = Math.round(height * BIGGEST_SIDE / width);
    width = BIGGEST_SIDE;
  } else if (height > BIGGEST_SIDE) {
    width = Math.round(width * BIGGEST_SIDE / height);
    height = BIGGEST_SIDE;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const pen = canvas.getContext("2d");
  pen.fillStyle = "white";
  pen.fillRect(0, 0, width, height);
  pen.drawImage(picture, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", 0.6);
}


/* ---------- approving ---------- */

function markApproved() {
  const proof = getProof(openOrderId);

  if (proof.versions.length === 0) {
    alert("Send a design first.");
    return;
  }

  if (confirm("Mark this design approved? No more drafts can be sent.") === false) {
    return;
  }

  updateRow("proofs", openOrderId, {
    status: "Approved",
    approvedBy: m7user.name,
    approvedOn: new Date().toISOString()
  });

  // Tell Module 3 the design is finished.
  const job = findById("workflows", openOrderId);
  if (job !== null) {
    for (let i = 0; i < job.steps.length; i++) {
      if (job.steps[i].name === "Designing" && job.steps[i].status !== "Done") {
        job.steps[i].status = "Done";
        job.steps[i].doneOn = new Date().toISOString();
        if (i + 1 < job.steps.length) {
          job.steps[i + 1].status = "Doing";
        }
      }
    }
    updateRow("workflows", openOrderId, { steps: job.steps });
  }

  showProof();
  showOrderList();
}


// POP: takes the newest draft off the top of the stack.
function removeNewest() {
  const proof = getProof(openOrderId);

  if (proof.versions.length === 0) {
    return;
  }
  if (confirm("Take the newest draft off the pile?") === false) {
    return;
  }

  const stack = new DraftStack();
  for (let i = 0; i < proof.versions.length; i++) {
    stack.add(proof.versions[i]);
  }

  stack.takeTop();

  updateRow("proofs", openOrderId, { versions: stack.pile });
  lookingAt = 0;
  showProof();
}
