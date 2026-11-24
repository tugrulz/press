/* Press Room - game logic and rendering. */
'use strict';

(() => {
  // ---------- utilities ----------
  const $ = (s, r = document) => r.querySelector(s);
  const rand = Math.random;
  const pick = (a) => a[Math.floor(rand() * a.length)];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const surname = (n) => n.trim().split(/\s+/).pop();
  const ordinal = (n) => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');
  function poisson(l) { const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= rand(); } while (p > L); return k - 1; }
  function fill(t, v) { return t.replace(/\{(\w+)\}/g, (m, k) => (v[k] !== undefined ? v[k] : m)); }
  function h(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) if (c !== null && c !== undefined && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
    return e;
  }
  function svg(markup) { const t = document.createElement('template'); t.innerHTML = markup.trim(); return t.content.firstChild; }
  const METERS = [
    { id: 'board', label: 'Board', icon: '\u{1F3DB}' },
    { id: 'dressing', label: 'Dressing room', icon: '\u{1F455}' },
    { id: 'fans', label: 'Fans', icon: '\u{1F4E3}' },
    { id: 'media', label: 'Media', icon: '\u{1F4F0}' }
  ];
  const MKEYS = ['board', 'dressing', 'fans', 'media'];

  const CREST = `<svg viewBox="0 0 100 120" class="crest" aria-hidden="true">
    <path d="M50 4 L94 18 V58 C94 88 72 106 50 116 C28 106 6 88 6 58 V18 Z" fill="var(--club)" stroke="var(--gold)" stroke-width="5"/>
    <path d="M14 24 L50 13 L86 24 V40 H14 Z" fill="var(--gold)"/>
    <text x="50" y="35" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="15" fill="var(--club)" letter-spacing="2">K A F C</text>
    <path d="M24 66 C34 54 44 56 50 62 C56 52 70 46 82 50 C72 54 64 60 60 68 L70 70 L58 74 C56 84 48 92 40 96 C44 86 44 80 42 76 L30 76 C34 72 36 70 38 68 C33 66 28 66 24 66 Z" fill="var(--gold)"/>
    <circle cx="62" cy="60" r="2.2" fill="var(--club)"/>
  </svg>`;

  // ---------- state ----------
  let S = null;
  const PREFS = 'pressroom.prefs';
  function loadPrefs() { try { return JSON.parse(localStorage.getItem(PREFS) || '{}'); } catch (e) { return {}; } }
  function savePrefs(p) { try { localStorage.setItem(PREFS, JSON.stringify(Object.assign(loadPrefs(), p))); } catch (e) { /* ignore */ } }

  function newSeason(manager) {
    const teams = DATA.teams.map(t => ({ ...t, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, form: [] }));
    // random small strength wobble each season so no two seasons are alike
    teams.forEach(t => { t.str += Math.round((rand() - 0.5) * 6); });
    S = {
      manager: manager || 'The Gaffer',
      week: 0,
      teams,
      squad: DATA.squad.map(p => ({ ...p, injured: 0, goals: 0, rating: 6.5 })),
      meters: { board: 60, dressing: 62, fans: 56, media: 50 },
      schedule: buildSchedule(teams.map(t => t.id)),
      ctx: null,
      presser: null,
      headlines: [],
      toneCounts: { calm: 0, defiant: 0, joke: 0, deflect: 0, praise: 0, blameRef: 0 },
      typedCount: 0,
      recentTones: [],
      liveCalls: 0,
      ending: null,
      peakPos: 12,
      results: []
    };
  }

  function buildSchedule(ids) {
    // circle method: 11 rounds for 12 teams, then weeks 12-14 replay rounds 1-3 with venues swapped
    const n = ids.length, rounds = [];
    const arr = ids.slice();
    for (let r = 0; r < n - 1; r++) {
      const games = [];
      for (let i = 0; i < n / 2; i++) {
        const a = arr[i], b = arr[n - 1 - i];
        games.push(r % 2 === 0 ? [a, b] : [b, a]);
      }
      rounds.push(games);
      arr.splice(1, 0, arr.pop());
    }
    const order = shuffle(rounds);
    const extra = order.slice(0, DATA.weeks - order.length).map(g => g.map(([a, b]) => [b, a]));
    return order.concat(extra);
  }

  const team = (id) => S.teams.find(t => t.id === id);
  const you = () => S.teams.find(t => t.you);
  function standings() {
    return S.teams.slice().sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || a.name.localeCompare(b.name));
  }
  const position = () => standings().findIndex(t => t.you) + 1;

  // ---------- match simulation ----------
  function effStr(t) {
    let s = t.str;
    if (t.you) {
      s += (S.meters.dressing - 50) / 14;
      s += (S.meters.fans - 50) / 30;
      s -= Math.min(3, S.squad.filter(p => p.injured > 0).length) * 1.6;
    }
    const f = t.form.slice(-3);
    s += f.filter(x => x === 'W').length * 0.8 - f.filter(x => x === 'L').length * 0.8;
    return s;
  }
  function simGame(hid, aid) {
    const H = team(hid), A = team(aid);
    const d = (effStr(H) - effStr(A)) / 22;
    const hg = poisson(1.38 * Math.exp(d + 0.08)), ag = poisson(1.12 * Math.exp(-d));
    record(H, hg, ag); record(A, ag, hg);
    return { h: hid, a: aid, hg, ag };
  }
  function record(t, gf, ga) {
    t.p++; t.gf += gf; t.ga += ga;
    const r = gf > ga ? 'W' : gf === ga ? 'D' : 'L';
    if (r === 'W') { t.w++; t.pts += 3; } else if (r === 'D') { t.d++; t.pts++; } else t.l++;
    t.form.push(r);
  }

  function playWeek() {
    S.week++;
    S.squad.forEach(p => { if (p.injured > 0) p.injured--; });
    const games = S.schedule[S.week - 1].map(([a, b]) => simGame(a, b));
    const mine = games.find(g => team(g.h).you || team(g.a).you);
    const home = team(mine.h).you;
    const gf = home ? mine.hg : mine.ag, ga = home ? mine.ag : mine.hg;
    const opp = team(home ? mine.a : mine.h);
    const result = gf > ga ? 'W' : gf === ga ? 'D' : 'L';
    const margin = gf - ga;
    const tag = margin >= 3 ? 'bigwin' : margin > 0 ? 'win' : margin === 0 ? 'draw' : margin <= -3 ? 'thrashing' : 'loss';

    // scorers
    const fit = S.squad.filter(p => p.injured === 0);
    const scorers = [];
    for (let i = 0; i < gf; i++) {
      const pool = fit.filter(p => p.w > 0); const tot = pool.reduce((s, p) => s + p.w, 0);
      let r = rand() * tot; let pl = pool[0];
      for (const p of pool) { r -= p.w; if (r <= 0) { pl = p; break; } }
      pl.goals++; scorers.push({ name: pl.name, min: 3 + Math.floor(rand() * 88) });
    }
    scorers.sort((a, b) => a.min - b.min);
    const oppScorers = Array.from({ length: ga }, () => 3 + Math.floor(rand() * 88)).sort((a, b) => a - b);

    // ratings
    fit.forEach(p => { p.rating = clamp(6.3 + margin * 0.25 + (rand() - 0.5) * 1.6 + scorers.filter(s => s.name === p.name).length * 0.9, 4, 9.8); });
    const star = fit.slice().sort((a, b) => b.rating - a.rating)[0];
    const flop = fit.filter(p => p !== star && p.pos !== 'GK').sort((a, b) => a.rating - b.rating)[0];

    // injury
    let injured = null;
    if (rand() < 0.22) {
      const cand = fit.filter(p => p.pos !== 'GK');
      injured = pick(cand); injured.injured = 1 + Math.floor(rand() * 3);
    }
    // controversy
    let controversy = null;
    if (rand() < 0.38) {
      const type = pick(['penalty', 'red card', 'offside goal', 'handball']);
      const against = result !== 'W' ? rand() < 0.8 : rand() < 0.35;
      controversy = { type, against, ref: pick(DATA.refs), desc: (against ? 'controversial ' : 'lucky ') + type + (against ? ' against you' : ' in your favour') };
    }
    // off-field event
    let event = null;
    if (S.week > 1 && rand() < 0.55) {
      const opts = DATA.events.filter(e => e.when(S));
      event = pick(opts);
    }
    const xgf = Math.max(0.2, gf * 0.75 + rand() * 1.2).toFixed(1);
    const xga = Math.max(0.2, ga * 0.75 + rand() * 1.2).toFixed(1);
    const shots = gf * 2 + 4 + Math.floor(rand() * 12);

    // result meter effects
    const before = { ...S.meters };
    const fx = { bigwin: [4, 3, 5, 1], win: [3, 2, 3, 0], draw: [-1, 0, -1, 0], loss: [-5, -3, -5, -1], thrashing: [-8, -5, -8, -2] }[tag];
    // meters drift back toward neutral each week, so nothing stays maxed out for free
    MKEYS.forEach(k => { S.meters[k] = Math.round(S.meters[k] + (50 - S.meters[k]) * 0.1); });
    applyFx(fx);
    const pos = position();
    S.peakPos = Math.min(S.peakPos, pos);
    if (S.week >= 3) {
      if (pos >= 10) applyFx([-3, 0, -2, 0]); else if (pos <= 3) applyFx([2, 1, 2, 0]);
    }
    const resultDelta = {}; MKEYS.forEach(k => { resultDelta[k] = S.meters[k] - before[k]; });

    // streak
    const form = you().form; let streak = 0;
    for (let i = form.length - 1; i >= 0 && form[i] === result; i--) streak++;

    const nextFixture = S.week < DATA.weeks ? S.schedule[S.week].find(([a, b]) => team(a).you || team(b).you) : null;
    const next = nextFixture ? team(team(nextFixture[0]).you ? nextFixture[1] : nextFixture[0]) : null;

    S.ctx = {
      week: S.week, home, opp: opp.name, oppId: opp.id, gf, ga, result, tag, margin, scorers, oppScorers,
      star: star.name, starGoals: star.goals, flop: flop.name, injured: injured ? injured.name : null, injWeeks: injured ? injured.injured : 0,
      controversy, event, xgf, xga, shots, pos, streak, next: next ? next.name : null, resultDelta,
      otherGames: games.filter(g => g !== mine)
    };
    S.results.push({ week: S.week, opp: opp.name, home, gf, ga, result });
  }

  function applyFx(arr, mult = 1) {
    MKEYS.forEach((k, i) => { S.meters[k] = clamp(Math.round(S.meters[k] + arr[i] * mult), 0, 100); });
  }

  function vars(extra) {
    const c = S.ctx, pos = c.pos;
    return Object.assign({
      club: DATA.club.name, nick: DATA.club.nick, city: DATA.club.city, league: DATA.league,
      opp: c.opp, gf: c.gf, ga: c.ga, star: c.star, starGoals: c.starGoals, flop: c.flop, injured: c.injured,
      ref: c.controversy ? c.controversy.ref : 'the referee', cdesc: c.controversy ? c.controversy.desc.replace(/ against you| in your favour/, '') : '',
      xgf: c.xgf, xga: c.xga, shots: c.shots, streak: c.streak, next: c.next || 'the next opponent',
      posTxt: ordinal(pos), sur: surname(S.manager).toUpperCase(),
      titlePct: clamp(Math.round(70 - (pos - 1) * 14 + (rand() * 10 - 5)), 2, 92),
      relPct: clamp(Math.round(20 + (pos - 8) * 12 + (rand() * 10 - 5)), 3, 90)
    }, extra || {});
  }

  function contextLine() {
    const c = S.ctx;
    const bits = [
      `${DATA.club.name} (the ${DATA.club.nick}) ${c.result === 'W' ? 'beat' : c.result === 'D' ? 'drew with' : 'lost to'} ${c.opp} ${c.gf}-${c.ga} (${c.home ? 'home' : 'away'}), matchweek ${c.week}/${DATA.weeks}.`,
      `Now ${ordinal(c.pos)} of 12 in ${DATA.league}.`,
      `Manager: ${S.manager}. Man of the match: ${c.star}.`
    ];
    if (c.injured) bits.push(`${c.injured} injured.`);
    if (c.controversy) bits.push(`Controversy: ${c.controversy.desc} (referee ${c.controversy.ref}).`);
    if (c.event) bits.push(`Off-field: ${c.event.text}`);
    return bits.join(' ');
  }

  // ---------- press conference ----------
  function buildPresser() {
    const c = S.ctx;
    const local = DATA.journalists.find(j => j.id === 'local');
    const others = shuffle(DATA.journalists.filter(j => j.id !== 'local'));
    const count = 3 + Math.floor(rand() * 3); // 3-5 journalists
    const room = [local].concat(others.slice(0, count - 1));

    const topics = [c.tag];
    const optional = [];
    if (c.injured) optional.push('injury');
    if (c.controversy) optional.push('controversy', 'controversy');
    if (c.event) optional.push(c.event.id, c.event.id);
    if (S.week >= 3 && c.pos <= 3) optional.push('top');
    if (S.week >= 3 && c.pos >= 9) optional.push('bottom');
    if (c.streak >= 2 && c.result === 'W') optional.push('streakWin');
    if (c.streak >= 2 && c.result === 'L') optional.push('streakLoss');
    optional.push('star', 'flop');
    if (c.next) optional.push('next');
    const nq = Math.min(room.length + 1, 3 + (rand() < 0.5 ? 1 : 0));
    for (const t of shuffle(optional)) { if (topics.length >= nq) break; if (!topics.includes(t)) topics.push(t); }

    const used = new Set();
    const questions = topics.map((topic, i) => {
      // pick a journalist: prefer one with a style-specific template for this topic, rotate through room
      const pool = DATA.questions[topic];
      let j = null, tpl = null;
      const candidates = shuffle(room).sort((a, b) => (used.has(a.id) ? 1 : 0) - (used.has(b.id) ? 1 : 0));
      for (const cand of candidates) {
        const special = pool.filter(q => typeof q === 'object' && q.s.includes(cand.style));
        if (special.length && rand() < 0.75) { j = cand; tpl = pick(special).t; break; }
      }
      if (!j) { j = candidates[0]; tpl = pick(pool.filter(q => typeof q === 'string')); }
      used.add(j.id);
      let text = fill(tpl, vars());
      if (rand() < 0.45) text = pick(DATA.openers[j.style]) + ' ' + text.charAt(0).toLowerCase() + text.slice(1);
      return { j, topic, text, followup: false };
    });
    // proper nouns at start of templates should keep their capital after an opener
    questions.forEach(q => { q.text = fixCaps(q.text); });
    S.presser = { room, questions, idx: 0, answers: [], followups: 0, lastTones: [], busy: false, flash: 0 };
  }
  function fixCaps(t) {
    const names = [DATA.club.name, DATA.league, ...DATA.teams.map(x => x.name), ...DATA.squad.map(p => p.name)];
    for (const n of names) {
      const low = n.charAt(0).toLowerCase() + n.slice(1);
      t = t.replace(new RegExp('([,:\\-\\.] )' + low.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), '$1' + n);
    }
    return t;
  }

  function classifyText(t) {
    const s = t.toLowerCase();
    if (/\b(ref|referee|officials?|linesm[ae]n|var|whistle|robbed|cheat|bias|stitched)/.test(s)) return 'blameRef';
    if (/(haha|lol|\bjoke|kidding|banter|😂|🤣|😄|\bpint\b|\bcake\b|\bmy wife\b|\bmy mum\b|\bnan\b)/.test(s)) return 'joke';
    if (/(no comment|next question|not going to|won'?t comment|can'?t comment|move on|i'?ll leave it|not talk about|ask (him|them|someone))/.test(s)) return 'deflect';
    if (/(proud|brilliant|fantastic|superb|magnificent|the lads|the boys|credit to|great group|outstanding|love (them|this team)|praise)/.test(s)) return 'praise';
    if (/(prove|doubters|nobody|no one|fear|fight|we will|we'?ll show|write us off|watch this|never give up|believe|going nowhere|bring it on)/.test(s)) return 'defiant';
    return 'calm';
  }

  function scoreAnswer(q, tone, text) {
    const c = S.ctx, notes = [];
    const fx = DATA.toneBase[tone].slice(); // [board, dressing, fans, media]
    const bad = c.tag === 'loss' || c.tag === 'thrashing';
    const good = c.tag === 'win' || c.tag === 'bigwin';
    if (tone === 'joke' && bad) { fx[0] -= 3; fx[2] -= 5; fx[1] -= 1; notes.push('Joking after a defeat goes down badly.'); }
    if (tone === 'joke' && q.topic === 'injury') { fx[1] -= 3; notes.push('Joking about an injury? The physio is not amused.'); }
    if (tone === 'blameRef') {
      if (q.topic === 'controversy' && c.controversy && c.controversy.against) { fx[2] += 2; fx[1] += 1; notes.push('Fans think you have a point about the ref.'); }
      else if (c.controversy && !c.controversy.against) { fx[0] -= 3; fx[3] -= 3; fx[2] -= 1; notes.push('Blaming a ref who helped you? Bold.'); }
      else { fx[0] -= 3; fx[3] -= 2; fx[2] -= 2; notes.push('No obvious refereeing issue - it sounds like an excuse.'); }
      if (rand() < 0.3) { fx[0] -= 3; notes.push('The league has asked for "observations" on your comments.'); }
    }
    if (tone === 'praise' && c.tag === 'thrashing') { fx[0] -= 2; fx[2] -= 3; notes.push('Praising that performance? Fans are baffled.'); }
    if (tone === 'praise' && q.topic === 'flop') { fx[1] += 3; notes.push(`${c.flop} appreciates the public backing.`); }
    if (tone === 'praise' && q.topic === 'ev_nightclub') { fx[0] -= 3; notes.push('Backing a nightclub dancer? The board raises an eyebrow.'); }
    if (tone === 'calm' && q.topic === 'ev_nightclub') { fx[0] += 2; }
    if (tone === 'calm' && c.tag === 'thrashing') { fx[2] -= 2; notes.push('Fans wanted more anger than that.'); }
    if (tone === 'defiant' && good) { fx[3] -= 1; fx[2] += 1; }
    if (tone === 'defiant' && q.topic === 'ev_sack') { fx[0] -= 2; fx[1] += 2; notes.push('Squaring up to the board in public is a gamble.'); }
    if (tone === 'deflect' && q.topic.startsWith('ev_')) { fx[0] += 2; fx[3] += 1; notes.push('Discretion on off-field matters is appreciated upstairs.'); }
    if (tone === 'defiant' && q.topic === 'ev_jab') { fx[2] += 2; fx[1] += 1; }
    if (tone === 'joke' && q.topic === 'ev_jab') { fx[3] += 2; fx[2] += 1; notes.push('Killing them with comedy. The clip goes viral.'); }
    // journalist taste
    if (q.j.likes.includes(tone)) fx[3] += 2;
    if (q.j.dislikes.includes(tone)) fx[3] -= 2;
    // repetition
    const lt = S.recentTones;
    if (lt.length >= 2 && lt[lt.length - 1] === tone && lt[lt.length - 2] === tone) {
      for (let i = 0; i < 4; i++) if (fx[i] > 0) fx[i] = Math.floor(fx[i] / 2);
      fx[3] -= 2; notes.push('Same routine again? The room has noticed, and it is wearing thin.');
    }
    // typed answers
    if (text) {
      const s = text.toLowerCase();
      if (text.length > 60) fx[3] += 1;
      const named = S.squad.find(p => s.includes(surname(p.name).toLowerCase()));
      if (named && tone !== 'blameRef' && !/(poor|awful|terrible|rubbish|useless|disgrace|blame|dropped|bench)/.test(s)) { fx[1] += 2; notes.push(`${named.name} reads that and smiles.`); }
      if (named && /(poor|awful|terrible|rubbish|useless|disgrace|blame|dropped)/.test(s)) { fx[1] -= 4; notes.push(`Publicly criticising ${named.name} unsettles the squad.`); }
      if (/\b(crap|rubbish|bloody|damn|shambles|joke of a|pathetic|disgrace)\b/.test(s)) { fx[0] -= 2; fx[2] += 1; fx[3] += 1; notes.push('Colourful language. The press officer reaches for the antacids.'); }
      if (/(chairman|board|owner)/.test(s) && /(should|must|need|back me|give me|money)/.test(s)) { fx[0] -= 2; notes.push('Messages to the board are rarely welcome in public.'); }
      if (/(sorry|apolog|my fault|on me|i take responsibility|responsib)/.test(s)) { fx[0] += 2; fx[2] += 2; fx[1] += 1; notes.push('Taking responsibility earns some respect.'); }
      if (/(fans|supporters)/.test(s) && /(thank|incredible|amazing|love|deserve)/.test(s)) { fx[2] += 3; }
      if (text.length < 6) { fx[3] -= 2; notes.push('Monosyllabic.'); }
    }
    return { fx: fx.map(v => clamp(v, -9, 9)), notes };
  }

  function snippet(text) {
    let t = text.trim().replace(/\s+/g, ' ');
    if (t.length <= 60) return t.replace(/[.!?]+$/, '');
    const cut = t.slice(0, 60); const sp = cut.lastIndexOf(' ');
    return (sp > 30 ? cut.slice(0, sp) : cut) + '...';
  }

  function offlineReaction(q, tone, text) {
    const r = DATA.reactions[tone];
    const lines = (r[q.j.style] && rand() < 0.6) ? r[q.j.style] : r._;
    let out = fill(pick(lines), { j: q.j.name.split(' ')[0], nick: DATA.club.nick });
    if (text) out = fill(pick(DATA.textReactions), { j: q.j.name.split(' ')[0], snip: snippet(text) }) + ' ' + out;
    return out;
  }
  function offlineFollowup(q, tone, text) {
    const P = S.presser;
    if (q.followup || P.followups >= 2) return null;
    const provocative = ['defiant', 'joke', 'blameRef', 'deflect'].includes(tone);
    const chance = (text ? 0.45 : 0) + (provocative ? 0.25 : 0.05) + (q.j.style === 'tabloid' ? 0.1 : 0);
    if (rand() > chance) return null;
    let pool = DATA.followups[q.j.style];
    if (!text) pool = pool.filter(x => !x.includes('{snip}'));
    if (!pool.length) return null;
    return fill(pick(pool), { snip: text ? snippet(text) : '' });
  }

  async function answer(tone, text) {
    const P = S.presser;
    if (!P || P.busy || P.answered) return;
    const q = P.questions[P.idx];
    text = (text || '').trim().slice(0, 400);
    if (!tone && !text) return;
    P.busy = true;
    renderPresser(); // shows busy state

    let finalTone = tone || classifyText(text);
    let reaction = null, followup = null, fx = null, notes = [], source = 'offline';

    if (text && LIVE.active()) {
      setStatus('Journalists are scribbling...');
      try {
        S.liveCalls++;
        const r = await LIVE.answer({
          context: contextLine(), question: q.text, answer: text,
          jName: q.j.name, jOutlet: q.j.outlet, jStyle: q.j.style, jLikes: q.j.likes.join('/'),
          allowFollowup: !q.followup && P.followups < 2
        });
        finalTone = tone || r.tone || finalTone;
        reaction = String(r.reaction || '').slice(0, 300);
        followup = r.followup ? String(r.followup).slice(0, 260) : null;
        const base = scoreAnswer(q, finalTone, text);
        // blend model judgement with game rules (model drives it, rules keep it grounded)
        const m = [r.board, r.dressing, r.fans, r.media].map(v => clamp(Math.round(Number(v) || 0), -6, 6));
        fx = m.map((v, i) => clamp(Math.round(v * 0.65 + base.fx[i] * 0.45), -9, 9));
        notes = base.notes.slice(0, 1);
        source = 'live';
      } catch (e) {
        toast('Live journalists unavailable: ' + e.message + '. Using the offline press pack.');
        if (e.kind === 'auth' || e.kind === 'billing') updateLiveBadge();
      }
      setStatus('');
    }
    if (!fx) {
      const sc = scoreAnswer(q, finalTone, text);
      fx = sc.fx; notes = sc.notes;
      reaction = offlineReaction(q, finalTone, text);
      followup = offlineFollowup(q, finalTone, text);
    }
    if (followup && (q.followup || P.followups >= 2)) followup = null;

    const before = { ...S.meters };
    applyFx(fx);
    const delta = {}; MKEYS.forEach(k => { delta[k] = S.meters[k] - before[k]; });
    S.toneCounts[finalTone]++;
    if (text) S.typedCount++;
    P.lastTones.push(finalTone);
    S.recentTones.push(finalTone); if (S.recentTones.length > 3) S.recentTones.shift();
    P.answers.push({ q: q.text, j: q.j.name, tone: finalTone, text, delta });
    P.answered = { tone: finalTone, text, reaction, notes, delta, source };
    if (followup) {
      P.followups++;
      P.questions.splice(P.idx + 1, 0, { j: q.j, topic: q.topic, text: followup, followup: true });
    }
    P.busy = false;
    flash(['joke', 'blameRef', 'defiant'].includes(finalTone) || (text && text.length > 50) ? 3 : 1);
    renderPresser();
    bumpMeters(delta);
  }

  function nextQuestion() {
    const P = S.presser;
    if (P.busy) return;
    if (P.idx < P.questions.length - 1) { P.idx++; P.answered = null; renderPresser(); return; }
    finishPresser();
  }

  async function finishPresser() {
    const P = S.presser; P.busy = true;
    // sacked mid-season?
    let head = null;
    if (LIVE.active() && P.answers.length) {
      renderLoadingPaper();
      try {
        S.liveCalls++;
        const r = await LIVE.headline({ context: contextLine(), manager: S.manager, answers: P.answers });
        head = { headline: String(r.headline || '').toUpperCase().slice(0, 70), subhead: String(r.subhead || '').slice(0, 220), quote: String(r.pullquote || '').slice(0, 140), source: 'live' };
        if (!head.headline) head = null;
      } catch (e) {
        toast('Headline desk offline: ' + e.message + '. Using the offline subs.');
        updateLiveBadge();
      }
    }
    if (!head) head = offlineHeadline();
    head.week = S.week;
    head.score = `${S.ctx.gf}-${S.ctx.ga}`;
    head.opp = S.ctx.opp;
    S.headlines.push(head);
    P.busy = false;
    S.phase = 'paper';
    renderPaper();
  }

  function offlineHeadline() {
    const c = S.ctx, P = S.presser;
    const counts = {}; P.answers.forEach(a => { counts[a.tone] = (counts[a.tone] || 0) + 1 + (a.text ? 0.5 : 0) + (['blameRef', 'joke'].includes(a.tone) ? 0.6 : 0); });
    const dom = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || 'calm';
    const grp = c.tag === 'bigwin' || c.tag === 'win' ? 'good' : c.tag === 'draw' ? 'meh' : 'bad';
    const v = {
      SUR: surname(S.manager).toUpperCase(), NICK: DATA.club.nick.toUpperCase(), CITY: DATA.club.city.toUpperCase(),
      STAR: surname(c.star).toUpperCase(), OPP: c.opp.toUpperCase(), REFSUR: c.controversy ? surname(c.controversy.ref).toUpperCase() : 'REF'
    };
    const useResult = rand() < 0.25 || !P.answers.length;
    const headline = fill(useResult ? pick(DATA.resultHeadlines[c.tag]) : pick(DATA.headlines[dom][grp]), v);
    const typed = P.answers.filter(a => a.text);
    let quote;
    if (typed.length) quote = snippet(pick(typed).text);
    else quote = pick({
      calm: ['We go again next week. That\'s football.', 'We stay humble and we keep working.'],
      defiant: ['Nobody writes this team off. Nobody.', 'Write us off at your peril.'],
      joke: ['I\'ve had worse afternoons. I once went to a wedding in Grenholt.', 'Ask me again after a cup of tea.'],
      deflect: ['I\'m not going to get into that.', 'Next question, please.'],
      praise: ['I couldn\'t be prouder of this group.', 'The lads gave everything. Everything.'],
      blameRef: ['Everyone saw what happened out there. Everyone.', 'I\'d love to see the referee\'s report. Framed.']
    }[dom]);
    const verb = { calm: 'stays cool', defiant: 'comes out fighting', joke: 'plays it for laughs', deflect: 'dodges the big questions', praise: 'backs his players', blameRef: 'rages at the officials' }[dom];
    const rw = c.result === 'W' ? 'win over' : c.result === 'D' ? 'draw with' : 'defeat to';
    const subhead = `${S.manager} ${verb} after ${c.gf}-${c.ga} ${rw} ${c.opp}`;
    return { headline, subhead, quote, source: 'offline', tone: dom };
  }

  function checkEnding() {
    const m = S.meters;
    if (m.board <= 8 && S.week >= 2) return 'sacked';
    if (S.week >= DATA.weeks) {
      const pos = position();
      if (pos === 1) return 'title';
      if (pos >= 11) return 'relegated';
      if (m.fans >= 72 && m.dressing >= 50) return 'cult';
      if (m.board < 25) return 'sacked';
      return 'survived';
    }
    return null;
  }

  // ---------- rendering ----------
  const app = () => $('#stage');
  let statusEl;
  function setStatus(t) { statusEl = $('#status'); if (statusEl) statusEl.textContent = t; }
  function toast(msg) {
    const t = h('div', { class: 'toast', role: 'status' }, msg);
    $('#toasts').append(t);
    setTimeout(() => t.classList.add('out'), 5200);
    setTimeout(() => t.remove(), 6000);
  }
  function flash(n) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const room = $('.room');
    for (let i = 0; i < n; i++) {
      setTimeout(() => {
        const f = h('div', { class: 'flashbulb' });
        f.style.left = (8 + rand() * 84) + '%'; f.style.top = (20 + rand() * 60) + '%';
        (room || document.body).append(f);
        setTimeout(() => f.remove(), 700);
        if (i === 0) { const w = $('#whiteout'); w.classList.remove('go'); void w.offsetWidth; w.classList.add('go'); }
      }, i * 140 + rand() * 80);
    }
  }

  function renderMeters() {
    const wrap = $('#meters'); wrap.textContent = '';
    if (!S) return;
    METERS.forEach(m => {
      const v = S.meters[m.id];
      const lvl = v < 25 ? 'crit' : v < 45 ? 'low' : v > 75 ? 'high' : 'mid';
      wrap.append(h('div', { class: 'meter ' + lvl, 'data-m': m.id, role: 'meter', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': v, 'aria-label': m.label },
        h('div', { class: 'mlabel' }, h('span', { class: 'micon', 'aria-hidden': 'true' }, m.icon), m.label, h('b', { class: 'mval' }, String(v))),
        h('div', { class: 'mbar' }, h('i', { style: `width:${v}%` })),
        h('span', { class: 'mdelta', 'aria-hidden': 'true' })));
    });
    const wk = $('#weekno'); if (wk) wk.textContent = S.week ? `Matchweek ${S.week}/${DATA.weeks}` : 'Pre-season';
  }
  function bumpMeters(delta) {
    renderMeters();
    MKEYS.forEach(k => {
      const d = delta[k]; if (!d) return;
      const el = $(`.meter[data-m="${k}"] .mdelta`); if (!el) return;
      el.textContent = (d > 0 ? '+' : '') + d; el.className = 'mdelta show ' + (d > 0 ? 'up' : 'down');
    });
  }

  function crestEl(cls) { const e = svg(CREST); if (cls) e.classList.add(cls); return e; }

  function focusMain() { const t = app().querySelector('[data-focus]') || app().querySelector('h2'); if (t) { if (!t.hasAttribute('tabindex') && !/BUTTON|INPUT|TEXTAREA/.test(t.tagName)) t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); } window.scrollTo({ top: 0 }); }

  function renderIntro() {
    S = null; renderMeters();
    const prefs = loadPrefs();
    const name = h('input', { id: 'mgrname', type: 'text', maxlength: 28, autocomplete: 'off', value: prefs.manager || '', placeholder: 'e.g. Sam Harrowby', 'aria-label': 'Your manager name' });
    const start = () => { const n = name.value.trim().replace(/[<>]/g, '') || 'Sam Harrowby'; savePrefs({ manager: n }); newSeason(n); playWeek(); renderMatch(); };
    name.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); start(); } });
    app().replaceChildren(h('section', { class: 'intro card' },
      h('div', { class: 'intro-hero' }, crestEl('crest-xl'),
        h('div', null,
          h('p', { class: 'kicker' }, DATA.league + ' · new appointment'),
          h('h2', { 'data-focus': true }, 'You are the new manager of ', h('span', { class: 'club' }, DATA.club.name)),
          h('p', null, 'Fourteen matchweeks. Every result is followed by a press conference. Every word you say ends up on ', h('em', null, 'The Back Page'), '. Keep the board, the dressing room, the fans and the media on side - or clear your desk.'))),
      h('div', { class: 'intro-grid' },
        h('div', { class: 'brief' }, h('h3', null, 'The brief'),
          h('ul', null,
            h('li', null, h('b', null, 'Board target: '), 'top-half finish. Board confidence at zero means the sack.'),
            h('li', null, h('b', null, 'Dressing room: '), 'happy players play better.'),
            h('li', null, h('b', null, 'Fans: '), 'they lift the team at home, and they decide who becomes a legend.'),
            h('li', null, h('b', null, 'Media: '), 'they write the headlines.'))),
        h('div', { class: 'brief' }, h('h3', null, 'How to answer'),
          h('p', null, 'Pick a tone (keys ', h('kbd', null, '1'), '-', h('kbd', null, '6'), ') or type your own answer and press ', h('kbd', null, 'Enter'), '. Typed answers are read for tone, names and attitude.'),
          h('p', { class: 'muted' }, LIVE.wanted() ? 'Live journalists are ON: typed answers get AI follow-ups and the headline is written live.' : 'Optional: turn on Live journalists (top right) with your own API key for AI follow-ups.'))),
      h('label', { class: 'namefield', for: 'mgrname' }, 'Your name, gaffer'),
      h('div', { class: 'row' }, name, h('button', { class: 'btn primary', onclick: start }, 'Take the job →'))));
    name.focus();
  }

  function tableEl(compact) {
    const st = standings(), pos = position();
    let rows = st.map((t, i) => ({ t, i }));
    if (compact) { const lo = clamp(pos - 3, 0, 7); rows = rows.slice(lo, lo + 5); }
    return h('table', { class: 'tbl' },
      h('thead', null, h('tr', null, h('th', null, '#'), h('th', { class: 'l' }, 'Club'), h('th', null, 'P'), h('th', null, 'GD'), h('th', null, 'Pts'))),
      h('tbody', null, rows.map(({ t, i }) => h('tr', { class: (t.you ? 'you ' : '') + (i === 0 ? 'lead ' : '') + (i >= 10 ? 'drop' : '') },
        h('td', null, String(i + 1)), h('td', { class: 'l' }, t.name), h('td', null, String(t.p)), h('td', null, (t.gf - t.ga > 0 ? '+' : '') + (t.gf - t.ga)), h('td', null, h('b', null, String(t.pts))))))
    );
  }

  function renderMatch() {
    S.phase = 'match';
    renderMeters();
    const c = S.ctx;
    const yourName = DATA.club.name, oppName = c.opp;
    const left = c.home ? yourName : oppName, right = c.home ? oppName : yourName;
    const lg = c.home ? c.gf : c.ga, rg = c.home ? c.ga : c.gf;
    const res = { W: 'WIN', D: 'DRAW', L: 'DEFEAT' }[c.result];
    const evs = [];
    c.scorers.forEach(s => evs.push({ min: s.min, txt: `⚽ ${s.name}`, side: 'you' }));
    c.oppScorers.forEach(m => evs.push({ min: m, txt: `⚽ ${oppName}`, side: 'opp' }));
    if (c.injured) evs.push({ min: 20 + Math.floor(rand() * 60), txt: `✚ ${c.injured} off injured (out ~${c.injWeeks} wk)`, side: 'you' });
    if (c.controversy) evs.push({ min: 10 + Math.floor(rand() * 78), txt: `\u{1F6A9} ${c.controversy.desc} (ref ${c.controversy.ref})`, side: c.controversy.against ? 'opp' : 'you' });
    evs.sort((a, b) => a.min - b.min);
    const deltaChips = MKEYS.map((k, i) => { const d = c.resultDelta[k]; return d ? h('span', { class: 'chip ' + (d > 0 ? 'up' : 'down') }, `${METERS[i].label} ${d > 0 ? '+' : ''}${d}`) : null; });
    const others = c.otherGames.map(g => h('li', null, `${team(g.h).name} ${g.hg}-${g.ag} ${team(g.a).name}`));
    app().replaceChildren(h('section', { class: 'match card' },
      h('p', { class: 'kicker' }, `Matchweek ${c.week} · ${c.home ? 'Home' : 'Away'} · full time`),
      h('div', { class: 'scoreboard ' + c.result },
        h('div', { class: 'side' + (c.home ? ' yours' : '') }, c.home ? crestEl('crest-sm') : h('span', { class: 'opp-dot' }, team(c.oppId).id), h('span', null, left)),
        h('div', { class: 'score', 'aria-label': `${left} ${lg}, ${right} ${rg}` }, h('span', null, String(lg)), h('i', null, '-'), h('span', null, String(rg))),
        h('div', { class: 'side' + (!c.home ? ' yours' : '') }, !c.home ? crestEl('crest-sm') : h('span', { class: 'opp-dot' }, team(c.oppId).id), h('span', null, right))),
      h('h2', { class: 'result-word', 'data-focus': true }, res),
      h('div', { class: 'match-grid' },
        h('div', null, h('h3', null, 'Key moments'),
          evs.length ? h('ol', { class: 'events' }, evs.map(e => h('li', { class: e.side }, h('b', null, e.min + "'"), ' ', e.txt))) : h('p', { class: 'muted' }, 'A goalless grind. Nobody will remember this one.'),
          h('p', { class: 'muted small' }, `Man of the match: ${c.star}. xG ${c.xgf} - ${c.xga}.`),
          c.event ? h('p', { class: 'event-note' }, '\u{1F4F0} ', c.event.text) : null,
          h('div', { class: 'chips' }, deltaChips)),
        h('div', null, h('h3', null, 'Table'), tableEl(true),
          h('details', { class: 'full-table' }, h('summary', null, 'Full table & other results'), tableEl(false), h('ul', { class: 'others' }, others)))),
      h('div', { class: 'actions' }, h('button', { class: 'btn primary', 'data-primary': true, onclick: () => { buildPresser(); S.phase = 'presser'; renderPresser(true); } }, 'Face the press →'))));
    focusMain();
  }

  function avatar(j, active) {
    const ini = j.name.split(' ').map(x => x[0]).join('').slice(0, 2);
    return h('div', { class: 'jcard' + (active ? ' active' : ''), style: `--jc:${j.color}`, title: j.blurb },
      h('div', { class: 'ava', 'aria-hidden': 'true' }, ini, h('span', { class: 'press-tag' }, 'PRESS')),
      h('div', { class: 'jmeta' }, h('b', null, j.name), h('span', null, j.outlet)));
  }

  function renderPresser(first) {
    const P = S.presser; const q = P.questions[P.idx];
    renderMeters();
    const total = P.questions.length;
    const room = h('div', { class: 'room' },
      h('div', { class: 'sponsor-wall', 'aria-hidden': 'true' }),
      h('div', { class: 'top-row' }, h('span', { class: 'live-dot' }, 'LIVE'), h('span', null, 'Post-match press conference · ', `${DATA.club.name} ${S.ctx.gf}-${S.ctx.ga} ${S.ctx.opp}`)),
      h('div', { class: 'desk', 'aria-hidden': 'true' },
        h('div', { class: 'mics' }, ...Array.from({ length: 5 }, (_, i) => h('i', { style: `--r:${(i - 2) * 9}deg;--c:${(P.room[i % P.room.length] || {}).color || '#888'}` }))),
        h('div', { class: 'nameplate' }, crestEl('crest-tiny'), S.manager)),
      h('div', { class: 'journos' }, P.room.map(j => avatar(j, j.id === q.j.id))));

    const qbox = h('div', { class: 'question', 'aria-live': 'polite' },
      h('div', { class: 'qhead' }, h('span', { class: 'qwho', style: `--jc:${q.j.color}` }, q.j.name, ' ', h('small', null, q.j.tag + ' · ' + q.j.outlet)),
        h('span', { class: 'qcount' }, q.followup ? 'Follow-up' : `Question ${P.idx + 1} of ${total}`)),
      h('p', { class: 'qtext', 'data-focus': !P.answered && !first ? true : null }, '“' + q.text + '”'));

    let panel;
    if (P.answered) {
      const a = P.answered;
      const chips = MKEYS.map((k, i) => a.delta[k] ? h('span', { class: 'chip ' + (a.delta[k] > 0 ? 'up' : 'down') }, `${METERS[i].label} ${a.delta[k] > 0 ? '+' : ''}${a.delta[k]}`) : null);
      const toneLabel = DATA.tones.find(t => t.id === a.tone).label;
      const more = P.idx < P.questions.length - 1;
      panel = h('div', { class: 'reaction', 'aria-live': 'polite' },
        h('p', { class: 'youanswer' }, h('span', { class: 'tone-tag t-' + a.tone }, toneLabel), a.text ? ' “' + a.text + '”' : ' ' + toneAnswerLine(a.tone)),
        h('p', { class: 'react-text' }, a.reaction),
        a.notes.length ? h('p', { class: 'muted small' }, a.notes.join(' ')) : null,
        h('div', { class: 'chips' }, chips, a.source === 'live' ? h('span', { class: 'chip live' }, 'live') : null),
        h('div', { class: 'actions' }, h('button', { class: 'btn primary', 'data-primary': true, 'data-focus': true, onclick: nextQuestion },
          more ? (P.questions[P.idx + 1].followup ? 'Take the follow-up →' : 'Next question →') : 'Wrap it up →')));
    } else {
      const ta = h('textarea', { id: 'freetext', rows: 2, maxlength: 400, placeholder: 'Or type your own answer... (Enter to send, Shift+Enter for new line)', 'aria-label': 'Type your own answer', disabled: P.busy });
      ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); answer(null, ta.value); } });
      panel = h('div', { class: 'answer' },
        h('div', { class: 'tones', role: 'group', 'aria-label': 'Answer tone' },
          DATA.tones.map(t => h('button', { class: 'tone t-' + t.id, disabled: P.busy, title: t.hint, 'aria-keyshortcuts': t.key, onclick: () => { const v = ta.value.trim(); answer(t.id, v); } },
            h('kbd', null, t.key), h('span', { class: 'tglyph', 'aria-hidden': 'true' }, t.glyph), h('span', null, t.label)))),
        h('div', { class: 'freebox' }, ta,
          h('button', { class: 'btn', disabled: P.busy, onclick: () => answer(null, ta.value) }, P.busy ? '...' : 'Say it')),
        h('p', { class: 'hint muted small' }, 'Tip: pick a tone and typed text together to set the tone of your words. ',
          LIVE.active() ? h('span', { class: 'livepill' }, 'Live journalists on') : null),
        h('p', { id: 'status', class: 'status', role: 'status' }, P.busy ? 'Journalists are scribbling...' : ''));
    }
    app().replaceChildren(h('section', { class: 'presser' }, room, h('div', { class: 'card qcard' }, qbox, panel)));
    if (first) { flash(2); const t = $('.qtext'); t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); window.scrollTo({ top: 0 }); }
    else if (P.answered) { const b = app().querySelector('[data-primary]'); if (b) b.focus({ preventScroll: true }); }
    else if (!P.busy) { const t = $('.qtext'); t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); }
  }
  function toneAnswerLine(t) {
    return pick({
      calm: ['You answer evenly, choosing every word with care.', 'You keep it measured and sensible.'],
      defiant: ['You lean into the microphone and make it clear nobody pushes this club around.', 'You fold your arms: "We\'ll see who\'s right in May."'],
      joke: ['You crack a joke and the tension drains out of the room.', 'You deadpan something about the catering and get a laugh.'],
      deflect: ['"I\'m not going to get into that." You stare at the next hand up.', 'You smile thinly and talk about something else entirely.'],
      praise: ['You talk at length about the character in the group.', 'You single out the players for real credit.'],
      blameRef: ['You suggest, not very subtly, that the officials had a shocker.', 'You say you will "be sending the clips to the league".']
    }[t]);
  }

  function renderLoadingPaper() {
    app().replaceChildren(h('section', { class: 'card paper loading' }, h('p', { class: 'kicker' }, 'The subs desk'), h('h2', { 'data-focus': true }, 'Writing tomorrow’s back page...'), h('div', { class: 'press-spinner', 'aria-hidden': 'true' })));
    focusMain();
  }

  function renderPaper() {
    renderMeters();
    const head = S.headlines[S.headlines.length - 1];
    const c = S.ctx;
    const ending = checkEnding();
    const briefs = shuffle(DATA.briefs).slice(0, 3).map(b => {
      const others = shuffle(S.teams.filter(t => !t.you));
      return h('li', null, fill(b, { t1: others[0].name, t2: others[1].name }));
    });
    const nextLabel = ending ? 'See how your season ended →' : `On to matchweek ${S.week + 1} →`;
    const sackStory = ending === 'sacked' && S.week < DATA.weeks;
    app().replaceChildren(h('section', { class: 'paper' },
      h('div', { class: 'masthead' }, h('span', { class: 'mast-l' }, 'Matchweek ' + S.week), h('h2', { class: 'mast', 'data-focus': true }, 'THE BACK PAGE'), h('span', { class: 'mast-r' }, head.source === 'live' ? 'Live edition' : 'Late edition')),
      h('div', { class: 'paper-body' },
        h('div', { class: 'splash' },
          h('span', { class: 'exclusive' }, sackStory ? 'BREAKING' : 'EXCLUSIVE'),
          h('h1', { class: 'headline' + (head.headline.length > 26 ? ' long' : '') }, sackStory ? `${surname(S.manager).toUpperCase()} AXED` : head.headline),
          h('p', { class: 'subhead' }, sackStory ? `${S.manager} is sacked after a disastrous run - board confidence hit rock bottom` : head.subhead),
          h('blockquote', { class: 'pull' }, '“' + head.quote + '”', h('cite', null, '- ' + S.manager)),
          h('p', { class: 'byline' }, 'By our chief football writer · ', `${DATA.club.name} ${c.gf}-${c.ga} ${c.opp}`)),
        h('aside', { class: 'sidebar' },
          h('h3', null, 'The table'), tableEl(true),
          h('h3', null, 'In brief'), h('ul', { class: 'briefs' }, briefs))),
      h('div', { class: 'actions' }, h('button', { class: 'btn primary', 'data-primary': true, onclick: () => {
        if (ending) { S.ending = ending; renderEnd(); }
        else { playWeek(); renderMatch(); }
      } }, nextLabel))));
    flash(1);
    focusMain();
  }

  function seasonSummary() {
    const t = you(), pos = position();
    const e = DATA.endings[S.ending];
    const best = S.headlines.slice().sort((a, b) => (b.source === 'live') - (a.source === 'live') || rand() - 0.5)[0];
    const fav = Object.keys(S.toneCounts).sort((a, b) => S.toneCounts[b] - S.toneCounts[a])[0];
    return { t, pos, e, best, fav: DATA.tones.find(x => x.id === fav).label };
  }

  function renderEnd() {
    S.phase = 'end';
    renderMeters();
    const { t, pos, e, best, fav } = seasonSummary();
    const card = h('div', { class: 'season-card end-' + S.ending, id: 'seasoncard' },
      h('div', { class: 'sc-top' }, crestEl('crest-md'), h('div', null, h('p', { class: 'kicker' }, `${DATA.league} · season review`), h('p', { class: 'sc-mgr' }, S.manager), h('p', { class: 'muted small' }, DATA.club.name))),
      h('p', { class: 'sc-kicker' }, e.kicker),
      h('h2', { class: 'sc-title', 'data-focus': true }, e.title),
      h('p', { class: 'sc-blurb' }, e.blurb),
      h('div', { class: 'sc-stats' },
        stat('Finished', ordinal(pos)), stat('Record', `${t.w}-${t.d}-${t.l}`), stat('Points', String(t.pts)), stat('Weeks', `${S.week}/${DATA.weeks}`)),
      h('div', { class: 'sc-meters' }, METERS.map(m => h('div', null, h('span', null, m.label), h('div', { class: 'mbar' }, h('i', { style: `width:${S.meters[m.id]}%` })), h('b', null, String(S.meters[m.id]))))),
      best ? h('div', { class: 'sc-head' }, h('small', null, `Back page, week ${best.week}`), h('strong', null, best.headline)) : null,
      h('p', { class: 'muted small' }, `Signature tone: ${fav} · ${S.typedCount} answers in your own words`));
    const form = h('ol', { class: 'formguide', 'aria-label': 'Results' }, S.results.map(r => h('li', { class: r.result, title: `Wk ${r.week}: ${r.home ? 'v' : '@'} ${r.opp} ${r.gf}-${r.ga}` }, r.result)));
    app().replaceChildren(h('section', { class: 'end' }, card, form,
      h('div', { class: 'actions wrap' },
        h('button', { class: 'btn primary', onclick: downloadCard }, 'Download card (PNG)'),
        h('button', { class: 'btn', onclick: copySummary }, 'Copy summary'),
        navigator.share ? h('button', { class: 'btn', onclick: shareSummary }, 'Share') : null,
        h('button', { class: 'btn ghost', onclick: () => renderIntro() }, 'New season')),
      h('details', { class: 'full-table' }, h('summary', null, 'Final table'), tableEl(false)),
      h('details', { class: 'full-table' }, h('summary', null, 'Every back page'), h('ol', { class: 'allheads' }, S.headlines.map(x => h('li', null, h('b', null, x.headline), ` — wk ${x.week}, ${x.score} v ${x.opp}`))))));
    flash(3);
    focusMain();
  }
  function stat(k, v) { return h('div', { class: 'stat' }, h('b', null, v), h('span', null, k)); }

  function summaryText() {
    const { t, pos, e, best } = seasonSummary();
    return `PRESS ROOM — ${e.title}\n${S.manager}, ${DATA.club.name}\nFinished ${ordinal(pos)} · ${t.w}W ${t.d}D ${t.l}L · ${t.pts} pts\nBoard ${S.meters.board} · Dressing room ${S.meters.dressing} · Fans ${S.meters.fans} · Media ${S.meters.media}\n${best ? 'Best back page: "' + best.headline + '"\n' : ''}${location.href.split('#')[0]}`;
  }
  async function copySummary() {
    try { await navigator.clipboard.writeText(summaryText()); toast('Season summary copied.'); }
    catch (e) { toast('Copy failed - your browser blocked clipboard access.'); }
  }
  async function shareSummary() { try { await navigator.share({ title: 'Press Room', text: summaryText() }); } catch (e) { /* cancelled */ } }

  async function downloadCard() {
    const { t, pos, e, best, fav } = seasonSummary();
    const W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const club = '#0f5c5a', gold = '#f2b231', ink = '#111418', paper = '#f4efe4', red = '#d7262e';
    g.fillStyle = paper; g.fillRect(0, 0, W, H);
    g.fillStyle = club; g.fillRect(0, 0, W, 300);
    // sponsor stripe
    g.save(); g.globalAlpha = 0.12; g.fillStyle = '#fff'; g.font = '700 26px Archivo, Arial, sans-serif';
    for (let y = 30; y < 300; y += 46) for (let x = -200 + (y % 92); x < W; x += 260) g.fillText(DATA.sponsors[(x + y) % DATA.sponsors.length], x, y);
    g.restore();
    try {
      const svgTxt = CREST.replace(/var\(--club\)/g, club).replace(/var\(--gold\)/g, gold).replace('class="crest"', 'xmlns="http://www.w3.org/2000/svg" width="200" height="240"');
      const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgTxt);
      await img.decode(); g.drawImage(img, 60, 40, 180, 216);
    } catch (err) { /* crest optional */ }
    g.fillStyle = '#fff'; g.font = '600 30px Archivo, Arial, sans-serif'; g.fillText((DATA.league + ' · season review').toUpperCase(), 280, 110);
    g.font = '700 64px Archivo, Arial, sans-serif'; g.fillText(S.manager, 280, 185);
    g.font = '500 32px Archivo, Arial, sans-serif'; g.fillText(DATA.club.name, 280, 235);
    g.fillStyle = red; g.fillRect(60, 340, 380, 56); g.fillStyle = '#fff'; g.font = '700 30px Archivo, Arial, sans-serif'; g.fillText(e.kicker.toUpperCase(), 80, 378);
    g.fillStyle = ink; g.font = '150px Anton, Impact, sans-serif';
    let y = wrapText(g, e.title, 60, 560, W - 120, 150, 2);
    g.font = '500 34px Archivo, Arial, sans-serif'; g.fillStyle = '#333';
    y = wrapText(g, e.blurb, 60, y + 30, W - 120, 46, 3);
    const stats = [['FINISHED', ordinal(pos)], ['RECORD', `${t.w}-${t.d}-${t.l}`], ['POINTS', String(t.pts)], ['TONE', fav.toUpperCase()]];
    stats.forEach(([k, v], i) => {
      const x = 60 + i * 245; g.fillStyle = '#e6dfcf'; g.fillRect(x, y + 30, 225, 140);
      g.fillStyle = club; g.font = (v.length > 8 ? '40px' : '60px') + ' Anton, Impact, sans-serif'; g.fillText(v, x + 20, y + 110);
      g.fillStyle = '#555'; g.font = '600 24px Archivo, Arial, sans-serif'; g.fillText(k, x + 20, y + 150);
    });
    y += 220;
    METERS.forEach((m, i) => {
      const yy = y + i * 52; g.fillStyle = ink; g.font = '600 28px Archivo, Arial, sans-serif'; g.fillText(m.label, 60, yy + 24);
      g.fillStyle = '#ddd5c4'; g.fillRect(340, yy, 600, 28); g.fillStyle = S.meters[m.id] < 30 ? red : club; g.fillRect(340, yy, 6 * S.meters[m.id], 28);
      g.fillStyle = ink; g.fillText(String(S.meters[m.id]), 960, yy + 24);
    });
    y += 4 * 52 + 30;
    if (best) {
      g.fillStyle = ink; g.fillRect(60, y, W - 120, H - y - 110);
      g.fillStyle = gold; g.font = '600 24px Archivo, Arial, sans-serif'; g.fillText(`THE BACK PAGE · WEEK ${best.week}`, 90, y + 46);
      g.fillStyle = '#fff'; g.font = '64px Anton, Impact, sans-serif'; wrapText(g, best.headline, 90, y + 125, W - 180, 70, 2);
    }
    g.fillStyle = '#666'; g.font = '500 24px Archivo, Arial, sans-serif'; g.fillText('PRESS ROOM · a football press-conference game · all clubs fictional', 60, H - 45);
    cv.toBlob(b => {
      if (!b) { toast('Could not render the card.'); return; }
      const a = h('a', { href: URL.createObjectURL(b), download: 'press-room-season.png' }); document.body.append(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    }, 'image/png');
  }
  function wrapText(g, text, x, y, maxW, lh, maxLines) {
    const words = text.split(' '); let line = '', n = 0;
    for (let i = 0; i < words.length; i++) {
      const test = line ? line + ' ' + words[i] : words[i];
      if (g.measureText(test).width > maxW && line) { g.fillText(line, x, y); y += lh; n++; line = words[i]; if (n >= maxLines - 1) { line = words.slice(i).join(' '); break; } }
      else line = test;
    }
    g.fillText(line, x, y); return y + lh;
  }

  // ---------- live settings dialog ----------
  function updateLiveBadge() {
    const b = $('#livebtn');
    const on = LIVE.active(), wanted = LIVE.wanted();
    b.classList.toggle('on', on);
    b.querySelector('span').textContent = on ? 'Live: on' : wanted ? 'Live: paused' : 'Live: off';
    b.title = on ? 'Live journalists on (' + LIVE.MODEL + ')' : wanted ? 'Live paused: ' + LIVE.disabledReason() : 'Offline press pack (no key needed)';
  }
  function openLive() {
    const dlg = $('#livedlg');
    const inp = $('#apikey'); inp.value = '';
    const st = $('#livestate');
    st.textContent = LIVE.getKey() ? `A key is saved in this browser (…${LIVE.getKey().slice(-4)}). ${LIVE.active() ? 'Live mode is on.' : LIVE.wanted() ? 'Live mode is paused: ' + LIVE.disabledReason() : 'Live mode is off.'}` : 'No key saved. The game is running fully offline.';
    $('#livemsg').textContent = '';
    $('#livetoggle').textContent = LIVE.wanted() ? 'Turn live mode off' : 'Turn live mode on';
    $('#livetoggle').disabled = !LIVE.getKey();
    $('#forgetkey').disabled = !LIVE.getKey();
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    inp.focus();
  }
  function initLive() {
    $('#livebtn').addEventListener('click', openLive);
    $('#closelive').addEventListener('click', () => $('#livedlg').close());
    $('#savekey').addEventListener('click', async () => {
      const k = $('#apikey').value.trim();
      const msg = $('#livemsg');
      if (!k && !LIVE.getKey()) { msg.textContent = 'Paste a key first.'; return; }
      if (k) LIVE.setKey(k); else LIVE.setOn(true);
      msg.textContent = 'Testing the key...';
      try { await LIVE.test(); msg.textContent = 'Key works. Live journalists are on.'; }
      catch (e) { msg.textContent = 'Saved, but the test failed: ' + e.message + '. The game will keep using the offline press pack.'; }
      $('#apikey').value = '';
      updateLiveBadge(); openLiveRefresh();
    });
    $('#forgetkey').addEventListener('click', () => { LIVE.forget(); $('#livemsg').textContent = 'Key deleted from this browser.'; updateLiveBadge(); openLiveRefresh(); });
    $('#livetoggle').addEventListener('click', () => { LIVE.setOn(!LIVE.wanted()); updateLiveBadge(); openLiveRefresh(); });
    updateLiveBadge();
  }
  function openLiveRefresh() {
    $('#livestate').textContent = LIVE.getKey() ? `A key is saved in this browser (…${LIVE.getKey().slice(-4)}). ${LIVE.active() ? 'Live mode is on.' : LIVE.wanted() ? 'Live mode is paused: ' + LIVE.disabledReason() : 'Live mode is off.'}` : 'No key saved. The game is running fully offline.';
    $('#livetoggle').textContent = LIVE.wanted() ? 'Turn live mode off' : 'Turn live mode on';
    $('#livetoggle').disabled = !LIVE.getKey();
    $('#forgetkey').disabled = !LIVE.getKey();
  }

  // ---------- theme ----------
  function initTheme() {
    const p = loadPrefs().theme || 'auto';
    applyTheme(p);
    $('#themebtn').addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme') || 'auto';
      const nxt = cur === 'auto' ? 'dark' : cur === 'dark' ? 'light' : 'auto';
      applyTheme(nxt); savePrefs({ theme: nxt });
    });
  }
  function applyTheme(t) {
    if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t);
    const b = $('#themebtn'); b.querySelector('span').textContent = { auto: 'Auto', dark: 'Dark', light: 'Light' }[t];
    b.setAttribute('aria-label', 'Theme: ' + t + ' (click to change)');
  }

  // ---------- keyboard ----------
  document.addEventListener('keydown', e => {
    if (!S || e.ctrlKey || e.metaKey || e.altKey) return;
    if ($('#livedlg').open) return;
    const typing = /INPUT|TEXTAREA/.test(document.activeElement.tagName);
    if (S.phase === 'presser' && S.presser && !S.presser.answered && !S.presser.busy) {
      if (!typing && /^[1-6]$/.test(e.key)) { e.preventDefault(); const t = DATA.tones[+e.key - 1]; answer(t.id, ''); return; }
      if (!typing && (e.key === 't' || e.key === '/')) { e.preventDefault(); const ta = $('#freetext'); if (ta) ta.focus(); return; }
    }
    if (!typing && (e.key === 'n' || e.key === 'N')) { const b = app().querySelector('[data-primary]'); if (b) { e.preventDefault(); b.click(); } }
  });

  // ---------- boot ----------
  window.addEventListener('DOMContentLoaded', () => {
    $('#crest-slot').replaceWith(crestEl('crest-head'));
    initTheme(); initLive();
    $('#homebtn').addEventListener('click', () => { if (!S || S.phase === 'end' || confirm('Abandon this season and start again?')) renderIntro(); });
    renderIntro();
  });

  // test hook (used for automated play-throughs; harmless in normal play)
  window.__pressroom = { state: () => S, answer, nextQuestion };
})();
