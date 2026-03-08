const { QUIZ_RUBRIC } = require("./quiz-rubric");

const PASSING_SCORE = 70;

function toInteger(value) {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === "string" && /^[0-9]+$/.test(value.trim())) {
    return Number.parseInt(value.trim(), 10);
  }

  return null;
}

function normalizeAnswers(lessonId, rawAnswers) {
  if (!rawAnswers || typeof rawAnswers !== "object" || Array.isArray(rawAnswers)) {
    throw new Error("invalid_quiz_answers");
  }

  const answerKey = QUIZ_RUBRIC[lessonId];
  if (!Array.isArray(answerKey) || answerKey.length === 0) {
    throw new Error("unsupported_lesson_id");
  }

  const normalized = {};
  for (let index = 0; index < answerKey.length; index += 1) {
    const questionId = `${lessonId}Q${index + 1}`;
    const answerValue = toInteger(rawAnswers[questionId]);
    if (answerValue === null || answerValue < 0) {
      throw new Error("invalid_quiz_answers");
    }

    normalized[questionId] = answerValue;
  }

  return normalized;
}

function gradeLessonQuiz(lessonId, rawAnswers) {
  const answerKey = QUIZ_RUBRIC[lessonId];
  if (!Array.isArray(answerKey) || answerKey.length === 0) {
    throw new Error("unsupported_lesson_id");
  }

  const answers = normalizeAnswers(lessonId, rawAnswers);
  const correctAnswers = {};

  let correct = 0;
  for (let index = 0; index < answerKey.length; index += 1) {
    const questionId = `${lessonId}Q${index + 1}`;
    const correctAnswer = answerKey[index];
    const userAnswer = answers[questionId];

    correctAnswers[questionId] = correctAnswer;
    if (userAnswer === correctAnswer) {
      correct += 1;
    }
  }

  const total = answerKey.length;
  const score = Math.round((correct / total) * 100);
  const passed = score >= PASSING_SCORE;

  return {
    score,
    passed,
    total,
    correct,
    answers,
    correctAnswers
  };
}

module.exports = {
  PASSING_SCORE,
  gradeLessonQuiz
};
