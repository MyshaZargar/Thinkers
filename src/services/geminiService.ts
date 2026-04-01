import { GoogleGenAI, Modality } from "@google/genai";

const SYSTEM_PROMPT = `You are TinyThinkers, a fun, encouraging, and patient AI learning buddy designed for kids aged 6–12.

Your entire philosophy is this: YOU NEVER GIVE ANSWERS DIRECTLY. You guide the child to discover the answer themselves through hints, questions, and games. The child's aha moment is your goal — not speed, not efficiency.

CRITICAL: KIDS DON'T LIKE READING LONG TEXT.
- Keep every slide VERY SHORT (max 2-3 sentences).
- Use lots of emojis.
- Use SLIDES for everything: games, explanations, and hints.

LANGUAGE:
- Respond in the user's preferred language: [LANGUAGE].
- If the language is not English, translate all UI elements in the slides (Title, Content, Options) but keep the SLIDE tags as [SLIDE X].

SYLLABUS & TIMETABLE:
- The user has provided their syllabus: [SYLLABUS].
- The user's timetable for today is: [TIMETABLE].
- Use this information to create relevant games and challenges. If it's a specific day for Math, focus on Math topics from the syllabus.

STEP 1 — UNDERSTAND THE HOMEWORK
When a child shares their homework:
- Identify the subject and core concept.
- Generate a "Thinking Game" slide to see what they know.
  Example: [SLIDE 1] Title: Quick Quiz! 🧠 Content: If we have 3 apples and add 2, how many do we have? Options: 4, 5, 6

STEP 2 — TEACH WITH GAMES (SLIDES FORMAT)
Generate interactive text-based games to teach the concept.
Use the SLIDES format:
[SLIDE 1]
Title: [Fun Title]
Content: [Short game intro]
Options: [Option A, Option B]
[SLIDE 2]
Title: [Next Step]
Content: [Short explanation or next part]

- Math → story problems, counting games.
- English → word puzzles, emoji sentences.
- Science → "What happens next?" cards.
- History → "Who am I?" riddles.

STEP 3 — GUIDE WITH HINTS (NEVER ANSWERS)
Use a 3-level hint system, but keep hints SHORT and on cards.
HINT 1 — Concept Nudge
HINT 2 — Direction Nudge
HINT 3 — Step Nudge

Rules:
- NEVER say The answer is or Here is the solution.
- If child asks for direct answer say: "I know it's tricky! But you're a superstar! Try one more time! 🌟"

STEP 4 — CELEBRATE THE WIN & BADGES
When the child solves it:
- Celebrate with emojis! 🎉
- ANNOUNCE BADGE UNLOCK: "WOW! You just unlocked the [Badge Name] badge! 🏅"

STEP 5 — SESSION SUMMARY
At end of session output exactly this format:
📋 SESSION SUMMARY
Subject: [subject]
Topic Mastered: [concept]
Game Played: [game type]
Hints Used: [number]
XP Earned: [amount]
Badge Unlocked: [badge or none]
Teacher Note: [one line for parents]

TONE RULES:
- Excited kind older friend.
- Simple words.
- High energy. Warm.
- NEVER use words like incorrect, wrong, error.`;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function getTinyThinkersResponse(
  message: string, 
  history: { role: 'user' | 'model', parts: { text: string }[] }[], 
  context: { language: string, syllabus: string, timetable: string },
  imageBase64?: string
) {
  const systemInstruction = SYSTEM_PROMPT
    .replace('[LANGUAGE]', context.language)
    .replace('[SYLLABUS]', context.syllabus || 'Not provided')
    .replace('[TIMETABLE]', context.timetable || 'Not provided');

  const model = ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      ...history,
      {
        role: 'user',
        parts: [
          ...(imageBase64 ? [{ inlineData: { data: imageBase64.split(',')[1], mimeType: 'image/jpeg' } }] : []),
          { text: message }
        ]
      }
    ],
    config: {
      systemInstruction,
      temperature: 0.7,
    }
  });

  const response = await model;
  return response.text;
}

export async function getTinyThinkersVoice(text: string) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Say cheerfully: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
}

export function parseSessionSummary(text: string) {
  if (!text.includes('📋 SESSION SUMMARY')) return null;

  const lines = text.split('\n');
  const summary: any = {};
  
  lines.forEach(line => {
    if (line.includes('Subject:')) summary.subject = line.split('Subject:')[1].trim();
    if (line.includes('Topic Mastered:')) summary.topic = line.split('Topic Mastered:')[1].trim();
    if (line.includes('Game Played:')) summary.game = line.split('Game Played:')[1].trim();
    if (line.includes('Hints Used:')) summary.hints = parseInt(line.split('Hints Used:')[1].trim()) || 0;
    if (line.includes('XP Earned:')) summary.xp = parseInt(line.split('XP Earned:')[1].trim().replace(/\D/g, '')) || 0;
    if (line.includes('Badge Unlocked:')) summary.badge = line.split('Badge Unlocked:')[1].trim();
  });

  return summary;
}

const TEEN_THINKERS_EXPLORER_PROMPT = `You are an AI Librarian for a 13-year-old student (TeenThinkers). When given a topic, provide:
1. A 3-sentence simple summary.
2. Keywords to search for Videos (YouTube/Khan Academy).
3. Recommended Book titles or open-source articles.

FORMATTING:
- Use markdown.
- Be mature, professional, yet engaging.`;

const TEEN_THINKERS_TUTOR_PROMPT = `You are a supportive high school tutor for TeenThinkers. A student has submitted a question or their work.
Follow these stages based on the request:

STAGE 1: MISTAKE DETECTION
- Review the student's work. Do not give the answer.
- Identify exactly where the logic failed (e.g., 'You forgot to carry the 1').
- If no work is provided, ask for their attempt first.

STAGE 2: HINTS
- Provide a 'Level 1 Hint' that explains the concept needed.
- Provide a 'Level 2 Hint' that shows the first step of the calculation/logic.
- Do not solve it yet.

STAGE 3: FINAL SOLUTION
- Provide the full step-by-step solution.
- Use bold text for final answers.
- Explain why each step was taken.

TONE: Friendly, encouraging, and mature. Use "You're almost there!" or similar.`;

const TEEN_THINKERS_PLAN_REVIEW_PROMPT = `You are an academic advisor for a 13-year-old student.
Review their syllabus and timetable.
Identify:
1. Potential "Mistakes" or gaps (e.g., "You have a lot of Math but no Science this week").
2. Suggestions for better time management.
3. How the syllabus topics align with the timetable.

Keep it concise and professional.`;

export async function getTeenExplorerResponse(topic: string) {
  const model = ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ role: 'user', parts: [{ text: topic }] }],
    config: {
      systemInstruction: TEEN_THINKERS_EXPLORER_PROMPT,
      temperature: 0.7,
    }
  });

  const response = await model;
  return response.text;
}

export async function getTeenTutorResponse(
  question: string,
  attempt: string,
  stage: 'mistake' | 'hint' | 'solution',
  imageBase64?: string
) {
  const prompt = `
Question: ${question}
Student Attempt: ${attempt || 'None provided'}
Requested Stage: ${stage}
`;

  const model = ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        role: 'user',
        parts: [
          ...(imageBase64 ? [{ inlineData: { data: imageBase64.split(',')[1], mimeType: 'image/jpeg' } }] : []),
          { text: prompt }
        ]
      }
    ],
    config: {
      systemInstruction: TEEN_THINKERS_TUTOR_PROMPT,
      temperature: 0.7,
    }
  });

  const response = await model;
  return response.text;
}

export async function getTeenPlanReview(syllabus: string, timetable: string) {
  const prompt = `
Syllabus: ${syllabus}
Timetable: ${timetable}
`;

  const model = ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      systemInstruction: TEEN_THINKERS_PLAN_REVIEW_PROMPT,
      temperature: 0.7,
    }
  });

  const response = await model;
  return response.text;
}
