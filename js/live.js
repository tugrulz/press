/* Press Room - optional "Live journalists" mode.
   The player's own Anthropic API key is kept in this browser's localStorage only
   and is sent nowhere except https://api.anthropic.com (direct browser access). */
'use strict';

const LIVE = (() => {
  const KEY_STORE = 'pressroom.apiKey';
  const ON_STORE = 'pressroom.liveOn';
  const ENDPOINT = 'https://api.anthropic.com/v1/messages';
  const MODEL = 'claude-haiku-5-5'; // fast, low-cost current model
  const TONES = ['calm', 'defiant', 'joke', 'deflect', 'praise', 'blameRef'];

  let sessionDisabled = '';

  function store(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } }
  function read(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }

  const api = {
    MODEL,
    getKey() { return read(KEY_STORE); },
    setKey(k) { store(KEY_STORE, k.trim()); store(ON_STORE, '1'); sessionDisabled = ''; },
    forget() { store(KEY_STORE, null); store(ON_STORE, null); },
    setOn(on) { store(ON_STORE, on ? '1' : null); if (on) sessionDisabled = ''; },
    wanted() { return !!read(KEY_STORE) && read(ON_STORE) === '1'; },
    active() { return api.wanted() && !sessionDisabled; },
    disabledReason() { return sessionDisabled; }
  };

  class LiveError extends Error {
    constructor(kind, msg, status) { super(msg); this.kind = kind; this.status = status || 0; }
  }

  async function call(system, user, schema, maxTokens) {
    const key = api.getKey();
    if (!key) throw new LiveError('nokey', 'No API key saved');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    let res;
    try {
      res = await fetch(ENDPOINT, {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          'content-type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2026-10-21',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: maxTokens || 1500,
          system,
          output_config: { effort: 'low', format: { type: 'json_schema', schema } },
          messages: [{ role: 'user', content: user }]
        })
      });
    } catch (e) {
      throw new LiveError('network', e.name === 'AbortError' ? 'Request timed out' : 'Network error');
    } finally { clearTimeout(timer); }

    if (!res.ok) {
      let msg = '';
      try { const j = await res.json(); msg = (j && j.error && j.error.message) || ''; } catch (e) { /* ignore */ }
      const s = res.status;
      if (s === 401 || s === 403) { sessionDisabled = 'Key rejected (' + s + ')'; throw new LiveError('auth', 'API key was rejected', s); }
      if (s === 429) throw new LiveError('rate', 'Rate limited - try again shortly', s);
      if (s === 529 || s >= 500) throw new LiveError('server', 'API is busy (' + s + ')', s);
      if (s === 400 && /credit|billing|balance/i.test(msg)) { sessionDisabled = 'Billing issue on this key'; throw new LiveError('billing', 'Billing issue: ' + msg, s); }
      throw new LiveError('http', 'API error ' + s + (msg ? ': ' + msg.slice(0, 120) : ''), s);
    }
    const data = await res.json();
    if (data.stop_reason === 'refusal') throw new LiveError('refusal', 'Model declined this one');
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    try { return JSON.parse(text); } catch (e) { throw new LiveError('parse', 'Could not read the reply'); }
  }

  const SYS = 'You voice journalists in a light-hearted football press-conference game. ' +
    'Everything is fictional: club, league, players, reporters. Never name real clubs, players or people. ' +
    'Keep it witty, PG-13, British tabloid flavour. Be brief.';

  const answerSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['tone', 'reaction', 'followup', 'board', 'dressing', 'fans', 'media'],
    properties: {
      tone: { type: 'string', enum: TONES },
      reaction: { type: 'string' },
      followup: { type: 'string' },
      board: { type: 'integer' },
      dressing: { type: 'integer' },
      fans: { type: 'integer' },
      media: { type: 'integer' }
    }
  };

  api.answer = async function (c) {
    const user = [
      'Context: ' + c.context,
      'Reporter: ' + c.jName + ' (' + c.jOutlet + ', ' + c.jStyle + '; likes ' + c.jLikes + ').',
      'Question: ' + c.question,
      'Manager\'s answer: """' + c.answer.slice(0, 400) + '"""',
      c.allowFollowup
        ? 'Write: tone (closest category), reaction (1 sentence, third person, how the room/reporter reacts to the actual words), followup (one sharp follow-up question from the same reporter that quotes or reacts to the manager\'s words; or "" if not worth it).'
        : 'Write: tone (closest category), reaction (1 sentence, third person, how the room/reporter reacts to the actual words), followup: "".',
      'Then meter effects as integers from -6 to 6: board (club board confidence), dressing (players\' morale), fans (supporters\' mood), media (press relationship). Judge the actual words: insults, blaming players or refs, arrogance, humour, honesty all matter.'
    ].join('\n');
    return call(SYS, user, answerSchema, 1200);
  };

  const headSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['headline', 'subhead', 'pullquote'],
    properties: {
      headline: { type: 'string' },
      subhead: { type: 'string' },
      pullquote: { type: 'string' }
    }
  };

  api.headline = async function (c) {
    const user = [
      'Write tomorrow\'s back-page splash for the tabloid "THE BACK PAGE".',
      'Context: ' + c.context,
      'Press conference answers (manager ' + c.manager + '):',
      c.answers.map((a, i) => (i + 1) + '. Q: ' + a.q.slice(0, 160) + ' | A [' + a.tone + ']: ' + (a.text ? a.text.slice(0, 200) : '(' + a.tone + ' answer)')).join('\n'),
      'headline: max 6 words, ALL CAPS, punny tabloid style (club nickname: Kestrels). subhead: one sentence. pullquote: the manager\'s most quotable line, max 15 words (paraphrase a tone answer if nothing was typed).'
    ].join('\n');
    return call(SYS, user, headSchema, 1000);
  };

  api.test = async function () {
    const schema = { type: 'object', additionalProperties: false, required: ['ok'], properties: { ok: { type: 'boolean' } } };
    return call('Reply with JSON.', 'Return {"ok": true}.', schema, 300);
  };

  api.LiveError = LiveError;
  return api;
})();
