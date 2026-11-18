# Quiz sound effects

Bundled files, with case-sensitive names and `.mp3.MPEG` extensions:
- `chronos_math_sound.mp3.MPEG`: each new question.
- `Chronos_Clock_Question_Correct.mp3.MPEG`: correct answer.
- `Chronos_Clock_Question_Incorrect.mp3.MPEG`: wrong answer or timeout.

The mapping lives in `SOUND_FILES` in `assets/entry-gate.js`. Audio bytes are unchanged.
Files are copied automatically by `npm run build`. Missing files or browser autoplay
restrictions do not block the quiz. Defeat challenges wait 900ms before closing on failure.
