/* A playful entrance quiz, not authentication or an anti-cheat mechanism. */
(function (root) {
  const TEXT = {
    it: {
      title: 'HAI FATTO I COMPITI?', yes: 'SÌ', no: 'NO', challenge: 'RISPONDI',
      round: 'Prova {0} di 3', remaining: 'Tempo rimasto: {0} secondi',
      denied: 'CHRONOS: tempo scaduto. Torna ai compiti!',
      close: 'Il browser potrebbe non permettere la chiusura: in quel caso si aprirà una pagina vuota.',
      answer: 'Risposta {0}', clock: 'Lancetta lunga sul {0}, lancetta corta sul {1}',
      failed: 'Accesso non consentito. Torna ai compiti!', live: 'Ora italiana: {0}',
    },
    fr: {
      title: 'AS-TU FAIT TES DEVOIRS ?', yes: 'OUI', no: 'NON', challenge: 'RÉPONDS',
      round: 'Épreuve {0} sur 3', remaining: 'Temps restant : {0} secondes',
      denied: 'CHRONOS : temps écoulé. Retourne faire tes devoirs !',
      close: 'Si le navigateur bloque la fermeture, une page vide s’ouvrira.',
      answer: 'Réponse {0}', clock: 'Grande aiguille sur le {0}, petite aiguille sur le {1}',
      failed: 'Accès refusé. Retourne faire tes devoirs !', live: 'Heure italienne : {0}',
    },
  };
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const roman = value => ROMAN[value - 1] || '';
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
  function makeQuestion(random = Math.random) {
    const next = () => Math.floor(random() * 12);
    const clocks = Array.from({ length: 2 }, () => ({ minute: next(), hour: next() }));
    const answer = clocks.reduce((sum, clock) => sum + clock.minute, 0) % 12;
    const positions = Array.from({ length: 12 }, (_, i) => i).filter(i => i !== answer);
    const shuffle = list => { for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; } return list; };
    const options = shuffle([answer, ...shuffle(positions).slice(0, 3)]).map(minute => ({ minute, hour: next() }));
    return { clocks, options, correctIndex: options.findIndex(clock => clock.minute === answer) };
  }
  const PASS_KEY = '20pagine.chronos.passed.v2';
  function start({ container = document.getElementById('root'), french = false } = {}) {
    try { if (root.sessionStorage.getItem(PASS_KEY) === 'yes') return Promise.resolve(true); } catch { /* private storage may be disabled */ }
    const words = TEXT[french ? 'fr' : 'it'];
    const t = (key, ...values) => {
      const original = words[key];
      const custom = root.SiteText ? root.SiteText.text(original) : original;
      return custom.replace(/\{(\d+)\}/g, (_, index) => String(values[Number(index)] ?? ''));
    };
    return new Promise(resolve => {
      let closed = false, round = 0, question, phase = 'welcome', previewTimer, roundTimer, deadline;
      const el = (tag, className, text) => {
        const node = document.createElement(tag); if (className) node.className = className;
        if (text !== undefined) node.textContent = text; return node;
      };
      const screen = el('main', 'entry-gate'), card = el('section', 'entry-card');
      const heading = el('h1', '', t('title')); heading.tabIndex = -1;
      const clockBox = el('div', 'entry-italy');
      function face(className, minute, hour) {
        const clock = el('span', 'entry-clock ' + className);
        clock.setAttribute('role', 'img');
        clock.setAttribute('aria-label', t('clock', minute || 12, hour || 12));
        [1, 2, 3].forEach(frame => {
          const image = el('img', 'entry-clock-face entry-clock-face-' + frame);
          image.src = '/assets/clock/face-' + frame + '.png'; image.alt = ''; image.draggable = false;
          clock.append(image);
        });
        ROMAN.forEach((numeral, index) => {
          const angle = (index + 1) * Math.PI / 6;
          const number = el('span', 'entry-roman', numeral);
          number.style.left = `${50 + Math.sin(angle) * 29}%`;
          number.style.top = `${50 - Math.cos(angle) * 29}%`;
          number.setAttribute('aria-hidden', 'true'); clock.append(number);
        });
        const short = el('span', 'entry-hand entry-hour'), long = el('span', 'entry-hand entry-minute');
        short.style.transform = `rotate(${hour * 30}deg)`; long.style.transform = `rotate(${minute * 30}deg)`;
        clock.append(short, long);
        return { clock, short, long };
      }
      const live = face('entry-live', 0, 0);
      clockBox.append(live.clock);
      const stage = el('div', 'entry-stage');
      card.append(clockBox, heading, stage); screen.append(card); container.replaceChildren(screen); heading.focus();
      function updateTime() {
        const time = italyTime();
        live.short.style.transform = `rotate(${time.hourAngle}deg)`;
        live.long.style.transform = `rotate(${time.minuteAngle}deg)`;
        live.clock.setAttribute('aria-label', t('live', time.label));
      }
      updateTime(); const liveTimer = root.setInterval(updateTime, 1000);
      function clearRound() { root.clearTimeout(previewTimer); root.clearInterval(roundTimer); }
      function cleanup() { clearRound(); root.clearInterval(liveTimer); root.removeEventListener('pagehide', cleanup); }
      root.addEventListener('pagehide', cleanup);
      function fail(timedOut = false) {
        if (closed) return;
        closed = true; phase = 'denied'; cleanup();
        try { root.sessionStorage.removeItem(PASS_KEY); } catch {}
        heading.textContent = t(timedOut ? 'denied' : 'failed'); stage.replaceChildren(el('p', '', t('close')));
        resolve(false);
        try { root.close(); } catch {}
        // Browsers normally forbid closing tabs not opened by a script.
        try { if (!root.closed) root.location.replace('about:blank'); } catch { /* denied screen remains */ }
      }
      function pass() {
        if (closed) return;
        closed = true; cleanup();
        try { root.sessionStorage.setItem(PASS_KEY, 'yes'); } catch {}
        container.replaceChildren(); resolve(true);
      }
      function choose(index) {
        if (closed || phase !== 'answer') return;
        if (Date.now() >= deadline) { fail(true); return; }
        phase = 'checking'; clearRound();
        if (index !== question.correctIndex) { fail(); return; }
        round++;
        if (round === 3) pass(); else showQuestion();
      }
      function showQuestion() {
        clearRound(); phase = 'preview'; question = makeQuestion();
        heading.textContent = t('challenge'); clockBox.hidden = true; stage.replaceChildren();
        const progress = el('h2', 'entry-progress', `${roman(round + 1)} / III`); progress.tabIndex = -1;
        progress.setAttribute('aria-label', t('round', round + 1));
        const equation = el('div', 'entry-equation');
        question.clocks.forEach((clock, index) => {
          if (index) equation.append(el('span', 'entry-plus', '+'));
          equation.append(face('', clock.minute, clock.hour).clock);
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
      const buttons = el('div', 'entry-actions'), yes = el('button', 'entry-yes', t('yes')), no = el('button', 'entry-no', t('no'));
      yes.type = no.type = 'button';
      yes.addEventListener('click', () => { if (phase === 'welcome' && !closed) showQuestion(); });
      no.addEventListener('click', () => fail());
      buttons.append(yes, no);
      stage.append(buttons);
    });
  }
  root.EntryGate = { start, italyTime, makeQuestion, TEXT };
})(typeof globalThis !== 'undefined' ? globalThis : window);
