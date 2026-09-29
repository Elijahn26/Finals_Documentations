// Hand-written photo list for local files.

const PHOTO_INDEX = {

  "EVT-001": {
    code: "A7K2",
    label: "Reyes-Santos Wedding",
    files: ["01.jpg", "02.jpg", "03.jpg", "04.jpg", "05.jpg", "06.jpg"]
  },

  "EVT-002": {
    code: "B4M8",
    label: "BSU Foundation Day",
    files: ["01.jpg", "02.jpg", "03.jpg", "04.jpg"]
  }

};


/* Load the photo table and seed it once from PHOTO_INDEX. */
function loadPhotoTable() {
  if (localStorage.getItem(PREFIX + "photos") !== null) {
    return load("photos");
  }

  const rows = [];
  for (const eventId in PHOTO_INDEX) {
    const album = PHOTO_INDEX[eventId];

    let code = album.code;
    const booking = findById("bookings", eventId);
    if (booking !== null) {
      code = booking.code;
    }

    rows[rows.length] = {
      id: eventId,
      code: code,
      label: album.label,
      files: album.files.slice()
    };
  }

  save("photos", rows);
  return rows;
}
