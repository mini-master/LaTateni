// LaTateni Logic - Firebase Edition
import { db, auth, ADMIN_EMAILS } from './firebase-config.js';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser = null;
let unsubscribePlayers = null; // To stop listener on logout

// -- Auth Check --
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;

    // Show Admin Link if allowed
    if (ADMIN_EMAILS.includes(user.email)) {
      const adminLink = document.getElementById('admin-link');
      if (adminLink) adminLink.style.display = 'block';
    }

    if (document.getElementById('player-grid')) {
      loadPlayersRealtime(user.uid);
    }
  } else {
    // If not logged in, go to login page
    window.location.href = 'index.html';
  }
});

// -- Global Setup for p5.js --
window.setup = function () {
  let canvas = createCanvas(windowWidth, windowHeight);
}

window.draw = function () {
  background(255);
}

window.windowResized = function () {
  resizeCanvas(windowWidth, windowHeight);
}

// -- Sidebar Logic & Logout --
window.toggleSidebar = function () {
  const sidebar = document.getElementById('sidebar');
  const isExpanded = sidebar.classList.contains('expanded');

  if (isExpanded) {
    sidebar.style.width = sidebar.scrollWidth + 15 + 'px';
    sidebar.offsetHeight; // Force reflow
    sidebar.classList.remove('expanded');
    sidebar.style.width = '60px';
  } else {
    sidebar.style.width = 'auto';
    sidebar.classList.add('expanded');
    const targetWidth = sidebar.scrollWidth + 15 + 'px';
    sidebar.classList.remove('expanded');
    sidebar.style.width = '60px';
    sidebar.offsetHeight; // Force reflow
    sidebar.classList.add('expanded');
    sidebar.style.width = targetWidth;
  }
}

window.logout = async function () {
  try {
    await signOut(auth);
    // onAuthStateChanged will handle redirect
  } catch (error) {
    console.error("Logout failed", error);
  }
}

/* =========================================
   Player Management Logic (Firebase)
   ========================================= */

let allPlayersCache = []; // Store real-time list

window.toggleForm = function () {
  const content = document.getElementById('form-content');
  content.classList.toggle('collapsed');
}

// -- Real-time Listener (User Isolated) --
function loadPlayersRealtime(userId) {
  // Query only players owned by THIS user
  const q = query(collection(db, "players"), where("ownerId", "==", userId));

  if (unsubscribePlayers) unsubscribePlayers(); // Clear old listener if any

  unsubscribePlayers = onSnapshot(q, (snapshot) => {
    allPlayersCache = [];
    snapshot.forEach((doc) => {
      // Use Firestore ID as the player ID
      allPlayersCache.push({ id: doc.id, ...doc.data() });
    });
    renderGrid(allPlayersCache);
  }, (error) => {
    console.error("Error getting players:", error);
  });
}

// -- Add Player --
window.addPlayer = function () {
  if (!currentUser) return;

  const name = document.getElementById('player-name').value.trim();
  const age = document.getElementById('player-age').value;
  const height = document.getElementById('player-height').value;
  const level = document.getElementById('player-level').value;
  const rating = document.getElementById('player-rating').value;
  const hand = document.getElementById('player-hand').value;
  const grip = document.getElementById('player-grip').value;
  const style = document.getElementById('player-style').value;
  const spin = document.getElementById('player-spin').value;
  const motivation = document.getElementById('player-motivation').value;
  const notes = document.getElementById('player-notes').value;
  const tagsInput = document.getElementById('player-tags').value;
  const imageInput = document.getElementById('player-image');

  if (!name) return alert("Indtast venligst et navn");

  const tags = tagsInput.split(',').map(t => t.trim()).filter(t => t);

  const playerData = {
    name, age, height, level, rating, hand, grip, style, spin, motivation, notes, tags,
    ownerId: currentUser.uid, // <--- CRITICAL: ASSIGN OWNER
    createdAt: Date.now() // Timestamps are good
  };

  // Handle Image (Base64)
  if (imageInput.files && imageInput.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      playerData.image = e.target.result;
      savePlayerToFirestore(playerData);
    };
    reader.readAsDataURL(imageInput.files[0]);
  } else {
    playerData.image = null;
    savePlayerToFirestore(playerData);
  }
}

async function savePlayerToFirestore(data) {
  try {
    await addDoc(collection(db, "players"), data);
    // Clear form or reload? Reload is simplest to reset everything visually
    // accessible UX: better to just clear form, but for now reload mimics old behavior
    location.reload();
  } catch (e) {
    console.error("Error adding player: ", e);
    alert("Fejl: Kunne ikke gemme spilleren. " + e.message);
  }
}

// -- Delete Player --
window.deletePlayer = async function (id) {
  if (!confirm('Er du sikker på, at du vil slette denne spiller permanent?')) return;

  try {
    await deleteDoc(doc(db, "players", id));
    // No need to reload, onSnapshot will update the grid automatically!
  } catch (e) {
    console.error("Error deleting player: ", e);
    alert("Fejl: Kunne ikke slette spilleren.");
  }
}

// -- Helpers --
window.filterPlayers = function () {
  const query = document.getElementById('player-search').value.toLowerCase();
  const filtered = allPlayersCache.filter(p => {
    const text = (p.name + " " + (p.tags ? p.tags.join(" ") : "") + " " + p.style + " " + p.level + " " + p.hand).toLowerCase();
    return text.includes(query);
  });
  renderGrid(filtered);
}

window.exportPlayersJson = function () {
  const jsonStr = JSON.stringify(allPlayersCache, null, 2);
  navigator.clipboard.writeText(jsonStr).then(() => {
    alert("Data kopieret til udklipsholder! (Backup)");
  }).catch(err => {
    console.error('Kunne ikke kopiere: ', err);
    alert("Kunne ikke kopiere.");
  });
}

function renderGrid(players) {
  const grid = document.getElementById('player-grid');
  if (!grid) return;

  grid.innerHTML = '';

  players.forEach(player => {
    const card = document.createElement('div');
    card.className = 'player-card';

    const tagsHtml = player.tags ? player.tags.map(tag => `<span class="tag-badge">${tag}</span>`).join('') : '';
    const handInfo = `${player.hand} / ${player.grip}`;

    // Note: onclick uses quotes for string ID
    card.innerHTML = `
            <div class="card-header">
                <div class="card-image" ${player.image ? 'style="background-image: url(' + player.image + '); background-size: cover; background-position: center;"' : 'style="background:#eee; display:flex; align-items:center; justify-content: center;"'}>
                    ${player.image ? '' : '<span style="color:#999; font-weight:bold; font-size:2rem;">' + player.name.charAt(0) + '</span>'}
                </div>
                <div class="level-badge" style="background-color: ${getLevelColor(player.level)}">${player.level}</div>
            </div>
            
            <div class="card-content">
                <h3 class="player-name">${player.name}</h3>
                <div class="player-meta">
                    <span>${player.age ? player.age + ' år' : ''}</span>
                    <span>${player.rating ? 'Rating: ' + player.rating : ''}</span>
                </div>

                <div class="stat-grid">
                    <div class="stat-item"><strong>Hånd:</strong> ${handInfo}</div>
                    <div class="stat-item"><strong>Stil:</strong> ${player.style}</div>
                    <div class="stat-item"><strong>Skru:</strong> ${player.spin}</div>
                    <div class="stat-item"><strong>Højde:</strong> ${player.height ? player.height + ' cm' : '-'}</div>
                </div>

                ${player.notes ? `<div class="player-notes">"${player.notes}"</div>` : ''}

                <div class="tags-container">${tagsHtml}</div>
                <button class="delete-btn" onclick="deletePlayer('${player.id}')">Slet Spiller</button>
            </div>
        `;
    grid.appendChild(card);
  });
}

function getLevelColor(level) {
  if (level === 'Elite') return '#d4af37';
  if (level === 'Øvet') return '#333';
  if (level === 'Letøvet') return '#666';
  return '#888';
}
