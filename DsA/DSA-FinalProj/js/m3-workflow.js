// Module 3 uses a linked list for workflow steps.


// One step in the job.
class StepNode {
  constructor(name) {
    this.name = name;
    this.status = "Waiting";   // Waiting, Doing or Done
    this.doneOn = null;
    this.extra = false;        // true if someone added it in the middle
    this.next = null;          // <-- the POINTER to the next step
  }
}


// The whole chain of steps.
class StepList {
  constructor() {
    this.first = null;
    this.count = 0;
  }

  // Put a new step at the very end.
  add(name) {
    const node = new StepNode(name);

    if (this.first === null) {
      this.first = node;
    } else {
      // WALK along the pointers until we reach the last node.
      let here = this.first;
      while (here.next !== null) {
        here = here.next;
      }
      here.next = node;
    }

    this.count = this.count + 1;
    return node;
  }

  // Look for a step by name by following the pointers.
  find(name) {
    let here = this.first;
    while (here !== null) {
      if (here.name === name) {
        return here;
      }
      here = here.next;
    }
    return null;
  }

  // The first step that is not finished yet.
  current() {
    let here = this.first;
    while (here !== null) {
      if (here.status !== "Done") {
        return here;
      }
      here = here.next;
    }
    return null;
  }

  /* LINKED-LIST SEARCH by part of a name. Start at the head and follow
     the next pointers one node at a time until a step name contains the
     words. There is no index to jump to, so this is always O(n). */
  findWhere(words) {
    let here = this.first;
    let position = 1;
    while (here !== null) {
      if (matchText(here.name, words) === true) {
        return { node: here, position: position };
      }
      here = here.next;
      position = position + 1;
    }
    return null;
  }

    /* Insert a new step by changing two pointers. */
  addAfter(afterName, newName) {
    const before = this.find(afterName);
    if (before === null) {
      return null;
    }

    const node = new StepNode(newName);
    node.extra = true;

    node.next = before.next;   // 1. the new step points to what came next
    before.next = node;        // 2. the old step now points to the new one

    this.count = this.count + 1;
    return node;
  }

  // Take a step out and join the two sides back together.
  remove(name) {
    if (this.first === null) {
      return;
    }

    if (this.first.name === name) {
      this.first = this.first.next;
      this.count = this.count - 1;
      return;
    }

    let here = this.first;
    while (here.next !== null) {
      if (here.next.name === name) {
        here.next = here.next.next;   // jump over the removed step
        this.count = this.count - 1;
        return;
      }
      here = here.next;
    }
  }

  // Finish the step we are on and start the next one.
  moveOn() {
    const now = this.current();
    if (now === null) {
      return;
    }

    now.status = "Done";
    now.doneOn = new Date().toISOString();

    if (now.next !== null) {
      now.next.status = "Doing";
    }
  }

  // How many steps are finished. A COUNTING LOOP.
  doneCount() {
    let total = 0;
    let here = this.first;
    while (here !== null) {
      if (here.status === "Done") {
        total = total + 1;
      }
      here = here.next;
    }
    return total;
  }

  // Turn the chain into a plain array so we can save it.
  toArray() {
    const list = [];
    let here = this.first;
    while (here !== null) {
      list[list.length] = {
        name: here.name,
        status: here.status,
        doneOn: here.doneOn,
        extra: here.extra
      };
      here = here.next;
    }
    return list;
  }
}


// Build the pointers again from a saved array.
function listFromArray(rows) {
  const list = new StepList();
  for (let i = 0; i < rows.length; i++) {
    const node = list.add(rows[i].name);
    node.status = rows[i].status;
    node.doneOn = rows[i].doneOn;
    node.extra = rows[i].extra;
  }
  return list;
}


// Build print or event workflows.

const PRINT_STEPS = ["Designing", "Printing", "Finishing", "Ready for Pickup"];
const EVENT_STEPS = ["Preparation", "Transport", "Setup", "Execution",
                     "Teardown", "Return"];


// Called by Module 5 when an order is saved.
function startWorkflow(jobId, kind) {
  if (findById("workflows", jobId) !== null) {
    return;
  }

  let names = PRINT_STEPS;
  if (kind === "event") {
    names = EVENT_STEPS;
  }

  const list = new StepList();
  for (let i = 0; i < names.length; i++) {
    const node = list.add(names[i]);
    if (i === 0) {
      node.status = "Doing";   // the first step starts straight away
    }
  }

  addRow("workflows", {
    id: jobId,
    title: kind,
    steps: list.toArray()
  });
}
