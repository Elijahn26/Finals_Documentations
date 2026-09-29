// Login page.

// If somebody is already signed in, go straight to the home page.
if (getUser() !== null) {
  window.location.href = "home.html";
}

// Pressing Enter in either box also signs in.
document.getElementById("username").onkeydown = enterKey;
document.getElementById("password").onkeydown = enterKey;

function enterKey(event) {
  if (event.key === "Enter") {
    trySignIn();
  }
}


function trySignIn() {
  const typedName = document.getElementById("username").value.trim();
  const typedPassword = document.getElementById("password").value;

  if (typedName === "" || typedPassword === "") {
    showError("Please fill in both boxes.");
    return;
  }

  const users = load("users");

  // LINEAR SEARCH: check each user until the name matches.
  for (let i = 0; i < users.length; i++) {
    if (users[i].username === typedName.toLowerCase()) {

      if (users[i].active === false) {
        showError("That account is turned off.");
        return;
      }

      // Compare the hashes, not the plain passwords.
      if (users[i].password === hashPassword(typedPassword)) {
        setUser({
          id: users[i].id,
          name: users[i].name,
          role: users[i].role
        });
         addLog("Signed in", "users", users[i].id,
           users[i].name + " signed in successfully.");
        window.location.href = "home.html";
        return;
      }

      showError("Wrong password.");
      return;
    }
  }

  showError("No account with that username.");
}


function showError(message) {
  const box = document.getElementById("errorBox");
  box.textContent = message;
  box.className = "msg bad";
}
