// Theory Management Logic - Firebase Edition
import { db, auth } from './firebase-config.js';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { generateTheoryArticle, getRemainingRequests } from './ai-helper.js';

let currentUser = null;
let unsubscribeTheory = null;
let allTheoryCache = [];
let allTags = new Set();

// -- Auth Check --
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        if (document.getElementById('theory-grid')) {
            loadTheoryRealtime(user.uid);
        }
    } else {
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
        sidebar.offsetHeight;
        sidebar.classList.remove('expanded');
        sidebar.style.width = '60px';
    } else {
        sidebar.style.width = 'auto';
        sidebar.classList.add('expanded');
        const targetWidth = sidebar.scrollWidth + 15 + 'px';
        sidebar.classList.remove('expanded');
        sidebar.style.width = '60px';
        sidebar.offsetHeight;
        sidebar.classList.add('expanded');
        sidebar.style.width = targetWidth;
    }
}

window.logout = async function () {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Logout failed", error);
    }
}

// -- AI Generation --
window.generateTheoryAI = async function () {
    if (!currentUser) return;

    const remaining = getRemainingRequests();
    if (remaining <= 0) {
        alert("Du har brugt alle dine AI forespørgsler for i dag. Prøv igen i morgen!");
        return;
    }

    // Get User Input
    const topic = prompt("Hvad skal artiklen handle om? (f.eks. Topspin mod underskru)");
    if (!topic) return;

    const tagsStr = prompt("Tags (komma-separeret)? (f.eks. Teknik, Angreb, Øvet)");
    const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()) : [];

    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '✨ Skriver... (ca. 10 sek)';

    try {
        const aiArticle = await generateTheoryArticle(topic, tags);

        // Fill the form
        document.getElementById('theory-title').value = topic;
        document.getElementById('theory-body').value = aiArticle;
        document.getElementById('theory-tags').value = tagsStr || '';

        // Open the form
        const content = document.getElementById('theory-form-content');
        content.classList.remove('collapsed');

        alert("✅ AI har skrevet et udkast! Tjek formularen nedenfor.");

    } catch (error) {
        console.error("AI Error:", error);
        alert("Fejl: " + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// -- Theory Management --
window.toggleTheoryForm = function () {
    const content = document.getElementById('theory-form-content');
    content.classList.toggle('collapsed');
}

// Real-time Listener
function loadTheoryRealtime(userId) {
    const q = query(collection(db, "theory"), where("ownerId", "==", userId));

    if (unsubscribeTheory) unsubscribeTheory();

    unsubscribeTheory = onSnapshot(q, (snapshot) => {
        allTheoryCache = [];
        allTags.clear();
        snapshot.forEach((doc) => {
            const data = { id: doc.id, ...doc.data() };
            allTheoryCache.push(data);
            if (data.tags) {
                data.tags.forEach(tag => allTags.add(tag));
            }
        });
        updateTagFilter();
        renderGrid(allTheoryCache);
    }, (error) => {
        console.error("Error getting theory:", error);
    });
}

function updateTagFilter() {
    const select = document.getElementById('tag-filter');
    const currentValue = select.value;
    select.innerHTML = '<option value="">Alle tags</option>';
    allTags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = tag;
        select.appendChild(option);
    });
    select.value = currentValue;
}

// Add Theory
window.addTheory = function () {
    if (!currentUser) return;

    const title = document.getElementById('theory-title').value.trim();
    const body = document.getElementById('theory-body').value.trim();
    const linksInput = document.getElementById('theory-links').value.trim();
    const tagsInput = document.getElementById('theory-tags').value.trim();
    const imagesInput = document.getElementById('theory-images');

    if (!title) return alert("Indtast venligst en titel");

    const links = linksInput ? linksInput.split(',').map(l => l.trim()).filter(l => l) : [];
    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];

    const theoryData = {
        title,
        body,
        links,
        tags,
        ownerId: currentUser.uid,
        createdAt: Date.now(),
        images: []
    };

    // Handle Multiple Images
    if (imagesInput.files && imagesInput.files.length > 0) {
        let processedCount = 0;
        const totalFiles = imagesInput.files.length;

        Array.from(imagesInput.files).forEach(file => {
            const reader = new FileReader();
            reader.onload = function (e) {
                theoryData.images.push(e.target.result);
                processedCount++;
                if (processedCount === totalFiles) {
                    saveTheoryToFirestore(theoryData);
                }
            };
            reader.readAsDataURL(file);
        });
    } else {
        saveTheoryToFirestore(theoryData);
    }
}

async function saveTheoryToFirestore(data) {
    try {
        await addDoc(collection(db, "theory"), data);
        location.reload();
    } catch (e) {
        console.error("Error adding theory: ", e);
        alert("Fejl: Kunne ikke gemme teori emnet. " + e.message);
    }
}

// Delete Theory
window.deleteTheory = async function (id) {
    if (!confirm('Er du sikker på, at du vil slette dette teori emne?')) return;

    try {
        await deleteDoc(doc(db, "theory", id));
    } catch (e) {
        console.error("Error deleting theory: ", e);
        alert("Fejl: Kunne ikke slette teori emnet.");
    }
}

// Filter Theory
window.filterTheory = function () {
    const searchQuery = document.getElementById('theory-search').value.toLowerCase();
    const tagFilter = document.getElementById('tag-filter').value;

    const filtered = allTheoryCache.filter(th => {
        const matchesSearch = (th.title + " " + th.body).toLowerCase().includes(searchQuery);
        const matchesTag = !tagFilter || (th.tags && th.tags.includes(tagFilter));
        return matchesSearch && matchesTag;
    });

    renderGrid(filtered);
}

// Open Modal
window.openTheoryModal = function (id) {
    const theory = allTheoryCache.find(t => t.id === id);
    if (!theory) return;

    const modal = document.getElementById('theory-modal');
    const modalBody = document.getElementById('modal-body');

    const tagsHtml = theory.tags ? theory.tags.map(tag => `<span class="tag-badge">${tag}</span>`).join('') : '';
    const linksHtml = theory.links && theory.links.length > 0
        ? '<div class="theory-links"><strong>Links:</strong><ul>' + theory.links.map(link => `<li><a href="${link}" target="_blank">${link}</a></li>`).join('') + '</ul></div>'
        : '';
    const imagesHtml = theory.images && theory.images.length > 0
        ? '<div class="theory-images">' + theory.images.map(img => `<img src="${img}" style="max-width: 100%; margin: 10px 0; border-radius: 8px;">`).join('') + '</div>'
        : '';

    modalBody.innerHTML = `
    <h2>${theory.title}</h2>
    <div class="tags-container" style="margin-bottom: 20px;">${tagsHtml}</div>
    <div class="theory-body" style="white-space: pre-wrap; line-height: 1.6;">${theory.body}</div>
    ${imagesHtml}
    ${linksHtml}
    <button class="delete-btn" onclick="deleteTheory('${theory.id}'); closeModal();" style="margin-top: 20px;">Slet Teori Emne</button>
  `;

    modal.style.display = 'flex';
}

window.closeModal = function () {
    document.getElementById('theory-modal').style.display = 'none';
}

// Render Grid
function renderGrid(theoryList) {
    const grid = document.getElementById('theory-grid');
    if (!grid) return;

    grid.innerHTML = '';

    theoryList.forEach(theory => {
        const card = document.createElement('div');
        card.className = 'player-card';
        card.style.cursor = 'pointer';
        card.onclick = () => openTheoryModal(theory.id);

        const tagsHtml = theory.tags ? theory.tags.map(tag => `<span class="tag-badge">${tag}</span>`).join('') : '';
        const excerpt = theory.body.length > 150 ? theory.body.substring(0, 150) + '...' : theory.body;

        card.innerHTML = `
      <div class="card-header">
        <div class="card-image" style="background:#f0f0f0; display:flex; align-items:center; justify-content: center;">
          <span style="color:#666; font-weight:bold; font-size:2rem;">📚</span>
        </div>
      </div>
      
      <div class="card-content">
        <h3 class="player-name">${theory.title}</h3>
        <div class="tags-container" style="margin-bottom: 15px;">${tagsHtml}</div>
        <div class="player-notes">${excerpt}</div>
        <button class="add-btn" style="margin-top: 15px; background: #2196F3;" onclick="event.stopPropagation(); openTheoryModal('${theory.id}')">Læs mere</button>
      </div>
    `;

        grid.appendChild(card);
    });
}
