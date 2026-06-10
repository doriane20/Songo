// ============================================================
//  LOCAL.JS  –  Version 2 joueurs même écran
// ============================================================

let etat = Songo.nouvellePartie();

// -------------------------------------------------------
// Initialisation de l'affichage
// -------------------------------------------------------
function init() {
  // Numéros des cases
  const numsNord = document.getElementById('nums-nord');
  const numsSud  = document.getElementById('nums-sud');
  numsNord.innerHTML = '';
  numsSud.innerHTML  = '';

  // Nord affiché de droite à gauche (case 7 à gauche visuellement)
  for (let i = 6; i >= 0; i--) {
    const s = document.createElement('span');
    s.textContent = i + 1;
    numsNord.appendChild(s);
  }
  // Sud affiché de gauche à droite
  for (let i = 0; i < 7; i++) {
    const s = document.createElement('span');
    s.textContent = i + 1;
    numsSud.appendChild(s);
  }

  afficher();
}

// -------------------------------------------------------
// Affiche l'état courant du plateau
// -------------------------------------------------------
function afficher() {
  afficherRangee('rangee-nord', 1, true);
  afficherRangee('rangee-sud',  0, false);

  document.getElementById('score-j1').textContent = etat.scores[0];
  document.getElementById('score-j2').textContent = etat.scores[1];

  // Bandeau actif
  document.getElementById('info-j1').classList.toggle('actif', etat.joueurActif === 0);
  document.getElementById('info-j2').classList.toggle('actif', etat.joueurActif === 1);

  // Texte de statut
  document.getElementById('tour-texte').textContent =
    etat.termine ? '⏹ Partie terminée' : `Tour du Joueur ${etat.joueurActif + 1}`;
  document.getElementById('info-texte').textContent =
    etat.message || 'Choisissez une case à semer';

  // Fin de partie
  if (etat.termine) afficherFin();
}

// -------------------------------------------------------
// Construit une rangée de cases dans le DOM
// joueur    : 0 (SUD) ou 1 (NORD)
// inverse   : true = cases affichées de droite à gauche
// -------------------------------------------------------
function afficherRangee(idDiv, joueur, inverse) {
  const div = document.getElementById(idDiv);
  div.innerHTML = '';

  const indices = inverse
    ? [6, 5, 4, 3, 2, 1, 0]   // NORD : case 7 à gauche
    : [0, 1, 2, 3, 4, 5, 6];  // SUD  : case 1 à gauche

  indices.forEach(i => {
    const nb = etat.board[joueur][i];
    const c  = document.createElement('div');
    c.className = 'case';
    if (nb === 0) c.classList.add('vide');

    // Seul le joueur actif peut cliquer sur ses propres cases
    const cliquable = (joueur === etat.joueurActif) && !etat.termine && nb > 0;
    if (!cliquable) c.classList.add('disabled');

    const span = document.createElement('span');
    span.className    = 'nb-graines';
    span.textContent  = nb;
    c.appendChild(span);

    if (cliquable) {
      c.addEventListener('click', () => jouer(i));
      c.title = `Semer la case ${i + 1} (${nb} graine${nb > 1 ? 's' : ''})`;
    }

    div.appendChild(c);
  });
}

// -------------------------------------------------------
// Joue un coup
// -------------------------------------------------------
function jouer(caseIndex) {
  const resultat = Songo.jouerCoup(etat, caseIndex);
  etat = resultat;
  afficher();
}

// -------------------------------------------------------
// Affiche l'overlay de fin
// -------------------------------------------------------
function afficherFin() {
  const overlay = document.getElementById('fin-partie');
  const titre   = document.getElementById('fin-titre');
  const scores  = document.getElementById('fin-scores');

  if (etat.vainqueur === 'nul') {
    titre.textContent = '🤝 Match nul !';
  } else {
    titre.textContent = `🏆 Joueur ${etat.vainqueur + 1} gagne !`;
  }

  scores.textContent =
    `Joueur 1 : ${etat.scores[0]} graines  |  Joueur 2 : ${etat.scores[1]} graines`;

  overlay.style.display = 'flex';
}

// -------------------------------------------------------
// Rejouer
// -------------------------------------------------------
function rejouer() {
  etat = Songo.nouvellePartie();
  document.getElementById('fin-partie').style.display = 'none';
  afficher();
}

// -------------------------------------------------------
// Lancement
// -------------------------------------------------------
init();
