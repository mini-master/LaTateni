function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
}

function draw() {
  background(255);
}


function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const isExpanded = sidebar.classList.contains('expanded');

  if (isExpanded) {
    // Collapse: Set explicit width first to ensure transition works from current pixel value
    sidebar.style.width = sidebar.scrollWidth + 15 + 'px';

    // Force browser to register the explicit width (reflow)
    sidebar.offsetHeight;

    // Now set to collapsed width
    sidebar.classList.remove('expanded');
    sidebar.style.width = '60px';
  } else {
    // Expand: 
    // 1. Temporarily allow sidebar to take natural width to measure it
    sidebar.style.width = 'auto';
    sidebar.classList.add('expanded'); // Apply logic that shows text so we get full width

    // 2. Measure the width
    const targetWidth = sidebar.scrollWidth + 15 + 'px';

    // 3. Reset to starting point (collapsed) INSTANTLY
    sidebar.classList.remove('expanded');
    sidebar.style.width = '60px';

    // 4. Force reflow so browser knows we are starting from 60px
    sidebar.offsetHeight;

    // 5. Animate to target
    sidebar.classList.add('expanded');
    sidebar.style.width = targetWidth;
  }
}

/* =========================================
   Player Management Logic
   ========================================= */

// Run when page loads
document.addEventListener('DOMContentLoaded', () => {
  // Check if we are on the Spillere page
  if (document.getElementById('player-grid')) {
    renderPlayers();
  }
});

function toggleForm() {
  const content = document.getElementById('form-content');
  content.classList.toggle('collapsed');
}

function getPlayers() {
  const players = localStorage.getItem('latateni_players');
  return players ? JSON.parse(players) : [];
}

function addPlayer() {
  // Get all input elements
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

  // Handle Image
  if (imageInput.files && imageInput.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      savePlayerToStorage({
        name, age, height, level, rating, hand, grip, style, spin, motivation, notes, tags,
        image: e.target.result
      });
    };
    reader.readAsDataURL(imageInput.files[0]);
  } else {
    savePlayerToStorage({
      name, age, height, level, rating, hand, grip, style, spin, motivation, notes, tags,
      image: null
    });
  }
}

function savePlayerToStorage(playerData) {
  const players = getPlayers();
  playerData.id = Date.now();

  players.push(playerData);
  localStorage.setItem('latateni_players', JSON.stringify(players));

  // Reload Page to reset form and show new listing
  location.reload();
}

function deletePlayer(id) {
  if (!confirm('Er du sikker på, at du vil slette denne spiller?')) return;

  let players = getPlayers();
  players = players.filter(p => p.id !== id);
  localStorage.setItem('latateni_players', JSON.stringify(players));
  renderPlayers(); // Re-render without reload
}

function filterPlayers() {
  const query = document.getElementById('player-search').value.toLowerCase();
  const players = getPlayers();

  const filtered = players.filter(p => {
    const text = (p.name + " " + p.tags.join(" ") + " " + p.style + " " + p.level + " " + p.hand).toLowerCase();
    return text.includes(query);
  });

  renderGrid(filtered);
}

function renderPlayers() {
  renderGrid(getPlayers());
}

function renderGrid(players) {
  const grid = document.getElementById('player-grid');
  if (!grid) return;

  grid.innerHTML = '';

  players.forEach(player => {
    const card = document.createElement('div');
    card.className = 'player-card';

    // Generate Tags HTML
    const tagsHtml = player.tags.map(tag => `<span class="tag-badge">${tag}</span>`).join('');

    // Short Hand/Grip info
    const handInfo = `${player.hand} / ${player.grip}`;

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
                <button class="delete-btn" onclick="deletePlayer(${player.id})">Slet Spiller</button>
            </div>
        `;

    grid.appendChild(card);
  });
}

function getLevelColor(level) {
  if (level === 'Elite') return '#d4af37'; // Gold
  if (level === 'Øvet') return '#333';
  if (level === 'Letøvet') return '#666';
  return '#888'; // Begynder
}
