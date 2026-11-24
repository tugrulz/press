/* Press Room - content data. Everything here is fictional: clubs, players,
   journalists, outlets, referees and sponsors are invented for this game. */
'use strict';

const DATA = {
  club: { name: 'Kestrelford Athletic', short: 'KES', nick: 'Kestrels', city: 'Kestrelford' },
  league: 'The Meridian League',
  weeks: 14,

  teams: [
    { id: 'KES', name: 'Kestrelford Athletic', str: 66, you: true },
    { id: 'COR', name: 'Corvane City', str: 76 },
    { id: 'PHA', name: 'Port Halloran', str: 73 },
    { id: 'BRI', name: 'Brindlemoor', str: 71 },
    { id: 'ASH', name: 'Ashenfield Town', str: 68 },
    { id: 'MER', name: 'Merrow Vale', str: 66 },
    { id: 'DUN', name: 'Dunsk Wanderers', str: 64 },
    { id: 'QUA', name: 'Quarry Lane', str: 63 },
    { id: 'VEL', name: 'Velmont Rovers', str: 61 },
    { id: 'OLQ', name: 'Old Quay', str: 59 },
    { id: 'THI', name: 'Thistlemarch', str: 57 },
    { id: 'GRE', name: 'Grenholt United', str: 55 }
  ],

  squad: [
    { name: 'Teodor Vasko', pos: 'GK', num: 1, w: 0 },
    { name: 'Callum Arkwright', pos: 'DF', num: 5, w: 1, captain: true },
    { name: 'Ibou Ndiaye-Ross', pos: 'DF', num: 4, w: 1 },
    { name: 'Fergal Mooney', pos: 'DF', num: 2, w: 1 },
    { name: 'Rasmus Edlund', pos: 'MF', num: 8, w: 3 },
    { name: 'Kwame Oduya-Lane', pos: 'MF', num: 6, w: 2 },
    { name: 'Danny Pike', pos: 'MF', num: 11, w: 4, alias: '"Dazzler"' },
    { name: 'Mateus Corvo', pos: 'FW', num: 9, w: 7 },
    { name: 'Jonah Fairweather', pos: 'FW', num: 19, w: 5 }
  ],

  refs: ['Alun Spragg', 'Dermot Kell', 'Hollis Brand', 'Yusuf Carne', 'Petra Lind-Hale', 'Osric Vane'],

  sponsors: ['VOLTA COLA', 'NORDLINE', 'GULLWING AIR', 'PIXELBANK', 'MARROW MOTORS', 'BRIGHTKETTLE', 'ORBIT TYRES', 'LUMEN BET-FREE'],

  journalists: [
    { id: 'hound', name: 'Gordon Pratley', tag: '"The Hound"', outlet: 'The Daily Klaxon', style: 'tabloid', color: '#d7262e',
      likes: ['joke', 'blameRef', 'defiant'], dislikes: ['deflect', 'calm'], blurb: 'Tabloid provocateur. Wants a headline, any headline.' },
    { id: 'data', name: 'Priya Venkat', tag: 'xG obsessive', outlet: 'The Expected', style: 'data', color: '#2f7de1',
      likes: ['calm', 'praise'], dislikes: ['blameRef', 'joke'], blurb: 'Data nerd. Has a spreadsheet for your spreadsheet.' },
    { id: 'local', name: 'Morag Dunnet', tag: 'since 1994', outlet: 'Kestrelford Evening Lamp', style: 'local', color: '#1f8a5b',
      likes: ['praise', 'calm', 'joke'], dislikes: ['deflect'], blurb: 'Loyal local reporter. Has seen eleven managers come and go.' },
    { id: 'foreign', name: 'Luca Bernardi-Holm', tag: 'correspondent', outlet: 'Il Fischietto', style: 'foreign', color: '#8a4fd1',
      likes: ['calm', 'defiant'], dislikes: ['joke'], blurb: 'Foreign correspondent. Tactically ruthless, unfailingly polite.' },
    { id: 'tv', name: 'Tess Okafor', tag: 'pitchside', outlet: 'MatchNight TV', style: 'tv', color: '#e07a12',
      likes: ['joke', 'praise'], dislikes: ['deflect', 'blameRef'], blurb: 'TV presenter. Wants emotion, ideally in under ten seconds.' },
    { id: 'pod', name: 'Benny Aurell', tag: '@touchline', outlet: 'Touchline Tapes (podcast)', style: 'pod', color: '#11999e',
      likes: ['defiant', 'joke'], dislikes: ['calm'], blurb: 'Podcaster. Reads out the comments section as if it were scripture.' }
  ],

  tones: [
    { id: 'calm', label: 'Calm', key: '1', glyph: '⚖', hint: 'Measured, reasonable. Boards love it, tabloids yawn.' },
    { id: 'defiant', label: 'Defiant', key: '2', glyph: '✊', hint: 'Chin up, chest out. Fans and players rally; press bristles.' },
    { id: 'joke', label: 'Joke', key: '3', glyph: '☺', hint: 'Disarm the room. Brilliant after a win, risky after a hiding.' },
    { id: 'deflect', label: 'Deflect', key: '4', glyph: '↪', hint: '"Next question." Safe, but the media notices.' },
    { id: 'praise', label: 'Praise players', key: '5', glyph: '★', hint: 'Put an arm round the squad. Dressing room loves it.' },
    { id: 'blameRef', label: 'Blame referee', key: '6', glyph: '\u{1F7E8}', hint: 'Fans cheer, the board winces, the league may call.' }
  ],

  // base meter effects per tone: [board, dressing, fans, media]
  toneBase: {
    calm:     [3, 0, -1, 2],
    defiant:  [-1, 3, 3, -2],
    joke:     [-1, 1, 2, 3],
    deflect:  [0, 0, -1, -3],
    praise:   [0, 4, 1, 0],
    blameRef: [-3, 2, 3, -2]
  },

  openers: {
    tabloid: ['Gaffer, gaffer -', 'Simple one for you:', 'Be straight with the punters:', 'Come on, give us something:'],
    data: ['Looking at the numbers,', 'Quick stat first:', 'The underlying data is interesting here:', 'Bear with me, this is a two-parter:'],
    local: ['Morning, boss.', 'For the Lamp readers,', 'On behalf of the folks in the Long Stand,', 'Boss,'],
    foreign: ['A question from abroad:', 'Forgive my English,', 'Where I come from we would ask it like this:', 'Mister,'],
    tv: ['Live on MatchNight,', 'For the viewers at home,', 'Quickly, we are on air:', 'In ten seconds or less,'],
    pod: ['Our listeners want to know:', 'Big one from the comments:', 'The group chat is on fire, so:', 'Okay, rapid-fire question:']
  },

  // question templates. {s:[styles]} restricts to those journalist styles.
  questions: {
    bigwin: [
      '{gf}-{ga} against {opp}. Is this the best {nick} side you have ever managed?',
      'That was a demolition. Did you see that coming at half-time?',
      '{star} was unplayable today. Is he the best player in {league}?',
      { s: ['data'], t: 'You generated {xgf} expected goals to their {xga}. Is that sustainable, or did everything just go in?' },
      { s: ['tabloid'], t: 'The {opp} fans were leaving at sixty minutes. Any message for them?' },
      { s: ['local'], t: 'People in {city} were dancing in the market square. What does a result like this mean to the town?' },
      { s: ['tv'], t: 'Give me one word for that performance.' },
      { s: ['pod'], t: 'The comments say "title race". Are you in a title race?' }
    ],
    win: [
      'A {gf}-{ga} win over {opp}. How satisfied are you?',
      'Three points, but it was not always pretty. Fair assessment?',
      '{star} made the difference today. What did you say to him before kick-off?',
      { s: ['data'], t: 'The xG was {xgf} to {xga}. Were you a bit fortunate there?' },
      { s: ['foreign'], t: 'You changed the shape after half an hour. Was it planned or improvised?' },
      { s: ['tabloid'], t: 'Some say you are riding your luck. Are you?' },
      { s: ['local'], t: 'The Long Stand was rocking today. Did you feel it down on the touchline?' }
    ],
    draw: [
      '{gf}-{ga} with {opp}. Two points dropped or one gained?',
      'A draw. Are you frustrated, or is that a fair result?',
      { s: ['data'], t: 'You had {shots} shots and {gf} goals. What is going wrong in the final third?' },
      { s: ['tabloid'], t: 'The fans booed at full-time. Did you hear them?' },
      { s: ['foreign'], t: 'Your team looked tired in the last twenty minutes. Is it a fitness problem?' },
      { s: ['tv'], t: 'How would you sum up that afternoon for the viewers?' },
      { s: ['pod'], t: 'Half our listeners call this "solid", half call it "dire". Which is it?' }
    ],
    loss: [
      'Beaten {gf}-{ga} by {opp}. What went wrong?',
      'That is a painful defeat. Where does the team go from here?',
      'Do you accept responsibility for that result?',
      { s: ['data'], t: 'You lost the xG battle {xgf} to {xga}. Is the system broken or the players?' },
      { s: ['tabloid'], t: 'Is this the beginning of the end for you at {club}?' },
      { s: ['local'], t: 'The supporters travelled in numbers today. What do you say to them?' },
      { s: ['foreign'], t: 'Your pressing collapsed after the first goal. Why?' },
      { s: ['pod'], t: 'The comments are brutal tonight. Want to respond to them directly?' }
    ],
    thrashing: [
      '{gf}-{ga}. Humiliating, frankly. How do you explain that?',
      'Was that the worst performance since you took charge?',
      'Did the players give up out there?',
      { s: ['tabloid'], t: '"{sur} OUT" banners were visible behind the dugout. Did you see them?' },
      { s: ['data'], t: '{ga} goals from {xga} expected. Is the goalkeeping the problem, or the whole back line?' },
      { s: ['local'], t: 'Boss, some of the older supporters were in tears. What happened?' },
      { s: ['tv'], t: 'Viewers are asking: will you be apologising to the fans?' }
    ],
    injury: [
      '{injured} went off injured. What is the latest?',
      'How big a blow is losing {injured}?',
      { s: ['data'], t: '{injured} covers more ground than anyone in your squad. Who replaces those numbers?' },
      { s: ['tabloid'], t: 'There are rumours {injured} was carrying a knock and you played him anyway. True?' },
      { s: ['local'], t: 'Any word from the medical room on {injured}? The town is worried.' }
    ],
    controversy: [
      'That {cdesc} - what did you make of it?',
      'Was referee {ref} the decisive factor today?',
      { s: ['tabloid'], t: 'Do you think {ref} has something against {club}?' },
      { s: ['data'], t: 'The replays were inconclusive on the {cdesc}. Should the league publish the audio?' },
      { s: ['pod'], t: 'The {cdesc} has three million views already. Your take?' }
    ],
    top: [
      'You are {posTxt} in the table. Can you win {league}?',
      'Top of the pile talk: is the pressure different up here?',
      { s: ['tabloid'], t: 'Corvane City say you will fade by spring. Will you?' },
      { s: ['data'], t: 'Our model gives you a {titlePct}% title chance. Too high or too low?' }
    ],
    bottom: [
      'You are {posTxt}. Are you in a relegation battle?',
      'The table does not lie. How worried are you?',
      { s: ['tabloid'], t: 'Is it time to admit you are not the right man for this job?' },
      { s: ['local'], t: 'The town remembers the last relegation. Will it happen again?' },
      { s: ['data'], t: 'Our model gives you a {relPct}% chance of going down. How do you change that?' }
    ],
    streakWin: [
      'That is {streak} wins in a row. What has changed?',
      { s: ['tabloid'], t: '{streak} on the spin. Are you getting carried away?' },
      { s: ['pod'], t: '{streak} wins on the bounce - is there a lucky suit involved?' }
    ],
    streakLoss: [
      'That is {streak} defeats in a row. Is the confidence gone?',
      { s: ['tabloid'], t: '{streak} straight defeats. Have you spoken to the chairman?' },
      { s: ['foreign'], t: '{streak} losses. In my league you would be gone already. Why should you survive?' }
    ],
    star: [
      '{star} is in brilliant form. Are you worried bigger clubs are watching?',
      { s: ['tv'], t: 'Describe {star} in three words.' },
      { s: ['data'], t: '{star} has {starGoals} goals already this season. Is he over-performing?' }
    ],
    flop: [
      '{flop} looked off the pace again. Does he still have your trust?',
      { s: ['tabloid'], t: 'Is {flop} finished at this level?' },
      { s: ['data'], t: '{flop} completed fewer passes than your goalkeeper. Is he playing out of position?' }
    ],
    next: [
      'Next up is {next}. How do you approach that one?',
      { s: ['foreign'], t: '{next} play a back three. Will you change your system for it?' },
      { s: ['local'], t: 'Big game next week against {next}. Any message for the travelling fans?' }
    ],
    ev_sack: [
      'Reports this morning say the board has drawn up a shortlist to replace you. Your response?',
      { s: ['tabloid'], t: 'We hear the chairman was spotted having lunch with another manager. Feel safe?' }
    ],
    ev_bid: [
      'There is talk of a big bid for {star}. Is he for sale?',
      { s: ['tabloid'], t: '{star}\'s agent was seen at Corvane City\'s training ground. Is he on his way?' }
    ],
    ev_banner: [
      'A plane flew over the ground today with a banner about you. Did you see it?',
      { s: ['pod'], t: 'Someone flew a banner over the stadium today. Did you read what it said?' }
    ],
    ev_owner: [
      'The owner posted a long statement last night about "standards". Was that aimed at you?',
      { s: ['data'], t: 'The owner\'s statement mentioned "sustainable results". What does that mean to you?' }
    ],
    ev_nightclub: [
      'Photos have emerged of {flop} in a nightclub two nights before the game. Will he be disciplined?',
      { s: ['tabloid'], t: 'Our photographer caught {flop} dancing on a table at 3am. Your thoughts?' }
    ],
    ev_jab: [
      'The {next} manager called your team "long-ball merchants" this week. Care to respond?',
      { s: ['tv'], t: 'The {next} boss says your side is boring to watch. Response?' }
    ]
  },

  // reactions: tone -> style -> lines (generic under '_')
  reactions: {
    calm: {
      _: ['{j} nods and writes it down. A sensible answer, if not a thrilling one.', 'A few heads nod around the room. Measured stuff.', '{j} seems satisfied. Nobody will lose sleep over that one.'],
      tabloid: ['{j} sighs theatrically. "Boring," he mutters, loud enough to be heard.', '{j} taps his pen. "Give us a bit more next time, eh?"'],
      data: ['{j} smiles. "That is a refreshingly evidence-based answer."'],
      local: ['{j} nods warmly. The Lamp will print that one in full.'],
      foreign: ['{j} inclines his head. "Very reasonable. Very... calm."'],
      pod: ['{j} mouths "content?" at his phone, then puts it away.']
    },
    defiant: {
      _: ['A murmur ripples round the room. That will play well on the terraces.', '{j} raises an eyebrow. Fighting talk.', 'The cameras click a little faster now.'],
      tabloid: ['{j} grins. "Now we\'re talking."', '{j} is already mouthing the headline to himself.'],
      data: ['{j} looks unconvinced. "Bold, but the numbers might disagree."'],
      local: ['{j} beams. That is exactly what the town wanted to hear.'],
      foreign: ['{j} smiles. "Ah. Passion. Very good."'],
      tv: ['{j} turns to camera: "Strong words there from the {nick} boss."']
    },
    joke: {
      _: ['The room laughs. Even the cameramen crack a smile.', 'A ripple of laughter. Tension: defused.', '{j} snorts into his notebook.'],
      tabloid: ['{j} roars with laughter and underlines something twice.', '"That\'s going in large print," says {j}.'],
      data: ['{j} does not laugh. She makes a note that you did not answer the question.'],
      foreign: ['{j} smiles politely, clearly not getting the joke.', '{j} asks his neighbour to explain the joke. It does not survive translation.'],
      tv: ['{j} laughs. "Brilliant, that\'s the clip of the night."'],
      pod: ['{j} is already clipping it for socials.']
    },
    deflect: {
      _: ['A collective groan. {j} tries to follow up, but the press officer moves things on.', '{j} sighs. "That\'s a no, then."', 'The room shifts. Nobody likes a non-answer.'],
      tabloid: ['"We\'ll take that as a yes," {j} says, scribbling.'],
      data: ['{j} writes "no comment" and circles it.'],
      local: ['{j} looks a little hurt. She has known you longer than that.'],
      tv: ['{j} visibly dies inside. That will not make the highlights.']
    },
    praise: {
      _: ['Somewhere in the building, a dressing room just felt a little taller.', '{j} notes the arm round the shoulder. Players read these things.', 'Supportive words. The players will see the clip by teatime.'],
      tabloid: ['{j} rolls his eyes. "Bit of a love-in, this."'],
      data: ['{j} nods. "The individual numbers do back you up, to be fair."'],
      local: ['{j} smiles. The Lamp has always had a soft spot for this group.'],
      tv: ['{j}: "Lovely words, and I\'m sure the lads will appreciate that."']
    },
    blameRef: {
      _: ['The room erupts. Phones are out. This will be everywhere.', '{j} gasps. "Are you sure you want to say that on record?"', 'The press officer\'s face goes grey.'],
      tabloid: ['{j} practically levitates out of his seat. Christmas has come early.'],
      data: ['{j} frowns. "Statistically, refereeing decisions even out over a season, you know."'],
      foreign: ['{j}: "In my country this would be a fine of fifty thousand."'],
      tv: ['{j} winces. "We\'ll have to see what the league makes of that."'],
      pod: ['{j} whispers: "Oh, this is going on the thumbnail."']
    }
  },

  // snippet reactions for typed answers: {snip} is a short quote of the player's words
  textReactions: [
    '"{snip}," {j} repeats slowly, underlining it twice.',
    '{j} reads it back: "{snip}". "Can I quote you on that?"',
    'Pens scratch. "{snip}" will be on somebody\'s back page.',
    '{j} looks up sharply at "{snip}". The room goes quiet for a beat.',
    'Somebody at the back mutters "{snip}" and laughs.'
  ],

  followups: {
    tabloid: ['You said "{snip}". Is that a dig at the board?', 'So you are admitting it, then? Yes or no?', 'Would you say that to the chairman\'s face?', 'Interesting. And if you lose next week - will you still feel that way?'],
    data: ['You said "{snip}". What evidence is that based on?', 'Fine, but how do you measure that?', 'Can you give me one number that supports that?'],
    local: ['You said "{snip}". What should the fans take from that?', 'And what would you say to the supporters who disagree?'],
    foreign: ['Sorry, "{snip}" - can you explain what you mean tactically?', 'So the problem is mentality, not tactics?'],
    tv: ['Quick follow-up for the viewers - "{snip}": serious or not?', 'Are you enjoying this job right now?'],
    pod: ['"{snip}" - the chat wants to know if you are serious.', 'Would you come on the pod and say that?']
  },

  // headline templates by dominant tone and result group (good/meh/bad)
  headlines: {
    calm: {
      good: ['COOL HAND {SUR}', 'KEEP CALM AND KESTREL ON', 'ICE IN THE VEINS', 'SERENE {SUR} PLOTS NEXT STEP'],
      meh: ['{SUR}: NO PANIC', 'STEADY AS SHE GOES', 'NOTHING TO SEE HERE'],
      bad: ['{SUR} KEEPS HIS COOL AS {NICK} SINK', 'ZEN AND THE ART OF LOSING', 'CALM BEFORE THE STORM?']
    },
    defiant: {
      good: ['BRING IT ON!', '{SUR}: WE FEAR NO ONE', 'TALONS OUT!', 'FLYING HIGH & FIRED UP'],
      meh: ['{SUR} COMES OUT SWINGING', '"WE\'RE NOT FINISHED"', 'DEFIANT {SUR} DIGS IN'],
      bad: ['{SUR}: I\'M GOING NOWHERE', 'BACK TO THE WALL', 'NO SURRENDER, SAYS {SUR}']
    },
    joke: {
      good: ['HAVING A LAUGH!', 'KESTREL-ARIOUS!', 'JOKER IN THE PACK', '{SUR} LOVES A GAG'],
      meh: ['STAND-UP SHOW', '{SUR} PLAYS IT FOR LAUGHS', 'WHO\'S LAUGHING NOW?'],
      bad: ['LAUGHING STOCK', 'NO JOKE, {SUR}', 'CLOWN PRINCE OF {CITY}', 'GAG ORDER NEEDED']
    },
    deflect: {
      good: ['MUM\'S THE WORD', '{SUR} KEEPS SECRETS', 'SILENT ASSASSINS'],
      meh: ['NO COMMENT', '{SUR} DUCKS THE QUESTIONS', 'THE GREAT DODGE'],
      bad: ['{SUR} RUNS FOR COVER', 'HIDING TO NOTHING', 'SPEECHLESS']
    },
    praise: {
      good: ['{STAR} STAR!', 'BAND OF BROTHERS', 'PROUD AS PUNCH', 'BIRDS OF A FEATHER'],
      meh: ['{SUR}\'S GROUP HUG', '"I BACK MY BOYS"', 'ARM ROUND THE SHOULDER'],
      bad: ['{SUR} STANDS BY FLOPS', 'LOVE IS BLIND', 'BLIND LOYALTY?']
    },
    blameRef: {
      good: ['{SUR} SEES RED (EVEN IN VICTORY)', 'WHISTLE BLOWER', 'REF RAGE!'],
      meh: ['REF JUSTICE!', '{SUR} BLASTS "{REFSUR} SHAMBLES"', 'WHISTLE WAR'],
      bad: ['ROBBED!', 'REF-USE TO LOSE', '{SUR}\'S REF FURY', 'CRY FOUL!']
    }
  },

  resultHeadlines: {
    bigwin: ['KESTRELS SOAR', 'BIRDS OF PREY FEAST ON {OPP}', '{OPP} PLUCKED'],
    win: ['WINGING IT', 'KESTRELS EDGE {OPP}'],
    draw: ['STALEMATE IN THE NEST', 'HOVERING'],
    loss: ['WINGS CLIPPED', 'GROUNDED'],
    thrashing: ['MAULED', 'FEATHERS FLY AS {OPP} RUN RIOT', 'NOSE DIVE']
  },

  briefs: [
    '{t1} boss: "We take it one game at a time"',
    '{t1} fans plan protest over pie prices',
    '{t1} striker signs new deal "until the moon falls"',
    'Groundsman at {t1} retires after 41 years',
    '{t1} mascot suspended for one match',
    '{t2} deny tapping up {t1} midfielder',
    'League to trial orange ball in winter fixtures',
    '{t1} chairman: "Manager has my full support" (again)',
    '{t2} youth team unbeaten in 19',
    'Floodlight failure halts {t1} training session'
  ],

  events: [
    { id: 'ev_sack', text: 'Rumours swirl that the board is sounding out replacements.', when: (s) => s.meters.board < 45 },
    { id: 'ev_bid', text: 'A big club is reportedly circling your top scorer.', when: (s) => true },
    { id: 'ev_banner', text: 'A light aircraft trailing a banner circled the ground during the match.', when: (s) => s.meters.fans < 45 || s.meters.fans > 75 },
    { id: 'ev_owner', text: 'The owner published a late-night statement about "standards".', when: (s) => s.meters.board < 55 },
    { id: 'ev_nightclub', text: 'Tabloid photos of a player at a nightclub surfaced this week.', when: (s) => true },
    { id: 'ev_jab', text: 'Next week\'s opposing manager has been talking about you.', when: (s) => true }
  ],

  endings: {
    sacked: { title: 'SACKED', kicker: 'Clear your desk', blurb: 'The board has seen enough. Your name is being scraped off the office door as we speak.' },
    relegated: { title: 'RELEGATED & SACKED', kicker: 'The drop', blurb: 'Kestrelford go down, and you go with them. The Lamp prints a black border round the back page.' },
    title: { title: 'CHAMPIONS', kicker: 'Kings of the Meridian', blurb: 'Kestrelford Athletic are champions. They are already painting a mural of you on the bus station.' },
    cult: { title: 'CULT HERO', kicker: 'Songs about you', blurb: 'No trophy, but the terraces have written three songs about you and one of them rhymes.' },
    survived: { title: 'SURVIVED', kicker: 'Another season', blurb: 'You made it through. The board renews your contract with a handshake that lasts slightly too long.' }
  }
};
