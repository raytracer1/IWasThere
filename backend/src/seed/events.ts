import type { Event } from '../shared';

/**
 * 15 historic sports events for IfIWasThere MVP.
 * Sorted by viral_score (descending).
 */
export const SEED_EVENTS: Omit<Event, 'createdAt'>[] = [
  // ─── 1. Messi 2022 World Cup Final ───────────────────────
  {
    id: '2022-wc-final',
    title: '2022 World Cup Final: Argentina vs France',
    year: 2022,
    location: 'Lusail Stadium, Qatar',
    sportType: 'football',
    description: 'The greatest World Cup final ever. Messi scores twice, Mbappé hits a hat-trick, and Argentina wins on penalties.',
    keyMoment: 'Messi lifting the World Cup trophy, arms raised to the sky',
    eraClothing: '2022 Argentina jersey, casual modern wear',
    imagePrompt: `Place this person naturally into the celebration crowd at Lusail Stadium after the 2022 World Cup Final. The person is wearing an Argentina jersey, face showing pure joy and tears, arms raised high. Golden confetti raining down, fireworks in the night sky. Messi just lifted the World Cup trophy.

The crowd around them is ecstatic — hugging strangers, waving Argentine flags, phones out recording history. Stadium floodlights illuminating the pitch, the giant trophy on the podium visible in the background.

The person should look genuinely part of this historic celebration — same warm golden lighting, same emotional intensity.

Visual style: Ultra-realistic DSLR sports photography, ESPN broadcast aesthetic, shallow depth of field, cinematic framing, 8K, Canon 35mm. Keep facial features intact. No text or logos.`,
    captionTemplates: JSON.stringify([
      'POV: You were at Lusail Stadium when Messi finally lifted the World Cup. Still get goosebumps. 🏆🇦🇷 #IfIWasThere',
      'What if you could step into the {year} World Cup Final? This is what it felt like when {moment}. Legendary. 🐐',
      'Dec 18, {year}. The night football peaked. And I was THERE. Still not over it. ✨ #POV',
      'Where were you when {moment}? I was at {location}. History witnessed. 🙌',
      'One stadium. One trophy. One moment that changed everything. And I was part of it. #IfIWasThere',
    ]),
    hashtags: '#IfIWasThere #Messi #WorldCupFinal #Argentina #Qatar2022 #GOAT',
    viralScore: 9.5,
    status: 'active',
  },

  // ─── 2. Germany 7-1 Brazil ─────────────────────────────
  {
    id: '2014-germany-7-1-brazil',
    title: '2014 World Cup Semi-Final: Germany 7-1 Brazil',
    year: 2014,
    location: 'Mineirão Stadium, Belo Horizonte, Brazil',
    sportType: 'football',
    description: 'The most shocking result in World Cup history. Germany scored 5 goals in 18 first-half minutes against the hosts.',
    keyMoment: 'German fans celebrating the 5th goal, stunned Brazilian fans in disbelief',
    eraClothing: '2014 Germany jersey, casual summer wear',
    imagePrompt: `Place this person naturally into the Germany fan section at Mineirão Stadium during the 2014 World Cup semi-final. The person is wearing a Germany jersey, arms raised, face showing shocked joy and disbelief. Scoreboard visible showing "GER 7 - 1 BRA".

The German fans around are in a state of ecstatic disbelief — some laughing in shock, others singing, flags waving. Brazilian fans visible across the stadium with hands on heads, tears, disbelief. Night atmosphere, stadium lights, dramatic contrast between sections.

The person should look genuinely part of this German celebration — same lighting, same surreal atmosphere, same raw emotion.

Visual style: Ultra-realistic DSLR sports photography, dramatic stadium lighting, emotional crowd shots, shallow depth of field, 8K, Canon 35mm. Keep facial features intact. No text or logos.`,
    captionTemplates: JSON.stringify([
      'POV: You witnessed the most insane night in football. Germany 7-1 Brazil. I was THERE in Belo Horizonte. 🤯🇩🇪 #IfIWasThere',
      'Still the most unbelievable thing I\'ve ever seen in sports. {moment}. And I was in that stadium. 💀',
      'What if you were at Mineirão on July 8, {year}? This is what the German section felt like. Pure shock. #POV',
      'Nobody believed it was real. Not even the Germans. {location}. {year}. Legendary. 🏟️',
      '{event}. The game that broke the internet. And I watched it from inside the stadium. Unreal. 🙌',
    ]),
    hashtags: '#IfIWasThere #GermanyVsBrazil #7x1 #WorldCup #Mineirazo #Football',
    viralScore: 9.0,
    status: 'active',
  },

  // ─── 3. 1998 World Cup Final ───────────────────────────
  {
    id: '1998-wc-final',
    title: '1998 World Cup Final: France vs Brazil',
    year: 1998,
    location: 'Stade de France, Paris, France',
    sportType: 'football',
    description: 'Zinedine Zidane scored two iconic headers to lead France to a 3-0 victory over Brazil on home soil.',
    keyMoment: 'Zidane\'s first header in the 27th minute, crowd erupting',
    eraClothing: 'late 90s France jersey, bucket hats, casual 90s style',
    imagePrompt: `Place this person naturally into the crowd at Stade de France during the 1998 World Cup Final. The person is wearing a late 90s France home jersey, arms raised in the air, face showing pure euphoria, mouth open cheering.

Zidane just scored his first header in the 27th minute. The crowd is exploding — people jumping, hugging strangers, French flags waving everywhere. Confetti and paper streamers in the air. Stadium floodlights blazing down on the pitch. Night atmosphere, dramatic shadows.

The person should look like they are genuinely part of this crowd — same lighting, same color temperature, same emotional intensity.

Visual style: Ultra-realistic DSLR sports photograph, ESPN broadcast aesthetic, shallow depth of field, cinematic framing, 8K, Canon 35mm. Keep facial features intact. No text or logos.`,
    captionTemplates: JSON.stringify([
      'POV: You were at the Stade de France in {year} when Zidane scored THAT header. Pure magic. 🇫🇷 #IfIWasThere',
      'They say where were you when Zidane scored? I was THERE. {year}. Goosebumps every time. 🏆',
      'What if you could step into {event}? This is what it felt like when {moment}. Legendary. 🙌',
      'Still not over this moment. {event}. {moment}. History happened right here. ✨',
      'One stadium. {moment}. And a moment that changed football forever. #POV',
    ]),
    hashtags: '#IfIWasThere #WorldCupFinal #France98 #Zidane #FootballHistory #AllezLesBleus',
    viralScore: 8.5,
    status: 'active',
  },

  // ─── 4. LeBron's Block 2016 ────────────────────────────
  {
    id: '2016-lebron-block',
    title: '2016 NBA Finals Game 7: LeBron\'s Chase-Down Block',
    year: 2016,
    location: 'Oracle Arena, Oakland, California',
    sportType: 'basketball',
    description: 'Game 7, tie game, 2 minutes left. LeBron James flies across the court to block Andre Iguodala\'s layup. Cavaliers complete the 3-1 comeback.',
    keyMoment: 'LeBron flying through the air for the chase-down block',
    eraClothing: '2016 Cavaliers jersey, casual NBA fan gear',
    imagePrompt: `Place this person naturally into the crowd at Oracle Arena during Game 7 of the 2016 NBA Finals. The person is wearing a Cavaliers jersey or wine-and-gold gear, face showing intense anticipation turning to shock and joy. Scoreboard reads "Game 7, Q4 1:50".

Lebron just made The Block on Iguodala. The arena is split — Cavs fans in the crowd are losing their minds, Warriors fans in disbelief. The hardwood floor gleaming under arena lights, the iconic Oracle Arena atmosphere, the tension of a tied Game 7.

The person should look genuinely part of this historic moment — same arena lighting, same raw emotion, same intensity.

Visual style: Ultra-realistic DSLR sports photography, ESPN broadcast aesthetic, NBA Finals atmosphere, dramatic arena lighting, shallow depth of field, 8K. Keep facial features intact. No text or logos.`,
    captionTemplates: JSON.stringify([
      'POV: You witnessed LeBron\'s chase-down block in Game 7. I was at Oracle Arena when history flipped. 🏀👑 #IfIWasThere',
      'BLOCKED BY JAMES! I was THERE for {moment}. {year} NBA Finals. Still gives me chills. 🔥',
      'What if you were courtside for the greatest block in NBA history? {event}. Legendary. 🙌',
      'Game 7. Tie game. And then LeBron flew. {location}. {year}. The moment the Cavs believed. ✨',
      'Still not over this. The block. The stop. The comeback. 3-1. And I witnessed it all. #POV',
    ]),
    hashtags: '#IfIWasThere #LeBron #TheBlock #NBAFinals #Cavaliers #Game7 #Basketball',
    viralScore: 8.5,
    status: 'active',
  },

  // ─── 5. Istanbul 2005 ──────────────────────────────────
  {
    id: '2005-istanbul-miracle',
    title: '2005 Champions League Final: The Miracle of Istanbul',
    year: 2005,
    location: 'Atatürk Olympic Stadium, Istanbul, Turkey',
    sportType: 'football',
    description: 'Liverpool came back from 3-0 down at halftime against AC Milan to win on penalties. The greatest comeback in Champions League history.',
    keyMoment: 'Liverpool fans celebrating the equalizer to make it 3-3, pure disbelief and joy',
    eraClothing: '2005 Liverpool jersey, mid-2000s casual wear',
    imagePrompt: `Place this person naturally into the Liverpool fan section at the Atatürk Olympic Stadium during the 2005 Champions League Final. The person is wearing a 2005 Liverpool red jersey, face showing ecstatic joy mixed with disbelief, scarf raised above head.

Liverpool just completed the comeback from 3-0 down. The crowd is in absolute euphoria — tears, singing "You\'ll Never Walk Alone", red flares and flags everywhere. Night atmosphere, stadium lights, the Champions League trophy visible in the distance.

The person should look genuinely part of this impossible celebration — same lighting, same tears of joy, same historic intensity.

Visual style: Ultra-realistic DSLR sports photography, Champions League broadcast aesthetic, dramatic stadium lighting, emotional crowd shots, cinematic framing, 8K. Keep facial features intact. No text or logos.`,
    captionTemplates: JSON.stringify([
      'POV: You were in Istanbul when Liverpool came back from 3-0 down. I still can\'t believe I witnessed {moment}. 🔴🏆 #IfIWasThere',
      '3-0 at halftime. 3-3 at full time. Champions of Europe. And I was THERE at {location}. Goosebumps forever. 🙌',
      'What if you could relive the Miracle of Istanbul? {event}. This is what it felt like. ✨',
      'Still not over this night. {location}. {year}. The greatest comeback in football. I witnessed it. 🔥',
      'You\'ll Never Walk Alone hit different that night. I was in that stadium. The miracle was real. #POV',
    ]),
    hashtags: '#IfIWasThere #MiracleOfIstanbul #Liverpool #UCL #ChampionsLeague #YNV #Football',
    viralScore: 8.0,
    status: 'active',
  },

  // ─── 6. Maradona Goal of the Century ───────────────────
  {
    id: '1986-maradona-goal',
    title: '1986 World Cup: Maradona\'s "Goal of the Century"',
    year: 1986,
    location: 'Estadio Azteca, Mexico City, Mexico',
    sportType: 'football',
    description: 'Diego Maradona dribbled past five England players from his own half to score the greatest goal in World Cup history.',
    keyMoment: 'Maradona dribbling past the last defender, about to score',
    eraClothing: '80s Argentina jersey, retro 80s casual clothes',
    imagePrompt: `Place this person naturally into the Argentina fan section at Estadio Azteca during the 1986 World Cup quarter-final. The person is wearing a classic 1986 Argentina light blue striped jersey, retro 80s style, face showing absolute awe and joy, arms up in celebration.

Maradona just completed his 60-meter dribble past half the England team. The Argentina fans are in a state of ecstatic disbelief — some with hands on their heads, others jumping and screaming, blue and white flags everywhere. Sunny afternoon, classic Estadio Azteca atmosphere.

The person should look naturally part of this 80s crowd — same warm Mexico sunlight, same vintage stadium feel, same historic emotion.

Visual style: Ultra-realistic 80s sports photography, vintage broadcast aesthetic, warm sunlight, shallow depth of field, cinematic framing, 8K. Keep facial features intact. No text or logos.`,
    captionTemplates: JSON.stringify([
      'POV: You witnessed the greatest goal in football history. Maradona. Azteca. {year}. I was THERE. 🇦🇷⚽ #IfIWasThere',
      'They still talk about {moment} at {event}. I saw it with my own eyes. Goosebumps every replay. 🐐',
      'What if you were at Estadio Azteca when Maradona did the impossible? This is what it felt like. #POV',
      'The Goal of the Century. {location}. {year}. And I was in that stadium. Still can\'t believe it. 🙌',
      '60 meters. 5 defenders. 1 immortal goal. I witnessed history. {event}. Forever legendary. ✨',
    ]),
    hashtags: '#IfIWasThere #Maradona #GoalOfTheCentury #WorldCup #Argentina #FootballLegend #1986',
    viralScore: 8.0,
    status: 'active',
  },

  // ─── 7. Iniesta 2010 ───────────────────────────────────
  {
    id: '2010-iniesta-winner',
    title: '2010 World Cup Final: Iniesta\'s Extra-Time Winner',
    year: 2010,
    location: 'Soccer City, Johannesburg, South Africa',
    sportType: 'football',
    description: 'Andrés Iniesta scored the winning goal in the 116th minute to give Spain their first ever World Cup title.',
    keyMoment: 'Iniesta\'s volley hitting the net in the 116th minute',
    eraClothing: '2010 Spain red jersey, vuvuzela, casual summer wear',
    imagePrompt: `Place this person naturally into the Spain fan section at Soccer City during the 2010 World Cup Final. The person is wearing a 2010 Spain red home jersey, face showing explosive joy, arms stretched wide, screaming in celebration.

Iniesta just scored the winner in the 116th minute. Spain fans are in absolute euphoria — hugging strangers, tears streaming, red and yellow flags everywhere. The sound of vuvuzelas in the air. Night atmosphere, stadium lights, the World Cup trophy visible.

The person should look genuinely part of this historic moment — same warm South African night lighting, same raw emotion, same intensity.

Visual style: Ultra-realistic DSLR sports photography, World Cup broadcast aesthetic, dramatic stadium lighting, emotional celebration shots, cinematic framing, 8K, Canon 35mm. Keep facial features intact. No text or logos.`,
    captionTemplates: JSON.stringify([
      'POV: You were at Soccer City when Iniesta scored in the 116th minute. Spain\'s first World Cup. I was THERE. 🇪🇸🏆 #IfIWasThere',
      '116 minutes. One kick. Eternal glory. I witnessed {moment} at {event}. Still get tears. 🙌',
      'What if you were there when Spain changed football history? {location}. {year}. Legendary. ✨',
      'The sound of vuvuzelas, the roar when Iniesta scored... I was in that stadium. Forever my memory. 🔥',
      'Spain. World Champions. And I saw the moment it happened. {event}. #POV',
    ]),
    hashtags: '#IfIWasThere #Iniesta #WorldCupFinal #Spain2010 #TikiTaka #FootballHistory',
    viralScore: 8.0,
    status: 'active',
  },

  // ─── 8. Bolt Beijing 2008 ──────────────────────────────
  {
    id: '2008-bolt-100m',
    title: 'Beijing 2008 Olympics: Usain Bolt 100m World Record',
    year: 2008,
    location: 'Bird\'s Nest Stadium, Beijing, China',
    sportType: 'athletics',
    description: 'Usain Bolt shattered the 100m world record with 9.69 seconds — and celebrated before even crossing the finish line.',
    keyMoment: 'Bolt crossing the finish line, arms spread wide, chest thumping, world record time on the clock',
    eraClothing: '2008 Olympics t-shirt, summer casual wear',
    imagePrompt: `Place this person naturally into the roaring crowd at the Bird\'s Nest Stadium during the Beijing 2008 Olympic 100m final. The person is wearing a 2008 Olympics t-shirt, face showing pure awe and excitement, clapping and cheering at maximum intensity.

Usain Bolt just crossed the finish line at 9.69 — celebrating before he even finished. The clock shows the world record time. The crowd is going absolutely wild — people on their feet, cameras flashing everywhere, the Olympic flame burning in the distance. Night atmosphere under the iconic Bird\'s Nest architecture.

The person should look genuinely part of this Olympic crowd — same dramatic stadium lighting, same raw emotion, same historic atmosphere.

Visual style: Ultra-realistic DSLR sports photography, Olympic broadcast aesthetic, dramatic stadium lighting, crowd energy, cinematic framing, 8K. Keep facial features intact. No text or logos.`,
    captionTemplates: JSON.stringify([
      'POV: You were inside the Bird\'s Nest when Bolt ran 9.69 and celebrated BEFORE the finish line. Still unreal. ⚡🇯🇲 #IfIWasThere',
      '9.69 seconds that changed athletics forever. And I was in that stadium. {moment}. {year}. ⚡',
      'What if you witnessed the fastest man in history at {location}? {event}. This is what it felt like. #POV',
      'The sound when Bolt hit top speed. The clock. The celebration. I saw it all. {event}. Legendary. 🙌',
      'Lightning Bolt. Bird\'s Nest. World Record. And I was THERE. Still get chills thinking about it. ✨',
    ]),
    hashtags: '#IfIWasThere #UsainBolt #Beijing2008 #Olympics #WorldRecord #LightningBolt #Athletics',
    viralScore: 7.5,
    status: 'active',
  },

  // ─── 9. Man Utd 1999 ───────────────────────────────────
  {
    id: '1999-man-utd-treble',
    title: '1999 Champions League Final: Manchester United\'s Stoppage-Time Comeback',
    year: 1999,
    location: 'Camp Nou, Barcelona, Spain',
    sportType: 'football',
    description: 'Manchester United scored twice in stoppage time — Solskjær\'s winner completing the Treble. The most dramatic ending ever.',
    keyMoment: 'Solskjær\'s toe-poke winning goal in the 93rd minute, Old Trafford fans going berserk',
    eraClothing: '1999 Manchester United jersey, late 90s casual wear',
    imagePrompt: `Place this person naturally into the Man United fan section at Camp Nou during the 1999 Champions League Final. The person is wearing a 1999 Manchester United red jersey, face showing ecstatic shock, arms raised, mouth wide open screaming.

Solskjær just scored the winner in the 93rd minute. United fans are in absolute bedlam — total chaos, people falling over seats, tears of joy, red shirts and scarves everywhere. The Champions League trophy visible on the pitch. Night atmosphere, stadium lights, the iconic "Football, bloody hell" moment.

The person should look genuinely part of this madness — same Camp Nou lighting, same raw disbelief, same historic intensity.

Visual style: Ultra-realistic 90s sports photography, Champions League broadcast aesthetic, dramatic stadium lighting, celebration chaos, cinematic framing, 8K. Keep facial features intact. No text or logos.`,
    captionTemplates: JSON.stringify([
      'POV: You were at Camp Nou when Solskjær won it in the 93rd minute. The Treble. I was THERE. 🔴🏆 #IfIWasThere',
      '"And Solskjær has won it!" Two goals. Stoppage time. The Treble. I witnessed {moment} at {event}. 🙌',
      'What if you were there for the most dramatic ending in football? {event}. {location}. Legendary. ✨',
      'Football. Bloody hell. I was in that stadium when United scored twice in stoppage time. #POV',
      '{year}. Camp Nou. The night United conquered Europe. And I was part of that red sea of joy. Unforgettable. 🔥',
    ]),
    hashtags: '#IfIWasThere #ManUnited #ChampionsLeague #Treble #Solskjaer #FootballHistory #1999',
    viralScore: 7.5,
    status: 'active',
  },

  // ─── 10. Super Bowl XLII Helmet Catch ─────────────────
  {
    id: '2008-superbowl-helmet-catch',
    title: 'Super Bowl XLII: The Helmet Catch & Giants Upset',
    year: 2008,
    location: 'University of Phoenix Stadium, Glendale, Arizona',
    sportType: 'american_football',
    description: 'David Tyree pinned the ball against his helmet on 3rd down, setting up the Giants\' shocking upset of the undefeated 18-0 Patriots.',
    keyMoment: 'David Tyree pinning the football against his helmet, Eli Manning escaping the sack',
    eraClothing: '2008 Giants jersey, casual NFL fan gear',
    imagePrompt: `Place this person naturally into the Giants fan section at the University of Phoenix Stadium during Super Bowl XLII. The person is wearing a 2008 Giants blue jersey, face showing pure shock and joy, hands on head in disbelief.

Tyree just made the Helmet Catch. Giants fans are going absolutely insane — jumping, screaming, crying, blue jerseys everywhere. The stadium is electric with the impossible becoming possible — the undefeated Patriots about to lose. Night atmosphere, Super Bowl lighting, confetti ready.

The person should look genuinely part of this shocking moment — same Super Bowl lighting, same raw disbelief, same historic electricity.

Visual style: Ultra-realistic NFL photography, Super Bowl broadcast aesthetic, dramatic stadium lighting, emotional intensity, cinematic framing, 8K. Keep facial features intact. No text or logos.`,
    captionTemplates: JSON.stringify([
      'POV: You witnessed the Helmet Catch at Super Bowl XLII. 18-0 Patriots. And I was THERE when the Giants did the impossible. 🏈 #IfIWasThere',
      'The Helmet Catch. The escape. The shock. I saw {moment} at {event} with my own eyes. Still gives me chills. 🙌',
      'What if you were inside the stadium when the 18-0 Patriots lost? {location}. {year}. The greatest Super Bowl upset. ✨',
      'Tyree pinned it to his helmet and everything changed. I was in that crowd. Pure disbelief. #POV 🔥',
      'Still the most insane Super Bowl play ever. And I was THERE when history broke. {event}. 🏆',
    ]),
    hashtags: '#IfIWasThere #SuperBowl #HelmetCatch #Giants #NFL #SuperBowlXLII #DavidTyree',
    viralScore: 7.5,
    status: 'active',
  },

  // ─── 11. Federer vs Nadal 2009 ─────────────────────────
  {
    id: '2009-federer-nadal-wimbledon',
    title: '2009 Wimbledon Final: Federer vs Nadal',
    year: 2009,
    location: 'Centre Court, Wimbledon, London, England',
    sportType: 'tennis',
    description: 'Often called the greatest match ever played. Federer won 5-7, 7-6, 7-6, 3-6, 16-14 in a 4-hour 48-minute epic.',
    keyMoment: 'Federer falling to his knees after winning match point 16-14 in the 5th set',
    eraClothing: '2009 tennis whites, summer casual wear, Wimbledon hat',
    imagePrompt: `Place this person naturally into the crowd on Centre Court at Wimbledon during the 2009 final. The person is wearing classic Wimbledon whites / summer tennis attire, face showing exhausted joy and awe, standing and applauding with the entire stadium.

Federer just won 16-14 in the 5th set. The crowd is on its feet giving a standing ovation to both players. The iconic Wimbledon scoreboard shows the epic scoreline. Late afternoon golden light on the grass court, the royal box visible, strawberries and cream atmosphere.

The person should look genuinely part of this historic tennis moment — same warm Wimbledon sunlight, same reverent joy, same historic appreciation.

Visual style: Ultra-realistic sports photography, Wimbledon broadcast aesthetic, golden afternoon light, grass court textures, cinematic framing, 8K. Keep facial features intact. No text or logos.`,
    captionTemplates: JSON.stringify([
      'POV: You were on Centre Court for the greatest tennis match ever. Federer 16-14 in the 5th. I was THERE. 🎾👑 #IfIWasThere',
      '4 hours 48 minutes. 16-14 in the fifth. I witnessed {moment} at {event}. The best match in history. 🙌',
      'What if you were at {location} for Federer vs Nadal {year}? The match that broke all records. Legendary. ✨',
      'Still the most incredible match I\'ve ever seen. And I was sitting right there. {event}. Forever grateful. #POV',
      'Centre Court. Golden light. Two legends. One immortal match. And I witnessed every point. 🏆',
    ]),
    hashtags: '#IfIWasThere #Wimbledon #Federer #Nadal #Tennis #CentreCourt #GOAT',
    viralScore: 7.0,
    status: 'active',
  },

  // ─── 12. Dream Team 1992 ───────────────────────────────
  {
    id: '1992-dream-team',
    title: '1992 Barcelona Olympics: The Dream Team',
    year: 1992,
    location: 'Palau Municipal d\'Esports, Barcelona, Spain',
    sportType: 'basketball',
    description: 'The first Olympic team with NBA superstars — Jordan, Magic, Bird, Barkley, Pippen. The most dominant team ever assembled, winning gold by an average of 44 points.',
    keyMoment: 'Jordan and Magic laughing on the bench as Team USA wins gold',
    eraClothing: '1992 USA Basketball jersey, retro 90s sportswear',
    imagePrompt: `Place this person naturally into the crowd at the 1992 Barcelona Olympics basketball final. The person is wearing a classic 1992 USA Basketball Dream Team jersey, retro 90s style, face showing pure joy and awe, cheering as the Dream Team dominates.

Jordan, Magic, Bird, Barkley all on the court together. The crowd is in awe — not just cheering, but watching basketball immortality. The Olympic rings visible, the gold medal ceremony about to happen. The atmosphere of witnessing the greatest team ever assembled.

The person should look genuinely part of this once-in-a-lifetime moment — same 90s arena lighting, same historic wonder, same joy.

Visual style: Ultra-realistic 90s sports photography, Olympic broadcast aesthetic, arena lighting, vintage basketball atmosphere, cinematic framing, 8K. Keep facial features intact. No text or logos.`,
    captionTemplates: JSON.stringify([
      'POV: You saw the Dream Team play live. Jordan. Magic. Bird. On the SAME team. I was at {location} in {year}. 🏀🇺🇸 #IfIWasThere',
      'The greatest team ever assembled. And I was in that arena watching {moment}. Still unreal. 🐐',
      'What if you were at the {year} Olympics when NBA legends played together? {event}. Legendary. ✨',
      'Jordan. Magic. Bird. Barkley. All on one team. One court. One gold medal. I witnessed history. #POV',
      'Still can\'t believe I saw the Dream Team in person. {location}. {year}. The most dominant team ever. 🙌',
    ]),
    hashtags: '#IfIWasThere #DreamTeam #Barcelona1992 #NBA #Olympics #Jordan #Magic #Bird',
    viralScore: 7.0,
    status: 'active',
  },

  // ─── 13. Liu Xiang 2004 ────────────────────────────────
  {
    id: '2004-liu-xiang-gold',
    title: 'Athens 2004 Olympics: Liu Xiang 110m Hurdles Gold',
    year: 2004,
    location: 'Olympic Stadium, Athens, Greece',
    sportType: 'athletics',
    description: 'Liu Xiang became the first Asian man to win an Olympic gold in a sprint event, equaling the world record at 12.91 seconds.',
    keyMoment: 'Liu Xiang crossing the finish line, seeing the time 12.91, realizing he is Olympic champion',
    eraClothing: '2004 China Olympic red jacket, summer casual wear',
    imagePrompt: `Place this person naturally into the celebrating crowd at the Athens Olympic Stadium during the 2004 110m hurdles final. The person is wearing a 2004 China Olympic red jacket, face showing tears of pride and joy, holding up a Chinese flag.

Liu Xiang just won gold with a world record-tying 12.91 seconds. The Chinese fans in the crowd are crying with pride — flags waving, strangers hugging, the weight of history lifting. The Olympic flame burning in the distance, the scoreboard showing the record time. Warm Athens evening light.

The person should look genuinely part of this historic breakthrough — same golden Olympic lighting, same tears of pride, same moment of history.

Visual style: Ultra-realistic sports photography, Olympic broadcast aesthetic, evening golden light, emotional crowd, cinematic framing, 8K. Keep facial features intact. No text or logos.`,
    captionTemplates: JSON.stringify([
      'POV: You were in Athens when Liu Xiang made history. First Asian man to win an Olympic sprint gold. I was THERE. 🇨🇳🥇 #IfIWasThere',
      '12.91 seconds. Olympic record. History made. I witnessed {moment} at {event}. Still get emotional. 🙌',
      'What if you were at {location} when Asia broke the barrier? {event}. {year}. Legendary moment. ✨',
      'A nation watched. A continent celebrated. And I was in that stadium when Liu Xiang changed everything. #POV',
      'The moment when the impossible became possible. {location}. {year}. I saw it with my own eyes. 🏃‍♂️💨',
    ]),
    hashtags: '#IfIWasThere #LiuXiang #Athens2004 #Olympics #China #Hurdles #GoldMedal #AsianPride',
    viralScore: 7.0,
    status: 'active',
  },

  // ─── 14. Cricket World Cup 2019 ───────────────────────
  {
    id: '2019-cricket-wc-final',
    title: '2019 Cricket World Cup Final: England\'s Super Over Victory',
    year: 2019,
    location: 'Lord\'s Cricket Ground, London, England',
    sportType: 'cricket',
    description: 'The most dramatic cricket match ever. Tied after 50 overs, tied after the Super Over, England won on boundary countback.',
    keyMoment: 'England players celebrating as the winning run is scored off the deflected throw',
    eraClothing: '2019 England cricket jersey, smart casual summer wear',
    imagePrompt: `Place this person naturally into the crowd at Lord\'s during the 2019 Cricket World Cup Final. The person is wearing an England cricket jersey, face showing absolute tension turning into explosive joy, hands on head in disbelief.

England just won on boundary countback after a tied Super Over. The crowd at Lord\'s is in a state of ecstatic shock — the most dramatic finish in cricket history. The iconic Lord\'s pavilion in the background, the World Cup trophy being prepared, summer evening light over the ground.

The person should look genuinely part of this cricket madness — same Lord\'s atmosphere, same raw emotion, same historic electricity.

Visual style: Ultra-realistic sports photography, cricket broadcast aesthetic, golden summer evening light, iconic Lord\'s atmosphere, cinematic framing, 8K. Keep facial features intact. No text or logos.`,
    captionTemplates: JSON.stringify([
      'POV: You were at Lord\'s for the greatest cricket match ever. Super Over. Boundary countback. I was THERE. 🏏🏆 #IfIWasThere',
      'Tied. Super Over tied. Won on boundaries. I witnessed {moment} at {event}. The most insane finish ever. 🙌',
      'What if you were at {location} for the {year} Cricket World Cup Final? Still can\'t believe it happened. ✨',
      'Lord\'s. World Cup Final. Super Over. And I was in that crowd when England won by the barest of margins. #POV 🔥',
      'Still not over this. The deflection. The run. The boundary countback. I saw it all. {event}. 🏆',
    ]),
    hashtags: '#IfIWasThere #CricketWorldCup #Lords #EnglandCricket #SuperOver #Cricket #2019',
    viralScore: 6.0,
    status: 'active',
  },

  // ─── 15. 2014 World Cup Final Götze ───────────────────
  {
    id: '2014-wc-final-gotze',
    title: '2014 World Cup Final: Götze\'s Extra-Time Winner',
    year: 2014,
    location: 'Maracanã Stadium, Rio de Janeiro, Brazil',
    sportType: 'football',
    description: 'Mario Götze controlled the ball on his chest and volleyed into the net in the 113th minute, giving Germany their fourth World Cup over Messi\'s Argentina.',
    keyMoment: 'Götze chesting the ball and volleying into the net, German bench exploding',
    eraClothing: '2014 Germany jersey, casual summer wear',
    imagePrompt: `Place this person naturally into the German fan section at the Maracanã during the 2014 World Cup Final. The person is wearing a 2014 Germany white jersey, face showing ecstatic joy, arms raised high, screaming in celebration.

Götze just scored the winner in the 113th minute. German fans are in absolute delirium — tears flowing, flags waving, the realization that they just won the World Cup at the Maracanã. The iconic stadium lit up at night, the World Cup trophy visible, Brazilian sunset fading.

The person should look genuinely part of this triumphant moment — same Maracanã lighting, same raw euphoria, same historic achievement.

Visual style: Ultra-realistic DSLR sports photography, World Cup broadcast aesthetic, dramatic stadium lighting, celebration intensity, cinematic framing, 8K, Canon 35mm. Keep facial features intact. No text or logos.`,
    captionTemplates: JSON.stringify([
      'POV: You were at the Maracanã when Götze scored in the 113th minute. Germany World Champions over Messi. I was THERE. 🇩🇪🏆 #IfIWasThere',
      '113 minutes. One touch. Eternal glory. I witnessed {moment} at {event}. Goosebumps forever. 🙌',
      'What if you were at {location} for the {year} World Cup Final? The night Germany conquered the world. ✨',
      'Messi vs Germany. Extra time. Götze\'s magic. And I was in that crowd. {event}. Legendary. #POV',
      'The Maracanã. World Cup Final. The winning goal. I saw it all happen. Forever my memory. 🔥',
    ]),
    hashtags: '#IfIWasThere #WorldCupFinal #Germany #Gotze #Maracana #Brazil2014 #Football',
    viralScore: 7.0,
    status: 'active',
  },
];
