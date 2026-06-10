<?php
// ============================================================
//  SERVER.PHP  –  Backend léger pour la version en ligne
//  Actions : create, poll, play
// ============================================================

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$FICHIER = __DIR__ . '/games.json';

// --- Lecture/écriture du fichier de parties ---
function lireParties($f) {
    if (!file_exists($f) || filesize($f) === 0) return [];
    return json_decode(file_get_contents($f), true) ?? [];
}

function sauvegarder($f, $parties) {
    file_put_contents($f, json_encode($parties, JSON_PRETTY_PRINT), LOCK_EX);
}

// --- Paramètres de la requête ---
$action = $_GET['action'] ?? $_POST['action'] ?? '';
$gameId = $_GET['gameId'] ?? $_POST['gameId'] ?? '';

$parties = lireParties($FICHIER);

// ============================================================
//  ACTION : create  –  Rejoindre la file d'attente
// ============================================================
if ($action === 'create') {

    // Cherche une partie en attente
    foreach ($parties as $id => &$partie) {
        if ($partie['statut'] === 'attente') {
            // Un adversaire trouvé : on le rejoint
            $partie['statut']   = 'en_cours';
            $partie['joueur1']  = $partie['joueur0']; // déjà là
            sauvegarder($FICHIER, $parties);
            echo json_encode(['gameId' => $id, 'side' => 1]);
            exit;
        }
    }

    // Pas de partie en attente : on en crée une
    $id = uniqid('g', true);
    $parties[$id] = [
        'statut'      => 'attente',
        'joueur0'     => session_id() ?: uniqid(),
        'board'       => [[5,5,5,5,5,5,5],[5,5,5,5,5,5,5]],
        'scores'      => [0, 0],
        'joueurActif' => 0,
        'termine'     => false,
        'vainqueur'   => null,
        'message'     => '',
        'dernierCoup' => time()
    ];
    sauvegarder($FICHIER, $parties);
    echo json_encode(['gameId' => $id, 'side' => 0]);
    exit;
}

// ============================================================
//  ACTION : poll  –  Récupère l'état courant de la partie
// ============================================================
if ($action === 'poll') {
    if (!isset($parties[$gameId])) {
        echo json_encode(['erreur' => 'Partie introuvable']);
        exit;
    }
    echo json_encode($parties[$gameId]);
    exit;
}

// ============================================================
//  ACTION : play  –  Joue un coup
// ============================================================
if ($action === 'play') {
    $caseIndex = intval($_POST['case'] ?? -1);
    $side      = intval($_POST['side'] ?? -1);

    if (!isset($parties[$gameId])) {
        echo json_encode(['erreur' => 'Partie introuvable']);
        exit;
    }

    $p = &$parties[$gameId];

    // Vérifie que c'est bien le tour de ce joueur
    if ($p['joueurActif'] !== $side) {
        echo json_encode(['erreur' => 'Pas ton tour']);
        exit;
    }

    // Applique le moteur JS côté PHP (version simplifiée)
    // On relit les règles de base directement ici
    $board  = $p['board'];
    $scores = $p['scores'];
    $j      = $side;
    $adv    = 1 - $j;

    if ($board[$j][$caseIndex] === 0) {
        echo json_encode(['erreur' => 'Case vide']);
        exit;
    }

    $graines = $board[$j][$caseIndex];
    $board[$j][$caseIndex] = 0;
    $pos  = $caseIndex;
    $camp = $j;
    $skip = $caseIndex;

    // Distribution
    while ($graines > 0) {
        if ($camp === $j) {
            $pos--;
            if ($pos < 0) { $camp = $adv; $pos = 0; }
        } else {
            $pos++;
            if ($pos >= 7) { $camp = $j; $pos = 6; $skip = -1; }
        }
        if ($camp === $j && $pos === $skip) continue;
        $board[$camp][$pos]++;
        $graines--;
    }

    // Captures (uniquement camp adverse, cases > 0 et != case 0)
    $capture = 0;
    if ($camp === $adv && $pos > 0) {
        $pp = $pos;
        while ($pp > 0 && $board[$adv][$pp] >= 2 && $board[$adv][$pp] <= 4) {
            $capture += $board[$adv][$pp];
            $board[$adv][$pp] = 0;
            $pp--;
        }
    }

    // Interdit : vider le camp adverse
    $campAdvVide = true;
    foreach ($board[$adv] as $g) { if ($g > 0) { $campAdvVide = false; break; } }
    if ($campAdvVide && $capture > 0) {
        // Annulation : on repart de l'état avant capture
        $board  = $p['board'];
        $board[$j][$caseIndex] = 0;
        $g2 = $p['board'][$j][$caseIndex];
        $pos2 = $caseIndex; $camp2 = $j; $skip2 = $caseIndex;
        while ($g2 > 0) {
            if ($camp2 === $j) { $pos2--; if ($pos2 < 0) { $camp2 = $adv; $pos2 = 0; } }
            else { $pos2++; if ($pos2 >= 7) { $camp2 = $j; $pos2 = 6; $skip2 = -1; } }
            if ($camp2 === $j && $pos2 === $skip2) continue;
            $board[$camp2][$pos2]++;
            $g2--;
        }
        $capture = 0;
    }

    $scores[$j] += $capture;

    // Fin de partie
    $termine   = false;
    $vainqueur = null;
    $message   = '';
    $total     = array_sum($board[0]) + array_sum($board[1]);

    if ($scores[$j] >= 40) {
        $termine = true; $vainqueur = $j;
        $message = "Joueur " . ($j+1) . " gagne avec {$scores[$j]} graines !";
    } elseif ($total < 10) {
        $scores[0] += array_sum($board[0]);
        $scores[1] += array_sum($board[1]);
        $board = [[0,0,0,0,0,0,0],[0,0,0,0,0,0,0]];
        $termine = true;
        if ($scores[0] >= 40)      { $vainqueur = 0; $message = "Joueur 1 gagne !"; }
        elseif ($scores[1] >= 40)  { $vainqueur = 1; $message = "Joueur 2 gagne !"; }
        else                       { $vainqueur = 'nul'; $message = "Match nul !"; }
    }

    $p['board']       = $board;
    $p['scores']      = $scores;
    $p['joueurActif'] = $termine ? $j : $adv;
    $p['termine']     = $termine;
    $p['vainqueur']   = $vainqueur;
    $p['message']     = $message;
    $p['dernierCoup'] = time();

    sauvegarder($FICHIER, $parties);
    echo json_encode($p);
    exit;
}

echo json_encode(['erreur' => 'Action inconnue']);
       
