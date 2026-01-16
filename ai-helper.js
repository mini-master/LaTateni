// AI Helper - Gemini API Integration
// NOTE: You need to add GEMINI_API_KEY to firebase-config.js first!

import { GEMINI_API_KEY } from './firebase-config.js';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

// Rate limiting
const AI_REQUEST_LIMIT = 20; // Max requests per day
const AI_STORAGE_KEY = 'ai_request_count';
const AI_TIMESTAMP_KEY = 'ai_last_reset';

function checkRateLimit() {
    const now = Date.now();
    const lastReset = parseInt(localStorage.getItem(AI_TIMESTAMP_KEY) || '0');
    const dayInMs = 24 * 60 * 60 * 1000;

    // Reset counter if 24 hours have passed
    if (now - lastReset > dayInMs) {
        localStorage.setItem(AI_REQUEST_LIMIT, '0');
        localStorage.setItem(AI_TIMESTAMP_KEY, now.toString());
        return true;
    }

    const count = parseInt(localStorage.getItem(AI_STORAGE_KEY) || '0');
    return count < AI_REQUEST_LIMIT;
}

function incrementRequestCount() {
    const count = parseInt(localStorage.getItem(AI_STORAGE_KEY) || '0');
    localStorage.setItem(AI_STORAGE_KEY, (count + 1).toString());
}

// Core API call function
async function callGeminiAPI(prompt) {
    if (!GEMINI_API_KEY) {
        throw new Error('Gemini API nøgle mangler! Tilføj den til firebase-config.js');
    }

    if (!checkRateLimit()) {
        throw new Error('Du har nået dagens grænse for AI forespørgsler. Prøv igen i morgen!');
    }

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 2048,
                }
            })
        });

        if (!response.ok) {
            throw new Error(`API fejl: ${response.status}`);
        }

        const data = await response.json();
        incrementRequestCount();

        // Extract text from response
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error('Gemini API fejl:', error);
        throw error;
    }
}

// 1. Suggest Exercises for Player
export async function suggestExercisesForPlayer(player, allExercises) {
    const exercisesList = allExercises.map(ex =>
        `- ${ex.name} (${ex.duration || 'N/A'}): ${ex.description || 'Ingen beskrivelse'}`
    ).join('\n');

    const prompt = `Du er en erfaren bordtennis træner. Analyser denne spiller og foreslå de 3-5 mest relevante øvelser.

SPILLERDATA:
- Navn: ${player.name}
- Niveau: ${player.level || 'Ukendt'}
- Spillestil: ${player.style || 'Ukendt'}
- Hånd: ${player.hand || 'Ukendt'}
- Motivation: ${player.motivation || 'Ikke angivet'}
- Notes: ${player.notes || 'Ingen notes'}
- Rating: ${player.rating || 'Ingen rating'}

TILGÆNGELIGE ØVELSER:
${exercisesList}

OPGAVE:
Vælg 3-5 øvelser der passer bedst til denne spillers niveau og behov.
For hver øvelse, forklar kort (1-2 linjer) hvorfor den er relevant.

Format dit svar som:
1. [Øvelsesnavn]: [Hvorfor den er relevant]
2. [Øvelsesnavn]: [Hvorfor den er relevant]
...`;

    return await callGeminiAPI(prompt);
}

// 2. Generate Training Program
export async function generateTrainingProgram(level, duration, focus, allExercises) {
    const exercisesList = allExercises.map(ex =>
        `- ${ex.name} (${ex.duration || 'N/A'}): ${ex.description || 'Ingen beskrivelse'}`
    ).join('\n');

    const prompt = `Du er en bordtennis træner. Lav et komplet træningsprogram.

KRAV:
- Spillerniveau: ${level}
- Total varighed: ${duration}
- Fokusområde: ${focus}

TILGÆNGELIGE ØVELSER:
${exercisesList}

OPGAVE:
Vælg relevante øvelser og organiser dem i et træningsprogram.
Inkluder:
1. Opvarmning
2. Hovedøvelser (fokuseret på ${focus})
3. Nedkøling

For hver øvelse, angiv:
- Navnet på øvelsen
- Varighed (tilpas så det samlet passer med ${duration})
- Kort note om hvad spilleren skal fokusere på

Format dit svar som en struktureret liste.`;

    return await callGeminiAPI(prompt);
}

// 3. Analyze Player
export async function analyzePlayer(player) {
    const prompt = `Du er en erfaren bordtennis træner. Analyser denne spiller og giv konstruktiv feedback.

SPILLERDATA:
- Navn: ${player.name}
- Niveau: ${player.level || 'Ukendt'}
- Alder: ${player.age || 'Ukendt'} år
- Rating: ${player.rating || 'Ingen rating'}
- Spillestil: ${player.style || 'Ukendt'}
- Hånd: ${player.hand || 'Ukendt'}
- Greb: ${player.grip || 'Ukendt'}
- Spin niveau: ${player.spin || 'Ukendt'}
- Motivation: ${player.motivation || 'Ikke angivet'}
- Notes: ${player.notes || 'Ingen notes'}

OPGAVE:
Giv en detaljeret analyse med:

1. **Styrker**: Hvad gør spilleren godt?
2. **Forbedringsområder**: Hvor kan spilleren blive bedre?
3. **Træningsanbefalinger**: Konkrete forslag til næste skridt
4. **Motiverende feedback**: Positiv opfordring

Vær konstruktiv, specifik og motiverende!`;

    return await callGeminiAPI(prompt);
}

// 4. Generate Theory Article
export async function generateTheoryArticle(topic, tags) {
    const tagsStr = tags && tags.length > 0 ? tags.join(', ') : 'Generel bordtennis';

    const prompt = `Du er en erfaren bordtennis træner og instruktør. Skriv en grundig og informativ artikel om bordtennis.

EMNE: ${topic}
TAGS: ${tagsStr}

OPGAVE:
Skriv en komplet artikel der inkluderer:

1. **Introduktion**: Præsenter emnet og dets betydning
2. **Teknik/Teori**: Forklar teknikken eller teorien grundigt
3. **Almindelige Fejl**: Hvad gør spillere ofte forkert?
4. **Træningstips**: Praktiske råd til at forbedre sig
5. **Konklusion**: Opsummering og opfordring

Artiklen skal være:
- Let at forstå for alle niveauer
- Praktisk anvendelig
- Motiverende
- Struktureret med overskrifter

Brug ikke markdown formatering (###), men brug linjeskift og tydeligt afsnit.`;

    return await callGeminiAPI(prompt);
}

// 5. Get remaining AI requests
export function getRemainingRequests() {
    const count = parseInt(localStorage.getItem(AI_STORAGE_KEY) || '0');
    return Math.max(0, AI_REQUEST_LIMIT - count);
}
