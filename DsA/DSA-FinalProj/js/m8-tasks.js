// Module 8 uses a queue for each staff member's tasks.

class TaskQueue {
  constructor(staffId, staffName) {
    this.staffId = staffId;
    this.staffName = staffName;
    this.things = [];
    this.front = 0;
  }

  join(task) {
    this.things = appendQueue(this.things, task);
  }

  takeNext() {
    if (this.isEmpty()) {
      return null;
    }
    const task = this.things[this.front];
    this.front = this.front + 1;
    return task;
  }

  peek() {
    if (this.isEmpty()) {
      return null;
    }
    return this.things[this.front];
  }

  isEmpty() {
    return this.front >= this.things.length;
  }

  size() {
    return this.things.length - this.front;
  }

  waiting() {
    const list = [];
    for (let i = this.front; i < this.things.length; i++) {
      list[list.length] = this.things[i];
    }
    return list;
  }

  /* QUEUE SEARCH. Walk from the front of the line to the back and say
     where a task is standing (1 = next to be done), or -1 if it is not
     waiting in this queue. Nothing is taken out of the queue. */
  positionOf(taskId) {
    let place = 1;
    for (let i = this.front; i < this.things.length; i++) {
      if (this.things[i].id === taskId) {
        return place;
      }
      place = place + 1;
    }
    return -1;
  }
}

function appendQueue(list, value) {
  const next = [];
  for (let i = 0; i < list.length; i++) {
    next[i] = list[i];
  }
  next[next.length] = value;
  return next;
}


// How urgent, as a number. Smaller means do it sooner.
function urgencyNumber(priority) {
  if (priority === "Urgent") {
    return 1;
  }
  if (priority === "High") {
    return 2;
  }
  if (priority === "Medium") {
    return 3;
  }
  return 4;
}


const m8user = startPage("m8");

// Whose personal to-do list is showing. Starts on the person signed in.
let openStaffId = null;
if (m8user !== null) {
  openStaffId = m8user.id;
}

if (m8user !== null) {
  document.getElementById("tDue").value = dayFromNow(3);
  fillJobPicker();
  showEverything();
}


// Build staff queues.

function buildQueues() {
  const users = load("users");
  const tasks = load("tasks");

  // Only the tasks that are not finished.
  let open = [];
  for (let i = 0; i < tasks.length; i++) {
    if (tasks[i].status === "Open") {
      open = appendList(open, tasks[i]);
    }
  }

  // Insertion sort: urgent tasks first, then earliest due date.
  for (let i = 1; i < open.length; i++) {
    const holding = open[i];
    let j = i - 1;

    while (j >= 0 && comesAfter(open[j], holding)) {
      open[j + 1] = open[j];
      j = j - 1;
    }
    open[j + 1] = holding;
  }

  // One queue for each person.
  let queues = [];
  for (let i = 0; i < users.length; i++) {
    if (users[i].active === true) {
      queues = appendList(queues, new TaskQueue(users[i].id, users[i].name));
    }
  }

  // Put each task in the right queue, already in order.
  for (let i = 0; i < open.length; i++) {
    for (let q = 0; q < queues.length; q++) {
      if (queues[q].staffId === open[i].staffId) {
        queues[q].join(open[i]);
      }
    }
  }

  return queues;
}


// Should task A go after task B?
function comesAfter(a, b) {
  const aUrgency = urgencyNumber(a.priority);
  const bUrgency = urgencyNumber(b.priority);

  if (aUrgency !== bUrgency) {
    return aUrgency > bUrgency;
  }
  return a.due > b.due;
}


// Draw task and workload summaries.

function showEverything() {
  const queues = buildQueues();
  const now = today();

  let totalOpen = 0;
  let totalLate = 0;
  let staffHtml = "";

  // Who has the least work? A SMALLEST-SO-FAR SEARCH.
  let freestName = "-";
  let freestCount = -1;

  for (let q = 0; q < queues.length; q++) {
    const queue = queues[q];
    const waiting = queue.waiting();

    // COUNTING LOOP for the late ones.
    let late = 0;
    for (let i = 0; i < waiting.length; i++) {
      if (waiting[i].due < now) {
        late = late + 1;
      }
    }

    totalOpen = totalOpen + waiting.length;
    totalLate = totalLate + late;

    if (freestCount === -1 || waiting.length < freestCount) {
      freestCount = waiting.length;
      freestName = queue.staffName;
    }

    // What is at the front of this person's queue?
    const next = queue.peek();
    let nextText = "<span class='grey'>nothing</span>";
    if (next !== null) {
      nextText = safe(next.what) + "<br><span class='small grey'>" +
                 safe(next.priority) + ", due " + showDate(next.due) + "</span>";
    }

    let lateText = "0";
    if (late > 0) {
      lateText = "<span class='tag bad'>" + late + "</span>";
    }

    staffHtml = staffHtml +
      "<tr><td><a href='#' onclick=\"openStaff('" + queue.staffId +
        "'); return false;\">" + safe(queue.staffName) + "</a></td>" +
      "<td class='right'>" + waiting.length + "</td>" +
      "<td class='right'>" + lateText + "</td>" +
      "<td class='small'>" + nextText + "</td></tr>";
  }

  document.getElementById("staffRows").innerHTML = staffHtml;
  document.getElementById("cardOpen").textContent = totalOpen;
  document.getElementById("cardLate").textContent = totalLate;
  document.getElementById("cardFree").textContent = freestName;

  showTaskTable(queues);
  showLateList(queues, now);
  fillStaffPicker(queues, freestName);
  showTodo(queues, now);
}


function openStaff(staffId) {
  openStaffId = staffId;
  showEverything();
}


/* Show one person's queue from the front. */
function showTodo(queues, now) {
  const area = document.getElementById("todoArea");

  // Find this person's queue. LINEAR SEARCH.
  let queue = null;
  for (let q = 0; q < queues.length; q++) {
    if (queues[q].staffId === openStaffId) {
      queue = queues[q];
    }
  }

  if (queue === null) {
    area.innerHTML = "<p class='grey small'>Pick a name above.</p>";
    return;
  }

  const waiting = queue.waiting();
  let html = "<p><strong>" + safe(queue.staffName) + "</strong> - " +
             waiting.length + " open</p>";

  if (waiting.length === 0) {
    area.innerHTML = html + "<p class='grey small'>Nothing to do.</p>";
    return;
  }

  html = html + "<table><thead><tr><th>#</th><th>Task</th><th>Job</th>" +
         "<th>Priority</th><th>Due</th><th></th></tr></thead><tbody>";

  for (let i = 0; i < waiting.length; i++) {
    const task = waiting[i];

    let dueText = showDate(task.due);
    if (task.due < now) {
      dueText = "<span class='tag bad'>" + dueText + "</span>";
    }

    let nextTag = "";
    if (i === 0) {
      nextTag = " <span class='tag blue'>NEXT</span>";
    }

    html = html +
      "<tr><td>" + (i + 1) + "</td>" +
      "<td>" + safe(task.what) + nextTag + "</td>" +
      "<td class='small'>" + safe(task.jobId) + "</td>" +
      "<td>" + safe(task.priority) + "</td>" +
      "<td>" + dueText + "</td>" +
      "<td><button class='small green' onclick=\"finishTask('" + task.id +
        "')\">Done</button></td></tr>";
  }

  area.innerHTML = html + "</tbody></table>";
}


function showTaskTable(queues) {
  const tasks = load("tasks");
  const wantWords = document.getElementById("m8Search").value;
  let html = "";

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const person = findById("users", task.staffId);

    let personName = task.staffId;
    if (person !== null) {
      personName = person.name;
    }

    // LINEAR SEARCH over the words on each task.
    const haystack = task.id + " " + task.what + " " + personName + " " +
                     task.jobId + " " + task.priority + " " + task.status;
    if (matchText(haystack, wantWords) === false) {
      continue;
    }

    // Find the owner's queue, then search it for this task.
    let placeText = "-";
    for (let q = 0; q < queues.length; q++) {
      if (queues[q].staffId === task.staffId) {
        const place = queues[q].positionOf(task.id);
        if (place !== -1) {
          placeText = place + " of " + queues[q].size();
        }
      }
    }

    let dueText = showDate(task.due);
    if (task.status === "Open" && task.due < today()) {
      dueText = "<span class='tag bad'>" + dueText + "</span>";
    }

    let button = "<button class='small green' onclick=\"finishTask('" +
                 task.id + "')\">Done</button>";
    if (task.status === "Done") {
      button = "<button class='small grey' onclick=\"reopenTask('" +
               task.id + "')\">Reopen</button>";
    }

    html = html +
      "<tr><td>" + safe(task.what) + "</td>" +
      "<td>" + safe(personName) + "</td>" +
      "<td class='small'>" + safe(task.jobId) + "</td>" +
      "<td>" + safe(task.priority) + "</td>" +
      "<td>" + dueText + "</td>" +
      "<td>" + safe(task.status) + "</td>" +
      "<td class='right'>" + placeText + "</td>" +
      "<td>" + button + "</td></tr>";
  }

  if (html === "") {
    let why = "No tasks yet.";
    if (tasks.length > 0) {
      why = "No tasks match the search.";
    }
    html = "<tr><td colspan='8' class='grey'>" + why + "</td></tr>";
  }
  document.getElementById("taskRows").innerHTML = html;
}


function clearM8Search() {
  document.getElementById("m8Search").value = "";
  showTaskTable(buildQueues());
}


function showLateList(queues, now) {
  let html = "";

  for (let q = 0; q < queues.length; q++) {
    const waiting = queues[q].waiting();
    for (let i = 0; i < waiting.length; i++) {
      if (waiting[i].due < now) {
        html = html + "<div class='msg bad'>" + safe(waiting[i].what) +
               "<br><span class='small'>" + safe(queues[q].staffName) +
               ", was due " + showDate(waiting[i].due) + "</span></div>";
      }
    }
  }

  if (html === "") {
    html = "<p class='grey small'>Nothing is late.</p>";
  }
  document.getElementById("lateArea").innerHTML = html;
}


// Task form.

function fillJobPicker() {
  const orders = load("orders");
  const bookings = load("bookings");
  let html = "";

  for (let i = 0; i < orders.length; i++) {
    if (orders[i].status !== "Released") {
      html = html + "<option value='" + orders[i].id + "'>" +
             safe(orders[i].id) + " - " + safe(orders[i].client) + "</option>";
    }
  }
  for (let i = 0; i < bookings.length; i++) {
    html = html + "<option value='" + bookings[i].id + "'>" +
           safe(bookings[i].id) + " - " + safe(bookings[i].client) + "</option>";
  }

  document.getElementById("tJob").innerHTML = html;
}


function fillStaffPicker(queues, freestName) {
  let html = "";

  for (let q = 0; q < queues.length; q++) {
    let suggestion = "";
    let selected = "";

    if (queues[q].staffName === freestName) {
      suggestion = " (least busy)";
      selected = " selected";
    }

    html = html + "<option value='" + queues[q].staffId + "'" + selected + ">" +
           safe(queues[q].staffName) + " - " + queues[q].size() +
           " open" + suggestion + "</option>";
  }

  document.getElementById("tStaff").innerHTML = html;
}


function giveTask() {
  const what = document.getElementById("tWhat").value.trim();

  if (what === "") {
    const box = document.getElementById("taskError");
    box.textContent = "Please say what needs doing.";
    box.className = "msg bad";
    return;
  }

  addRow("tasks", {
    id: makeId("TSK"),
    staffId: document.getElementById("tStaff").value,
    jobId: document.getElementById("tJob").value,
    what: what,
    priority: document.getElementById("tPriority").value,
    due: document.getElementById("tDue").value,
    status: "Open"
  });

  document.getElementById("tWhat").value = "";
  document.getElementById("taskError").className = "msg bad hide";
  showEverything();
}


function finishTask(taskId) {
  updateRow("tasks", taskId, { status: "Done" });
  showEverything();
}


function reopenTask(taskId) {
  updateRow("tasks", taskId, { status: "Open" });
  showEverything();
}
