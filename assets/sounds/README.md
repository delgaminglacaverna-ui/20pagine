# Quiz sound effects

Bundled audio (uploaded as `.mp3.mpeg`, moved here and normalized to `.mp3`):
- `Chronos_math_sound.mp3`: each new question, when its clocks appear.
- `Chronos_Clock_Question_Correct.mp3`: correct answer.
- `Chronos_Clock_Question_Incorrect.mp3`: wrong answer or timeout.

The mapping lives in `SOUND_FILES` in `assets/entry-gate.js`. Audio bytes are unchanged.
Files are copied automatically by `npm run build`. Missing files or browser autoplay
restrictions do not block the quiz. Defeat challenges wait 900ms before closing on failure.
