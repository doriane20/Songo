const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;
const FICHIER = path.join(__dirname, 'server/games.json');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Lecture/écriture
function lireParties() {
  if (!fs.existsSync(FICHIER)) return {};
  const contenu = fs.readFileSync(FICHIER, 'utf8');
  return contenu ? JSON.parse(contenu) : {};
}
function sauvegarder(parties) {
  fs.writeFileSync(FICHIER, JSON.stringify(parties, null, 2));
}

// CREATE
app.post('/api', (req, res) => {
  const action = req.body.action || req.query.action;
  const parties = lireParties();

  if (action === 'create') {
    for (const id in parties) {
      if (parties[id].statut === 'attente') {
        parties[id].statut = 'en_cours';
        sauvegarder(parties);
        return res.json({ gameId: id, side: 1 });
      }
    }
    const id = 'g' + Date.now() + Math.random().toString(36).slice(2);
    parties[id] = {
      statut: 'attente',
      board: [[5,5,5,5,5,5,5],[5,5,5,5,5,5,5]],
      scores: [0, 0],
      joueurActif: 0,
      termine: false,
      vainqueur: null,
      message: '',
      dernierCoup: Date.now()
    };
    sauvegarder(parties);
    return res.json({ gameId: id, side: 0 });
  }

  if (action === 'poll') {
    const gameId = req.body.gameId || req.query.gameId;
    if (!parties[gameId]) return res.json({ erreur: 'Partie introuvable' });
    return res.json(parties[gameId]);
  }

  if (action === 'play') {
    const gameId    = req.body.gameId;
    const caseIndex = parseInt(req.body.case);
    const side      = parseInt(req.body.side);

    if (!parties[gameId]) return res.json({ erreur: 'Partie introuvable' });
    const p = parties[gameId];
    if (p.joueurActif !== side) return res.json({ erreur: 'Pas ton tour' });

    let board  = p.board.map(r => [...r]);
    let scores = [...p.scores];
    const j   = side;
    const adv = 1 - j;

    if (board[j][caseIndex] === 0) return res.json({ erreur: 'Case vide' });

    let graines = board[j][caseIndex];
    board[j][caseIndex] = 0;
    let pos = caseIndex, camp = j, skip = caseIndex;

    while (graines > 0) {
      if (camp === j) { pos--; if (pos < 0) { camp = adv; pos = 0; } }
      else { pos++; if (pos >= 7) { camp = j; pos = 6; skip = -1; } }
      if (camp === j && pos === skip) continue;
      board[camp][pos]++;
      graines--;
    }

    let capture = 0;
    if (camp === adv && pos > 0) {
      let pp = pos;
      while (pp > 0 && board[adv][pp] >= 2 && board[adv][pp] <= 4) {
        capture += board[adv][pp];
        board[adv][pp] = 0;
        pp--;
      }
    }

    const campAdvVide = board[adv].every(g => g === 0);
    if (campAdvVide && capture > 0) {
      board  = p.board.map(r => [...r]);
      board[j][caseIndex] = 0;
      let g2 = p.board[j][caseIndex];
      let pos2 = caseIndex, camp2 = j, skip2 = caseIndex;
      while (g2 > 0) {
        if (camp2 === j) { pos2--; if (pos2 < 0) { camp2 = adv; pos2 = 0; } }
        else { pos2++; if (pos2 >= 7) { camp2 = j; pos2 = 6; skip2 = -1; } }
        if (camp2 === j && pos2 === skip2) continue;
        board[camp2][pos2]++;
        g2--;
      }
      capture = 0;
    }

    scores[j] += capture;

    let termine = false, vainqueur = null, message = '';
    const total = board[0].reduce((a,b)=>a+b,0) + board[1].reduce((a,b)=>a+b,0);

    if (scores[j] >= 40) {
      termine = true; vainqueur = j;
      message = `Joueur ${j+1} gagne avec ${scores[j]} graines !`;
    } else if (total < 10) {
      scores[0] += board[0].reduce((a,b)=>a+b,0);
      scores[1] += board[1].reduce((a,b)=>a+b,0);
      board = [[0,0,0,0,0,0,0],[0,0,0,0,0,0,0]];
      termine = true;
      if (scores[0] >= 40)     { vainqueur = 0; message = 'Joueur 1 gagne !'; }
      else if (scores[1] >= 40){ vainqueur = 1; message = 'Joueur 2 gagne !'; }
      else                     { vainqueur = 'nul'; message = 'Match nul !'; }
    }

    p.board = board; p.scores = scores;
    p.joueurActif = termine ? j : adv;
    p.termine = termine; p.vainqueur = vainqueur;
    p.message = message; p.dernierCoup = Date.now();

    sauvegarder(parties);
    return res.json(p);
  }

  res.json({ erreur: 'Action inconnue' });
});

// GET poll
app.get('/api', (req, res) => {
  const action = req.query.action;
  const parties = lireParties();
  if (action === 'poll') {
    const gameId = req.query.gameId;
    if (!parties[gameId]) return res.json({ erreur: 'Partie introuvable' });
    return res.json(parties[gameId]);
  }
  if (action === 'create') {
    for (const id in parties) {
      if (parties[id].statut === 'attente') {
        parties[id].statut = 'en_cours';
        sauvegarder(parties);
        return res.json({ gameId: id, side: 1 });
      }
    }
    const id = 'g' + Date.now() + Math.random().toString(36).slice(2);
    parties[id] = {
      statut: 'attente',
      board: [[5,5,5,5,5,5,5],[5,5,5,5,5,5,5]],
      scores: [0, 0],
      joueurActif: 0,
      termine: false,
      vainqueur: null,
      message: '',
      dernierCoup: Date.now()
    };
    sauvegarder(parties);
    return res.json({ gameId: id, side: 0 });
  }
  res.json({ erreur: 'Action inconnue' });
});

app.listen(PORT, () => console.log(`Serveur Songo sur port ${PORT}`));
