// Training Program Logic - Firebase Edition
import { db, auth } from './firebase-config.js';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { generateTrainingProgram, getRemainingRequests } from './ai-helper.js';

let currentUser = null;
let unsubscribePrograms = null;
let allProgramsCache = [];
let allExercisesCache = []; // For exercise selector
let selectedExercises = []; // Exercises to add to program

// -- Auth Check --
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        if (document.getElementById('program-grid')) {
            loadProgramsRealtime(user.uid);
            loadAvailableExercises(user.uid);
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
window.generateProgramAI = async function () {
    if (!currentUser) return;

    const remaining = getRemainingRequests();
    if (remaining <= 0) {
        alert("Du har brugt alle dine AI forespørgsler for i dag. Prøv igen i morgen!");
        return;
    }

    // Get User Input
    const level = prompt("Hvilket niveau skal programmet være til? (f.eks. Begynder, Øvet, Elite)");
    if (!level) return;

    const duration = prompt("Hvor lang tid skal træningen vare? (f.eks. 60 min, 90 min)");
    if (!duration) return;

    const focus = prompt("Hvad skal fokus være? (f.eks. Forhånd loop, Benarbejde, Serv/Retur)");
    if (!focus) return;

    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '✨ Genererer... (ca. 10 sek)';

    try {
        // Force load exercises first if not loaded
        if (allExercisesCache.length === 0) {
            await loadAvailableExercises(currentUser.uid);
        }

        const aiPlan = await generateTrainingProgram(level, duration, focus, allExercisesCache);

        // Create the program object
        const newProgram = {
            name: `AI: ${focus} (${level})`,
            totalDuration: duration,
            description: aiPlan, // The full AI text
            exercises: [], // We don't link specific objects automatically yet
            ownerId: currentUser.uid,
            createdAt: Date.now(),
            isAI: true
        };

        await saveProgramToFirestore(newProgram);
        alert("✅ Træningsprogram oprettet af AI!");

    } catch (error) {
        console.error("AI Error:", error);
        alert("Fejl: " + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// -- Program Management --
window.toggleProgramForm = function () {
    const content = document.getElementById('program-form-content');
    content.classList.toggle('collapsed');
}

// Load available exercises for selector
async function loadAvailableExercises(userId) {
    const q = query(collection(db, "exercises"), where("ownerId", "==", userId));
    const snapshot = await getDocs(q);

    allExercisesCache = [];
    snapshot.forEach((doc) => {
        allExercisesCache.push({ id: doc.id, ...doc.data() });
    });

    // Populate selector
    const selector = document.getElementById('exercise-selector');
    selector.innerHTML = '<option value="">Vælg en øvelse fra banken...</option>';
    allExercisesCache.forEach(ex => {
        const option = document.createElement('option');
        option.value = ex.id;
        option.textContent = `${ex.name} (${ex.duration || 'N/A'})`;
        selector.appendChild(option);
    });
}

// Add exercise to program (temporary list before saving)
window.addExerciseToProgram = function () {
    const selector = document.getElementById('exercise-selector');
    const exerciseId = selector.value;

    if (!exerciseId) return alert("Vælg en øvelse");

    const exercise = allExercisesCache.find(ex => ex.id === exerciseId);
    if (!exercise) return;

    // Check if already added
    if (selectedExercises.find(ex => ex.exerciseId === exerciseId)) {
        return alert("Denne øvelse er allerede tilføjet");
    }

    selectedExercises.push({
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        duration: exercise.duration || 'N/A',
        notes: ''
    });

    renderSelectedExercisesList();
    selector.value = '';
}

function renderSelectedExercisesList() {
    const list = document.getElementById('selected-exercises-list');
    const noMsg = document.getElementById('no-exercises-msg');

    if (selectedExercises.length === 0) {
        noMsg.style.display = 'block';
        return;
    }

    noMsg.style.display = 'none';
    list.innerHTML = '';

    selectedExercises.forEach((ex, index) => {
        const item = document.createElement('div');
        item.style.cssText = 'padding: 10px; margin-bottom: 8px; background: white; border-radius: 6px; border: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center;';

        item.innerHTML = `
      <div>
        <strong>${ex.exerciseName}</strong> <span style="color: #666;">(${ex.duration})</span>
      </div>
      <button onclick="removeExerciseFromProgram(${index})" style="background: #ff4444; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
        Fjern
      </button>
    `;

        list.appendChild(item);
    });
}

window.removeExerciseFromProgram = function (index) {
    selectedExercises.splice(index, 1);
    renderSelectedExercisesList();
}

// Save Program
window.saveProgram = function () {
    if (!currentUser) return;

    const name = document.getElementById('program-name').value.trim();
    const duration = document.getElementById('program-duration').value.trim();
    const description = document.getElementById('program-description').value.trim();

    if (!name) return alert("Indtast venligst et navn");
    if (selectedExercises.length === 0) return alert("Tilføj mindst én øvelse til programmet");

    const programData = {
        name,
        totalDuration: duration,
        description,
        exercises: selectedExercises,
        ownerId: currentUser.uid,
        createdAt: Date.now()
    };

    saveProgramToFirestore(programData);
}

async function saveProgramToFirestore(data) {
    try {
        await addDoc(collection(db, "training_programs"), data);
        selectedExercises = [];
        location.reload();
    } catch (e) {
        console.error("Error adding program: ", e);
        alert("Fejl: Kunne ikke gemme træningsprogrammet. " + e.message);
    }
}

// Real-time Listener for Programs
function loadProgramsRealtime(userId) {
    const q = query(collection(db, "training_programs"), where("ownerId", "==", userId));

    if (unsubscribePrograms) unsubscribePrograms();

    unsubscribePrograms = onSnapshot(q, (snapshot) => {
        allProgramsCache = [];
        snapshot.forEach((doc) => {
            allProgramsCache.push({ id: doc.id, ...doc.data() });
        });
        renderGrid(allProgramsCache);
    }, (error) => {
        console.error("Error getting programs:", error);
    });
}

// Delete Program
window.deleteProgram = async function (id) {
    if (!confirm('Er du sikker på, at du vil slette dette træningspas?')) return;

    try {
        await deleteDoc(doc(db, "training_programs", id));
    } catch (e) {
        console.error("Error deleting program: ", e);
        alert("Fejl: Kunne ikke slette træningspas.");
    }
}

// Filter Programs
window.filterPrograms = function () {
    const searchQuery = document.getElementById('program-search').value.toLowerCase();
    const filtered = allProgramsCache.filter(prog => {
        const text = (prog.name + " " + prog.description).toLowerCase();
        return text.includes(searchQuery);
    });
    renderGrid(filtered);
}

// Open Program Modal
window.openProgramModal = function (id) {
    const program = allProgramsCache.find(p => p.id === id);
    if (!program) return;

    const modal = document.getElementById('program-modal');
    const modalBody = document.getElementById('program-modal-body');

    const exercisesHtml = program.exercises && program.exercises.length > 0
        ? '<div class="stat-grid" style="grid-template-columns: 1fr;"><h3 style="grid-column: span 1; margin-bottom: 10px;">Øvelser i programmet:</h3>' +
        program.exercises.map((ex, i) => `
        <div style="padding: 10px; background: #f9f9f9; border-radius: 6px; margin-bottom: 8px;">
          <strong>${i + 1}. ${ex.exerciseName}</strong> <span style="color: #666;">(${ex.duration})</span>
          ${ex.notes ? `<div style="margin-top: 5px; font-size: 0.85rem; color: #777;">${ex.notes}</div>` : ''}
        </div>
      `).join('') + '</div>'
        : '<p>Ingen øvelser</p>';

    modalBody.innerHTML = `
    <h2>${program.name}</h2>
    <div class="player-meta" style="margin-bottom: 20px;">
      <span><strong>Total varighed:</strong> ${program.totalDuration || 'N/A'}</span>
      <span><strong>Antal øvelser:</strong> ${program.exercises ? program.exercises.length : 0}</span>
    </div>
    ${program.description ? `<div class="player-notes" style="margin-bottom: 20px;">${program.description}</div>` : ''}
    ${exercisesHtml}
    <button class="delete-btn" onclick="deleteProgram('${program.id}'); closeProgramModal();" style="margin-top: 20px;">Slet Træningspas</button>
  `;

    modal.style.display = 'flex';
}

window.closeProgramModal = function () {
    document.getElementById('program-modal').style.display = 'none';
}

// Render Grid
function renderGrid(programs) {
    const grid = document.getElementById('program-grid');
    if (!grid) return;

    grid.innerHTML = '';

    programs.forEach(program => {
        const card = document.createElement('div');
        card.className = 'player-card';
        card.style.cursor = 'pointer';
        card.onclick = () => openProgramModal(program.id);

        const exerciseCount = program.exercises ? program.exercises.length : 0;

        card.innerHTML = `
      <div class="card-header">
        <div class="card-image" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display:flex; align-items:center; justify-content: center;">
          <span style="color: white; font-weight:bold; font-size:2rem;">🏓</span>
        </div>
        <div class="level-badge" style="background-color: #667eea">${program.totalDuration || 'N/A'}</div>
      </div>
      
      <div class="card-content">
        <h3 class="player-name">${program.name}</h3>
        <div class="player-meta">
          <span>${exerciseCount} øvelser</span>
        </div>
        ${program.description ? `<div class="player-notes">"${program.description}"</div>` : ''}
        <button class="add-btn" style="margin-top: 15px; background: #667eea;" onclick="event.stopPropagation(); openProgramModal('${program.id}')">Se program</button>
      </div>
    `;

        grid.appendChild(card);
    });
}
