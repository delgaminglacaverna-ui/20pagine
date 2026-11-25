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

Lo scacco matto subito contro l'IA mostra un jumpscare della bocca
(un solo zoom, senza lampeggi, disattivato con movimento ridotto) e la sequenza:
«BROO», «AVEVI DETTO DI AVER STUDIATO», «ORA BASTA»,
«INVECE DI ESSERE IL PROFESSORE ECCEZIONALE CHE SONO», «ASSEGNERÒ E BASTA»,
«È FINITA PER TE!!!», «VERGOGNATI». I messaggi sono testuali, tradotti anche in francese.
Poi partono automaticamente 300 domande da 15 orologi ciascuna.
La sfida si attiva perdendo contro l'IA oppure online (anche per resa), solo per il perdente.
È disattivata in PvP locale, nelle patte e in IA contro IA. Non ci sono pulsanti di uscita dalla sfida né scorciatoie Escape; i normali comandi del browser restano disponibili.
Errore o timeout cancellano solo il pass d'ingresso di 24 ore e tentano di chiudere
la scheda; se il browser lo vieta si apre `about:blank`. Gli altri dati restano intatti.
Completare la sfida non rinnova il pass. Timer e animazione si interrompono all'uscita.


### Immagini e suoni del quiz

Il quiz normale usa i quattro occhi originali in `assets/eyes/frame-{1,2,3,4}.webp`.
Una sconfitta contro l'IA mostra subito le tre bocche in `assets/mouths/frame-{1,2,3}.webp`,
sia nel jumpscare sia durante la sfida successiva. Anche un errore/timeout nel quiz normale
trasforma gli occhi in bocche. I quadranti del quiz alternano tutte e tre le immagini
`assets/clock/face-{1,2,3}.png`, 200 ms ciascuna (solo la prima con movimento ridotto).
Gli effetti audio sono inclusi in `assets/sounds/`:
- `chronos_math_sound.mp3.MPEG`: nuova domanda.
- `Chronos_Clock_Question_Correct.mp3.MPEG`: risposta giusta.
- `Chronos_Clock_Question_Incorrect.mp3.MPEG`: errore o timeout.
Il quiz funziona anche se l’autoplay è bloccato.
Una risposta sbagliata sovrappone le tre X animate di `assets/wrong/` a tutti e tre i quadranti
con risposta errata, anche al timeout; la risposta corretta resta senza X. Nessun messaggio di sconfitta.
Il quiz aspetta la fine di Correct prima della domanda successiva (o dell’accesso finale)
e il 60% di Wrong prima di chiudere, anche nel quiz iniziale. Errori audio o autoplay
bloccato non fermano il quiz; un watchdog di 60 secondi gestisce caricamenti/playback bloccati.

Gli otto occhi del quiz iniziale sono cliccabili fin dalla prima visita e diventano
le nuove immagini di occhi chiusi in `assets/closed-eyes/`. Ogni occhio conta una sola volta:
3 su 8 eliminano una risposta sbagliata, 6 su 8 ne eliminano due, 8 su 8 tutte e tre.
Gli aiuti restano per tutte le domande di quel quiz; non saltano l'ingresso e non
si applicano alla sfida dopo sconfitta a scacchi. Nessun rientro automatico dopo errore.
Il timer delle pubblicità, quando pronto per saltare, mostra le stesse X animate
sopra il quadrante anziché diventare verde; i 30 secondi e il click restano invariati.

La bocca alterna i tre fotogrammi originali ogni 240 ms (ciclo di 720 ms);
la velocità degli occhi resta invariata e il movimento ridotto resta rispettato.

Errore o timeout nella sfida da 15 orologi chiudono subito la pagina (fallback `about:blank`),
senza far riapparire Chronos e senza attendere Wrong. Il quiz iniziale mantiene il feedback al 60%.

### Browser LIM / display integrati

Il CSS utility incorporato usa cascade layers, ignorati interamente da alcuni
browser Chromium meno recenti. `assets/legacy-layout.css` replica le stesse utility
senza `@layer` e converte la palette OKLCH in sRGB; è generato da
`node scripts/legacy-css.cjs` e rigenerato automaticamente dalla build.
Non modificarlo a mano. È caricato anche nel sorgente, non solo nel deployment.
La scacchiera principale imposta inoltre le dieci righe/colonne esplicitamente,
limita la dimensione minima delle celle e misura l'altezza quadrata senza dipendere
da `aspect-ratio`. Il ridimensionamento mantiene il fallback senza ResizeObserver.
I test coprono CSS generato e misurazioni; la verifica fisica su Philips LIM resta da fare.

### Ripassa

Il pulsante **Ripassa** apre un minigioco separato, senza consumare o modificare
il pass d'ingresso. Impostazioni: 1–120 secondi per domanda (default 12), 1–15
orologi (default 2), poi domande infinite. Il contatore mostra la streak corrente;
errore o timeout la riportano a zero e parte un'altra domanda, dopo Wrong.
Le risposte corrette mantengono l'attesa della fine del suono Correct.

Gli otto occhi sono inizialmente chiusi. Inizialmente ogni 5 secondi si apre un occhio chiuso
scelto a caso; cliccarlo lo richiude e può riaprirsi successivamente. Se un occhio
resta aperto per 4 secondi, tutti diventano bocche, lo sfondo diventa blu e appare
«PERCHè è TUTTO BLUE?!?!» per 500 ms prima di tentare la chiusura (fallback
`about:blank`). I timer usano scadenze reali, anche dopo un cambio scheda.
Prima di iniziare: «NON FARE I COMPITI IN CLASSE!(o non farti beccare...)».

**Torna agli scacchi** o Escape escono dal minigioco e ripuliscono timer/audio.
Durante il ripasso IA e cronometri locali sono in pausa; le partite online
continuano sul server e gli eventuali risultati vengono gestiti al ritorno.

Ripassa è accanto alle modalità di gioco. La scheda, gli occhi decorativi e la
disposizione dei due orologi usano lo stesso layout del quiz iniziale; con più
di tre orologi l’equazione va a capo per restare leggibile.

Nel ripasso, ogni 5 punti di streak l’occhio diventa più veloce, alternando
riduzioni iniziali di 250 ms e 500 ms (poi ×1,5 per coppia): a 5 l’intervallo è 4,75 s, a 10 è 4,25 s,
a 15 è 3,875 s e a 20 è 3,125 s. Il minimo è 1,5 s (raggiunto a streak 30).
Un errore o timeout azzera la streak e ripristina l’intervallo di 5 s.
Il numero di orologi resta sempre quello configurato, anche oltre streak 10.


### Titolo e icona della scheda

`assets/tab-state.js` aggiorna il titolo e un singolo favicon secondo la modalità:
Compiti → occhio aperto; scacchi → pedone; versione francese → sigaretta;
Ripassa → occhio chiuso; Chronos infuriato (sconfitta, errore d'ingresso o scoperta
nel ripasso) → bocca. Uscire dal ripasso ripristina il titolo/icona precedenti.
Le immagini degli occhi e della bocca usano i fotogrammi esistenti; pedone e
sigaretta hanno icone SVG locali. Le icone della scheda sono statiche.

Titoli esatti della scheda:
- Compiti: `HAI FATTO I COMPITI???`
- Scacchi: `TEMPO ESTREMO COME IL DIH`
- Francese: `(gbfjkdfugyfhdjk)/`
- Ripassa: `NON SI FANNO I COMPITI IN CLASSE!!`
- Chronos: `IO SAREI MORTIFICATO, NON PROVI VERGOGNA`

Solo nella versione francese (`/french`), i titoli Compiti/Ripassa/Chronos
sono rispettivamente `MIO FIGLIO HA STUDIATO L'INGLESE E LAVORA IN FRANCIA`,
`perchè è tutto blanc` e `los tempos es bellos hahahas`. Icone e titolo degli
scacchi francesi restano invariati.

### ENFOSI AD (easter egg)

Ripassa è ora un pulsante discreto in fondo alla pagina, visibile anche alla
navigazione da tastiera (non è rimosso dall'accessibilità).
Tre clic sul timer della TBB AD entro una finestra mobile di 10 secondi attivano
la variante `/risio` con ENFOSI AD. La navigazione ricomincia la partita. I clic contano anche durante il countdown,
ma non permettono di saltare prima dei 30 secondi. Il terzo clic attiva la modalità
senza saltare il nuovo contenuto e riparte il countdown.

La faccina allegata (`assets/enfosi/smiley.png`) sostituisce il timer visivo e ruota
una volta ogni 15 secondi, salvo preferenza movimento ridotto. Il player YouTube
viene distrutto e sostituito da una delle undici GIF o dall'MP4 locale; skip e fine
video scelgono un contenuto diverso e fanno ripartire il timer. Le GIF dipendono
da KLIPY e hanno la faccina come fallback se non disponibili:
- https://klipy.com/gifs/glaggleland-glaggle-1
- https://klipy.com/gifs/enfosi-blud-obby-disloyalcloth-stream-preview
- https://klipy.com/gifs/cheerer-being-pet-aww

I file caricati nel repository sono spostati in `assets/enfosi/rushing.mp4` e
`assets/enfosi/risio.mp3`, senza ricodifica, e inclusi nella build. L'MP3 tenta l'avvio
all'apertura della variante e va in loop, con controllo audio dedicato; l'MP4 è muto
per non sovrapporre due tracce. Se l'autoplay audio viene bloccato, usare il
pulsante audio. Il widget resta trascinabile.


### Variante /risio

Il triplo clic sull'orologio apre `/risio` (accessibile anche direttamente).
Qui l'ingresso non richiede il quiz e non modifica il pass di 24 ore. Il widget
parte come ENFOSI AD. I pezzi usano le immagini caricate, solo in questa variante:
- Pedone: faccina gialla originale (`assets/enfosi/smiley.png`).
- Cavallo: Kruzzit; alfiere: Yippeeyay; torre: Glogga.
- Regina: Floopfang; re: Zorker; estremo: Blepzo.
I neri sono ruotati di 180° con colori invertiti. Le promozioni e le anteprime
usano la stessa mappatura. Le immagini degli altri pezzi sono in `assets/risio/`.

Online 1v1, Ripassa e selettore francese non sono disponibili; anche parametri
`?version=french` e `?partita=...` vengono ignorati. Nessuna sconfitta evoca Chronos.
La pagina oscilla e si comprime, con tinta gialla non interattiva. La preferenza
movimento ridotto disabilita il ballo. L'icona della scheda è la faccina.
**Torna alla normalità** apre `/`: pezzi testuali, modalità normali, quiz d'ingresso
con il pass esistente e pubblicità TBB sono ripristinati. Le partite non vengono
trasferite fra le due pagine. Le rewrite Vercel coprono `/risio` e `/risio/`.


Aggiornamento RISIO: l'animazione dura 3,6 secondi e alterna uno schiacciamento
verticale al 94% e un allungamento al 104,5%, con oscillazione di ±0,7°. Il movimento
ridotto continua a disabilitarla. Solo in `/risio`, il nome dell'IA è **RISIO**
e il pezzo speciale è **L'enfoso** (immagine Blepzo), incluse modalità, statistiche,
descrizioni e aperture che nominano il pezzo. Le regole non cambiano.

La playlist ENFOSI comprende anche queste otto GIF (11 GIF totali + MP4):
- https://klipy.com/gifs/smile-more-enfosi
- https://klipy.com/gifs/scratch-my-belly-gloober
- https://klipy.com/gifs/enfosi-tumore-2
- https://klipy.com/gifs/glaaber-from-enfosi-absolutely-hitting-it
- https://klipy.com/gifs/grug-enfosi
- https://klipy.com/gifs/roblox-enfosi
- https://klipy.com/gifs/enfosi-scribladd
- https://klipy.com/gifs/when-the-enfosi-glagglleand
Restano caricamenti esterni da KLIPY con fallback locale e rotazione casuale
senza ripetizione immediata.

In `/risio` il cooldown per cambiare ENFOSI AD è 2,5 secondi a ogni cambio
(la versione normale mantiene 30 secondi). Tutte le dieci aperture e i testi
introduttivi hanno nomi a tema ENFOSI/RISIO, senza modificare mosse o regole.

Le aperture RISIO usano anche i nomi Giggler, Gazo, Gloober, Gembo, Cheerer,
Gleeber e Glaaber; “Smiley” non è usato come nome di un enfoso nelle aperture.
Le immagini originali di pedone e timer restano invariate.


RISIO: nessun pulsante mute nella pagina. La musica prova l'autoplay e riprova
alle interazioni (i controlli audio del browser/dispositivo restano disponibili).
Non è presente una testa decorativa durante il gioco, né su desktop né su mobile.
Una sconfitta umana contro l'IA RISIO
mostra la faccia a schermo intero per 900 ms e poi apre nella stessa scheda
https://sites.google.com/view/enphosoweb?pli=1&authuser=0 . Pareggi e partite
locali fra umani o fra IA non attivano il jumpscare. Nessun lampeggio o audio extra.

Il ballo della pagina RISIO include anche piccoli saltelli (6 px verso l’alto)
e un’oscillazione laterale di 4 px, mantenendo il ciclo morbido da 3,6 s.
Il movimento ridotto disabilita il ballo; il jumpscare resta indipendente.

Solo RISIO: il riquadro commentatore dice “bip bup”, senza pop-up separati.
Ogni arrocco (corto o lungo, di entrambi i colori) aggiunge una pioggia decorativa
di enfosi per circa un secondo, senza bloccare i clic. Con movimento ridotto
le immagini restano ferme. Caricamento aperture, annulla e ripeti non generano effetti.

Solo in `/risio`, i nomi visibili dei colori sono **Bianco Glaggles** e
**Nero Enfosi**, anche nei turni, timer, profondità e risultati. I colori
interni del motore e le altre versioni restano invariati.


Playlist ENFOSI aggiornata: **14 GIF + 2 video**, con le aggiunte:
- https://klipy.com/gifs/enfosi-risio
- https://klipy.com/gifs/enphosian-glaggleland-enphosian-bean
- https://klipy.com/gifs/enfosi-gloober
- `assets/enfosi/enfosi-upload.mp4`, conversione H.264/AAC con faststart del
  file originale `v12044gd0000dbijqp7og65ogbohiss0.mov`, conservato nella root.
Il video usa lo stesso autoplay muto, skip dopo 2,5 s e avanzamento a fine video
previsti per gli altri contenuti RISIO. Le ad del sito normale non cambiano.

Chronos browser-tab icons (open eye, closed eye and mouth) use separate
light-blue-tinted PNGs in `assets/tabs/chronos-*.png` for visibility on light
browser chrome. Original in-page animation frames, titles and other mode icons
are unchanged. The initial HTML favicon uses the same tinted eye.


### Commentatore mosse
Le mosse locali dal vivo ricevono un simbolo nel registro e un commento sotto
la scacchiera. La ricerca gira in un Web Worker sul motore 10×10 del sito
(profondità obiettivo 4 semimosse, budget ~4 s; indisponibile se non completa nemmeno un livello).
Non usa Stockfish e non riproduce l'algoritmo proprietario di chess.com.
Il commentatore si chiama **boi battler dice:**. Scala dei simboli:
- `??` Grave errore: perdita >=300 centesimi rispetto alla migliore trovata.
- `X` Errore / occasione mancata: perdita >=150 e <300.
- `?!` Imprecisione: perdita >=80 e <150.
- `V` Decente: perdita >25 e <80.
- Due ✓ sovrapposti: Buona, perdita <=25 ma non la migliore a pari merito.
- 👑 Migliore: punteggio massimo trovato, inclusi eventuali ex aequo.
- `!` Eccezionale: migliore unica con margine >=150 sulle alternative.
- `!!` Brillante: migliore unica con sacrificio, margine >=80 sulle alternative.
Gli ultimi due richiedono almeno profondità 2 completata e valutazione >=-50;
non vengono regalati a ogni mossa corretta. “Eccezionale” e “Brillante” sono
riconoscimenti aggiuntivi alla migliore mossa, non punteggi superiori al massimo.
Il sacrificio è un'euristica: pezzo attaccabile da uno meno prezioso, tenendo
conto del materiale già catturato. Non prova la correttezza a lungo termine.
La ricerca breve può sbagliare: non è un verdetto definitivo né un rilevatore
perfetto di pezzi persi o mosse mancate. La classificazione usa il punteggio,
non il solo fatto di aver mosso o catturato un pezzo.
Online il commentatore valuta solo le mosse già compiute dal giocatore locale, bianco o nero: voti e commenti restano nel suo browser e non vengono inviati al rivale. Suggerimenti prima della mossa e spiegazioni API restano disabilitati.
Aperture caricate sono marcate Theory senza ricerca; annulla ripristina il commento precedente,
ripeti conserva la valutazione già ricevuta. I simboli non entrano nella notazione copiata.
In RISIO le valutazioni sono volutamente parodistiche: umano vs IA ??/!!,
IA vs IA 67, umano vs umano ??; il commento resta sempre “bip bup”.

Aggiornamento occhio ripasso: gli upgrade a 5/10/15/20 sono rispettivamente
-0,25/-0,50/-0,375/-0,75 s. Ogni coppia successiva moltiplica le riduzioni
per 1,5; intervalli 4,75/4,25/3,875/3,125 s, minimo 1,5 s dalla streak 30.
Il numero configurato di orologi non cambia e l'errore ripristina 5 s.


Il commentatore espone anche la valutazione del motore in unità di pedone,
sempre dal punto di vista del Bianco (+ Bianco, − Nero), con profondità raggiunta.
Non è la confidenza di un modello linguistico: è la stima scacchistica della
posizione dopo la mossa. Se l'analisi manca/fallisce resta “—”, senza inventare
punteggi. In RISIO non si mostra un'evaluation numerica per non confondere
le valutazioni parodistiche con un'analisi reale.
Il simbolo dell'ultima mossa appare nell'angolo in alto a destra della casa
di arrivo, anche a scacchiera ruotata, oltre che nel registro. Si aggiorna con
annulla/ripeti e scompare al reset, in assenza di analisi e quando la mossa online appartiene all’avversario.


### Theory e API di boi battler
Le sequenze che corrispondono a un prefisso esatto di una delle dieci aperture
del sito sono **📖 Theory**, sia giocate sia caricate. Non è un database di teoria
8×8: la prima deviazione smette di essere Theory. I voti scherzosi RISIO hanno
precedenza e non chiamano API; online il commentatore mostra soltanto le proprie mosse, con analisi locale a profondità 3 (Stockfish nella pagina boring). Alla riconnessione recupera il commento della propria ultima mossa.

Dopo l'analisi di una mossa locale fuori repertorio, il client chiama `POST /api/coach`
con la cronologia, l'alternativa trovata, perdita stimata e profondità. Il server
ricostruisce la partita e verifica la legalità di entrambe le mosse usando le
stesse regole 10×10 (anche francesi). Fornisce una spiegazione concreta con case,
catture, scacco/matto e alternativa; non afferma che una cattura legale sia forzata.
I punteggi rimangono stime della ricerca client, non una seconda analisi server.

Facoltativamente configura **OPENAI_API_KEY** solo sul server Vercel e ridistribuisci;
`COACH_MODEL` sceglie il modello (default `gpt-4.1-mini`). La chiave non va in chat,
HTML o frontend. Il modello riceve soltanto fatti scacchistici verificati e stime
del motore, non IP, credenziali o altri dati del giocatore; la richiesta arriva dal
server a OpenAI e può avere costi. La fonte “AI” è indicata nell'interfaccia.
Servono anche le variabili Upstash esistenti per limitare le chiamate a pagamento
(8/minuto per IP, 100/minuto globali). Se mancano chiave/limitatore, si raggiunge
il limite o il provider fallisce, l'API restituisce la spiegazione deterministica
senza chiamate a pagamento. Questi limiti non sostituiscono un tetto di spesa
nell'account del provider. Gli errori di rete client lasciano il commento locale.

Il collegamento al provider è testato con risposte simulate, non con una chiave
reale in questo ambiente. Le spiegazioni generate possono comunque sbagliare e
non modificano simboli o punteggi. Il browser invia solo richieste same-origin;
l'endpoint accetta POST JSON, limita il corpo e rifiuta origini diverse.

Navigazione nel tempo: ogni clic su indietro/avanti percorre una singola
semimossa (Bianco oppure Nero), anche contro IA. Durante la navigazione
IA, timer, suggerimenti e conseguenze di sconfitta sono sospesi. Tornando
all’ultima mossa con Avanti, la pausa termina automaticamente e puoi giocare
(o riparte l’IA se tocca a lei). “Riprendi
da qui” scarta le mosse future e riparte dalla posizione visualizzata; se
tocca al Nero contro IA, il motore riprende a giocare. Reset esce dalla pausa.


Il motore dei voti ora cerca fino a **4 semimosse** (non quattro turni completi),
con approfondimento iterativo e budget di 4 s. Mostra sempre il livello davvero
completato, che può essere inferiore su posizioni costose; non promette profondità
4 se il tempo scade. Il nuovo ricercatore conserva la variante principale di ogni
candidato, con controlli di legalità, matto, patta e ripetizione. I punteggi di tutti
i candidati usati per un voto provengono dallo stesso livello completato.
L'API riceve e verifica le linee della mossa giocata e dell'alternativa; boi battler
cita la risposta di quella linea, non la cattura legale di valore più alto.
Una variante prevista non è un piano garantito: l'IA di gioco può cercare a una
profondità diversa. In assenza di continuazione, il commento dichiara il limite.

In giocatore vs IA (normale e francese), tutte le mosse avviano la ricerca dei
voti, incluse quelle dell'IA. Solo le mosse umane fuori repertorio richiedono
spiegazioni a `/api/coach`: boi battler continua a commentare l'ultima mossa umana.
Evaluation numerica e badge seguono invece l'ultima mossa di qualunque colore.
Durante l'analisi o se questa fallisce, l'evaluation mostra una stima statica
esplicitamente indicata, non una finta profondità di ricerca. Le mosse Theory
mantengono libro e nome dell'apertura, ma ricevono anche la ricerca numerica.
PvP e IA vs IA mantengono i commenti per entrambe le parti.
In RISIO il riquadro si chiama **RISIO dice:** e continua a dire “bip bup”; il
pop-up separato è rimosso. Festa dell'arrocco e jumpscare restano invariati.


### Le tue partite · Analisi
Le partite vengono salvate automaticamente in localStorage (`20pagine.games.v1`),
senza IP, account, cookie identificativi o sincronizzazione server. Sono riconosciute
per browser/profilo/origine: cancellare i dati del sito le elimina; la navigazione
privata può non conservarle. Non si recuperano partite precedenti a questa funzione.
Sono conservate le ultime 50 partite (massimo 600 semimosse ciascuna), incluse
interrotte, con variante, modalità, data, stato, mosse e valutazioni. Non si salvano
token online o credenziali. Se lo storage è bloccato/pieno, l'archivio segnala il limite.
Reset/modalità iniziano una nuova voce; riprendere da un punto passato crea una
nuova partita senza sovrascrivere il ramo originale. Sfogliare la cronologia non
riscrive il salvataggio. Un ritorno al presente prosegue la stessa voce.

Il pulsante “Le tue partite · Analisi” apre l'elenco, dettaglio mosse ed eliminazione.
“Analizza / riprendi” esamina in sequenza le mosse senza valutazione, salvando ogni
risultato e mostrando evaluation/variante; si può interrompere o chiudere. Non fa
chiamate linguistiche a pagamento in blocco. La profondità resta fino a 4 semimosse
con budget e indicazione del livello effettivo. RISIO conserva i voti parodistici.
Il dettaglio riproduce la partita su una scacchiera di analisi in sola lettura, separata dalla partita live.


La ricerca rapida durante la partita ha ora obiettivo **3 semimosse**; l'analisi
completa nell'archivio ha obiettivo **4**. Il livello completato e il relativo
obiettivo sono indicati separatamente; il budget resta di 4 s per posizione.
L'archivio ricalcola a obiettivo 4 anche le mosse già valutate rapidamente e
analizza entrambi i colori, comprese le mosse dell'IA. I risultati completi già
salvati possono essere ripresi senza ripartire dall'inizio. Theory e parodia
RISIO restano riconoscibili; gli errori di analisi si possono ritentare.

Il dettaglio dell'archivio include ora la stessa UI della scacchiera, in sola
lettura: inizio, mossa precedente/successiva, fine, rotazione e selezione di una
mossa dal registro. Durante l'analisi passa alla mossa esaminata e mostra il voto
appena disponibile. Replay e regole rispettano la variante salvata (normale,
francese o RISIO), anche aprendola da un'altra versione del sito. Non avvia IA,
Chronos, pubblicità, effetti RISIO né modifica la partita live.


Localisation française : le commentateur, les libellés/commentaires des notes,
les explications API (ainsi que la consigne du fournisseur IA optionnel), les
états de recherche, l'archive et la navigation du replay sont traduits.
Les anciennes explications API italiennes sauvegardées affichent une description
française du vote ; les nouvelles explications sont générées directement en français.
Les valeurs numériques, les symboles et les règles du jeu ne sont pas modifiés.


### Modalità online condivisa (prefisso del codice)
Le nuove lobby fissano una sola modalità per entrambi i giocatori. La prima cifra
del codice a 8 caratteri identifica la modalità:

- **0** normale 10×10
- **1** francese (niente mosse verso sinistra né arrocco, per entrambi)
- **2** RISIO
- **3** boring, scacchi classici 8×8
- **4** Dash, scacchi 10×10 con le icone caricate di Geometry Dash

Creazione e ingresso sono verificati dal server: il browser che entra legge la
modalità e raggiunge la pagina corretta prima di occupare il posto. Cambiare URL
o inviare una variante diversa non cambia le regole della lobby. Gli URL restano
`/?partita=CODICE`, `/french?partita=CODICE`, `/risio?partita=CODICE`,
`/boring?partita=CODICE`. I vecchi codici senza metadato `mode` conservano le regole
originali personali per compatibilità. I commenti online restano privati e solo
successivi alle proprie mosse, sia Bianco sia Nero.

### /boring
Pagina separata, raggiungibile digitando `/boring` (o con un invito a una partita
boring), senza collegamenti nei menu delle altre pagine. Usa `chess.js` 1.4.0 per
regole classiche, scacchiera 8×8, arrocco, en passant, quattro promozioni, scacco,
matto, stallo e patte. Non carica Ripassa, pubblicità, riferimenti
all’Estremo o alle aperture di fantasia. I nomi classici sono riconosciuti da un
piccolo repertorio di sequenze SAN vere, non da un database completo ECO.

Avversario e review usano **Stockfish 18 Lite single-thread WASM**, non il motore
10×10 ribattezzato. La ricerca locale ha limite profondità 12 / 700 ms per posizione;
la review mostra la profondità effettiva minima delle due ricerche (prima e dopo).
I simboli sono classificati in base alla perdita stimata; non vengono attribuiti
riconoscimenti di unicità/sacrificio senza dati sufficienti. Errori di caricamento
sono mostrati esplicitamente, senza risultati simulati. Sono disponibili partita
contro Stockfish, due giocatori locali e online 1v1. Online solo il proprio ultimo
commento viene recuperato alla riconnessione; non si chiamano API esplicative né
si trasmettono valutazioni al rivale. Il server ricostruisce le mosse boring con
`chess.js` e decide il risultato, senza fidarsi di quello inviato dal client.

La build copia solo il motore Lite single-thread (~7 MB WASM), wrapper, licenza e
modulo chess.js dalle dipendenze bloccate in package-lock; binari e dipendenze non
sono committati. Stockfish è GPLv3: sorgenti esatti/tag e licenza sono collegati
nella pagina (`https://github.com/nmrugg/stockfish.js/tree/v18.0.8`).


### /dash e /french
La versione Geometry Dash è raggiungibile da `/dash` (online: `/dash?partita=CODICE`).
Conserva le regole 10×10 normali; cambia le immagini dei pezzi con gli upload forniti:
Cube001=pedone, Ball001=cavallo, Robot001=alfiere, Cube408=torre, UFO001=regina,
Ship001=re, Wave001=Estremo. Spider e Swing non sono usati. Le immagini sono locali;
i pezzi neri sono invertiti e ruotati per distinguerli dai bianchi. La stessa skin
si usa nelle promozioni e nei replay salvati, anche se aperti da un’altra versione.
Online il prefisso 4 fissa Dash per entrambi i giocatori, senza cambiare le regole.

La versione francese ora usa `/french`, mai `version=` nei nuovi link. Il vecchio
`/?version=french&partita=...` viene normalizzato a `/french?partita=...`, mantenendo
il codice e i token salvati. Lingua del coach, archivio, tab e regole senza sinistra
seguono il percorso `/french` (anche con slash finale).


#### Variante GD semplificata
`/dash` (alias `/gd`) è una variante diretta come RISIO, senza pannello-omaggio,
selettore degli stage o cambi di colore per livello. Restano le icone caricate,
i nomi delle aperture a tema e uno stile fisso. La distinzione bianco/nero resta
indipendente dai livelli. I metadati dei 22 livelli sono conservati per gli alias
URL, non per un selettore nell'interfaccia.
La variante non monta la pubblicità (nessun player/iframe o timer pubblicitario),
non riserva spazio per l'ad, richiede il pass compiti come le altre versioni, non mostra Ripassa e non
attiva la punizione Chronos alle sconfitte. Le altre versioni restano invariate.

### Pagine /gd e memento mori
`/gd` e `/gd/` reindirizzano a `/dash`; i parametri della richiesta (incluso
`partita`) sono conservati dal redirect Vercel.

`/morte`, `/mortis`, `/memento-mori`, `/mementomori` e `/memento%20mori`
mostrano **soltanto il tracciato verde su nero**, a schermo pieno. Non ci sono più
titoli, valori BPM, griglie, bordi o controlli visibili. Durata, ampiezza e forma
dei battiti variano; il lub-dub sintetizzato usa gli stessi istanti del tracciato.
Tocco/click oppure Spazio/Invio sul canvas attiva/disattiva l'audio (gesto richiesto
dal browser). Audio sospeso in background e chiuso all'uscita; reduced-motion
rende statico il disegno. È una simulazione decorativa, non una misura medica.

### Altre pagine nascoste
- `/chronos`, `/tempo`: soltanto l'occhio di Chronos in un void nero.
- `/67`: `XD`.
- `/doomsday`, `/doom`, `/muffin`, `/doomsdaymuffin`: `THE END IS NEAR`.
- `/harken`, `/sybau`, `/stfu`, `/sybauken`: l'immagine caricata, locale e invariata.
- `/x-treme`, `/xtreme`, `/estremo`: Wikipedia, Tortura, sezione dal medioevo
  all'età moderna.
- `/teiera`, `/newell`, `/tazza`: Wikipedia, Martin Newell (computer scientist),
  autore della Utah teapot.
- `/tiki`: https://the-battle-bricks.fandom.com/wiki/Tiki_Battler
- `/boi`, `/son`: https://www.youtube.com/@TheRealLowTierGod

Alias validi anche con slash finale; redirect esterni a destinazioni fisse.
Nessuna di queste pagine carica pubblicità, gate, quiz o l'app degli scacchi.


Ulteriori alias: `/blud` e `/bludda` aprono il gruppo Roblox WE BLUDDIN OUT OF THIS ONE;
`/blood`, `/bloodbath`, `/golden` e i 22 nomi dei livelli classici portano a `/dash`.
I nomi composti accettano spazi, trattini o nessun separatore, in minuscolo (es.
`/stereo-madness`, `/stereomadness`). `/dash` stesso resta la pagina, senza loop.
Tutti i nomi Glaggle presenti nel sito (Floopfang, Gazo, Giggler, Gloober, Gembo,
Cheerer, Gleeber, Glaaber, Glogga, Kruzzit, Zorker, Blepzo, Yippeeyay, Smiley),
`/glaggle`, `/glaggles`, `/enfosi`, `/enfoso`, `/enphoso`, `/enphosian`,
`/glaggleland` portano a `/risio`; `/risio` rimane la pagina originale.
`/mattone` mostra il Brick Notifier caricato. `/omori` apre OMORI Plush su OMOCAT.
`/rizz`, `/tung`, `/triple-t` (anche spazio o unito), `/ttt`, `/skibidi`, `/gyatt`,
`/puh`, `/dih`, `/hawktuah`, `/rizzler`, `/aura` aprono Wikipedia Brain rot.
`/are-you` (anche spazio o unito), `/ru`, `/tree` aprono il video Hanging Tree indicato.
`/penna`, `/pennabic`, `/bic` aprono Wikipedia Dio. Alias validi anche con slash finale.

### Pagina non trovata
I percorsi inesistenti usano `404.html`: solo l'immagine fornita a schermo intero
(`object-fit: cover`, quindi con possibile ritaglio sui rapporti d'aspetto diversi).
L'asset ha URL assoluto rispetto al sito, funzionante anche su percorsi annidati.
Vercel mantiene lo status HTTP 404 senza redirect generico né interferenze con API
o alias esistenti. Nessuno script di blocco uscita o riapertura delle schede.


### Chessometry Dash e compiti su tutte le versioni
La variante GD si chiama **Chessometry Dash** (anche nella scheda); i testi non
usano separatori a punto mediano. I pezzi sono Cube, Ball, Robot, Torre, UFO,
Ship e Wave, inclusi i nomi accessibili delle immagini; restano le regole 10×10.
La frase introduttiva è `THE SOCIETY IS GONNA BE IN GRIEF FOR YEARS`.

Tutte le versioni giocabili (normale, /french, /risio, /dash, /boring) richiedono
il pass compiti condiviso. Senza pass valido si apre la stessa prova d'ingresso,
anche tramite alias e inviti online. Con il pass giornaliero valido non viene
ripetuta inutilmente. In /boring il modulo di gioco e l'autojoin non vengono
nemmeno caricati prima del superamento. Nessuna pubblicità aggiunta a GD e
nessuna modifica alle pagine segrete non giocabili o ai redirect esterni.


### Boss di The Battle Bricks: riferimenti aggiuntivi
Elenco di 58 voci verificato sulla categoria wiki (incluse forme alternative e
rimosse): https://the-battle-bricks.fandom.com/wiki/Category:Bosses . Le associazioni
qui sotto sono easter egg scelti per il sito, **non affermazioni sulla lore**.
I riferimenti già richiesti per Chronos, Mortis, X-TREME e Doomsday Muffin sono
preservati; Catalog Muffin usa la destinazione muffin, Cesus usa il riferimento
Dio già scelto per penna. I percorsi accettano minuscole, spazi/trattini o parole
unite e slash finale. Le destinazioni sono fisse e le parentesi URL sono codificate.

Il registro completo è `data/boss-references.json`; `node scripts/sync-boss-aliases.cjs`
aggiunge solo gli alias mancanti senza sovrascrivere route esistenti.

| Boss | Riferimento scelto | Destinazione |
| --- | --- | --- |
| Allan | Alan Wake | https://en.wikipedia.org/wiki/Alan_Wake |
| American Fatboy | Fat Man | https://en.wikipedia.org/wiki/Fat_Man |
| Apostle | Dodici apostoli | https://en.wikipedia.org/wiki/Apostles_in_Christianity |
| Bedridden | La bella addormentata | https://en.wikipedia.org/wiki/Sleeping_Beauty |
| Birthday Battler | Torta di compleanno | https://en.wikipedia.org/wiki/Birthday_cake |
| Blackmail | Phishing | https://en.wikipedia.org/wiki/Phishing |
| Bulldozer | Bulldozer | https://en.wikipedia.org/wiki/Bulldozer |
| Captain Red | L’isola del tesoro | https://en.wikipedia.org/wiki/Treasure_Island |
| Casual Battler | Casual game | https://en.wikipedia.org/wiki/Casual_game |
| Casual Challenger | Space Invaders | https://en.wikipedia.org/wiki/Space_Invaders |
| Catalog Muffin | Muffin: riferimento già scelto | /muffin |
| Celebration Battler | Coriandoli | https://en.wikipedia.org/wiki/Confetti |
| Cesus | Dio: destinazione già scelta per penna | /penna |
| Chef Sarge | Hell’s Kitchen | https://en.wikipedia.org/wiki/Hell%27s_Kitchen_%28American_TV_series%29 |
| Chronos | Occhio di Chronos | /chronos |
| Crusher | Pressa idraulica | https://en.wikipedia.org/wiki/Hydraulic_press |
| Cyborg Crocket Battle | RoboCop | https://en.wikipedia.org/wiki/RoboCop |
| Cyborg Rocket Battle | Lanciarazzi | https://en.wikipedia.org/wiki/Rocket_launcher |
| Dark Pelican | Il cigno nero | https://en.wikipedia.org/wiki/Black_Swan_%28film%29 |
| Deathbringer | Tracciato cardiaco | /morte |
| DJ Radical | Turntablism | https://en.wikipedia.org/wiki/Turntablism |
| Doctor Despair | Danganronpa | https://en.wikipedia.org/wiki/Danganronpa |
| Doombringer | Doom | https://en.wikipedia.org/wiki/Doom_%281993_video_game%29 |
| Doomsday Muffin | THE END IS NEAR | /doomsdaymuffin |
| Enigma II Battler | Macchina Enigma | https://en.wikipedia.org/wiki/Enigma_machine |
| EXEC | File eseguibile | https://en.wikipedia.org/wiki/Executable |
| Father | Darth Vader | https://en.wikipedia.org/wiki/Darth_Vader |
| FunK1d | Five Nights at Freddy’s | https://en.wikipedia.org/wiki/Five_Nights_at_Freddy%27s |
| Fusecoil | Bobina di Tesla | https://en.wikipedia.org/wiki/Tesla_coil |
| GameK1d | Game Boy | https://en.wikipedia.org/wiki/Game_Boy |
| Grimace Battler | McDonaldland | https://en.wikipedia.org/wiki/McDonaldland |
| Hellfighter | Doom | https://en.wikipedia.org/wiki/Doom_%281993_video_game%29 |
| Infernus | Inferno di Dante | https://en.wikipedia.org/wiki/Inferno_%28Dante%29 |
| Insecure | Sindrome dell’impostore | https://en.wikipedia.org/wiki/Impostor_syndrome |
| Jetrock | Jet pack | https://en.wikipedia.org/wiki/Jet_pack |
| Lichen | Licheni | https://en.wikipedia.org/wiki/Lichen |
| Martyr | Giovanna d’Arco | https://en.wikipedia.org/wiki/Joan_of_Arc |
| McDonald Battler | McDonald’s | https://en.wikipedia.org/wiki/McDonald%27s |
| Mister Mancer | Negromanzia | https://en.wikipedia.org/wiki/Necromancy |
| Monolith | Monolito di 2001 | https://en.wikipedia.org/wiki/Monolith_%28Space_Odyssey%29 |
| Monsalt | Cloruro di sodio | https://en.wikipedia.org/wiki/Sodium_chloride |
| Mortis | Tracciato cardiaco | /mortis |
| Mystery II Battler | Giallo | https://en.wikipedia.org/wiki/Mystery_fiction |
| Outcast | Il gobbo di Notre-Dame | https://en.wikipedia.org/wiki/The_Hunchback_of_Notre-Dame |
| Paintmaster | Microsoft Paint | https://en.wikipedia.org/wiki/Microsoft_Paint |
| Pancake | Pancake | https://en.wikipedia.org/wiki/Pancake |
| Pancake Pelican Of Truth | The X-Files | https://en.wikipedia.org/wiki/The_X-Files |
| Patriot Warhead | Il dottor Stranamore | https://en.wikipedia.org/wiki/Dr._Strangelove |
| Redbeard | Barbanera | https://en.wikipedia.org/wiki/Blackbeard |
| Reinbo | Arcobaleno | https://en.wikipedia.org/wiki/Rainbow |
| Rockstar Radical | Guitar Hero | https://en.wikipedia.org/wiki/Guitar_Hero |
| Sargent | Full Metal Jacket | https://en.wikipedia.org/wiki/Full_Metal_Jacket |
| Scarlet Storm | Temporale | https://en.wikipedia.org/wiki/Thunderstorm |
| Soulfuse | Musica soul | https://en.wikipedia.org/wiki/Soul_music |
| Terminator | The Terminator | https://en.wikipedia.org/wiki/The_Terminator |
| Treachstone | Giuda Iscariota | https://en.wikipedia.org/wiki/Judas_Iscariot |
| Turking | King of the Hill | https://en.wikipedia.org/wiki/King_of_the_Hill |
| X-TREME | Tortura: riferimento già scelto | /x-treme |

Aggiunta successiva richiesta: `/blight` e `/hell` → https://en.wikipedia.org/wiki/Hell . Blight è registrato come aggiunta dell’utente oltre alle 58 voci della categoria consultata.
