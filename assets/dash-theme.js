// Main classic levels, in game order. Source: https://geometrydash.wiki.gg/wiki/Geometry_Dash#Levels
(function (root) {
  const rows = [
    ['Stereo Madness','Easy',1,'ForeverBound'],['Back On Track','Easy',2,'DJVI'],
    ['Polargeist','Normal',3,'Step'],['Dry Out','Normal',4,'DJVI'],
    ['Base After Base','Hard',5,'DJVI'],["Can't Let Go",'Hard',6,'DJVI'],
    ['Jumper','Harder',7,'Waterflame'],['Time Machine','Harder',8,'Waterflame'],
    ['Cycles','Harder',9,'DJVI'],['xStep','Insane',10,'DJVI'],
    ['Clutterfunk','Insane',11,'Waterflame'],['Theory of Everything','Insane',12,'dj-Nate'],
    ['Electroman Adventures','Insane',10,'Waterflame'],['Clubstep','Demon',14,'dj-Nate'],
    ['Electrodynamix','Insane',12,'dj-Nate'],['Hexagon Force','Insane',12,'Waterflame'],
    ['Blast Processing','Harder',10,'Waterflame'],['Theory of Everything 2','Demon',14,'dj-Nate'],
    ['Geometrical Dominator','Harder',10,'Waterflame'],['Deadlocked','Demon',15,'F-777'],
    ['Fingerdash','Insane',12,'MDK'],['Dash','Insane',12,'MDK'],
  ];
  const colors = ['#713cce','#c22d91','#137aab','#a24e16','#176e87','#714bb4','#137c4d','#a33e61','#196b99','#3452c0','#73562b','#8b3a9c','#1d778c','#b83145','#3b62b2','#704bb7','#267850','#6934af','#a3571c','#8b303f','#963c8e','#4e42b1'];
  const levels = rows.map(([name,difficulty,stars,artist],i) => ({ name,difficulty,stars,artist,color:colors[i],number:i+1 }));
  const names = {
    "L'estremo":'Ball', "L’Estremo":'Ball', "L’Estremo (X)":'Ball',
    'Apertura del Re (fuori tempo)':'Stereo Madness', 'Gambetto del Tempo':'Back On Track',
    "Attacco dell'Estremo":'Blast Processing', 'Partita del Centro Estremo':'Polargeist',
    'Doppio Estremo':'Hexagon Force', 'Cavalli del Tempo':'Jumper',
    'Fianchetto Estremo':'Geometrical Dominator', 'Svolta a T':'Cycles',
    'Arrocco Lampo':'Electroman Adventures', 'Difesa del Tempo Fermo':'Deadlocked',
    'Scacchi Dash 10×10 · 20 Pagine':'Chessometry Dash',
    'Modalità di gioco estremo':'SELECT MODE', 'boi battler dice:':'Chessometry Dash dice:',
    'Giocatore vs 20 Pagine':'Normal Mode · vs IA', 'Giocatore vs Giocatore':'Dual Mode · locale',
    '20 Pagine vs 20 Pagine':'Auto Mode · IA vs IA', 'Nuova partita':'New Attempt',
    'Aperture estreme':'LEVEL OPENINGS', 'Reset estremo':'NEW ATTEMPT', 'Ritorno al tempo zero':'RESTART · posizione iniziale',
    "Il nuovo pezzo: L'estremo (X)":'Ball',
    '⟲ Torna indietro nel tempo':'⟲ Checkpoint precedente',
    'Aperture':'Level openings', 'Carica apertura':'Carica sequenza',
    ': sfida il tempo contro 20 Pagine o contro un amico. Estremo nel gioco, estremo nel tempo.':': Cube, Ship, Ball, UFO, Robot e Wave sulla scacchiera. CHESSOMETRY DASH.',
    'Puoi giocare solo se studi 20 pagine':'THE SOCIETY IS GONNA BE IN GRIEF FOR YEARS',
  };
  function text(value) {
    if (typeof value !== 'string') return value;
    const result = Object.hasOwn(names,value) ? names[value] : value;
    const pieces = { pedone:'Cube', pedoni:'Cube', cavallo:'Robot', cavalli:'Robot', alfiere:'Wave', alfieri:'Wave', regina:'UFO', regine:'UFO', donna:'UFO', donne:'UFO', re:'Ship', estremo:'Ball' };
    return result.replace(/\b(pedone|pedoni|cavallo|cavalli|alfiere|alfieri|regina|regine|donna|donne|re|estremo)\b/gi, word => pieces[word.toLowerCase()]).replace(/\s*·\s*/g, ' ').replace(/ {2,}/g, ' ');
  }
  root.DashTheme = { levels,text };
  if (/^\/dash\/?$/.test(root.location?.pathname || '')) root.document?.documentElement?.classList.add('dash-theme');
})(typeof globalThis !== 'undefined' ? globalThis : window);
