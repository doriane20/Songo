// ============================================================
//  ONLINE.JS  –  Version en ligne avec AJAX polling
// ============================================================

const SERVER = 'https://songo-1kju.onrender.com/api';

let gameId   = null;
let mySide   = null;   // 0 ou 1
let polling  = null;   // setInterval
let dernierEtat = null;

// -------------------------------------------------------
// Rejoindre la file d'attente
// -------------------------------------------------------
function rejoindreFile() {
  document.getElementById('btn-rejoindre').disabled = true;
  document.getElementById('msg-attente').textContent = '🔍 Recherche d\'un adversaire...';

  fetch(`${SERVER}?action=create`, { method: 'POST' })
    .then(r => r.json())
    .then(data => {
      gameId = data.gameId;
      mySide = data.side;

      document.getElementById('msg-attente').textContent =
        mySide === 0
          ? '⏳ En attente d\'un adversaire...'
          : '✅ Adversaire trouvé ! La partie commence...';

      // Noms des joueurs
      document.getElementById('nom-j1').textContent = `Joueur ${mySide + 1} (Moi)`;
      document.getElementById('nom-j2').textContent = `Joueur ${2 - mySide} (Adversaire)`;

      // Démarre le polling
      polling = setInterval(pollServeur, 1000);
    })
    .catch(() => {
      document.getElementById('msg-attente').textContent = '❌ Erreur de connexion.';
      document.getElementById('btn-rejoindre').disabled = false;
    });
}

// -------------------------------------------------------
// Polling : interroge le serveur toutes les secondes
// -------------------------------------------------------
function pollServeur() {
  fetch(`${SERVER}?action=poll&gameId=${gameId}`)
    .then(r => r.json())
    .then(etat => {
      if (etat.erreur) return;

      // Passe à l'écran de jeu dès que la partie est en cours
      if (etat.statut === 'en_cours' || etat.termine) {
        document.getElementById('ecran-attente').style.display = 'none';
        document.getElementById('ecran-jeu').style.display     = 'flex';
      }

      dernierEtat = etat;
      afficher(etat);

      if (etat.termine) {
        clearInterval(polling);
        afficherFin(etat);
      }
    });
}

// -------------------------------------------------------
// Affiche l'état du plateau
// -------------------------------------------------------
function afficher(etat) {
  // Du point de vue du joueur local :
  // mySide = mon camp (SUD affiché en bas)
  // adversaire = camp NORD (affiché en haut)
  const adv = 1 - mySide;

  afficherRangee('rangee-nord', adv,    etat, true);
  afficherRangee('rangee-sud',  mySide, etat, false);

  // Scores : j1 = moi, j2 = adversaire
  document.getElementById('score-j1').textContent = etat.scores[mySide];
  document.getElementById('score-j2').textContent = etat.scores[adv];

  // Bandeaux actifs
  const monTour = etat.joueurActif === mySide;
  document.getElementById('info-j1').classList.toggle('actif',  monTour);
  document.getElementById('info-j2').classList.toggle('actif', !monTour);

  // Texte statut
  document.getElementById('tour-texte').textContent =
    etat.termine ? '⏹ Partie terminée'
    : monTour    ? '🟢 C\'est ton tour !'
                 : '⏳ Tour de l\'adversaire...';

  document.getElementById('info-texte').textContent = etat.message || '';
}

// -------------------------------------------------------
// Construit une rangée
// -------------------------------------------------------
function afficherRangee(idDiv, joueur, etat, inverse) {
  const div = document.getElementById(idDiv);
  div.innerHTML = '';

  const monTour = etat.joueurActif === mySide && !etat.termine;
  const indices = inverse
    ? [6, 5, 4, 3, 2, 1, 0]
    : [0, 1, 2, 3, 4, 5, 6];

  indices.forEach(i => {
    const nb = etat.board[joueur][i];
    const c  = document.createElement('div');
    c.className = 'case';
    if (nb === 0) c.classList.add('vide');

    // Cliquable uniquement si c'est mon camp ET mon tour
    const cliquable = joueur === mySide && monTour && nb > 0;
    if (!cliquable) c.classList.add('disabled');

    const span = document.createElement('span');
    span.className   = 'nb-graines';
    span.textContent = nb;
    c.appendChild(span);

    if (cliquable) {
      c.addEventListener('click', () => jouerCoup(i));
      c.title = `Semer la case ${i + 1}`;
    }

    div.appendChild(c);
  });

  // Numéros
  const numsId = inverse ? 'nums-nord' : 'nums-sud';
  const numsDiv = document.getElementById(numsId);
  if (numsDiv) {
    numsDiv.innerHTML = '';
    indices.forEach(i => {
      const s = document.createElement('span');
      s.textContent = i + 1;
      numsDiv.appendChild(s);
    });
  }
}

// -------------------------------------------------------
// Envoie un coup au serveur
// -------------------------------------------------------
function jouerCoup(caseIndex) {
  const body = new URLSearchParams({
    action: 'play',
    gameId: gameId,
    case:   caseIndex,
    side:   mySide
  });

  fetch(SERVER, { method: 'POST', body })
    .then(r => r.json())
    .then(etat => {
      if (etat.erreur) {
        document.getElementById('info-texte').textContent = '⚠️ ' + etat.erreur;
        return;
      }
      dernierEtat = etat;
      afficher(etat);
      if (etat.termine) {
        clearInterval(polling);
        afficherFin(etat);
      }
    });
}

// -------------------------------------------------------
// Overlay fin de partie
// -------------------------------------------------------
function afficherFin(etat) {
  const overlay = document.getElementById('fin-partie');
  const titre   = document.getElementById('fin-titre');
  const scores  = document.getElementById('fin-scores');

  if (etat.vainqueur === 'nul') {
    titre.textContent = '🤝 Match nul !';
  } else if (etat.vainqueur === mySide) {
    titre.textContent = '🏆 Tu as gagné !';
  } else {
    titre.textContent = '😔 Tu as perdu...';
  }

  scores.textContent =
    `Moi : ${etat.scores[mySide]} graines  |  Adversaire : ${etat.scores[1 - mySide]} graines`;

  overlay.style.display = 'flex';
}
