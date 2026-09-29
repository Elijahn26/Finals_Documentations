// Seed sample data on the first page load.

// Build sample workflow steps.
function makeSteps(jobId, kind, howManyDone) {
  let names = ["Designing", "Printing", "Finishing", "Ready for Pickup"];
  if (kind === "event") {
    names = ["Preparation", "Transport", "Setup", "Execution",
             "Teardown", "Return"];
  }

  const steps = [];
  for (let i = 0; i < names.length; i++) {
    let status = "Waiting";
    if (i < howManyDone) {
      status = "Done";
    } else if (i === howManyDone) {
      status = "Doing";
    }

    steps[steps.length] = {
      name: names[i],
      status: status,
      doneOn: null,
      extra: false
    };
  }

  return { id: jobId, title: kind, steps: steps };
}


/* Build one sample audit line (Module 1).

   Live logs get their time from addLog(). Seeded logs need a fixed day and
   clock time instead, so the date range filter has a real spread to search.
   The text is local time ("2026-09-14T09:15:00"), so the day the filter reads
   with slice(0, 10) is exactly the day we asked for. */
let logCount = 0;

function makeLog(daysAgo, hour, minute, user, action, table, recordId, message) {
  logCount = logCount + 1;

  return {
    id: "LOG-" + padNumber(logCount),
    userId: user.id,
    userName: user.name,
    action: action,
    table: table,
    recordId: recordId,
    message: message,
    time: dayFromNow(daysAgo) + "T" + padTwo(hour) + ":" + padTwo(minute) + ":00"
  };
}


function seedData() {
  // Already done? Then stop.
  if (localStorage.getItem("clpp_seeded") === "yes") {
    return;
  }

  /* ----- staff accounts (Module 4) ----- */
  save("users", [
    { id: "USR-001", name: "Christopher", username: "owner",
      password: hashPassword("owner123"), role: "Owner", active: true },
    { id: "USR-002", name: "Loisa", username: "loisa",
      password: hashPassword("loisa123"), role: "Owner", active: true },
    { id: "USR-003", name: "Test_Designer", username: "designer",
      password: hashPassword("designer123"), role: "Designer", active: true },
    { id: "USR-004", name: "Test_Staff", username: "staff",
      password: hashPassword("staff123"), role: "Staff", active: true }
  ]);

  /* ----- consumable materials (Module 6) ----- */
  save("items", [
    { id: "ITM-001", name: "Tarpaulin Roll (sq ft)", unit: "sq ft",
      stock: 400, lowAt: 100, price: 6 },
    { id: "ITM-002", name: "Eco-Solvent Ink", unit: "ml",
      stock: 900, lowAt: 500, price: 2 },
    { id: "ITM-003", name: "Glossy Photo Paper A4", unit: "sheet",
      stock: 250, lowAt: 100, price: 8 },
    { id: "ITM-004", name: "Matte Photo Paper A4", unit: "sheet",
      stock: 180, lowAt: 100, price: 9 },
    { id: "ITM-005", name: "PVC Card Blank", unit: "piece",
      stock: 240, lowAt: 100, price: 25 },
    { id: "ITM-006", name: "Pearl Card Stock", unit: "sheet",
      stock: 300, lowAt: 100, price: 12 },
    { id: "ITM-007", name: "Sticker Vinyl", unit: "sheet",
      stock: 60, lowAt: 80, price: 14 },
    { id: "ITM-008", name: "Lamination Film", unit: "sheet",
      stock: 90, lowAt: 50, price: 5 },
    { id: "ITM-009", name: "Sintra Board (sq ft)", unit: "sq ft",
      stock: 120, lowAt: 40, price: 30 },
    { id: "ITM-010", name: "Lanyard Strap", unit: "piece",
      stock: 150, lowAt: 60, price: 18 },
    { id: "ITM-011", name: "Ink Cartridge (Photo)", unit: "ml",
      stock: 300, lowAt: 200, price: 3 },
    { id: "ITM-012", name: "Wooden Frame Blank", unit: "piece",
      stock: 25, lowAt: 10, price: 90 },
    { id: "ITM-013", name: "Short Envelope", unit: "piece",
      stock: 100, lowAt: 20, price: 6 },
    { id: "ITM-014", name: "Long Envelope", unit: "piece",
      stock: 100, lowAt: 20, price: 10 },
    { id: "ITM-015", name: "Short Folder", unit: "piece",
      stock: 100, lowAt: 20, price: 15 },
    { id: "ITM-016", name: "Long Folder", unit: "piece",
      stock: 100, lowAt: 20, price: 20 },
    { id: "ITM-017", name: "Short Plastic", unit: "piece",
      stock: 100, lowAt: 20, price: 20 },
    { id: "ITM-018", name: "Long Plastic", unit: "piece",
      stock: 100, lowAt: 20, price: 30 },
    { id: "ITM-019", name: "DTR", unit: "piece",
      stock: 100, lowAt: 20, price: 5 },
    { id: "ITM-020", name: "Bond Paper", unit: "sheet",
      stock: 500, lowAt: 100, price: 1 },
    { id: "ITM-021", name: "Ballpen", unit: "piece",
      stock: 100, lowAt: 20, price: 10 },
    { id: "ITM-022", name: "Photo Paper", unit: "sheet",
      stock: 250, lowAt: 50, price: 10 },
    { id: "ITM-023", name: "Photo Sleeve", unit: "piece",
      stock: 100, lowAt: 20, price: 20 },
    { id: "ITM-024", name: "Paper Sticker", unit: "piece",
      stock: 100, lowAt: 20, price: 10 }
  ]);

  /* ----- services, recipes, and modifications (Module 5) ----- */
  save("services", [
    {
      id: "SVC-001", name: "Tarpaulin", unit: "per order", price: 150,
      isEvent: false,
      recipe: [
        { itemId: "ITM-001", qty: 1 },
        { itemId: "ITM-002", qty: 2 }
      ],
      modifications: [
        { name: "2x3", addPrice: 0,
          swaps: [{ from: "ITM-001", to: "ITM-001", qty: 6 }] },
        { name: "3x4", addPrice: 100,
          swaps: [{ from: "ITM-001", to: "ITM-001", qty: 12 }] },
        { name: "3x5", addPrice: 150,
          swaps: [{ from: "ITM-001", to: "ITM-001", qty: 15 }] },
        { name: "3x6", addPrice: 210,
          swaps: [{ from: "ITM-001", to: "ITM-001", qty: 18 }] },
        { name: "4x5", addPrice: 250,
          swaps: [{ from: "ITM-001", to: "ITM-001", qty: 20 }] },
        { name: "4x6", addPrice: 330,
          swaps: [{ from: "ITM-001", to: "ITM-001", qty: 24 }] },
        { name: "4x8", addPrice: 490,
          swaps: [{ from: "ITM-001", to: "ITM-001", qty: 32 }] },
        { name: "3x3", addPrice: 60,
          swaps: [{ from: "ITM-001", to: "ITM-001", qty: 9 }] },
        { name: "3x8", addPrice: 330,
          swaps: [{ from: "ITM-001", to: "ITM-001", qty: 24 }] },
        { name: "2x4", addPrice: 60,
          swaps: [{ from: "ITM-001", to: "ITM-001", qty: 8 }] }
      ]
    },
    {
      id: "SVC-002", name: "Photo Paper Print", unit: "per sheet", price: 35,
      isEvent: false,
      recipe: [
        { itemId: "ITM-003", qty: 1 },
        { itemId: "ITM-011", qty: 2 }
      ],
      modifications: [
        { name: "Glossy paper", addPrice: 0, swaps: [] },
        { name: "Matte paper", addPrice: 3,
          swaps: [{ from: "ITM-003", to: "ITM-004" }] }
      ]
    },
    {
      id: "SVC-003", name: "PVC Card / School ID", unit: "per piece", price: 80,
      isEvent: false,
      recipe: [
        { itemId: "ITM-005", qty: 1 },
        { itemId: "ITM-011", qty: 1 }
      ],
      modifications: [
        { name: "Front only", addPrice: 0, swaps: [] },
        { name: "Front and back", addPrice: 15, swaps: [] }
      ]
    },
    {
      id: "SVC-004", name: "Invitation", unit: "per piece", price: 45,
      isEvent: false,
      recipe: [
        { itemId: "ITM-006", qty: 1 },
        { itemId: "ITM-011", qty: 1 }
      ],
      modifications: [
        { name: "Pearl card", addPrice: 0, swaps: [] },
        { name: "Matte card", addPrice: 0,
          swaps: [{ from: "ITM-006", to: "ITM-004" }] },
        { name: "Gold foil text", addPrice: 8, swaps: [] },
        { name: "With ribbon", addPrice: 6, swaps: [] }
      ]
    },
    {
      id: "SVC-005", name: "Sticker", unit: "per sheet", price: 30,
      isEvent: false,
      recipe: [{ itemId: "ITM-007", qty: 1 }, { itemId: "ITM-011", qty: 1 }],
      modifications: [
        { name: "Sheet only", addPrice: 0, swaps: [] },
        { name: "Die cut", addPrice: 10, swaps: [] }
      ]
    },
    {
      id: "SVC-006", name: "Sintra Board", unit: "per sq ft", price: 95,
      isEvent: false,
      recipe: [{ itemId: "ITM-009", qty: 1 }, { itemId: "ITM-002", qty: 2 }],
      modifications: [
        { name: "3mm board", addPrice: 0, swaps: [] },
        { name: "5mm board", addPrice: 20, swaps: [] }
      ]
    },
    {
      id: "SVC-007", name: "Lamination", unit: "per piece", price: 20,
      isEvent: false,
      recipe: [{ itemId: "ITM-008", qty: 1 }],
      modifications: [
        { name: "A4 size", addPrice: 0, swaps: [] },
        { name: "Legal size", addPrice: 5, swaps: [] },
        { name: "ID size", addPrice: 0, swaps: [] }
      ]
    },
    {
      id: "SVC-008", name: "Lanyard", unit: "per piece", price: 60,
      isEvent: false,
      recipe: [{ itemId: "ITM-010", qty: 1 }, { itemId: "ITM-011", qty: 1 }],
      modifications: [
        { name: "Printed one side", addPrice: 0, swaps: [] },
        { name: "Printed both sides", addPrice: 12, swaps: [] }
      ]
    },
    {
      id: "SVC-009", name: "Photo Frame", unit: "per piece", price: 250,
      isEvent: false,
      recipe: [{ itemId: "ITM-012", qty: 1 }, { itemId: "ITM-003", qty: 1 }],
      modifications: [
        { name: "A4 size", addPrice: 0, swaps: [] },
        { name: "A3 size", addPrice: 120, swaps: [] }
      ]
    },
    {
      id: "SVC-010", name: "Ref Magnet", unit: "per piece", price: 55,
      isEvent: false,
      recipe: [{ itemId: "ITM-007", qty: 1 }],
      modifications: [
        { name: "Standard", addPrice: 0, swaps: [] }
      ]
    },
    {
      id: "SVC-011", name: "Souvenir Item", unit: "per piece", price: 120,
      isEvent: false,
      recipe: [],
      modifications: [
        { name: "Standard", addPrice: 0, swaps: [] }
      ]
    },
    {
      id: "SVC-012", name: "Solo", unit: "per session", price: 399,
      isEvent: true,
      recipe: [],
      modifications: [{ name: "Standard", addPrice: 0, swaps: [] }]
    },
    {
      id: "SVC-013", name: "Duo", unit: "per session", price: 499,
      isEvent: true, recipe: [],
      modifications: [{ name: "Standard", addPrice: 0, swaps: [] }]
    },
    {
      id: "SVC-014", name: "Family Picture", unit: "per session", price: 799,
      isEvent: true, recipe: [],
      modifications: [{ name: "Standard", addPrice: 0, swaps: [] }]
    },
  ]);

  /* ----- event types (Module 2) ----- */
  save("eventtypes", [
    { id: "ETP-001", name: "Wedding Coverage" },
    { id: "ETP-002", name: "Debut Coverage" },
    { id: "ETP-003", name: "Event Booth" },
    { id: "ETP-004", name: "Photo Booth" },
    { id: "ETP-005", name: "Event Coverage" },
    { id: "ETP-006", name: "Birthday Coverage" }
  ]);

  /* ----- equipment (Module 2) ----- */
  save("equipment", [
    { id: "EQP-001", name: "DSLR Camera", total: 3 },
    { id: "EQP-002", name: "Studio Light Kit", total: 4 },
    { id: "EQP-003", name: "Backdrop Stand", total: 5 },
    { id: "EQP-004", name: "Photo Booth Unit", total: 2 },
    { id: "EQP-005", name: "Mobile Printer", total: 2 },
    { id: "EQP-006", name: "Speaker Set", total: 2 },
    { id: "EQP-007", name: "Tripod", total: 6 },
    { id: "EQP-008", name: "Tent / Canopy", total: 4 }
  ]);

  /* ----- sample orders (Module 5) ----- */
  save("orders", [
    { id: "ORD-001", code: "BSU1-2CDE", client: "Bulacan State University",
      contact: "0917 555 0101",
      items: [
        { service: "Tarpaulin", modification: "4x8",
          quantity: 1, unitPrice: 800, lineTotal: 800 }
      ],
      notes: "4x8 welcome banner", price: 800, paid: 800,
      due: dayFromNow(-6), status: "Released", staffName: "Test_Designer",
        madeOn: dayFromNow(-12) },

    { id: "ORD-002", code: "SNE2-3FGH", client: "Sto. Nino Elementary",
      contact: "0918 555 0202",
      items: [
        { service: "PVC Card / School ID", modification: "Front and back",
          quantity: 120, unitPrice: 95, lineTotal: 11400 }
      ],
      notes: "Landscape with lanyard slot", price: 11400, paid: 5000,
        due: dayFromNow(3), status: "In Progress", staffName: "Test_Designer",
      madeOn: dayFromNow(-4) },

    { id: "ORD-003", code: "REY3-4JKL", client: "Reyes Wedding",
      contact: "0999 555 0303",
      items: [
        { service: "Invitation", modification: "Gold foil text",
          quantity: 150, unitPrice: 53, lineTotal: 7950 },
        { service: "Sticker", modification: "Die cut",
          quantity: 40, unitPrice: 40, lineTotal: 1600 }
      ],
      notes: "5x7 invitations plus seal stickers", price: 9550, paid: 4000,
        due: dayFromNow(9), status: "In Progress", staffName: "Test_Designer",
      madeOn: dayFromNow(-2) },

    { id: "ORD-004", code: "BRG4-5MNP", client: "Caingin Barangay Hall",
      contact: "0905 555 0404",
      items: [
        { service: "Sintra Board", modification: "3mm board",
          quantity: 6, unitPrice: 95, lineTotal: 570 }
      ],
      notes: "Directory signage", price: 570, paid: 570,
      due: dayFromNow(-1), status: "Ready for Pickup",
      staffName: "Test_Designer", madeOn: dayFromNow(-8) },

    { id: "ORD-005", code: "DLR5-6QRS", client: "Dela Rosa Family",
      contact: "0921 555 0505",
      items: [
        { service: "Photo Frame", modification: "A4 size",
          quantity: 4, unitPrice: 250, lineTotal: 1000 },
        { service: "Photo Paper Print", modification: "Matte paper",
          quantity: 12, unitPrice: 38, lineTotal: 456 }
      ],
      notes: "Family portraits, matte finish", price: 1456, paid: 500,
      due: dayFromNow(5), status: "In Progress",
      staffName: "Test_Staff", madeOn: dayFromNow(-1) },

    { id: "ORD-006", code: "SRC6-7TUV", client: "San Rafael Coop",
      contact: "0933 555 0606",
      items: [
        { service: "Lanyard", modification: "Printed both sides",
          quantity: 200, unitPrice: 72, lineTotal: 14400 }
      ],
      notes: "Full colour", price: 14400, paid: 14400,
      due: dayFromNow(-10), status: "Released",
      staffName: "Test_Staff", madeOn: dayFromNow(-20) }
  ]);

  /* ----- event bookings (Module 2) ----- */
  save("bookings", [
    { id: "EVT-001", code: "A7K2-8WXY", client: "Reyes-Santos Wedding",
      contact: "0999 555 0303", startDate: dayFromNow(-15),
      endDate: dayFromNow(-15), place: "Casa Sofia, San Rafael",
      kind: "Wedding Coverage", status: "Completed",
      gear: [{ id: "EQP-001", qty: 2 }, { id: "EQP-002", qty: 2 },
             { id: "EQP-004", qty: 1 }] },

    { id: "EVT-002", code: "B4M8-9ZAB", client: "BSU Foundation Day",
      contact: "0917 555 0101", startDate: dayFromNow(-5),
      endDate: dayFromNow(-4), place: "BSU Grounds, Bustos",
      kind: "Event Booth", status: "Completed",
      gear: [{ id: "EQP-004", qty: 1 }, { id: "EQP-005", qty: 2 },
             { id: "EQP-008", qty: 2 }] },

    { id: "EVT-003", code: "C5N1-2CDF", client: "Aquino Debut",
      contact: "0916 555 0707", startDate: dayFromNow(6),
      endDate: dayFromNow(6), place: "Villa Corazon, Baliwag",
      kind: "Debut Coverage", status: "Booked",
      gear: [{ id: "EQP-001", qty: 2 }, { id: "EQP-002", qty: 3 },
             { id: "EQP-003", qty: 2 }, { id: "EQP-007", qty: 3 }] },

    { id: "EVT-004", code: "D2P7-3GHJ", client: "Caingin Fiesta",
      contact: "0905 555 0404", startDate: dayFromNow(6),
      endDate: dayFromNow(7), place: "Caingin Plaza",
      kind: "Photo Booth", status: "Pending",
      gear: [{ id: "EQP-004", qty: 1 }, { id: "EQP-006", qty: 1 },
             { id: "EQP-008", qty: 2 }] },

    { id: "EVT-005", code: "E9R3-4KLM", client: "SRC Christmas Party",
      contact: "0933 555 0606", startDate: dayFromNow(20),
      endDate: dayFromNow(20), place: "San Rafael Coop Hall",
      kind: "Event Coverage", status: "Booked",
      gear: [{ id: "EQP-001", qty: 1 }, { id: "EQP-005", qty: 1 },
             { id: "EQP-006", qty: 2 }] }
  ]);

  /* ----- staff tasks (Module 8) ----- */
  save("tasks", [
    { id: "TSK-001", staffId: "USR-003", jobId: "ORD-002",
      what: "Design the ID template", priority: "High",
      due: dayFromNow(1), status: "Open" },
    { id: "TSK-002", staffId: "USR-003", jobId: "ORD-003",
      what: "Lay out invitation with gold foil", priority: "Medium",
      due: dayFromNow(4), status: "Open" },
    { id: "TSK-003", staffId: "USR-002", jobId: "ORD-005",
      what: "Cut and assemble 4 frames", priority: "Medium",
      due: dayFromNow(3), status: "Open" },
    { id: "TSK-004", staffId: "USR-002", jobId: "EVT-003",
      what: "Prepare and test lighting kit", priority: "High",
      due: dayFromNow(5), status: "Open" },
    { id: "TSK-005", staffId: "USR-004", jobId: "ORD-004",
      what: "Deliver signage to barangay hall", priority: "Urgent",
      due: dayFromNow(-1), status: "Open" },
    { id: "TSK-006", staffId: "USR-002", jobId: "ORD-001",
      what: "Roll and pack finished tarpaulins", priority: "Low",
      due: dayFromNow(-7), status: "Done" }
  ]);

  /* ----- expenses (Module 11) ----- */
  save("expenses", [
    { id: "EXP-001", kind: "Supplies", amount: 8400, date: dayFromNow(-18),
      note: "Bulk ink order" },
    { id: "EXP-002", kind: "Utilities", amount: 4250, date: dayFromNow(-14),
      note: "Electricity bill" },
    { id: "EXP-003", kind: "Labor", amount: 12000, date: dayFromNow(-13),
      note: "Staff wages" },
    { id: "EXP-004", kind: "Supplies", amount: 3600, date: dayFromNow(-7),
      note: "Photo paper and film" },
    { id: "EXP-005", kind: "Transport", amount: 1500, date: dayFromNow(-5),
      note: "Delivery fuel" },
    { id: "EXP-006", kind: "Maintenance", amount: 2800, date: dayFromNow(-3),
      note: "Printer cleaning" }
  ]);

  /* ----- stock movements (Module 6) ----- */
  save("stockmoves", [
    { id: "MOV-001", itemId: "ITM-001", kind: "OUT", qty: 32,
      why: "ORD-001", who: "Test_Staff", time: dayFromNow(-11) },
    { id: "MOV-002", itemId: "ITM-005", kind: "OUT", qty: 120,
      why: "ORD-002", who: "Test_Staff", time: dayFromNow(-3) },
    { id: "MOV-003", itemId: "ITM-003", kind: "IN", qty: 100,
      why: "Delivery", who: "Christopher", time: dayFromNow(-7) }
  ]);

    /* ----- workflows and permissions ----- */
  save("permissions", []);

  save("workflows", [
    makeSteps("ORD-001", "print", 4),            // finished
    makeSteps("ORD-002", "print", 1), // on Printing
    makeSteps("ORD-003", "print", 0),           // still Designing
    makeSteps("ORD-004", "print", 3),         // ready to collect
    makeSteps("ORD-005", "print", 1),
    makeSteps("ORD-006", "print", 4),              // finished
    makeSteps("EVT-001", "event", 6),        // finished
    makeSteps("EVT-002", "event", 6),        // finished
    makeSteps("EVT-003", "event", 0),
    makeSteps("EVT-004", "event", 0),
    makeSteps("EVT-005", "event", 0)
  ]);

  /* ----- sample activity log (Module 1) -----

     Oldest first, because Module 1 reads the list backwards to show the
     newest line at the top. The days run from three weeks ago up to today,
     and every action the app can write is represented at least once, so the
     date range, the person picker, and the action filters all have something
     to find. */
  logCount = 0;
  const owner = { id: "USR-001", name: "Christopher" };
  const loisa = { id: "USR-002", name: "Loisa" };
  const designer = { id: "USR-003", name: "Test_Designer" };
  const staff = { id: "USR-004", name: "Test_Staff" };

  save("logs", [
    /* three weeks back - the oldest order comes in */
    makeLog(-20, 8, 5, owner, "Signed in", "users", "USR-001",
            "Christopher signed in."),
    makeLog(-20, 8, 32, owner, "Added", "orders", "ORD-006",
            "Added a new order (ORD-006)."),
    makeLog(-20, 9, 10, owner, "Added", "tasks", "TSK-006",
            "Added a new task (TSK-006)."),

    /* two and a half weeks back - stock delivery and a price correction */
    makeLog(-18, 10, 45, loisa, "Added", "expenses", "EXP-001",
            "Added a new expense (EXP-001)."),
    makeLog(-18, 11, 2, loisa, "Updated", "items", "ITM-002",
            "Updated item (ITM-002); changed stock."),
    makeLog(-17, 14, 20, owner, "Updated", "services", "SVC-001",
            "Updated service (SVC-001); changed price."),

    /* the wedding booking and its coverage */
    makeLog(-15, 7, 40, staff, "Signed in", "users", "USR-004",
            "Test_Staff signed in."),
    makeLog(-15, 8, 15, staff, "Updated", "bookings", "EVT-001",
            "Updated booking (EVT-001); changed status."),
    makeLog(-14, 16, 30, loisa, "Added", "expenses", "EXP-002",
            "Added a new expense (EXP-002)."),

    /* a fortnight back - access housekeeping */
    makeLog(-13, 9, 25, owner, "Changed access", "permissions",
            "Designer / m6", "Designer can now open m6."),
    makeLog(-13, 9, 27, owner, "Changed access", "permissions",
            "Staff / m11", "Staff can no longer open m11."),
    makeLog(-13, 17, 5, loisa, "Added", "expenses", "EXP-003",
            "Added a new expense (EXP-003)."),

    /* the big tarpaulin job */
    makeLog(-12, 8, 50, designer, "Signed in", "users", "USR-003",
            "Test_Designer signed in."),
    makeLog(-12, 9, 12, designer, "Added", "orders", "ORD-001",
            "Added a new order (ORD-001)."),
    makeLog(-11, 13, 40, staff, "Updated", "items", "ITM-001",
            "Updated item (ITM-001); changed stock."),
    makeLog(-10, 15, 55, staff, "Updated", "orders", "ORD-006",
            "Updated order (ORD-006); changed status, paid."),

    /* the school ID batch */
    makeLog(-8, 9, 5, designer, "Added", "orders", "ORD-004",
            "Added a new order (ORD-004)."),
    makeLog(-7, 10, 18, owner, "Added", "stockmoves", "MOV-003",
            "Added a new stockmove (MOV-003)."),
    makeLog(-7, 10, 40, owner, "Deleted", "items", "ITM-025",
            "Permanently deleted item (ITM-025)."),
    makeLog(-6, 11, 30, staff, "Updated", "orders", "ORD-001",
            "Updated order (ORD-001); changed status."),

    /* last week - the client checks in on their own job */
    makeLog(-5, 8, 20, loisa, "Signed in", "users", "USR-002",
            "Loisa signed in."),
    makeLog(-5, 9, 0, loisa, "Added", "expenses", "EXP-005",
            "Added a new expense (EXP-005)."),
    makeLog(-4, 14, 12, designer, "Added", "orders", "ORD-002",
            "Added a new order (ORD-002)."),
    makeLog(-4, 19, 45, owner, "Client opened", "order", "ORD-002",
            "Client opened order ORD-002."),
    makeLog(-3, 9, 35, staff, "Added", "stockmoves", "MOV-002",
            "Added a new stockmove (MOV-002)."),
    makeLog(-3, 16, 8, loisa, "Added", "expenses", "EXP-006",
            "Added a new expense (EXP-006)."),

    /* this week */
    makeLog(-2, 8, 45, designer, "Added", "orders", "ORD-003",
            "Added a new order (ORD-003)."),
    makeLog(-2, 11, 20, designer, "Added", "tasks", "TSK-002",
            "Added a new task (TSK-002)."),
    makeLog(-2, 20, 10, owner, "Client opened", "event", "EVT-003",
            "Client opened event EVT-003."),
    makeLog(-1, 9, 15, staff, "Added", "orders", "ORD-005",
            "Added a new order (ORD-005)."),
    makeLog(-1, 13, 50, staff, "Updated", "tasks", "TSK-005",
            "Updated task (TSK-005); changed priority."),
    makeLog(-1, 15, 30, owner, "Reset access", "permissions", "all roles",
            "Put every role back to the default access."),

    /* today, so the "today" card is never zero */
    makeLog(0, 8, 10, owner, "Signed in", "users", "USR-001",
            "Christopher signed in."),
    makeLog(0, 8, 40, owner, "Updated", "orders", "ORD-003",
            "Updated order (ORD-003); changed paid."),
    makeLog(0, 9, 25, designer, "Updated", "bookings", "EVT-004",
            "Updated booking (EVT-004); changed status.")
  ]);

  /* ----- empty tables the modules fill in later ----- */
  save("proofs", []);
  save("releases", []);
  save("reviews", []);
  save("feedback", []);

  /* ----- ID counters so we never reuse a number ----- */
  save("counters", [
    { prefix: "USR", number: 4 },
      { prefix: "ITM", number: 24 },
      { prefix: "SVC", number: 14 },
    { prefix: "ETP", number: 6 },
    { prefix: "EQP", number: 8 },
    { prefix: "ORD", number: 6 },
    { prefix: "EVT", number: 5 },
    { prefix: "TSK", number: 6 },
    { prefix: "EXP", number: 6 },
    { prefix: "MOV", number: 3 }
  ]);

  localStorage.setItem("clpp_seeded", "yes");
}

// Wipes everything and puts the sample data back.
function resetEverything() {
  let keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.indexOf("clpp_") === 0) {
      keys = appendList(keys, key);
    }
  }
  for (let i = 0; i < keys.length; i++) {
    localStorage.removeItem(keys[i]);
  }
  seedData();
}

// Run it as soon as this file loads.
seedData();
