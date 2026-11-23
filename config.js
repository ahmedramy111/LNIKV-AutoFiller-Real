module.exports = {
  PLATFORM_URL: "https://me-tp.qureo.education/chapter/90029/lecture/90029010",
  PORT: process.env.PORT || 3000,
  ADMIN_PATH: process.env.ADMIN_PATH || "__control_7f3a9d",
  ADMIN_USER: process.env.ADMIN_USER || "admin",
  ADMIN_PASS: process.env.ADMIN_PASS || "CHANGE-ME-NOW",
  MAX_LEVELS: 42,
  MAX_QUESTIONS_PER_LEVEL: 30,
  FAST_DELAY_MS: Number(process.env.FAST_DELAY_MS || 0),
  SELECTORS: {
    loginCode: "",
    loginPassword: "",
    loginSubmit: "",
    loginError: "",
    lessonContainer: "",
    trainingStartButton: "",
    question: "",
    answerEditor: "",
    option: "",
    optionLabel: "",
    nextButton: "",
    levelComplete: ""
  }
};
