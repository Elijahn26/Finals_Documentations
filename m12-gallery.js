// Module 12: staff photo gallery and customer retrieval.

const m12user = startPage("m12");
let openAlbum = null;

if (m12user !== null) {
  showAlbums();
}


function showAlbums() {
  const rows = loadPhotoTable();
  const wantWords = document.getElementById("m12Search").value;
  let html = "";
  let photoCount = 0;

  // COUNTING LOOP over every album in the table.
  for (let i = 0; i < rows.length; i++) {
    const album = rows[i];
    photoCount = photoCount + album.files.length;

    /* NESTED SEARCH. Outer level: the album's own details. If those do
       not match, go one level down and search its list of file names. */
    let photoText = album.files.length;
    if (matchText(album.id + " " + album.label + " " + album.code,
                  wantWords) === false) {
      const hits = filesMatching(album.files, wantWords);
      if (hits === 0) {
        continue;
      }
      photoText = hits + " of " + album.files.length + " match";
    }

    html = html +
      "<tr><td>" + safe(album.id) + "</td>" +
      "<td>" + safe(album.label) + "</td>" +
      "<td class='right'>" + photoText + "</td>" +
      "<td><strong>" + safe(album.code) + "</strong></td>" +
      "<td><button class='small' onclick=\"openPhotos('" + album.id +
        "')\">Open</button> " +
      "<button class='small red' onclick=\"removeAlbum('" + album.id +
        "')\">Remove</button></td></tr>";
  }

  if (html === "") {
    let why = "No albums yet.";
    if (rows.length > 0) {
      why = "No albums or photos match the search.";
    }
    html = "<tr><td colspan='5' class='grey'>" + why + "</td></tr>";
  }

  document.getElementById("albumRows").innerHTML = html;
  document.getElementById("cardEvents").textContent = rows.length;
  document.getElementById("cardPhotos").textContent = photoCount;
}


function openPhotos(eventId) {
  openAlbum = eventId;
  const album = findById("photos", eventId);

  document.getElementById("albumTitle").textContent =
    album.label + "  (" + album.files.length + " photos)";

  // Only narrow the photos when the album itself did not match the words.
  let wantWords = document.getElementById("m12Search").value;
  if (matchText(album.id + " " + album.label + " " + album.code,
                wantWords) === true) {
    wantWords = "";
  }

  let html = "";

  // LOOP that builds the path for each photo file.
  for (let i = 0; i < album.files.length; i++) {
    if (matchText(album.files[i], wantWords) === false) {
      continue;
    }
    const path = "../photos/" + eventId + "/" + album.files[i];

    html = html +
      "<div>" +
      "<a href='" + path + "' target='_blank'>" +
      "<img src='" + path + "' alt='Photo'></a><br>" +
      safe(album.files[i]) +
      "</div>";
  }

  if (html === "" && album.files.length > 0) {
    html = "<p class='grey'>No photos in this album match the search.</p>";
  }
  document.getElementById("photoArea").innerHTML = html;
}


// Inner level of the nested search: how many file names contain the words.
function filesMatching(files, wantWords) {
  let hits = 0;
  for (let f = 0; f < files.length; f++) {
    if (matchText(files[f], wantWords) === true) {
      hits = hits + 1;
    }
  }
  return hits;
}


function clearM12Search() {
  document.getElementById("m12Search").value = "";
  showAlbums();
  if (openAlbum !== null) {
    openPhotos(openAlbum);
  }
}


// Add an album or replace its photo list.
function addAlbum() {
  const eventId = document.getElementById("aEvent").value.trim().toUpperCase();
  const label = document.getElementById("aLabel").value.trim();
  const typed = document.getElementById("aFiles").value;

  if (eventId === "") {
    return showAlbumError("Please type the event id.");
  }

  const booking = findById("bookings", eventId);
  if (booking === null) {
    return showAlbumError("There is no booking called " + eventId + ".");
  }

  // Split the typed text at the commas and tidy each name.
  let files = [];
  const parts = typed.split(",");
  for (let i = 0; i < parts.length; i++) {
    const name = parts[i].trim();
    if (name !== "") {
      files = appendList(files, name);
    }
  }

  if (files.length === 0) {
    return showAlbumError("Please type at least one file name.");
  }

  let name = label;
  if (name === "") {
    name = booking.client;
  }

  // Make sure the table exists before we change it.
  loadPhotoTable();

  if (findById("photos", eventId) !== null) {
    updateRow("photos", eventId, { label: name, files: files, code: booking.code });
  } else {
    addRow("photos", { id: eventId, code: booking.code, label: name, files: files });
  }

  document.getElementById("aEvent").value = "";
  document.getElementById("aLabel").value = "";
  document.getElementById("aFiles").value = "";
  document.getElementById("albumError").className = "msg bad hide";

  showAlbums();
  openPhotos(eventId);
}


function removeAlbum(eventId) {
  if (confirm("Remove the album for " + eventId + "? " +
              "The photo files themselves are not deleted.") === false) {
    return;
  }

  deleteRow("photos", eventId);

  if (openAlbum === eventId) {
    openAlbum = null;
    document.getElementById("albumTitle").textContent = "Pick an event above";
    document.getElementById("photoArea").innerHTML = "";
  }
  showAlbums();
}


function showAlbumError(message) {
  const box = document.getElementById("albumError");
  box.textContent = message;
  box.className = "msg bad";
}
