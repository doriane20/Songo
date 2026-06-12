const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;
let partiesMemoire = {};
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));
function lireParties() { return partiesMemoire; }
function sauvegarder(p) { partiesMemoire = p; }
function jouerCoup(board, scores, j, caseIndex) {
  const adv = 1 - j;
  board = board.map(r => [...r]);
  scores = [...scores];
  let graines = board[j][caseIndex];
  board[j][caseIndex] = 0;
  let pos = caseIndex, camp = j, skip = caseIndex;
  while (graines > 0) {
    if (camp === j) { pos--; if (pos < 0) { camp = adv; pos = 0; } }
    else { pos++; if (pos >= 7) { camp = j; pos = 6; skip = -1; } }
    if (camp === j && pos === skip) continue;
    board[camp][pos]++; graines--;
  }
  let capture = 0;
  if (camp === adv && pos > 0) {
    let pp = pos;
    while (pp > 0 && board[adv][pp] >= 2 && board[adv][pp] <= 4) {
      capture += board[adv][pp]; board[adv][pp] = 0; pp--;
    }
  }
  if (board[adv].every(g => g === 0) && capture > 0) { capture = 0; }
  scores[j] += capture;
  let termine = false, vainqueur = null, message = '';
  const total = board[0].reduce((a,b)=>a+b,0) + board[1].reduce((a,b)=>a+b,0);
  if (scores[j] >= 40) { termine = true; vainqueur = j; message = 'Joueur '+(j+1)+' gagne!'; }
  else if (total < 10) {
    scores[0] += board[0].reduce((a,b)=>a+b,0);
    scores[1] += board[1].reduce((a,b)=>a+b,0);
    board = [[0,0,0,0,0,0,0],[0,0,0,0,0,0,0]];
    termine = true;
    if (scores[0] >= 40) { vainqueur = 0; message = 'Joueur 1 gagne!'; }
    else if (scores[1] >= 40) { vainqueur = 1; message = 'Joueur 2 gagne!'; }
    else { vainqueur = 'nul'; message = 'Match nul!'; }
  }
  return { board, scores, termine, vainqueur, message, joueurActif: termine ? j : adv };
}
function handleCreate(res) {
  const parties = lireParties();
  for (const id in parties) {
    if (parties[id].statut === 'attente') {
      parties[id].statut = 'en_cours';
      sauvegarder(parties);
      return res.json({ gameId: id, side: 1 });
    }
  }
  const id = 'g' + Date.now() + Math.random().toString(36).slice(2);
  parties[id] = { statut: 'attente', board: [[5,5,5,5,5,5,5],[5,5,5,5,5,5,5]], scores: [0,0], joueurActif: 0, termine: false, vainqueur: null, message: '', dernierCoup: Date.now() };
  sauvegarder(parties);
  return res.json({ gameId: id, side: 0 });
}
app.all('/api', (req, res) => {
  const action = req.body.action || req.query.action;
  const parties = lireParties();
  if (action === 'create') return handleCreate(res);
  if (action === 'poll') {
    const gameId = req.body.gameId || req.query.gameId;
    if (!parties[gameId]) return res.json({ erreur: 'Partie introuvable' });
    return res.json(parties[gameId]);
  }
  if (action === 'play') {
    const gameId = req.body.gameId;
    const caseIndex = parseInt(req.body.case);
    const side = parseInt(req.body.side);
    if (!parties[gameId]) return res.json({ erreur: 'Partie introuvable' });
    const p = parties[gameId];
    if (p.joueurActif !== side) return res.json({ erreur: 'Pas ton tour' });
    if (p.board[side][caseIndex] === 0) return res.json({ erreur: 'Case vide' });
    const result = jouerCoup(p.board, p.scores, side, caseIndex);
    p.board = result.board; p.scores = result.scores;
    p.joueurActif = result.joueurActif; p.termine = result.termine;
    p.vainqueur = result.vainqueur; p.message = result.message;
    p.dernierCoup = Date.now();
    sauvegarder(parties);
    return res.json(p);
  }
  res.json({ erreur: 'Action inconnue' });
});
app.listen(PORT, () => console.log('Serveur Songo sur port ' + PORT));
