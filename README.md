# 20 Pagine — scacchi estremi

Sito statico con API Node.js su Vercel e partite online salvate in Upstash Redis.
Richiede Node.js 22. Acorn è una dipendenza di sviluppo usata per generare il catalogo dei testi.

## Attivare le lobby su Vercel (passo per passo)

1. Pubblica queste modifiche nel repository collegato a Vercel.
2. Apri il progetto Vercel → **Storage / Marketplace** → **Upstash Redis**.
   Crea/collega un database Redis (non Vector).
3. In **Settings → Environment Variables** imposta:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN` (token REST con permessi di scrittura, non read-only)
   Puoi copiarli dalla console del database Upstash, se l'integrazione non li aggiunge.
   Sono supportati anche i nomi `KV_REST_API_URL` / `KV_REST_API_TOKEN`.
   Non usare `REDIS_URL`: questo backend usa l'API REST HTTPS, non TCP.
4. Abilita le variabili per **Production** e, se vuoi testare le PR, **Preview**.
   Non mettere i valori nell'HTML, in Git o in chat.
5. Impostazioni build Vercel: framework **Other**, comando `npm run build`,
   directory di output **public**. `vercel.json` contiene già questi valori e le
   riscritture delle API: rimuovi eventuali override diversi nelle impostazioni.
6. Esegui un **nuovo deployment / Redeploy** dopo aver impostato le variabili.
7. Apri il deployment aggiornato, scegli **Online 1v1** (versione italiana), crea
   una partita e apri il link in un altro browser/dispositivo per entrare coi Neri.
   Verifica una mossa a testa e un ricaricamento della pagina.

Un 404 HTML su `/api/matches` indica un deployment statico/vecchio o una
configurazione delle Functions non applicata. Un **503 JSON** con i nomi delle
variabili indica che le API esistono, ma Redis non è configurato. Un 404 JSON con
“Partita non trovata o scaduta” indica invece un codice lobby inesistente/scaduto.
In caso di 503 “Database non raggiungibile”, controlla token REST, URL e stato
Upstash. Non condividere i token nei log/screenshots.

## Comportamento e limiti

- Il creatore gioca coi Bianchi; il primo ospite coi Neri. Lobby piena: 409.
- Il token giocatore resta nel localStorage del browser. Tornando col link dallo
  stesso browser si recupera il proprio posto. Senza token non si può recuperare
  un posto già occupato; non cancellare i dati del sito durante una partita.
- Stato condiviso e scritture atomiche Redis: non viene usata memoria locale
  delle Functions. Join e mosse concorrenti non sovrascrivono lo stato.
- Mosse, turno, promozioni e risultati vengono verificati sul server con le stesse
  regole 10×10 dell'interfaccia. Il risultato dichiarato dal client è ignorato.
- Ogni partita scade dopo **24 ore dall'ultima modifica**. Il polling non rinnova
  la scadenza. I token sono memorizzati su Redis solo come hash SHA-256.
- Polling ogni 1,2 secondi: controlla l'utilizzo e i limiti del piano Upstash/Vercel.
  Sono presenti limiti di richieste per IP (creazione, join, scrittura, lettura),
  non un sistema anti-abuso completo. Persone sulla stessa rete condividono i limiti.
- Non ci sono account, recupero credenziali, WebSocket o lobby francesi.
- Il codice lobby consente di leggere lo stato pubblico della partita; non è una
  credenziale per muovere i pezzi.

## Sviluppo e test

```sh
npm test
npm run build
```

Il motore del server in `lib/chess.cjs` è generato dalle regole di `index.html`.
Dopo aver cambiato le regole, esegui `node scripts/sync-engine.cjs`; i test
controllano che le due copie non divergano. Il build genera il sito in `public/`
(esclusa da Git); le Functions in `api/` sono distribuite separatamente da Vercel.
Non aprire solo il file HTML per provare l'online: serve un deployment Vercel,
oppure `vercel dev` con le variabili del file `.env.example` configurate localmente.
I test usano uno store simulato: non richiedono token e non contattano Upstash.
Il collegamento effettivo a Upstash va verificato dopo il deployment.


## Pannello riservato dei testi: `/panel`

Il percorso non è collegato dal sito ed è marcato `noindex`, ma **non è la
segretezza dell’URL a proteggerlo**: tutte le operazioni di modifica sono
verificate dal server. Per abilitarlo:

1. In Vercel → Settings → Environment Variables aggiungi `PANEL_PASSWORD`, con
   la password privata che hai scelto. Non inserirla in HTML o nel repository.
2. Aggiungi `PANEL_SESSION_SECRET`, una stringa casuale di almeno 32 caratteri.
   Puoi generarla localmente con:
   ```sh
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```
   Non condividerla in chat. Usa un segreto differente dalla password.
3. Abilita le variabili per gli ambienti necessari ed esegui un nuovo deploy.
   Il pannello usa lo stesso Redis già configurato per le lobby.
4. Apri `https://TUO-SITO/panel`, accedi e cerca il testo da cambiare.
   Premi **Salva modifiche** e ricarica la pagina del gioco per applicarle.

Sono disponibili i testi italiani e francesi e i messaggi dinamici con
segnaposto `{0}`, `{1}`. Mantieni tutti i segnaposto e gli spazi significativi:
alcune frasi sono composte da più frammenti. Il catalogo viene estratto al build.
Per messaggi rari non in elenco usa **Aggiungi un testo non in elenco** con
l’originale esatto (o con segnaposto per le parti variabili).
Le modifiche riguardano testo visualizzato, non HTML, URL, classi CSS, codici
partita, notazione o valori numerici del motore. La pagina amministrativa stessa
non è personalizzabile da questo editor.

Le personalizzazioni sono conservate senza scadenza nella chiave Redis
`20pagine:site-text:v1`, separata dalle partite; un nuovo deploy non le cancella.
Le modifiche simultanee sono rilevate: in caso di conflitto ricarica prima di
salvare. Puoi ripristinare singoli testi o tutti gli originali, poi salvare.
La lettura delle personalizzazioni è pubblica (come i testi del sito): **non
inserire segreti nel contenuto**. Se Upstash non risponde, il gioco usa i testi
originali dopo un’attesa massima di 2,5 secondi.

L’accesso usa cookie firmati `HttpOnly`, `SameSite=Strict`, `Secure` su HTTPS,
con durata di 8 ore e limite di 5 tentativi di login al minuto per IP.
Cambiare password o segreto invalida le sessioni esistenti; usa comunque una
password lunga e unica. Non esiste una password predefinita nel codice.


## Ingresso «Hai fatto i compiti?» e prova di CHRONOS

Prima di montare il gioco (quindi prima di avviare video, IA o auto-join delle
lobby), il sito mostra un ingresso con i tre quadranti già presenti e l’ora
italiana in tempo reale, con sole lancette di ore e minuti e quadranti senza numeri. La
schermata iniziale mostra soltanto la domanda e i pulsanti SÌ/NO, senza istruzioni. Il fuso è `Europe/Rome`, con cambio automatico tra ora
solare e legale; l’ora deriva dall’orologio del dispositivo.

- **Sì:** tre prove consecutive. Il titolo diventa **RISPONDI**. Ogni prova mostra due orologi da sommare,
  un secondo di osservazione e quattro risposte (I–IV), con 12 secondi per rispondere.
  Anche avanzamento e conto alla rovescia usano numeri romani; l’orologio italiano
  viene nascosto durante le prove. Le descrizioni accessibili restano disponibili.
- Si sommano solo le posizioni delle lancette lunghe modulo 12; le corte sono
  distrattori. Le quattro alternative hanno posizioni lunghe distinte e una sola
  è corretta. Domande e alternative sono generate casualmente.
- **No**, errore o tempo scaduto: si tenta `window.close()`. Molti browser lo
  vietano sulle schede aperte normalmente; in quel caso si esce su `about:blank`.
  Se anche la navigazione è bloccata, resta una schermata di accesso negato.
- Tre risposte corrette salvano un lasciapassare in `localStorage` valido per
  **24 ore esatte dal completamento**, anche tra schede e riaperture dello stesso
  browser/profilo. Ricaricare o cambiare lingua non rinnova la scadenza. Non vengono
  usati IP né inviati dati a Redis. Eliminare i dati del sito o usare un altro
  browser richiede di ripetere il quiz; con storage bloccato si entra comunque dopo
  aver risposto correttamente, ma il successo non può essere ricordato.
- I quadranti non mostrano numeri romani; risposte, avanzamento e countdown sì.
  Sullo sfondo dell’ingresso e del quiz ci sono occhi decorativi che alternano
  le quattro immagini caricate. Restano dietro ai controlli, non intercettano
  tocchi/click e diventano statici con `prefers-reduced-motion`.
- `/panel` resta raggiungibile direttamente, con la sua autenticazione server.
  Questo ingresso è un gioco, **non un controllo di sicurezza**: è lato client.
- I nuovi testi italiani e francesi sono inclusi nel catalogo del pannello.
  Le animazioni rispettano `prefers-reduced-motion` e i pulsanti sono utilizzabili
  anche da tastiera; gli orologi hanno descrizioni per gli screen reader.

Meccanica ispirata alla prova a tre orologi di Chronos in The Battle Bricks:
https://the-battle-bricks.fandom.com/wiki/Chronos
https://thebattlebricks.miraheze.org/wiki/Chronos

### Sfida dopo una sconfitta

Lo scacco matto subito contro l'IA o in 1v1 locale mostra un jumpscare dell'occhio
(un solo zoom, senza lampeggi, disattivato con movimento ridotto) e la sequenza:
«BROO», «AVEVI DETTO DI AVER STUDIATO», «ORA BASTA»,
«INVECE DI ESSERE IL PROFESSORE ECCEZIONALE CHE SONO», «ASSEGNERÒ E BASTA»,
«È FINITA PER TE!!!», «VERGOGNATI». I messaggi sono testuali, tradotti anche in francese.
Poi partono automaticamente 300 domande da 15 orologi ciascuna.
In locale lo schermo è condiviso: la sfida è per chi ha perso. Online compare
solo al perdente (anche per resa), non al vincitore, agli spettatori o nelle patte;
esclusa la modalità IA contro IA. Non ci sono pulsanti di uscita dalla sfida né scorciatoie Escape; i normali comandi del browser restano disponibili.
Errore o timeout cancellano solo il pass d'ingresso di 24 ore e tentano di chiudere
la scheda; se il browser lo vieta si apre `about:blank`. Gli altri dati restano intatti.
Completare la sfida non rinnova il pass. Timer e animazione si interrompono all'uscita.


### Immagini e suoni del quiz

Lo sfondo e il jumpscare usano le tre nuove immagini in `assets/eyes/frame-{1,2,3}.webp`.
Gli effetti audio sono inclusi in `assets/sounds/`:
- `Chronos_math_sound.mp3`: nuova domanda.
- `Chronos_Clock_Question_Correct.mp3`: risposta giusta.
- `Chronos_Clock_Question_Incorrect.mp3`: errore o timeout.
Il quiz funziona anche se l’autoplay è bloccato.
Dopo un errore nella sfida attende 900 ms per il suono prima di uscire.
