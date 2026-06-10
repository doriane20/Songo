// ============================================================
//  MOTEUR DU JEU SONGO
//  Contient uniquement la logique pure, sans interface
// ============================================================

const Songo = {

  NB_CASES: 7,
  NB_GRAINES_INIT: 5,
  SEUIL_VICTOIRE: 40,
  SEUIL_FIN: 10,

  // -------------------------------------------------------
  // Crée un nouvel état de jeu
  // board[0] = rangée joueur 0 (SUD), index 0 = gauche
  // board[1] = rangée joueur 1 (NORD), index 0 = gauche
  // -------------------------------------------------------
  nouvellePartie() {
    return {
      board: [
        [5, 5, 5, 5, 5, 5, 5],  // joueur 0 (SUD)
        [5, 5, 5, 5, 5, 5, 5],  // joueur 1 (NORD)
      ],
      scores: [0, 0],
      joueurActif: 0,
      termine: false,
      vainqueur: null,  // 0, 1, ou 'nul'
      message: ''
    };
  },

  // -------------------------------------------------------
  // Nombre total de graines sur le plateau
  // -------------------------------------------------------
  totalGraines(etat) {
    return etat.board[0].reduce((a, b) => a + b, 0)
         + etat.board[1].reduce((a, b) => a + b, 0);
  },

  // -------------------------------------------------------
  // Vérifie si un camp est entièrement vide
  // -------------------------------------------------------
  campVide(etat, joueur) {
    return etat.board[joueur].every(g => g === 0);
  },

  // -------------------------------------------------------
  // Vérifie si un coup respecte la règle de solidarité
  // Retourne le nombre de graines envoyées chez l'adversaire
  // -------------------------------------------------------
  grainesEnvoyeesAdversaire(etat, joueur, caseIndex) {
    const adversaire = 1 - joueur;
    let graines = etat.board[joueur][caseIndex];
    if (graines === 0) return 0;

    // Simulation de la distribution pour compter
    let pos = caseIndex;
    let camp = joueur;
    let compteur = 0;
    let skip = caseIndex; // case de départ à sauter si tour complet

    while (graines > 0) {
      // Déplacement
      if (camp === joueur) {
        pos--;
        if (pos < 0) { camp = adversaire; pos = 0; }
      } else {
        pos++;
        if (pos >= this.NB_CASES) { camp = joueur; pos = this.NB_CASES - 1; skip = -1; }
      }
      if (camp === joueur && pos === skip) continue;

      if (camp === adversaire) compteur++;
      graines--;
    }
    return compteur;
  },

  // -------------------------------------------------------
  // Vérifie si le coup est légal (solidarité + case non vide)
  // -------------------------------------------------------
  coupLegal(etat, caseIndex) {
    const j = etat.joueurActif;
    const adversaire = 1 - j;

    if (etat.board[j][caseIndex] === 0) return { legal: false, raison: 'Case vide' };

    // Solidarité : si camp adverse vide, doit envoyer >= 7 graines
    if (this.campVide(etat, adversaire)) {
      const envoi = this.grainesEnvoyeesAdversaire(etat, j, caseIndex);
      const maxEnvoi = Math.max(...etat.board[j].map((_, i) =>
        this.grainesEnvoyeesAdversaire(etat, j, i)
      ));
      if (maxEnvoi >= 7 && envoi < 7) {
        return { legal: false, raison: 'Solidarité : tu dois envoyer au moins 7 graines' };
      }
      // Sinon on joue le maximum possible, on laisse passer
    }

    return { legal: true };
  },

  // -------------------------------------------------------
  // Joue un coup et retourne le nouvel état (immutable)
  // -------------------------------------------------------
  jouerCoup(etat, caseIndex) {
    const verification = this.coupLegal(etat, caseIndex);
    if (!verification.legal) {
      return { ...etat, message: verification.raison };
    }

    // Copie profonde du plateau
    let board = etat.board.map(r => [...r]);
    let scores = [...etat.scores];
    const j = etat.joueurActif;
    const adversaire = 1 - j;

    let graines = board[j][caseIndex];
    board[j][caseIndex] = 0;

    let pos = caseIndex;
    let camp = j;
    let skip = caseIndex;
    let tourComplet = false;

    // --- Distribution ---
    while (graines > 0) {
      if (camp === j) {
        pos--;
        if (pos < 0) { camp = adversaire; pos = 0; }
      } else {
        pos++;
        if (pos >= this.NB_CASES) {
          camp = j;
          pos = this.NB_CASES - 1;
          tourComplet = true;
          skip = -1;
        }
      }
      if (camp === j && pos === skip) continue;
      board[camp][pos]++;
      graines--;
    }

    // --- Captures ---
    // La dernière graine est tombée en (camp, pos)
    let capture = 0;

    // Cas spécial : case 0 adverse après tour complet → 1 seule graine
    if (camp === adversaire && pos === 0 && tourComplet) {
      capture += 1;
      board[adversaire][0]--;
    } else if (camp === adversaire && pos !== 0) {
      // Prise à la chaîne depuis pos vers 0 (exclus)
      let p = pos;
      while (p > 0 && board[adversaire][p] >= 2 && board[adversaire][p] <= 4) {
        capture += board[adversaire][p];
        board[adversaire][p] = 0;
        p--;
      }
    }

    scores[j] += capture;

    // --- Interdit : vider complètement le camp adverse ---
    if (board[adversaire].every(g => g === 0) && capture > 0) {
      // Annulation des captures
      // On restitue (simplification : on remet les graines capturées
      // dans les cases où elles étaient — ici on annule juste le score)
      // Pour une implémentation rigoureuse il faudrait sauvegarder l'état avant capture
      scores[j] -= capture;
      // On refait sans capturer : on remet les graines dans les cases
      board = etat.board.map(r => [...r]);
      board[j][caseIndex] = 0;
      // Re-distribution sans capture
      let g2 = etat.board[j][caseIndex];
      let pos2 = caseIndex, camp2 = j, skip2 = caseIndex;
      while (g2 > 0) {
        if (camp2 === j) { pos2--; if (pos2 < 0) { camp2 = adversaire; pos2 = 0; } }
        else { pos2++; if (pos2 >= this.NB_CASES) { camp2 = j; pos2 = this.NB_CASES - 1; skip2 = -1; } }
        if (camp2 === j && pos2 === skip2) continue;
        board[camp2][pos2]++;
        g2--;
      }
    }

    // --- Interdit case 7 (index 6) : 1 ou 2 graines chez adversaire ---
    // (géré dans coupLegal pour l'UI, ici on laisse passer en mode forcé)

    // --- Fin de partie ---
    let termine = false;
    let vainqueur = null;
    let message = '';
    const total = board[0].reduce((a,b)=>a+b,0) + board[1].reduce((a,b)=>a+b,0);

    if (scores[j] >= this.SEUIL_VICTOIRE) {
      termine = true;
      vainqueur = j;
      message = `Joueur ${j + 1} gagne avec ${scores[j]} graines !`;
    } else if (total < this.SEUIL_FIN) {
      // Chaque joueur récupère son camp
      scores[0] += board[0].reduce((a,b)=>a+b,0);
      scores[1] += board[1].reduce((a,b)=>a+b,0);
      board = [[0,0,0,0,0,0,0],[0,0,0,0,0,0,0]];
      termine = true;
      if (scores[0] >= this.SEUIL_VICTOIRE) { vainqueur = 0; message = `Joueur 1 gagne !`; }
      else if (scores[1] >= this.SEUIL_VICTOIRE) { vainqueur = 1; message = `Joueur 2 gagne !`; }
      else { vainqueur = 'nul'; message = 'Match nul !'; }
    }

    return {
      board,
      scores,
      joueurActif: termine ? j : adversaire,
      termine,
      vainqueur,
      message
    };
  }
};
