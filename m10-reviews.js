// Module 10: internal reviews for finished jobs.

const m10user = startPage("m10");

if (m10user !== null) {
  fillJobList();
  fillRemarkFilter();
  showAverages();
  showReviewTable();
  showCustomerMessages();
}


// Check whether proof approval is required and complete.
function hasClientApproval(jobId) {
  const proof = findById("proofs", jobId);

  if (proof === null) {
    return true;           // never went to proofing, nothing to approve
  }
  return proof.status === "Approved";
}


// Find a print order or event booking.
function findJob(jobId) {
  const order = findById("orders", jobId);
  if (order !== null) {
    return { record: order, kind: "order" };
  }

  const booking = findById("bookings", jobId);
  if (booking !== null) {
    return { record: booking, kind: "event" };
  }

  return null;
}


// What do we call the service this job was? Used to group the scores.
function jobServiceName(job) {
  if (job.kind === "event") {
    return job.record.kind;          // "Wedding Coverage" and so on
  }
  return orderSummary(job.record);
}


// Find jobs that are finished, approved, and not already reviewed.
function jobsWeCanScore() {
  let allowed = [];

  const orders = load("orders");
  for (let i = 0; i < orders.length; i++) {
    if (orders[i].status !== "Released") {
      continue;                       // not handed over yet
    }
    if (hasClientApproval(orders[i].id) === false) {
      continue;                       // customer has not signed it off
    }
    if (alreadyScored(orders[i].id) !== null) {
      continue;                       // scored before
    }
    allowed = appendList(allowed, { record: orders[i], kind: "order" });
  }

  // Events go through the same gate. An event is finished when it is
  // Completed, which is the booking calendar's version of "released".
  const bookings = load("bookings");
  for (let i = 0; i < bookings.length; i++) {
    if (bookings[i].status !== "Completed") {
      continue;
    }
    if (hasClientApproval(bookings[i].id) === false) {
      continue;
    }
    if (alreadyScored(bookings[i].id) !== null) {
      continue;
    }
    allowed = appendList(allowed, { record: bookings[i], kind: "event" });
  }

  return allowed;
}


// LINEAR SEARCH for a review of this order.
function alreadyScored(orderId) {
  const reviews = load("reviews");

  for (let i = 0; i < reviews.length; i++) {
    if (reviews[i].orderId === orderId) {
      return reviews[i];
    }
  }
  return null;
}


function fillJobList() {
  const allowed = jobsWeCanScore();
  let html = "";

  for (let i = 0; i < allowed.length; i++) {
    const job = allowed[i];

    html = html + "<option value='" + job.record.id + "'>" +
           safe(job.record.id) + " - " + safe(job.record.client) +
           " (" + safe(jobServiceName(job)) + ")</option>";
  }

  if (html === "") {
    html = "<option value=''>No finished jobs to score</option>";
  }

  document.getElementById("rOrder").innerHTML = html;
}


function saveReview() {
  const orderId = document.getElementById("rOrder").value;
  const errorBox = document.getElementById("reviewError");

  if (orderId === "") {
    errorBox.textContent = "There is nothing to score right now.";
    errorBox.className = "msg bad";
    return;
  }

  const job = findJob(orderId);

  // Check the whole gate again before saving, in case something changed
  // in another tab while this form was open.
  if (job === null) {
    errorBox.textContent = "That job no longer exists.";
    errorBox.className = "msg bad";
    fillJobList();
    return;
  }

  const finished = (job.kind === "order" && job.record.status === "Released") ||
                   (job.kind === "event" && job.record.status === "Completed");

  if (finished === false) {
    errorBox.textContent = "That job is not finished and handed over yet.";
    errorBox.className = "msg bad";
    fillJobList();
    return;
  }

  if (hasClientApproval(orderId) === false) {
    errorBox.textContent = "The customer has not approved the design yet.";
    errorBox.className = "msg bad";
    fillJobList();
    return;
  }

  if (alreadyScored(orderId) !== null) {
    errorBox.textContent = "That job has already been scored once.";
    errorBox.className = "msg bad";
    fillJobList();
    return;
  }

  addRow("reviews", {
    id: makeId("REV"),
    orderId: orderId,
    client: job.record.client,
    service: jobServiceName(job),
    speed: Number(document.getElementById("rSpeed").value),
    quality: Number(document.getElementById("rQuality").value),
    staffScore: Number(document.getElementById("rStaff").value),
    notes: document.getElementById("rNotes").value.trim(),
    by: m10user.name,
    time: new Date().toISOString()
  });

  document.getElementById("rNotes").value = "";
  errorBox.className = "msg bad hide";

  const doneBox = document.getElementById("reviewDone");
  doneBox.textContent = "Review saved for " + orderId + ".";
  doneBox.className = "msg good";

  fillJobList();
  fillRemarkFilter();
  showAverages();
  showReviewTable();
}


// Calculate review averages.

function showAverages() {
  const reviews = load("reviews");

  // ADDING-UP LOOPS, one for each of the three parts.
  let speedTotal = 0;
  let qualityTotal = 0;
  let staffTotal = 0;

  for (let i = 0; i < reviews.length; i++) {
    speedTotal = speedTotal + reviews[i].speed;
    qualityTotal = qualityTotal + reviews[i].quality;
    staffTotal = staffTotal + reviews[i].staffScore;
  }

  let howMany = reviews.length;
  if (howMany === 0) {
    document.getElementById("averageRows").innerHTML =
      "<tr><td colspan='2' class='grey'>No reviews yet.</td></tr>";
    document.getElementById("serviceRows").innerHTML =
      "<tr><td colspan='2' class='grey'>No reviews yet.</td></tr>";
    return;
  }

  const parts = [
    { name: "How fast", average: speedTotal / howMany },
    { name: "Printing quality", average: qualityTotal / howMany },
    { name: "Staff handling", average: staffTotal / howMany }
  ];

  // Bubble sort: lowest average first.
  for (let i = 0; i < parts.length - 1; i++) {
    for (let j = 0; j < parts.length - 1 - i; j++) {
      if (parts[j].average > parts[j + 1].average) {
        const keep = parts[j];
        parts[j] = parts[j + 1];
        parts[j + 1] = keep;
      }
    }
  }

  let html = "";
  for (let i = 0; i < parts.length; i++) {
    let name = safe(parts[i].name);
    if (i === 0) {
      name = "<strong>" + name + "</strong> <span class='tag warn'>weakest</span>";
    }
    html = html + "<tr><td>" + name + "</td>" +
           "<td class='right'>" + parts[i].average.toFixed(2) + " / 5</td></tr>";
  }
  document.getElementById("averageRows").innerHTML = html;

  showServiceAverages(reviews);
}


// Groups the reviews by service and works out each average.
function showServiceAverages(reviews) {
  let groups = [];

  for (let i = 0; i < reviews.length; i++) {
    const review = reviews[i];
    const score = (review.speed + review.quality + review.staffScore) / 3;

    // LINEAR SEARCH for a group we already made.
    let found = null;
    for (let g = 0; g < groups.length; g++) {
      if (groups[g].service === review.service) {
        found = groups[g];
      }
    }

    if (found === null) {
      groups = appendList(groups, { service: review.service, total: score, count: 1 });
    } else {
      found.total = found.total + score;
      found.count = found.count + 1;
    }
  }

  let html = "";
  for (let i = 0; i < groups.length; i++) {
    const average = groups[i].total / groups[i].count;
    html = html + "<tr><td>" + safe(groups[i].service) + "</td>" +
           "<td class='right'>" + average.toFixed(2) + "</td></tr>";
  }

  document.getElementById("serviceRows").innerHTML = html;
}


// Draw the review tables.

// Fill the service filter with reviewed services.
function fillRemarkFilter() {
  const reviews = load("reviews");
  let kinds = [];

  for (let i = 0; i < reviews.length; i++) {
    // Seen this kind of service already? LINEAR SEARCH.
    let seen = false;
    for (let k = 0; k < kinds.length; k++) {
      if (kinds[k] === reviews[i].service) {
        seen = true;
      }
    }
    if (seen === false) {
      kinds = appendList(kinds, reviews[i].service);
    }
  }

  // Keep what the user had picked, so redrawing does not reset the filter.
  const box = document.getElementById("remarkFilter");
  const wasPicked = box.value;

  let html = "<option value=''>Every service</option>";
  for (let i = 0; i < kinds.length; i++) {
    html = html + "<option>" + safe(kinds[i]) + "</option>";
  }
  box.innerHTML = html;

  // Only put the old choice back if it is still one of the options.
  for (let i = 0; i < kinds.length; i++) {
    if (kinds[i] === wasPicked) {
      box.value = wasPicked;
    }
  }
}


function showReviewTable() {
  const reviews = load("reviews");
  const wantService = document.getElementById("remarkFilter").value;
  const wantWords = document.getElementById("m10Search").value;
  const minScore = Number(document.getElementById("m10MinScore").value);
  let html = "";

  for (let i = 0; i < reviews.length; i++) {
    // MULTI-CRITERIA SEARCH: every test must pass for the row to show.
    if (reviewMatches(reviews[i], wantService, wantWords, minScore) === false) {
      continue;
    }

    html = html +
      "<tr><td>" + safe(reviews[i].orderId) + "</td>" +
      "<td>" + safe(reviews[i].client) + "</td>" +
      "<td>" + safe(reviews[i].service) + "</td>" +
      "<td class='right'>" + reviews[i].speed + "</td>" +
      "<td class='right'>" + reviews[i].quality + "</td>" +
      "<td class='right'>" + reviews[i].staffScore + "</td>" +
      "<td class='small'>" + safe(reviews[i].notes) + "</td></tr>";
  }

  if (html === "") {
    // Say which of the two it is, so an empty table is never confusing.
    let why = "No reviews yet.";
    if (wantService !== "") {
      why = "No reviews for " + safe(wantService) + ".";
    }
    if (reviews.length > 0 && (wantWords.trim() !== "" || minScore > 0)) {
      why = "No reviews match the search.";
    }
    html = "<tr><td colspan='7' class='grey'>" + why + "</td></tr>";
  }
  document.getElementById("reviewRows").innerHTML = html;
}


/* The test for one review. Cheapest checks first, so most rows are
   ruled out before the slower word search runs. */
function reviewMatches(review, wantService, wantWords, minScore) {
  if (wantService !== "" && review.service !== wantService) {
    return false;
  }

  const average = (review.speed + review.quality + review.staffScore) / 3;
  if (average < minScore) {
    return false;
  }

  const haystack = review.orderId + " " + review.client + " " +
                   review.service + " " + review.notes;
  return matchText(haystack, wantWords);
}


function clearM10Search() {
  document.getElementById("m10Search").value = "";
  document.getElementById("m10MinScore").value = "0";
  document.getElementById("remarkFilter").value = "";
  showReviewTable();
  showCustomerMessages();
}


// Messages customers sent from their own page.
function showCustomerMessages() {
  const messages = load("feedback");
  const wantWords = document.getElementById("m10Search").value;
  const minScore = Number(document.getElementById("m10MinScore").value);
  let html = "";

  // Backwards so the newest is first.
  for (let i = messages.length - 1; i >= 0; i--) {
    // Same two tests as the reviews. A message with no stars has no score.
    if (minScore > 0 && messages[i].stars < minScore) {
      continue;
    }
    const haystack = messages[i].jobId + " " + messages[i].client + " " +
                     messages[i].message;
    if (matchText(haystack, wantWords) === false) {
      continue;
    }

    let score = "-";
    if (messages[i].stars > 0) {
      score = messages[i].stars + " / 5";
    }

    html = html +
      "<tr><td class='small'>" + showDateTime(messages[i].time) + "</td>" +
      "<td>" + safe(messages[i].jobId) + "</td>" +
      "<td>" + safe(messages[i].client) + "</td>" +
      "<td class='right'>" + score + "</td>" +
      "<td>" + safe(messages[i].message) + "</td></tr>";
  }

  if (html === "") {
    let why = "No messages yet.";
    if (messages.length > 0) {
      why = "No messages match the search.";
    }
    html = "<tr><td colspan='5' class='grey'>" + why + "</td></tr>";
  }
  document.getElementById("feedbackRows").innerHTML = html;
}
