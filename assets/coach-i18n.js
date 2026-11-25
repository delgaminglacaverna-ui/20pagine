(function (root) {
  'use strict';
  const strings = {
    'Crea una partita e manda il codice a un amico. La prima cifra indica la modalità condivisa: 0 normale, 1 francese, 2 RISIO, 3 scacchi 8×8, 4 Dash. Chi entra usa la stessa modalità.': 'Créez une partie et partagez le code. Le premier chiffre indique la version commune : 0 normale, 1 française, 2 RISIO, 3 échecs 8×8, 4 Dash. Les deux joueurs utilisent la même version.',
    "Apertura del Re (fuori tempo)": "Ouverture du roi (hors du temps)",
    "Gambetto del Tempo": "Gambit du temps",
    "Attacco dell'Estremo": "Attaque de l’extrême",
    "Partita del Centro Estremo": "Partie du centre extrême",
    "Doppio Estremo": "Double extrême", "Cavalli del Tempo": "Cavaliers du temps",
    "Fianchetto Estremo": "Fianchetto extrême", "Svolta a T": "Virage en T",
    "Arrocco Lampo": "Roque éclair", "Difesa del Tempo Fermo": "Défense du temps arrêté",
    'normal': 'Normale', 'french': 'Française', 'risio': 'RISIO',
    'boi battler dice:': 'boi battler dit :',
    'Commento della mossa': 'Commentaire du coup',
    'Le tue partite': 'Vos parties', 'Le tue partite · Analisi': 'Vos parties · Analyse',
    'Chiudi': 'Fermer', 'Apri e analizza': 'Ouvrir et analyser', 'Elimina': 'Supprimer', '← Elenco': '← Liste',
    'Giocatore vs IA': 'Joueur contre IA', 'Giocatore vs giocatore': 'Joueur contre joueur', 'IA vs IA': 'IA contre IA',
    'In corso / interrotta': 'En cours / interrompue', 'In corso · scacco': 'En cours · échec',
    'Vince il Nero': 'Les Noirs gagnent', 'Vince il Bianco': 'Les Blancs gagnent',
    'Patta · stallo': 'Nulle · pat', 'Patta · ripetizione': 'Nulle · répétition', 'Patta · materiale': 'Nulle · matériel', 'Patta · 50 mosse': 'Nulle · 50 coups',
    'Terminata per abbandono': 'Terminée par abandon', 'Terminata online': 'Terminée en ligne', 'Terminata': 'Terminée',
    'Salvate solo in questo browser, senza IP o account. Ultime 50 partite.': 'Enregistrées uniquement dans ce navigateur, sans IP ni compte. Les 50 dernières parties.',
    'Memoria locale non disponibile o piena: il salvataggio potrebbe non riuscire.': 'Stockage local indisponible ou plein : l’enregistrement peut échouer.',
    'Nessuna partita salvata. Inizia a giocare: le mosse vengono salvate automaticamente.': 'Aucune partie enregistrée. Jouez : les coups sont enregistrés automatiquement.',
    'Analisi locale fino a 4 semimosse, senza chiamate AI a pagamento. È una stima, non un verdetto.': 'Analyse locale jusqu’à 4 demi-coups, sans appels IA payants. C’est une estimation, pas un verdict.',
    'Puoi interrompere e riprendere l’analisi.': 'Vous pouvez interrompre et reprendre l’analyse.',
    'Analizza / riprendi': 'Analyser / reprendre', 'Interrompi analisi': 'Interrompre l’analyse',
    'Analisi interrotta. I risultati completati sono salvati.': 'Analyse interrompue. Les résultats terminés sont enregistrés.',
    'Analisi completata. Le mosse non analizzabili sono indicate come tali e possono essere ritentate.': 'Analyse terminée. Les coups non analysables sont signalés et peuvent être réessayés.',
    'Analisi non disponibile: puoi ritentare.': 'Analyse indisponible : vous pouvez réessayer.',
    'Variante prevista: ': 'Variante prévue : ', 'Valutazione della posizione: ': 'Évaluation de la position : ',
    'Commenti disabilitati durante le partite online.': 'Commentaires désactivés pendant les parties en ligne.',
    'Gioca una mossa per ricevere un commento.': 'Jouez un coup pour recevoir un commentaire.',
    'Analisi della mossa…': 'Analyse du coup…', 'Analisi non disponibile per questa mossa.': 'Analyse indisponible pour ce coup.',
    'Spiegazione AI basata sui dati del motore; può contenere errori.': 'Explication IA fondée sur les données du moteur ; elle peut contenir des erreurs.',
    'Spiegazione API basata su mosse legali e dati del motore.': 'Explication API fondée sur les coups légaux et les données du moteur.',
    ' · stima statica (analisi non ancora disponibile)': ' · estimation statique (analyse pas encore disponible)',
    ' (+ Bianco / − Nero)': ' (+ Blancs / − Noirs)',
    'Stima del motore 10×10 del sito, non Stockfish né analisi chess.com. Ricerca breve: anche Brillante è una valutazione euristica.': 'Estimation du moteur 10×10 du site, ni Stockfish ni une analyse chess.com. Recherche courte : même Brillant est une appréciation heuristique.',
    'Impossibile ricostruire questa posizione salvata.': 'Impossible de reconstruire cette position enregistrée.',
    '⏮ Inizio': '⏮ Début', '← Mossa': '← Coup', 'Mossa →': 'Coup →', 'Fine ⏭': 'Fin ⏭', '⇅ Ruota': '⇅ Retourner',
    'Inizio partita': 'Début de partie', 'Seleziona una mossa o avvia l’analisi completa.': 'Sélectionnez un coup ou lancez l’analyse complète.',
    '▶ Riprendi da qui': '▶ Reprendre ici',
    'Matto per il Bianco': 'Mat en faveur des Blancs', 'Matto per il Nero': 'Mat en faveur des Noirs',
    'Brillante': 'Brillant', 'Eccezionale': 'Exceptionnel', 'Migliore': 'Meilleur', 'Buona': 'Bon', 'Decente': 'Correct',
    'Imprecisione': 'Imprécision', 'Errore / occasione mancata': 'Erreur / occasion manquée', 'Grave errore': 'Gaffe', 'Theory': 'Théorie',
    'Un sacrificio di materiale che la ricerca considera solido e nettamente preferibile alle alternative.': 'Un sacrifice de matériel que la recherche juge solide et nettement préférable aux alternatives.',
    'Una scelta decisiva: la ricerca la trova nettamente superiore a tutte le alternative.': 'Un choix décisif : la recherche le juge nettement supérieur aux alternatives.',
    'La migliore mossa trovata dalla ricerca, o una mossa a pari merito.': 'Le meilleur coup trouvé par la recherche, éventuellement à égalité.',
    'Una buona continuazione, molto vicina alla migliore trovata.': 'Une bonne continuation, très proche de la meilleure trouvée.',
    'Una continuazione giocabile, anche se si poteva ottenere qualcosa in più.': 'Une continuation jouable, même s’il était possible d’obtenir un peu plus.',
    'Una piccola occasione persa: la posizione peggiora senza una perdita grave secondo la ricerca.': 'Une petite occasion manquée : la position se dégrade sans perte grave selon la recherche.',
    'Hai mancato una continuazione sensibilmente migliore. Controlla minacce e pezzi indifesi.': 'Vous avez manqué une continuation nettement meilleure. Vérifiez les menaces et les pièces sans défense.',
    'La ricerca vede una perdita molto grave, equivalente ad almeno un pezzo minore o a una conseguenza decisiva.': 'La recherche voit une perte très grave, équivalant au moins à une pièce mineure ou à une conséquence décisive.',
  };
  function text(value, french = true) {
    if (!french || typeof value !== 'string') return value;
    if (Object.hasOwn(strings, value)) return strings[value];
    return value.replace(/^Limiti francesi \(sinistra e arrocco vietati\): (.*)\. Modalità condivisa da entrambi i giocatori\.$/, (_, sides) => `Restrictions françaises (gauche et roque interdits) : ${sides.replace(/Bianco/g, 'Blancs').replace(/Nero/g, 'Noirs').replace(/nessuno/g, 'aucune')}. Version commune aux deux joueurs.`)
      .replace(/^Analisi (\d+\/\d+)…$/, 'Analyse $1…')
      .replace(/^Posizione /, 'Position ').replace(/Inizio partita/g, 'Début de partie').replace(/\bMossa (\d+)/g, 'Coup $1')
      .replace(/ · profondità /g, ' · profondeur ').replace(/^Evaluation: /, 'Évaluation : ').replace(/^Variante prevista: /, 'Variante prévue : ')
      .replace(/Matto per il Bianco/g, 'Mat en faveur des Blancs').replace(/Matto per il Nero/g, 'Mat en faveur des Noirs')
      .replace(/ semimosse$/, ' demi-coups')
      .replace(/^Apertura: (.*)\. Questa sequenza è nel repertorio del sito\.$/, (_, name) => `Ouverture : ${strings[name] || name}. Cette séquence figure dans le répertoire du site.`);
  }
  function review(value, french) {
    if (!value || !french || value.parody) return value;
    const legacy = value.explanationSource && value.language !== 'fr';
    const defaults = {
      '??': 'La recherche voit une perte importante par rapport à la meilleure continuation.',
      'X': 'La recherche trouve une continuation nettement meilleure.',
      '?!': 'Une petite imprécision selon la recherche.',
      'V': 'Une continuation jouable.', '✓✓': 'Un bon coup, proche du meilleur trouvé.',
      '👑': 'Le meilleur coup trouvé par la recherche.', '!': 'Une continuation exceptionnelle selon la recherche.', '!!': 'Un sacrifice jugé solide par la recherche.',
    };
    return { ...value, label: text(value.label), comment: legacy ? defaults[value.symbol] || 'Analyse enregistrée ; relancez l’analyse pour une nouvelle explication.' : text(value.comment) };
  }
  root.CoachI18n = { text, review };
  if (typeof module !== 'undefined') module.exports = root.CoachI18n;
})(typeof globalThis !== 'undefined' ? globalThis : window);
