const { generateJson } = require("./gemini.service");

async function analyzeResume({ resumeText, jobDescription = "" }) {
  const prompt = `Analyze the resume for job readiness. Do not invent facts and do not treat resume claims as independently verified. Return ONLY JSON with this schema:
{
  "overallScore": number from 0 to 100,
  "summary": "2-4 sentences",
  "strengths": ["..."],
  "improvements": [{"title":"...", "detail":"...", "priority":"high|medium|low"}],
  "skills": {"matched":["..."], "missing":["..."], "mentioned":["..."]},
  "ats": {"score": number from 0 to 100, "findings":["..."], "keywordsToConsider":["..."]},
  "interviewQuestions": [
    // exactly 10 distinct, top interview questions based on the candidate's specific technologies, projects, and role fit
    {"question":"...", "reason":"...", "sampleAnswerOutline":["..."]}
  ],
  "rewrittenSummary": "truthful resume summary based only on the source",
  "experienceBullets": [{"original":"...", "suggested":"...", "reason":"..."}]
}
If no job description is provided, assess general resume quality and leave matched/missing skills conservative.
Generate exactly 10 high-quality interview questions covering technical skills, project implementation, challenges faced, and behavioral fit.
RESUME:
${resumeText.slice(0, 24000)}
JOB DESCRIPTION:
${jobDescription.slice(0, 10000) || "(not provided)"}`;
  return generateJson(prompt);
}

async function generateTop10InterviewQuestions({ resumeText, jobDescription = "" }) {
  const prompt = `You are a Lead Hiring Manager. Generate exactly 10 distinct, top interview questions specifically tailored to this candidate's resume and target job.
Include a balanced mix:
- 3 Technical Competency & Tooling questions
- 3 Project Architecture & Implementation deep-dives (using their actual resume projects)
- 2 Problem Solving, Debugging & Performance questions
- 2 Behavioral & Collaboration questions (STAR method)

Return ONLY JSON array with 10 objects conforming to this schema:
[
  {
    "question": "clear, engaging question directly citing their experience or role",
    "category": "Technical" | "Project Deep-Dive" | "Problem Solving" | "Behavioral",
    "reason": "why this question matters for their role and resume",
    "sampleAnswerOutline": ["key point 1 to cover", "key point 2", "key point 3"]
  }
]

RESUME:
${resumeText.slice(0, 24000)}
JOB DESCRIPTION:
${jobDescription.slice(0, 10000) || "(general software/engineering role)"}`;

  return generateJson(prompt);
}

async function evaluateInterviewAnswer({ question, reason = "", sampleAnswerOutline = [], userAnswer = "" }) {
  const prompt = `You are a supportive, insightful interview coach. Evaluate the candidate's spoken/written answer to this interview question.

QUESTION:
${question}

REASON FOR QUESTION:
${reason}

EXPECTED ANSWER OUTLINE:
${JSON.stringify(sampleAnswerOutline)}

CANDIDATE'S RESPONSE:
${userAnswer || "(Candidate submitted empty or blank answer)"}

Return ONLY JSON with this schema:
{
  "score": number from 1 to 10 (be fair: 8-10 for strong structured response, 5-7 for satisfactory but missing depth, 1-4 for incomplete or off-topic),
  "verdict": "Strong Answer" | "Solid Effort" | "Needs Improvement",
  "feedback": "2-3 sentences of constructive, encouraging feedback on how they communicated and answered",
  "strengths": ["1-3 key positive things they articulated well"],
  "missingPoints": ["1-3 technical details or STAR elements they should mention next time"],
  "modelAnswer": "A concise, 3-4 sentence exemplary answer demonstrating how to articulate this in an interview"
}`;

  return generateJson(prompt);
}

async function structureResume(resumeText) {
  const prompt = `Extract resume facts into JSON with exactly these keys:
{"fullName":"","email":"","phone":"","location":"","website":"","summary":"","skills":[],"experience":[{"role":"","company":"","location":"","startDate":"","endDate":"","bullets":[]}],"education":[{"degree":"","institution":"","location":"","startDate":"","endDate":"","details":[]}],"projects":[{"name":"","technologies":[],"bullets":[]}],"certifications":[]}
Only use facts explicitly present in the source. Missing values should be empty strings or empty arrays. Do not add fabricated details. Keep bullets concise. RESUME TEXT:\n${resumeText.slice(0, 24000)}`;
  return generateJson(prompt);
}

module.exports = { analyzeResume, generateTop10InterviewQuestions, evaluateInterviewAnswer, structureResume };
