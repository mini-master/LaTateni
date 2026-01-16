// Training Exercise Logic - Firebase Edition
import { db, auth } from './firebase-config.js';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser = null;
let unsubscribeExercises = null;
let allExercisesCache = [];

// -- Auth Check --
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        if (document.getElementById('exercise-grid')) {
            loadExercisesRealtime(user.uid);
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

// -- Exercise Management --
window.toggleExerciseForm = function () {
    const content = document.getElementById('exercise-form-content');
    content.classList.toggle('collapsed');
}

// Real-time Listener
function loadExercisesRealtime(userId) {
    const q = query(collection(db, "exercises"), where("ownerId", "==", userId));

    if (unsubscribeExercises) unsubscribeExercises();

    unsubscribeExercises = onSnapshot(q, (snapshot) => {
        allExercisesCache = [];
        snapshot.forEach((doc) => {
            allExercisesCache.push({ id: doc.id, ...doc.data() });
        });
        renderGrid(allExercisesCache);
    }, (error) => {
        console.error("Error getting exercises:", error);
    });
}

// Add Exercise
window.addExercise = function () {
    if (!currentUser) return;

    const name = document.getElementById('exercise-name').value.trim();
    const duration = document.getElementById('exercise-duration').value.trim();
    const description = document.getElementById('exercise-description').value.trim();
    const benefits = document.getElementById('exercise-benefits').value.trim();
    const imageInput = document.getElementById('exercise-image');

    if (!name) return alert("Indtast venligst et navn");

    const exerciseData = {
        name,
        duration,
        description,
        benefits,
        ownerId: currentUser.uid,
        createdAt: Date.now()
    };

    // Handle Image
    if (imageInput.files && imageInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            exerciseData.image = e.target.result;
            saveExerciseToFirestore(exerciseData);
        };
        reader.readAsDataURL(imageInput.files[0]);
    } else {
        exerciseData.image = null;
        saveExerciseToFirestore(exerciseData);
    }
}

async function saveExerciseToFirestore(data) {
    try {
        await addDoc(collection(db, "exercises"), data);
        location.reload();
    } catch (e) {
        console.error("Error adding exercise: ", e);
        alert("Fejl: Kunne ikke gemme øvelsen. " + e.message);
    }
}

// Delete Exercise
window.deleteExercise = async function (id) {
    if (!confirm('Er du sikker på, at du vil slette denne øvelse?')) return;

    try {
        await deleteDoc(doc(db, "exercises", id));
    } catch (e) {
        console.error("Error deleting exercise: ", e);
        alert("Fejl: Kunne ikke slette øvelsen.");
    }
}

// Filter Exercises
window.filterExercises = function () {
    const query = document.getElementById('exercise-search').value.toLowerCase();
    const filtered = allExercisesCache.filter(ex => {
        const text = (ex.name + " " + ex.description + " " + ex.duration).toLowerCase();
        return text.includes(query);
    });
    renderGrid(filtered);
}

// Render Grid
function renderGrid(exercises) {
    const grid = document.getElementById('exercise-grid');
    if (!grid) return;

    grid.innerHTML = '';

    exercises.forEach(exercise => {
        const card = document.createElement('div');
        card.className = 'player-card';

        card.innerHTML = `
      <div class="card-header">
        <div class="card-image" ${exercise.image ? 'style="background-image: url(' + exercise.image + '); background-size: cover; background-position: center;"' : 'style="background:#eee; display:flex; align-items:center; justify-content: center;"'}>
          ${exercise.image ? '' : '<span style="color:#999; font-weight:bold; font-size:2rem;">⚡</span>'}
        </div>
        <div class="level-badge" style="background-color: #2196F3">${exercise.duration || 'N/A'}</div>
      </div>
      
      <div class="card-content">
        <h3 class="player-name">${exercise.name}</h3>
        
        ${exercise.description ? `<div class="player-notes">"${exercise.description}"</div>` : ''}
        
        ${exercise.benefits ? `<div class="stat-grid"><div class="stat-item" style="grid-column: span 2;"><strong>Fordele:</strong> ${exercise.benefits}</div></div>` : ''}
        
        <button class="delete-btn" onclick="deleteExercise('${exercise.id}')">Slet Øvelse</button>
      </div>
    `;

        grid.appendChild(card);
    });
}
