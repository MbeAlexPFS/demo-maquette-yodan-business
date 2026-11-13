/* Maquette Lonaci — page résultat. Données 100 % fictives, aucun envoi réseau. */
(function () {
  'use strict';

  var MAX = 27; // 9 questions × 3 points (ICJE)

  // Résultats fictifs par zone (textes repris de config/healingy_test.php)
  var ZONES = {
    green: {
      key: 'low', score: 2, color: '#16a34a', soft: '#ecfdf3', emoji: '🙂',
      title: 'À faible risque',
      msg: 'Votre score indique un faible risque. Restez attentif à vos habitudes de jeu et fixez-vous des limites claires.'
    },
    orange: {
      key: 'mid', score: 5, color: '#ea580c', soft: '#fff7ed', emoji: '⚠️',
      title: 'À risque modéré',
      msg: 'Votre score indique un risque modéré. Il peut être utile d’en parler et de mettre en place des stratégies pour reprendre le contrôle.'
    },
    red: {
      key: 'high', score: 14, color: '#dc2626', soft: '#fef2f2', emoji: '🛑',
      title: 'Jeu excessif',
      msg: 'Votre score suggère un risque élevé de jeu problématique. Nous vous recommandons fortement de demander de l’aide et de ne pas rester seul(e) avec cette situation.'
    }
  };

  var state = { zone: 'red', device: 'pc' };

  var $ = function (id) { return document.getElementById(id); };
  var site = $('site'), frame = $('frame'), stage = $('stage');

  // Cadre PC mis à l'échelle (dimensions réelles conservées : 1366 × 640)
  var wrap = document.createElement('div');
  wrap.className = 'frame-wrap';
  frame.parentNode.insertBefore(wrap, frame);
  wrap.appendChild(frame);

  function fitFrame() {
    if (state.device !== 'pc') {
      frame.style.transform = '';
      wrap.style.width = wrap.style.height = '';
      return;
    }
    var avail = stage.clientWidth - 40;
    var s = Math.min(1, avail / 1366);
    frame.style.transform = 'scale(' + s + ')';
    wrap.style.width = (1366 * s) + 'px';
    wrap.style.height = (640 * s) + 'px';
  }

  function checkFit() {
    var out = $('fit');
    if (state.device !== 'pc') {
      out.className = 'fit';
      out.textContent = 'Mobile : défilement vertical normal.';
      return;
    }
    var over = frame.scrollHeight - frame.clientHeight;
    if (over <= 1) {
      out.className = 'fit ok';
      out.textContent = '✅ Tout le contenu tient dans l’écran PC, sans défilement.';
    } else {
      out.className = 'fit ko';
      out.textContent = '⚠️ Le contenu dépasse de ' + over + ' px : défilement nécessaire.';
    }
  }

  function render() {
    var z = ZONES[state.zone];
    var pct = Math.round(z.score / MAX * 100);

    site.style.setProperty('--z', z.color);
    site.style.setProperty('--z-soft', z.soft);
    site.className = 'site zone-' + state.zone;

    $('gauge').style.setProperty('--p', pct);
    $('gauge').setAttribute('aria-label', 'Score : ' + pct + ' %');
    $('gauge-emoji').textContent = z.emoji;
    $('gauge-pct').textContent = pct + '%';
    $('result-title').textContent = z.title;
    $('score').textContent = z.score;
    $('result-msg').textContent = z.msg;

    // Cases à cocher : zones orange et rouge ; accord d'accompagnement : rouge uniquement
    $('follow').hidden = state.zone === 'green';
    $('support-row').hidden = state.zone !== 'red';

    frame.className = 'frame ' + state.device;
    $('frame-caption').textContent = state.device === 'pc'
      ? 'Écran PC 1366 × 768 (zone visible ≈ 1366 × 640 après la barre du navigateur) — aucun défilement attendu'
      : 'Mobile 390 px — version responsive de la même interface';

    fitFrame();
    requestAnimationFrame(checkFit);
  }

  // ----- Barre de maquette -----
  document.querySelectorAll('[data-zone]').forEach(function (b) {
    b.addEventListener('click', function () {
      state.zone = b.dataset.zone;
      document.querySelectorAll('[data-zone]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      $('saved').hidden = true;
      render();
    });
  });
  document.querySelectorAll('[data-device]').forEach(function (b) {
    b.addEventListener('click', function () {
      state.device = b.dataset.device;
      document.querySelectorAll('[data-device]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      render();
    });
  });
  $('notes-toggle').addEventListener('click', function () {
    var on = $('layout').classList.toggle('with-notes');
    this.setAttribute('aria-pressed', String(on));
    render();
  });

  // ----- Formulaire (simulation, rien n'est envoyé) -----
  $('follow-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var call = $('cb-call').checked;
    var support = $('cb-support').checked && state.zone === 'red';
    var msg = 'Merci, votre choix a bien été enregistré.';
    if (call || support) msg += ' Nous vous contacterons dans les meilleurs délais.';
    $('saved').textContent = msg;
    $('saved').hidden = false;
    requestAnimationFrame(checkFit);
  });

  window.addEventListener('resize', function () { fitFrame(); });
  render();
})();
