/* A playful entrance quiz, not authentication or an anti-cheat mechanism. */
(function (root) {
  const TEXT = {
    it: {
      taunt: 'BROO', speech1: 'AVEVI DETTO DI AVER STUDIATO', speech2: 'ORA BASTA', speech3: 'INVECE DI ESSERE IL PROFESSORE ECCEZIONALE CHE SONO', speech4: 'ASSEGNERÒ E BASTA', speech5: 'È FINITA PER TE!!!', speech6: 'VERGOGNATI', punishRound: 'Domanda {0} di 300', punishFailed: 'CHRONOS HA VINTO.',
      title: 'HAI FATTO I COMPITI?', yes: 'SÌ', no: 'NO', challenge: 'RISPONDI',
      round: 'Prova {0} di 3', remaining: 'Tempo rimasto: {0} secondi',
      denied: 'CHRONOS: tempo scaduto. Torna ai compiti!',
      close: 'Il browser potrebbe non permettere la chiusura: in quel caso si aprirà una pagina vuota.',
      answer: 'Risposta {0}', clock: 'Lancetta lunga sul {0}, lancetta corta sul {1}',
      failed: 'Accesso non consentito. Torna ai compiti!', live: 'Ora italiana: {0}',
    },
    fr: {
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
  const SOUND_FILES = {
    Clock: 'Chronos_math_sound.mp3',
    Correct: 'Chronos_Clock_Question_Correct.mp3',
    Wrong: 'Chronos_Clock_Question_Incorrect.mp3',
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
  function start({ container = document.getElementById('root'), french = false, punishment = false, signal } = {}) {
    if (signal?.aborted) return Promise.resolve(false);
    const totalRounds = punishment ? 300 : 3;
    if (!punishment && hasPass()) return Promise.resolve(true);
    const words = TEXT[french ? 'fr' : 'it'];
    const t = (key, ...values) => {
      const original = words[key];
      const custom = root.SiteText ? root.SiteText.text(original) : original;
      return custom.replace(/\{(\d+)\}/g, (_, index) => String(values[Number(index)] ?? ''));
    };
    return new Promise(resolve => {
      const sounds = new Set();
      function playSound(name) {
        try {
          if (typeof root.Audio !== 'function') return;
          const audio = new root.Audio('/assets/sounds/' + SOUND_FILES[name]);
          audio.volume = 0.7; sounds.add(audio);
          const release = () => sounds.delete(audio);
          audio.addEventListener('ended', release, { once: true });
          audio.addEventListener('error', release, { once: true });
          const playing = audio.play();
          if (playing?.catch) playing.catch(release);
        } catch { /* Missing files and autoplay restrictions must not break the quiz. */ }
      }
      let closeTimer;
      let closed = false, round = 0, question, phase = 'welcome', previewTimer, roundTimer, introTimer, deadline;
      const el = (tag, className, text) => {
        const node = document.createElement(tag); if (className) node.className = className;
        if (text !== undefined) node.textContent = text; return node;
      };
      const screen = el('main', 'entry-gate' + (punishment ? ' entry-punishment' : '')), card = el('section', 'entry-card');
      const eyes = el('div', 'entry-eyes'); eyes.setAttribute('aria-hidden', 'true');
      for (let index = 0; index < 8; index++) {
        const eye = el('span', 'entry-eye');
        for (let frame = 1; frame <= 3; frame++) {
          const image = el('img', 'entry-eye-frame entry-eye-frame-' + frame);
          image.src = '/assets/eyes/frame-' + frame + '.webp';
          image.alt = ''; image.draggable = false; image.width = image.height = 420;
          image.style.animationDelay = `${-(index * 0.09 + (frame - 1) * 0.24)}s`;
          eye.append(image);
        }
        eyes.append(eye);
      }
      const heading = el('h1', '', t(punishment ? 'taunt' : 'title')); heading.tabIndex = -1;
      if (punishment) { heading.setAttribute('aria-live', 'assertive'); screen.className += ' entry-jumpscare'; }
      const clockBox = el('div', 'entry-italy');
      const bigEye = el('div', 'entry-big-eye'); bigEye.setAttribute('aria-hidden', 'true');
      if (punishment) {
        for (let frame = 1; frame <= 3; frame++) {
          const image = el('img', 'entry-eye-frame entry-eye-frame-' + frame);
          image.src = '/assets/eyes/frame-' + frame + '.webp'; image.alt = ''; image.draggable = false;
          image.style.animationDelay = `${-(frame - 1) * 0.24}s`; bigEye.append(image);
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
        root.clearTimeout(closeTimer);
        for (const audio of sounds) { try { audio.pause(); } catch {} } sounds.clear();
        clearRound(); root.clearTimeout(introTimer); root.clearInterval(liveTimer); root.removeEventListener('pagehide', cleanup);
        signal?.removeEventListener('abort', dismiss);
      }
      function dismiss() {
        if (closed) return;
        closed = true; cleanup(); resolve(false);
      }
      signal?.addEventListener('abort', dismiss, { once: true });
      root.addEventListener('pagehide', cleanup);
      function fail(timedOut = false) {
        if (closed) return;
        closed = true; phase = 'denied'; cleanup();
        try { root.localStorage.removeItem(PASS_KEY); } catch {}
        heading.textContent = t(punishment ? 'punishFailed' : timedOut ? 'denied' : 'failed'); stage.replaceChildren(el('p', '', t('close')));
        playSound('Wrong');
        function leave() {
          resolve(false);
          try { root.close(); } catch {}
          // Browsers normally forbid closing tabs not opened by a script.
          try { if (!root.closed) root.location.replace('about:blank'); } catch { /* denied screen remains */ }
        }
        // Give the failure cue time to play before navigating away.
        if (punishment) closeTimer = root.setTimeout(leave, 900); else leave();
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
        phase = 'checking'; clearRound();
        if (index !== question.correctIndex) { fail(); return; }
        round++;
        if (round === totalRounds) { pass(); playSound('Correct'); }
        else { playSound('Correct'); showQuestion(); }
      }
      function showQuestion() {
        playSound('Clock');
        clearRound(); phase = 'preview'; question = makeQuestion(Math.random, punishment ? 15 : 2);
        heading.textContent = t('challenge'); heading.setAttribute('aria-live', 'off'); screen.className = 'entry-gate' + (punishment ? ' entry-punishment' : ''); clockBox.hidden = true; bigEye.hidden = true; stage.replaceChildren();
        const progress = el('h2', 'entry-progress', `${roman(round + 1)} / ${roman(totalRounds)}`); progress.tabIndex = -1;
        progress.setAttribute('aria-label', t(punishment ? 'punishRound' : 'round', round + 1));
        const equation = el('div', 'entry-equation');
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
          phase = 'answer'; deadline = Date.now() + 12000;
          question.options.forEach((clock, index) => {
            const button = el('button', 'entry-choice'); button.type = 'button';
            button.setAttribute('aria-label', t('answer', roman(index + 1)) + ': ' + t('clock', clock.minute || 12, clock.hour || 12));
            const illustration = face('', clock.minute, clock.hour).clock; illustration.setAttribute('aria-hidden', 'true');
            button.append(el('span', 'entry-answer-letter', roman(index + 1)), illustration);
            button.addEventListener('click', () => choose(index)); choices.append(button);
          });
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
      if (!online || online.status !== 'over' || ![1, -1].includes(online.color)) return false;
      if (!['mate', 'resign'].includes(online.reason)) return false;
      return online.winner === (online.color === 1 ? 'black' : 'white');
    }
    if (kind !== 'mate') return false;
    return (mode === 'pvc' && turn === 1) || mode === 'pvp';
  }
  async function punish({ french = false, signal } = {}) {
    if (signal?.aborted) return false;
    const overlay = document.createElement('div'); overlay.className = 'entry-defeat-overlay';
    overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', french ? TEXT.fr.taunt : TEXT.it.taunt);
    const previousFocus = document.activeElement, overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; document.body.append(overlay);
    // Native inert prevents keyboard and screen-reader navigation behind the overlay.
    const background = document.getElementById('root'), wasInert = background?.inert;
    if (background) background.inert = true;
    const escape = event => {
      if (event.key === 'Tab') {
        const buttons = [...overlay.querySelectorAll('button:not([disabled])')];
        const first = buttons[0], last = buttons[buttons.length - 1];
        if ((event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
          event.preventDefault(); (event.shiftKey ? last : first)?.focus();
        }
      }
    };
    overlay.addEventListener('keydown', escape);
    try { return await start({ container: overlay, french, punishment: true, signal }); }
    finally {
      overlay.removeEventListener('keydown', escape); overlay.remove(); document.body.style.overflow = overflow;
      if (background) background.inert = wasInert;
      previousFocus?.focus?.();
    }
  }
  root.EntryGate = { start, punish, isDefeat, italyTime, makeQuestion, TEXT };
})(typeof globalThis !== 'undefined' ? globalThis : window);
