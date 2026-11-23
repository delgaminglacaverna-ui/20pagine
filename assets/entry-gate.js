/* A playful entrance quiz, not authentication or an anti-cheat mechanism. */
(function (root) {
  const TEXT = {
    it: {
      review: 'Ripassa', practiceNote: 'NON FARE I COMPITI IN CLASSE!(o non farti beccare...)', seconds: 'Secondi per domanda', clocks: 'Numero di orologi', begin: 'Inizia', exit: 'Torna agli scacchi', streak: 'Streak: {0}', caught: 'PERCHè è TUTTO BLUE?!?!',

      taunt: 'BROO', speech1: 'AVEVI DETTO DI AVER STUDIATO', speech2: 'ORA BASTA', speech3: 'INVECE DI ESSERE IL PROFESSORE ECCEZIONALE CHE SONO', speech4: 'ASSEGNERÒ E BASTA', speech5: 'È FINITA PER TE!!!', speech6: 'VERGOGNATI', punishRound: 'Domanda {0} di 300', punishFailed: 'CHRONOS HA VINTO.',
      title: 'HAI FATTO I COMPITI?', yes: 'SÌ', no: 'NO', challenge: 'RISPONDI',
      round: 'Prova {0} di 3', remaining: 'Tempo rimasto: {0} secondi',
      denied: 'CHRONOS: tempo scaduto. Torna ai compiti!',
      close: 'Il browser potrebbe non permettere la chiusura: in quel caso si aprirà una pagina vuota.',
      answer: 'Risposta {0}', clock: 'Lancetta lunga sul {0}, lancetta corta sul {1}',
      failed: 'Accesso non consentito. Torna ai compiti!', live: 'Ora italiana: {0}',
    },
    fr: {
      review: 'Réviser', practiceNote: 'NE FAIS PAS TES DEVOIRS EN CLASSE !(ou ne te fais pas prendre...)', seconds: 'Secondes par question', clocks: 'Nombre d’horloges', begin: 'Commencer', exit: 'Retour aux échecs', streak: 'Série : {0}', caught: 'POURQUOI TOUT EST BLEU ?!?!',

      taunt: 'BROO', speech1: 'TU AVAIS DIT AVOIR ÉTUDIÉ', speech2: 'MAINTENANT ÇA SUFFIT', speech3: 'AU LIEU D’ÊTRE LE PROFESSEUR EXCEPTIONNEL QUE JE SUIS', speech4: 'JE VAIS JUSTE DONNER DES DEVOIRS', speech5: 'C’EST FINI POUR TOI !!!', speech6: 'HONTE À TOI', punishRound: 'Question {0} sur 300', punishFailed: 'CHRONOS A GAGNÉ.',
      title: 'AS-TU FAIT TES DEVOIRS ?', yes: 'OUI', no: 'NON', challenge: 'RÉPONDS',
      round: 'Épreuve {0} sur 3', remaining: 'Temps restant : {0} secondes',
      denied: 'CHRONOS : temps écoulé. Retourne faire tes devoirs !',
      close: 'Si le navigateur bloque la fermeture, une page vide s’ouvrira.',
      answer: 'Réponse {0}', clock: 'Grande aiguille sur le {0}, petite aiguille sur le {1}',
      failed: 'Accès refusé. Retourne faire tes devoirs !', live: 'Heure italienne : {0}',
    },
  };
  function roman(value) {
    if (!Number.isInteger(value) || value <= 0 || value > 3999) return '';
    let result = '';
    for (const [number, symbol] of [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]) {
      while (value >= number) { result += symbol; value -= number; }
    }
    return result;
  }
  function italyTime(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(date);
    const get = type => Number(parts.find(part => part.type === type).value);
    const hour = get('hour'), minute = get('minute'), second = get('second');
    return { hour, minute, second, label: [hour, minute].map(n => String(n).padStart(2, '0')).join(':'),
      hourAngle: (hour % 12 + minute / 60 + second / 3600) * 30,
      minuteAngle: (minute + second / 60) * 6 };
  }
  function makeQuestion(random = Math.random, count = 2) {
    if (!Number.isInteger(count) || count < 1 || count > 15) throw RangeError('Invalid clock count');
    const next = () => Math.floor(random() * 12);
    const clocks = Array.from({ length: count }, () => ({ minute: next(), hour: next() }));
    const answer = clocks.reduce((sum, clock) => sum + clock.minute, 0) % 12;
    const positions = Array.from({ length: 12 }, (_, i) => i).filter(i => i !== answer);
    const shuffle = list => { for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; } return list; };
    const options = shuffle([answer, ...shuffle(positions).slice(0, 3)]).map(minute => ({ minute, hour: next() }));
    return { clocks, options, correctIndex: options.findIndex(clock => clock.minute === answer) };
  }
  function practiceSpawnInterval(streak) {
    const upgrades = Math.floor(Math.max(0, streak) / 5);
    return Math.max(1500, 5000 - (upgrades + Math.floor(upgrades / 2)) * 250);
  }
  const SOUND_FILES = {
    Clock: 'chronos_math_sound.mp3.MPEG',
    Correct: 'Chronos_Clock_Question_Correct.mp3.MPEG',
    Wrong: 'Chronos_Clock_Question_Incorrect.mp3.MPEG',
  };
  const PASS_KEY = '20pagine.chronos.pass.v3';
  const PASS_DURATION = 24 * 60 * 60 * 1000;
  function hasPass() {
    try {
      const raw = root.localStorage.getItem(PASS_KEY);
      if (!raw) return false;
      const pass = JSON.parse(raw), now = Date.now();
      if (pass && Number.isFinite(pass.passedAt) && Number.isFinite(pass.expiresAt)
          && pass.expiresAt - pass.passedAt === PASS_DURATION
          && pass.passedAt <= now && pass.expiresAt > now) return true;
      root.localStorage.removeItem(PASS_KEY);
    } catch { /* Storage may be blocked, full or malformed: show the quiz normally. */ }
    return false;
  }
  function start({ container = document.getElementById('root'), french = false, punishment = false, practice = false, signal } = {}) {
    if (signal?.aborted) return Promise.resolve(false);
    const totalRounds = punishment ? 300 : 3;
    if (!practice && !punishment && hasPass()) return Promise.resolve(true);
    root.TabState?.set(punishment ? 'enraged' : practice ? 'review' : 'compiti');
    const words = TEXT[french ? 'fr' : 'it'];
    const t = (key, ...values) => {
      const original = words[key];
      const custom = root.SiteText ? root.SiteText.text(original) : original;
      return custom.replace(/\{(\d+)\}/g, (_, index) => String(values[Number(index)] ?? ''));
    };
    return new Promise(resolve => {
      const sounds = new Map();
      function stopSounds() {
        for (const cancel of [...sounds.values()]) cancel();
      }
      function playSound(name, done = () => {}) {
        let audio, timer, settled = false;
        function finish(continueQuiz = true) {
          if (settled) return;
          settled = true; root.clearTimeout(timer);
          if (audio) {
            sounds.delete(audio);
            audio.removeEventListener('ended', finish);
            audio.removeEventListener('error', finish);
            audio.removeEventListener('timeupdate', progress);
            try { audio.pause(); } catch {}
          }
          if (continueQuiz) done();
        }
        function progress() {
          if (name === 'Wrong' && Number.isFinite(audio.duration) && audio.duration > 0 && audio.currentTime >= audio.duration * 0.6) finish();
        }
        try {
          if (typeof root.Audio !== 'function') { finish(); return; }
          audio = new root.Audio('/assets/sounds/' + SOUND_FILES[name]);
          audio.volume = 0.7;
          sounds.set(audio, () => finish(false));
          audio.addEventListener('timeupdate', progress);
          audio.addEventListener('ended', finish, { once: true });
          audio.addEventListener('error', finish, { once: true });
          // Watchdog only for failed loads/stalled playback, not normal clip duration.
          timer = root.setTimeout(finish, 60000);
          const playing = audio.play();
          if (playing?.catch) playing.catch(() => finish());
        } catch { finish(); }
      }
      let closed = false, round = 0, question, phase = 'welcome', previewTimer, roundTimer, introTimer, deadline;
      const el = (tag, className, text) => {
        const node = document.createElement(tag); if (className) node.className = className;
        if (text !== undefined) node.textContent = text; return node;
      };
      let practiceSeconds = 12, practiceClocks = 2, eyeTimer, caughtTimer, nextEyeAt;
      const openEyes = new Map();
      const clickedEyes = new Set();
      const creature = punishment ? 'mouth' : 'eye';
      const frameCount = punishment ? 3 : 4;
      const frameFolder = punishment ? 'mouths' : 'eyes';
      const frameDuration = 0.72 / frameCount;
      const screen = el('main', 'entry-gate' + (punishment ? ' entry-punishment' : '') + (practice ? ' entry-practice' : '')), card = el('section', 'entry-card');
      const eyes = el('div', 'entry-eyes'); eyes.setAttribute('aria-hidden', punishment ? 'true' : 'false');
      for (let index = 0; index < 8; index++) {
        const eye = el(punishment ? 'span' : 'button', 'entry-eye' + (!punishment ? ' entry-hint-eye' : ''));
        if (!punishment) {
          eye.type = 'button'; eye.setAttribute('aria-label', (french ? 'Fermer l’œil ' : 'Chiudi occhio ') + (index + 1));
          eye.setAttribute('aria-pressed', 'false');
          eye.addEventListener('click', () => {
            if (practice) {
              if (closed || phase === 'caught') return;
              if (openEyes.has(index) && Date.now() >= openEyes.get(index)) { caught(); return; }
              openEyes.delete(index); paintEye(eye, 'closed'); return;
            }
            if (closed || phase === 'denied' || clickedEyes.has(index)) return;
            clickedEyes.add(index); eye.setAttribute('aria-pressed', 'true');
            eye.replaceChildren();
            for (let frame = 1; frame <= 3; frame++) {
              const image = el('img', 'entry-closed-frame entry-closed-frame-' + frame);
              image.src = '/assets/closed-eyes/frame-' + frame + '.webp'; image.alt = ''; eye.append(image);
            }
            applyHints();
          });
        }
        for (let frame = 1; frame <= frameCount; frame++) {
          const image = el('img', 'entry-' + creature + '-frame entry-' + creature + '-frame-' + frame);
          image.src = '/assets/' + frameFolder + '/frame-' + frame + '.webp';
          image.alt = ''; image.draggable = false; image.width = image.height = 420;
          image.style.animationDelay = `${-(index * 0.09 + (frame - 1) * frameDuration)}s`;
          eye.append(image);
        }
        if (practice) paintEye(eye, 'closed');
        eyes.append(eye);
      }
      const heading = el('h1', '', t(punishment ? 'taunt' : 'title')); heading.tabIndex = -1;
      if (punishment) { heading.setAttribute('aria-live', 'assertive'); screen.className += ' entry-jumpscare'; }
      const clockBox = el('div', 'entry-italy');
      const bigEye = el('div', 'entry-big-eye'); bigEye.setAttribute('aria-hidden', 'true');
      if (punishment) {
        for (let frame = 1; frame <= frameCount; frame++) {
          const image = el('img', 'entry-' + creature + '-frame entry-' + creature + '-frame-' + frame);
          image.src = '/assets/' + frameFolder + '/frame-' + frame + '.webp'; image.alt = ''; image.draggable = false;
          image.style.animationDelay = `${-(frame - 1) * frameDuration}s`; bigEye.append(image);
        }
        card.append(bigEye); clockBox.hidden = true;
      }
      function face(className, minute, hour) {
        const clock = el('span', 'entry-clock ' + className);
        clock.setAttribute('role', 'img');
        clock.setAttribute('aria-label', t('clock', minute || 12, hour || 12));
        [1, 2, 3].forEach(frame => {
          const image = el('img', 'entry-clock-face entry-clock-face-' + frame);
          image.src = '/assets/clock/face-' + frame + '.png'; image.alt = ''; image.draggable = false;
          clock.append(image);
        });
        const short = el('span', 'entry-hand entry-hour'), long = el('span', 'entry-hand entry-minute');
        short.style.transform = `rotate(${hour * 30}deg)`; long.style.transform = `rotate(${minute * 30}deg)`;
        clock.append(short, long);
        return { clock, short, long };
      }
      const live = face('entry-live', 0, 0);
      clockBox.append(live.clock);
      const stage = el('div', 'entry-stage');
      card.append(clockBox, heading, stage); screen.append(eyes, card); container.replaceChildren(screen); heading.focus();
      function updateTime() {
        const time = italyTime();
        live.short.style.transform = `rotate(${time.hourAngle}deg)`;
        live.long.style.transform = `rotate(${time.minuteAngle}deg)`;
        live.clock.setAttribute('aria-label', t('live', time.label));
      }
      updateTime(); const liveTimer = root.setInterval(updateTime, 1000);
      function clearRound() { root.clearTimeout(previewTimer); root.clearInterval(roundTimer); }
      function cleanup() {
        root.clearInterval(eyeTimer); root.clearTimeout(caughtTimer);
        stopSounds();
        clearRound(); root.clearTimeout(introTimer); root.clearInterval(liveTimer); root.removeEventListener('pagehide', cleanup);
        signal?.removeEventListener('abort', dismiss);
      }
      function dismiss() {
        if (closed) return;
        closed = true; cleanup(); resolve(false);
      }
      signal?.addEventListener('abort', dismiss, { once: true });
      root.addEventListener('pagehide', cleanup);
        function markClock(target) {
          const cross = el('span', 'entry-wrong'); cross.setAttribute('aria-hidden', 'true');
          for (let frame = 1; frame <= 3; frame++) {
            const image = el('img', 'entry-wrong-frame entry-wrong-frame-' + frame);
            image.src = '/assets/wrong/frame-' + frame + (frame === 3 ? '.png' : '.webp');
            image.alt = ''; cross.append(image);
          }
          target.append(cross);
        }
      function applyHints() {
        if (practice || punishment || !question || phase !== 'answer') return;
        const count = clickedEyes.size === 8 ? 3 : clickedEyes.size >= 6 ? 2 : clickedEyes.size >= 3 ? 1 : 0;
        let removed = 0;
        for (const [index, button] of [...stage.querySelectorAll('.entry-choice')].entries()) {
          if (index === question.correctIndex || removed >= count) continue;
          removed++;
          button.disabled = true;
          if (!button.querySelector('.entry-wrong')) markClock(button.querySelector('.entry-clock'));
        }
      }
      function fail(timedOut = false, wrongIndex) {
        if (closed || phase === 'denied' || phase === 'caught') return;
        if (practice) {
          phase = 'checking'; clearRound(); stopSounds(); round = 0;
          nextEyeAt = Date.now() + practiceSpawnInterval(0);
          const progress = stage.querySelector('.entry-progress');
          if (progress) progress.textContent = t('streak', 0);
          playSound('Wrong', () => { if (!closed && phase === 'checking') showQuestion(); }); return;
        }
        phase = 'denied'; cleanup();
        signal?.addEventListener('abort', dismiss, { once: true });
        root.addEventListener('pagehide', cleanup);
        try { root.localStorage.removeItem(PASS_KEY); } catch {}
        if (punishment) { leave(); return; }
        root.TabState?.set('enraged');
        heading.textContent = '';
        clockBox.hidden = true;
        // Both chess defeat and homework failure use mouths.
        screen.className = 'entry-gate entry-failed';
        for (const eye of [...eyes.children, bigEye]) {
          eye.replaceChildren();
          for (let frame = 1; frame <= 3; frame++) {
            const image = el('img', 'entry-mouth-frame entry-mouth-frame-' + frame);
            image.src = '/assets/mouths/frame-' + frame + '.webp'; image.alt = '';
            image.style.animationDelay = `${-(frame - 1) * 0.24}s`; eye.append(image);
          }
        }
        if (punishment) bigEye.hidden = false;
        const choices = stage.querySelectorAll('.entry-choice');
        for (const [index, button] of [...choices].entries()) {
          button.disabled = true;
          if (question && index !== question.correctIndex && !button.querySelector('.entry-wrong')) markClock(button.querySelector('.entry-clock'));
        }
        function leave() {
          if (closed) return;
          closed = true; cleanup(); resolve(false);
          try { root.close(); } catch {}
          // Browsers normally forbid closing tabs not opened by a script.
          try { if (!root.closed) root.location.replace('about:blank'); } catch { /* denied screen remains */ }
        }
        playSound('Wrong', leave);
      }
      function pass() {
        if (closed) return;
        closed = true; cleanup();
        try {
          if (!punishment) {
            const passedAt = Date.now();
            root.localStorage.setItem(PASS_KEY, JSON.stringify({ passedAt, expiresAt: passedAt + PASS_DURATION }));
          }
        } catch { /* Passing still unlocks this page when persistence is unavailable. */ }
        container.replaceChildren(); resolve(true);
      }
      function choose(index) {
        if (closed || phase !== 'answer') return;
        if (Date.now() >= deadline) { fail(true); return; }
        if (stage.querySelectorAll('.entry-choice')[index]?.disabled) return;
        phase = 'checking'; clearRound();
        if (index !== question.correctIndex) { fail(false, index); return; }
        round++;
        if (practice && round % 5 === 0) nextEyeAt = Math.min(nextEyeAt, Date.now() + practiceSpawnInterval(round));
        stopSounds();
        playSound('Correct', () => {
          if (closed || phase !== 'checking') return;
          if (!practice && round === totalRounds) pass(); else showQuestion();
        });
      }
      function showQuestion() {
        playSound('Clock');
        const clockCount = practice ? practiceClocks : punishment ? 15 : 2;
        clearRound(); phase = 'preview'; question = makeQuestion(Math.random, clockCount);
        heading.textContent = t('challenge'); heading.setAttribute('aria-live', 'off'); screen.className = 'entry-gate' + (punishment ? ' entry-punishment' : '') + (practice ? ' entry-practice' : ''); clockBox.hidden = true; bigEye.hidden = true; stage.replaceChildren();
        const progress = el('h2', 'entry-progress', practice ? t('streak', round) : `${roman(round + 1)} / ${roman(totalRounds)}`); progress.tabIndex = -1;
        progress.setAttribute('aria-label', practice ? t('streak', round) : t(punishment ? 'punishRound' : 'round', round + 1));
        const equation = el('div', 'entry-equation' + (practice && clockCount > 3 ? ' entry-equation-many' : ''));
        question.clocks.forEach((clock, index) => {
          if (punishment) {
            const term = el('span', 'entry-term'); term.append(face('', clock.minute, clock.hour).clock);
            if (index < question.clocks.length - 1) term.append(el('span', 'entry-term-plus', '+'));
            equation.append(term);
          } else {
            if (index) equation.append(el('span', 'entry-plus', '+'));
            equation.append(face('', clock.minute, clock.hour).clock);
          }
        });
        equation.append(el('span', 'entry-plus', '= ?'));
        const countdown = el('p', 'entry-countdown', '…');
        countdown.setAttribute('role', 'timer'); countdown.setAttribute('aria-live', 'off');
        const choices = el('div', 'entry-choices');
        stage.append(progress, equation, countdown, choices); progress.focus();
        previewTimer = root.setTimeout(() => {
          if (closed || phase !== 'preview') return;
          phase = 'answer'; deadline = Date.now() + (practice ? practiceSeconds : 12) * 1000;
          question.options.forEach((clock, index) => {
            const button = el('button', 'entry-choice'); button.type = 'button';
            button.setAttribute('aria-label', t('answer', roman(index + 1)) + ': ' + t('clock', clock.minute || 12, clock.hour || 12));
            const illustration = face('', clock.minute, clock.hour).clock; illustration.setAttribute('aria-hidden', 'true');
            button.append(el('span', 'entry-answer-letter', roman(index + 1)), illustration);
            button.addEventListener('click', () => choose(index)); choices.append(button);
          });
          applyHints();
          function tick() {
            if (closed || phase !== 'answer') return;
            const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
            countdown.textContent = roman(seconds);
            countdown.setAttribute('aria-label', t('remaining', seconds));
            if (Date.now() >= deadline) fail(true);
          }
          tick(); roundTimer = root.setInterval(tick, 100); choices.firstElementChild.focus();
        }, 1000);
      }
      function paintEye(eye, type) {
        eye.replaceChildren();
        const folder = type === 'closed' ? 'closed-eyes' : type === 'mouth' ? 'mouths' : 'eyes';
        const kind = type === 'closed' ? 'closed' : type === 'mouth' ? 'mouth' : 'eye';
        const count = type === 'open' ? 4 : 3;
        for (let frame = 1; frame <= count; frame++) {
          const image = el('img', `entry-${kind}-frame entry-${kind}-frame-${frame}`);
          image.src = `/assets/${folder}/frame-${frame}.webp`; image.alt = '';
          // Closed frames already have distinct, phased CSS keyframes.
          // Offsetting them again synchronizes their visibility and causes flicker.
          if (type !== 'closed') image.style.animationDelay = `${-(frame - 1) * (type === 'mouth' ? .24 : .18)}s`;
          eye.append(image);
        }
        eye.setAttribute('aria-pressed', type === 'closed' ? 'true' : 'false');
      }
      function caught() {
        if (closed || phase === 'caught') return;
        cleanup(); phase = 'caught';
        root.TabState?.set('enraged');
        signal?.addEventListener('abort', dismiss, { once: true });
        root.addEventListener('pagehide', cleanup);
        screen.className = 'entry-gate entry-practice entry-caught';
        heading.textContent = t('caught'); heading.focus(); stage.replaceChildren();
        for (const eye of eyes.children) paintEye(eye, 'mouth');
        caughtTimer = root.setTimeout(() => {
          if (closed) return;
          closed = true; cleanup(); resolve(false);
          try { root.close(); } catch {}
          try { if (!root.closed) root.location.replace('about:blank'); } catch {}
        }, 500);
      }
      if (practice) {
        heading.textContent = t('review');
        const setup = el('form', 'entry-practice-setup');
        setup.append(el('p', '', t('practiceNote')));
        function numberInput(key, value, min, max) {
          const label = el('label', '', t(key)), input = el('input', 'entry-setting-' + key);
          input.type = 'number'; input.value = String(value); input.min = String(min); input.max = String(max); input.step = '1'; input.required = true;
          label.append(input); setup.append(label); return input;
        }
        const seconds = numberInput('seconds', 12, 1, 120), clocks = numberInput('clocks', 2, 1, 15);
        const begin = el('button', 'entry-practice-begin', t('begin')); begin.type = 'submit'; setup.append(begin);
        setup.addEventListener('submit', event => {
          event.preventDefault();
          if (closed || phase !== 'welcome') return;
          const time = Number(seconds.value), count = Number(clocks.value);
          if (!Number.isInteger(time) || time < 1 || time > 120 || !Number.isInteger(count) || count < 1 || count > 15) return;
          practiceSeconds = time; practiceClocks = count; nextEyeAt = Date.now() + practiceSpawnInterval(0);
          eyeTimer = root.setInterval(() => {
            if (closed || phase === 'caught') return;
            const now = Date.now();
            if ([...openEyes.values()].some(deadline => now >= deadline)) { caught(); return; }
            if (now >= nextEyeAt) {
              const available = [...eyes.children].map((_, i) => i).filter(i => !openEyes.has(i));
              if (available.length) {
                const index = available[Math.floor(Math.random() * available.length)];
                openEyes.set(index, now + 4000); paintEye(eyes.children[index], 'open');
              }
              nextEyeAt = now + practiceSpawnInterval(round);
            }
          }, 100);
          showQuestion();
        });
        stage.append(setup);
        const exit = el('button', 'entry-practice-exit', t('exit')); exit.type = 'button'; exit.addEventListener('click', dismiss); card.append(exit);
        seconds.focus(); return;
      }
      if (punishment) {
        phase = 'intro';
        const lines = ['taunt', 'speech1', 'speech2', 'speech3', 'speech4', 'speech5', 'speech6'];
        let line = 0;
        function nextLine() {
          if (closed || phase !== 'intro') return;
          if (++line === lines.length) { showQuestion(); return; }
          heading.textContent = t(lines[line]);
          introTimer = root.setTimeout(nextLine, line === 3 ? 3800 : 2200);
        }
        introTimer = root.setTimeout(nextLine, 1200);
        heading.focus(); return;
      }
      const buttons = el('div', 'entry-actions'), yes = el('button', 'entry-yes', t('yes')), no = el('button', 'entry-no', t('no'));
      yes.type = no.type = 'button';
      yes.addEventListener('click', () => { if (phase === 'welcome' && !closed) showQuestion(); });
      no.addEventListener('click', () => fail());
      buttons.append(yes, no);
      stage.append(buttons);
    });
  }
  function isDefeat({ mode, kind, turn, online }) {
    if (mode === 'online') {
      return !!online && online.status === 'over' && [1, -1].includes(online.color)
        && ['mate', 'resign'].includes(online.reason)
        && online.winner === (online.color === 1 ? 'black' : 'white');
    }
    return mode === 'pvc' && kind === 'mate' && turn === 1;
  }
  async function punish({ french = false, signal, practice = false } = {}) {
    if (signal?.aborted) return false;
    const previousTab = root.TabState?.get();
    const overlay = document.createElement('div'); overlay.className = 'entry-defeat-overlay';
    overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', practice ? (french ? TEXT.fr.review : TEXT.it.review) : french ? TEXT.fr.taunt : TEXT.it.taunt);
    const previousFocus = document.activeElement, overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; document.body.append(overlay);
    // Native inert prevents keyboard and screen-reader navigation behind the overlay.
    const background = document.getElementById('root'), wasInert = background?.inert;
    if (background) background.inert = true;
    const escape = event => {
      if (practice && event.key === 'Escape') overlay.querySelector('.entry-practice-exit')?.click();
      if (event.key === 'Tab') {
        const buttons = [...overlay.querySelectorAll('button:not([disabled]), input')];
        const first = buttons[0], last = buttons[buttons.length - 1];
        if ((event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
          event.preventDefault(); (event.shiftKey ? last : first)?.focus();
        }
      }
    };
    overlay.addEventListener('keydown', escape);
    try { return await start({ container: overlay, french, punishment: !practice, practice, signal }); }
    finally {
      overlay.removeEventListener('keydown', escape); overlay.remove(); document.body.style.overflow = overflow;
      if (background) background.inert = wasInert;
      previousFocus?.focus?.();
      if (previousTab) root.TabState?.set(previousTab);
    }
  }
  root.EntryGate = { start, punish, practiceSpawnInterval, review: options => punish({ ...options, practice: true }), isDefeat, italyTime, makeQuestion, TEXT };
})(typeof globalThis !== 'undefined' ? globalThis : window);
