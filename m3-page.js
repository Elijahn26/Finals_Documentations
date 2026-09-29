// Module 3 page; the linked list is in m3-workflow.js.

const m3user = startPage("m3");
let openJobId = null;

if (m3user !== null) {
  makeMissingWorkflows();
  showJobList();
  showJob();
}


// Older sample orders were saved before this module existed,
// so give them a step list now.
function makeMissingWorkflows() {
  const orders = load("orders");

  for (let i = 0; i < orders.length; i++) {
    if (findById("workflows", orders[i].id) === null) {
      // Event packages use the event steps, everything else the print steps.
      let kind = "print";
      for (let k = 0; k < orders[i].items.length; k++) {
        // Look the service up so we read its isEvent flag, not its name.
        const services = load("services");
        for (let v = 0; v < services.length; v++) {
          if (services[v].name === orders[i].items[k].service &&
              services[v].isEvent === true) {
            kind = "event";
          }
        }
      }
      startWorkflow(orders[i].id, kind);

      // Move the sample jobs along a bit so the demo is not all on step one.
      const job = findById("workflows", orders[i].id);
      const list = listFromArray(job.steps);

      if (orders[i].status === "Released") {
        while (list.current() !== null) {
          list.moveOn();
        }
      } else if (orders[i].status === "Ready for Pickup") {
        list.moveOn();
        list.moveOn();
        list.moveOn();
      }
      updateRow("workflows", orders[i].id, { steps: list.toArray() });
    }
  }

  const bookings = load("bookings");
  for (let i = 0; i < bookings.length; i++) {
    if (findById("workflows", bookings[i].id) === null) {
      startWorkflow(bookings[i].id, "event");
    }
  }
}


// The list of jobs on the right.
function showJobList() {
  const jobs = load("workflows");
  const wantWords = document.getElementById("m3Search").value.toLowerCase().trim();
  let html = "";

  for (let i = 0; i < jobs.length; i++) {
    const list = listFromArray(jobs[i].steps);
    const now = list.current();

    let nowName = "Finished";
    if (now !== null) {
      nowName = now.name;
    }

    if (openJobId === null) {
      openJobId = jobs[i].id;
    }

    // Match the job number or kind first, then search the linked list.
    let hint = "";
    if (wantWords !== "" &&
        matchText(jobs[i].id + " " + jobs[i].title, wantWords) === false) {
      const hit = list.findWhere(wantWords);
      if (hit === null) {
        continue;
      }
      hint = "<br><span class='small grey'>step " + hit.position + ": " +
             safe(hit.node.name) + " (" + safe(hit.node.status) + ")</span>";
    }

    html = html +
      "<tr><td><a href='#' onclick=\"openJob('" + jobs[i].id +
      "'); return false;\">" + safe(jobs[i].id) + "</a><br>" +
      "<span class='small grey'>" + safe(jobs[i].title) + "</span></td>" +
      "<td>" + safe(nowName) + hint + "</td></tr>";
  }

  if (html === "") {
    let why = "No jobs yet.";
    if (jobs.length > 0) {
      why = "No jobs match the search.";
    }
    html = "<tr><td colspan='2' class='grey'>" + why + "</td></tr>";
  }
  document.getElementById("jobRows").innerHTML = html;
}


function clearM3Search() {
  document.getElementById("m3Search").value = "";
  showJobList();
}


function openJob(jobId) {
  openJobId = jobId;
  showJob();
}


// Draws the steps and the table underneath.
function showJob() {
  const job = findById("workflows", openJobId);

  if (job === null) {
    document.getElementById("jobTitle").textContent = "No job picked";
    return;
  }

  const order = findById("orders", job.id);
  let who = job.title;
  if (order !== null) {
    who = order.client + " - " + orderServiceList(order);
  }

  document.getElementById("jobTitle").textContent = job.id + "  " + who;

  const list = listFromArray(job.steps);

  // The coloured boxes.
  let boxes = "";
  let here = list.first;
  while (here !== null) {
    let style = "step";
    if (here.status === "Done") {
      style = "step done";
    }
    if (here.status === "Doing") {
      style = "step now";
    }

    let extraMark = "";
    if (here.extra === true) {
      extraMark = "<br><span class='small'>added</span>";
    }

    boxes = boxes + "<div class='" + style + "'>" + safe(here.name) +
            extraMark + "</div>";
    here = here.next;
  }
  document.getElementById("stepArea").innerHTML = boxes;

  // The message under the steps.
  const now = list.current();
  if (now === null) {
    document.getElementById("stepInfo").innerHTML =
      "<span class='tag good'>All steps finished</span>";
    document.getElementById("nextButton").className = "hide";
  } else {
    document.getElementById("stepInfo").innerHTML =
      "Doing now: <strong>" + safe(now.name) + "</strong> " +
      "<span class='grey'>(" + list.doneCount() + " of " + list.count +
      " done)</span>";
    document.getElementById("nextButton").className = "";
  }

  showNodeTable(list);
}


// Shows what the linked list really holds, including the pointers.
function showNodeTable(list) {
  let html = "";
  let here = list.first;
  let number = 0;

  while (here !== null) {
    let pointsTo = "null";
    if (here.next !== null) {
      pointsTo = here.next.name;
    }

    let removeButton = "";
    if (here.extra === true) {
      removeButton = "<button class='small red' onclick=\"removeStep('" +
                     here.name + "')\">Remove</button>";
    }

    let finished = "-";
    if (here.doneOn !== null) {
      finished = showDateTime(here.doneOn);
    }

    html = html +
      "<tr><td>" + number + "</td>" +
      "<td>" + safe(here.name) + "</td>" +
      "<td>" + safe(here.status) + "</td>" +
      "<td class='small grey'>" + finished + "</td>" +
      "<td class='small grey'>" + safe(pointsTo) + "</td>" +
      "<td>" + removeButton + "</td></tr>";

    here = here.next;
    number = number + 1;
  }

  document.getElementById("nodeRows").innerHTML = html;
}


// Workflow actions.

function finishStep() {
  const job = findById("workflows", openJobId);
  const list = listFromArray(job.steps);

  list.moveOn();
  updateRow("workflows", openJobId, { steps: list.toArray() });

  // If every step is done, the order is ready to collect.
  if (list.current() === null) {
    const order = findById("orders", openJobId);
    if (order !== null && order.status !== "Released") {
      updateRow("orders", openJobId, { status: "Ready for Pickup" });
    }
  }

  showJob();
  showJobList();
}


function addExtraStep() {
  const job = findById("workflows", openJobId);
  const list = listFromArray(job.steps);

  // Build a list of the step names to show in the question box.
  let names = "";
  let here = list.first;
  while (here !== null) {
    names = names + here.name + "\n";
    here = here.next;
  }

  const afterName = prompt("Put the new step AFTER which one?\n\n" + names);
  if (afterName === null) {
    return;
  }

  if (list.find(afterName.trim()) === null) {
    alert("There is no step called " + afterName);
    return;
  }

  const newName = prompt("Name of the new step:");
  if (newName === null || newName.trim() === "") {
    return;
  }

  list.addAfter(afterName.trim(), newName.trim());   // the pointer change
  updateRow("workflows", openJobId, { steps: list.toArray() });

  showJob();
}


function removeStep(name) {
  if (confirm("Remove the step " + name + "?") === false) {
    return;
  }

  const job = findById("workflows", openJobId);
  const list = listFromArray(job.steps);

  list.remove(name);
  updateRow("workflows", openJobId, { steps: list.toArray() });

  showJob();
}
