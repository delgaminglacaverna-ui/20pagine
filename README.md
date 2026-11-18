# 20 Pagine — scacchi estremi

Sito statico con API Node.js su Vercel e partite online salvate in Upstash Redis.
Nessuna dipendenza npm esterna. Richiede Node.js 22 o successivo.

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
