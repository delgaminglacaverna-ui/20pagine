/* A playful entrance quiz, not authentication or an anti-cheat mechanism. */
(function (root) {
  const TEXT = {
    it: {
      title: 'HAI FATTO I COMPITI?', yes: 'Sì, metti alla prova il mio tempo', no: 'No',
      italy: 'Ora in Italia · Europe/Rome', intro: 'CHRONOS ti aspetta: 3 prove, 3 orologi da sommare, 4 risposte. Hai 12 secondi per ogni prova.',
      rules: 'Somma solo le posizioni delle lancette lunghe. La lancetta sul 12 vale 0; se la somma supera 11, riparti da 0. Le lancette corte sono un diversivo.',
      warning: 'Se rispondi No, sbagli o finisci il tempo, uscirai dal sito.',
      challenge: 'LA PROVA DI CHRONOS', round: 'Prova {0} di 3', preview: 'Osserva gli orologi…',
      remaining: 'Tempo rimasto: {0} s', denied: 'CHRONOS: tempo scaduto. Torna ai compiti!',
      close: 'Il browser potrebbe non permettere la chiusura: in quel caso si aprirà una pagina vuota.',
      answer: 'Risposta {0}', clock: 'Lancetta lunga sul {0}, lancetta corta sul {1}',
      failed: 'Accesso non consentito. Torna ai compiti!', live: 'Ora italiana: {0}',
    },
    fr: {
      title: 'AS-TU FAIT TES DEVOIRS ?', yes: 'Oui, mets mon temps à l’épreuve', no: 'Non',
      italy: 'Heure en Italie · Europe/Rome', intro: 'CHRONOS t’attend : 3 épreuves, 3 horloges à additionner, 4 réponses. Tu as 12 secondes par épreuve.',
      rules: 'Additionne seulement les positions des grandes aiguilles. Le 12 vaut 0 ; au-delà de 11, repars de 0. Les petites aiguilles sont une distraction.',
      warning: 'Si tu réponds Non, te trompes ou dépasses le temps, tu quitteras le site.',
      challenge: 'L’ÉPREUVE DE CHRONOS', round: 'Épreuve {0} sur 3', preview: 'Observe les horloges…',
      remaining: 'Temps restant : {0} s', denied: 'CHRONOS : temps écoulé. Retourne faire tes devoirs !',
      close: 'Si le navigateur bloque la fermeture, une page vide s’ouvrira.',
      answer: 'Réponse {0}', clock: 'Grande aiguille sur le {0}, petite aiguille sur le {1}',
      failed: 'Accès refusé. Retourne faire tes devoirs !', live: 'Heure italienne : {0}',
    },
  };
  function italyTime(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(date);
    const get = type => Number(parts.find(part => part.type === type).value);
    const hour = get('hour'), minute = get('minute'), second = get('second');
    return { hour, minute, second, label: [hour, minute, second].map(n => String(n).padStart(2, '0')).join(':'),
      hourAngle: (hour % 12 + minute / 60 + second / 3600) * 30,
      minuteAngle: (minute + second / 60) * 6, secondAngle: second * 6 };
  }
  function makeQuestion(random = Math.random) {
    const next = () => Math.floor(random() * 12);
    const clocks = Array.from({ length: 3 }, () => ({ minute: next(), hour: next() }));
    const answer = clocks.reduce((sum, clock) => sum + clock.minute, 0) % 12;
    const positions = Array.from({ length: 12 }, (_, i) => i).filter(i => i !== answer);
    const shuffle = list => { for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; } return list; };
    const options = shuffle([answer, ...shuffle(positions).slice(0, 3)]).map(minute => ({ minute, hour: next() }));
    return { clocks, options, correctIndex: options.findIndex(clock => clock.minute === answer) };
  }
  const PASS_KEY = '20pagine.chronos.passed.v1';
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
      function face(className, minute, hour, live = false) {
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
        let second;
        if (live) { second = el('span', 'entry-hand entry-second'); clock.append(second); }
        return { clock, short, long, second };
      }
      const live = face('entry-live', 0, 0, true), digital = el('time', 'entry-digital');
      clockBox.append(live.clock, el('p', 'entry-zone', t('italy')), digital);
      const stage = el('div', 'entry-stage');
      card.append(clockBox, heading, stage); screen.append(card); container.replaceChildren(screen); heading.focus();
      function updateTime() {
        const time = italyTime();
        live.short.style.transform = `rotate(${time.hourAngle}deg)`;
        live.long.style.transform = `rotate(${time.minuteAngle}deg)`;
        live.second.style.transform = `rotate(${time.secondAngle}deg)`;
        live.clock.setAttribute('aria-label', t('live', time.label));
        digital.textContent = time.label; digital.dateTime = new Date().toISOString();
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
        heading.textContent = t('challenge'); clockBox.className = 'entry-italy entry-italy-compact'; stage.replaceChildren();
        const progress = el('h2', '', t('round', round + 1)); progress.tabIndex = -1;
        const equation = el('div', 'entry-equation');
        question.clocks.forEach((clock, index) => {
          if (index) equation.append(el('span', 'entry-plus', '+'));
          equation.append(face('', clock.minute, clock.hour).clock);
        });
        equation.append(el('span', 'entry-plus', '= ?'));
        const countdown = el('p', 'entry-countdown', t('preview'));
        countdown.setAttribute('role', 'timer'); countdown.setAttribute('aria-live', 'off');
        const choices = el('div', 'entry-choices');
        stage.append(progress, equation, countdown, choices); progress.focus();
        previewTimer = root.setTimeout(() => {
          if (closed || phase !== 'preview') return;
          phase = 'answer'; deadline = Date.now() + 12000;
          question.options.forEach((clock, index) => {
            const button = el('button', 'entry-choice'); button.type = 'button';
            button.setAttribute('aria-label', t('answer', String.fromCharCode(65 + index)) + ': ' + t('clock', clock.minute || 12, clock.hour || 12));
            const illustration = face('', clock.minute, clock.hour).clock; illustration.setAttribute('aria-hidden', 'true');
            button.append(el('span', 'entry-answer-letter', String.fromCharCode(65 + index)), illustration);
            button.addEventListener('click', () => choose(index)); choices.append(button);
          });
          function tick() {
            if (closed || phase !== 'answer') return;
            const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
            countdown.textContent = t('remaining', seconds);
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
      stage.append(el('p', 'entry-intro', t('intro')), el('p', '', t('rules')), el('p', 'entry-warning', t('warning')), buttons);
    });
  }
  root.EntryGate = { start, italyTime, makeQuestion, TEXT };
})(typeof globalThis !== 'undefined' ? globalThis : window);
