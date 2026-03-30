/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ARXON BATTLE IMAGE RESOLVER
 * Auto-maps battle sides to real public images:
 *   • Football/sports club logos  → Wikipedia SVG logos
 *   • Politicians / celebs        → Wikipedia portraits
 *   • Country topics              → flagcdn.com flags
 *   • Crypto tokens               → CoinGecko CDN icons
 *   • Yes/No political questions  → relevant face images
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Wikipedia CDN base (all images are public domain / freely licensed) ──────
const W = 'https://upload.wikimedia.org/wikipedia/commons';
const WE = 'https://upload.wikimedia.org/wikipedia/en';

// ── Flag CDN (no attribution required) ───────────────────────────────────────
const F = 'https://flagcdn.com/w160';

// ── CoinGecko coin icons ──────────────────────────────────────────────────────
const CG = 'https://assets.coingecko.com/coins/images';

// ─────────────────────────────────────────────────────────────────────────────
// FOOTBALL CLUBS
// ─────────────────────────────────────────────────────────────────────────────
const CLUBS: Record<string, string> = {
  // LaLiga
  'barcelona':       `${W}/thumb/4/47/FC_Barcelona_%28crest%29.svg/200px-FC_Barcelona_%28crest%29.svg.png`,
  'fc barcelona':    `${W}/thumb/4/47/FC_Barcelona_%28crest%29.svg/200px-FC_Barcelona_%28crest%29.svg.png`,
  'real madrid':     `${W}/thumb/c/c7/Real_Madrid_CF.svg/200px-Real_Madrid_CF.svg.png`,
  'atletico madrid': `${W}/thumb/f/f4/Atletico_Madrid_2017_logo.svg/200px-Atletico_Madrid_2017_logo.svg.png`,
  'real oviedo':     `${W}/thumb/d/d7/Real_Oviedo_logo.svg/200px-Real_Oviedo_logo.svg.png`,
  'sevilla':         `${W}/thumb/3/3b/Sevilla_FC_logo.svg/200px-Sevilla_FC_logo.svg.png`,
  'valencia':        `${W}/thumb/c/ce/Valenciacf.svg/200px-Valenciacf.svg.png`,
  'villarreal':      `${W}/thumb/b/b8/Villarreal_CF_Logo.svg/200px-Villarreal_CF_Logo.svg.png`,
  // Premier League
  'arsenal':         `${W}/thumb/5/53/Arsenal_FC.svg/200px-Arsenal_FC.svg.png`,
  'chelsea':         `${W}/thumb/c/cc/Chelsea_FC.svg/200px-Chelsea_FC.svg.png`,
  'liverpool':       `${W}/thumb/0/0c/Liverpool_FC.svg/200px-Liverpool_FC.svg.png`,
  'manchester city': `${W}/thumb/e/eb/Manchester_City_FC_badge.svg/200px-Manchester_City_FC_badge.svg.png`,
  'man city':        `${W}/thumb/e/eb/Manchester_City_FC_badge.svg/200px-Manchester_City_FC_badge.svg.png`,
  'manchester united': `${W}/thumb/7/7a/Manchester_United_FC_crest.svg/200px-Manchester_United_FC_crest.svg.png`,
  'man united':      `${W}/thumb/7/7a/Manchester_United_FC_crest.svg/200px-Manchester_United_FC_crest.svg.png`,
  'man utd':         `${W}/thumb/7/7a/Manchester_United_FC_crest.svg/200px-Manchester_United_FC_crest.svg.png`,
  'tottenham':       `${W}/thumb/b/b4/Tottenham_Hotspur.svg/200px-Tottenham_Hotspur.svg.png`,
  'spurs':           `${W}/thumb/b/b4/Tottenham_Hotspur.svg/200px-Tottenham_Hotspur.svg.png`,
  'newcastle':       `${W}/thumb/5/56/Newcastle_United_Logo.svg/200px-Newcastle_United_Logo.svg.png`,
  'aston villa':     `${W}/thumb/9/9a/Aston_Villa_FC_crest_%282016%29.svg/200px-Aston_Villa_FC_crest_%282016%29.svg.png`,
  'west ham':        `${W}/thumb/c/c2/West_Ham_United_FC_logo.svg/200px-West_Ham_United_FC_logo.svg.png`,
  'brighton':        `${W}/thumb/f/fd/Brighton_%26_Hove_Albion_logo.svg/200px-Brighton_%26_Hove_Albion_logo.svg.png`,
  'everton':         `${WE}/thumb/7/7e/Everton_FC_logo.svg/200px-Everton_FC_logo.svg.png`,
  'brentford':       `${W}/thumb/2/2a/Brentford_FC_crest.svg/200px-Brentford_FC_crest.svg.png`,
  // Bundesliga
  'bayern munich':   `${W}/thumb/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282002%E2%80%932017%29.svg/200px-FC_Bayern_M%C3%BCnchen_logo_%282002%E2%80%932017%29.svg.png`,
  'bayern':          `${W}/thumb/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282002%E2%80%932017%29.svg/200px-FC_Bayern_M%C3%BCnchen_logo_%282002%E2%80%932017%29.svg.png`,
  'borussia dortmund': `${W}/thumb/6/67/Borussia_Dortmund_logo.svg/200px-Borussia_Dortmund_logo.svg.png`,
  'dortmund':        `${W}/thumb/6/67/Borussia_Dortmund_logo.svg/200px-Borussia_Dortmund_logo.svg.png`,
  'bvb':             `${W}/thumb/6/67/Borussia_Dortmund_logo.svg/200px-Borussia_Dortmund_logo.svg.png`,
  'rb leipzig':      `${W}/thumb/0/04/RB_Leipzig_2014_logo.svg/200px-RB_Leipzig_2014_logo.svg.png`,
  'bayer leverkusen': `${W}/thumb/5/5f/Bayer_04_Leverkusen_logo.svg/200px-Bayer_04_Leverkusen_logo.svg.png`,
  // Serie A
  'juventus':        `${W}/thumb/1/15/Juventus_FC_2017_icon_%28black%29.svg/200px-Juventus_FC_2017_icon_%28black%29.svg.png`,
  'ac milan':        `${W}/thumb/d/d0/Logo_of_AC_Milan.svg/200px-Logo_of_AC_Milan.svg.png`,
  'inter milan':     `${W}/thumb/0/05/FC_Internazionale_Milano_2021.svg/200px-FC_Internazionale_Milano_2021.svg.png`,
  'inter':           `${W}/thumb/0/05/FC_Internazionale_Milano_2021.svg/200px-FC_Internazionale_Milano_2021.svg.png`,
  'napoli':          `${W}/thumb/2/2d/SSC_Napoli_badge.svg/200px-SSC_Napoli_badge.svg.png`,
  'as roma':         `${W}/thumb/d/d5/AS_Roma_Logo_2017.svg/200px-AS_Roma_Logo_2017.svg.png`,
  'roma':            `${W}/thumb/d/d5/AS_Roma_Logo_2017.svg/200px-AS_Roma_Logo_2017.svg.png`,
  // Ligue 1
  'psg':             `${W}/thumb/7/76/Paris_Saint-Germain_F.C..svg/200px-Paris_Saint-Germain_F.C..svg.png`,
  'paris saint-germain': `${W}/thumb/7/76/Paris_Saint-Germain_F.C..svg/200px-Paris_Saint-Germain_F.C..svg.png`,
  'marseille':       `${W}/thumb/e/e9/Logo_Olympique_de_Marseille.svg/200px-Logo_Olympique_de_Marseille.svg.png`,
  // Champions League / Int'l clubs
  'porto':           `${W}/thumb/3/31/FC_Porto.svg/200px-FC_Porto.svg.png`,
  'benfica':         `${W}/thumb/1/1d/SL_Benfica_logo.svg/200px-SL_Benfica_logo.svg.png`,
  'ajax':            `${W}/thumb/7/79/Ajax_Amsterdam.svg/200px-Ajax_Amsterdam.svg.png`,
  'psv':             `${W}/thumb/0/05/PSV_Eindhoven_Logo.svg/200px-PSV_Eindhoven_Logo.svg.png`,
  'celtic':          `${W}/thumb/d/df/Celtic_FC.svg/200px-Celtic_FC.svg.png`,
  'rangers':         `${W}/thumb/7/76/Rangers_FC.svg/200px-Rangers_FC.svg.png`,
  // African football
  'enyimba':         `${W}/thumb/a/a0/Enyimba_International_FC.jpg/200px-Enyimba_International_FC.jpg`,
  'kano pillars':    `${W}/thumb/b/b4/Kano_Pillars_FC.png/200px-Kano_Pillars_FC.png`,
  'al ahly':         `${W}/thumb/d/d0/Al_Ahly_SC_logo.svg/200px-Al_Ahly_SC_logo.svg.png`,
  'zamalek':         `${W}/thumb/b/b1/Zamalek_SC_logo.svg/200px-Zamalek_SC_logo.svg.png`,
  'sundowns':        `${W}/thumb/a/a9/Mamelodi_Sundowns_FC.svg/200px-Mamelodi_Sundowns_FC.svg.png`,
  'mamelodi sundowns': `${W}/thumb/a/a9/Mamelodi_Sundowns_FC.svg/200px-Mamelodi_Sundowns_FC.svg.png`,
  // NBA
  'lakers':          `${W}/thumb/3/3c/Los_Angeles_Lakers_logo.svg/200px-Los_Angeles_Lakers_logo.svg.png`,
  'los angeles lakers': `${W}/thumb/3/3c/Los_Angeles_Lakers_logo.svg/200px-Los_Angeles_Lakers_logo.svg.png`,
  'golden state warriors': `${W}/thumb/d/de/Golden_State_Warriors_logo_%282020%E2%80%93present%29.svg/200px-Golden_State_Warriors_logo_%282020%E2%80%93present%29.svg.png`,
  'warriors':        `${W}/thumb/d/de/Golden_State_Warriors_logo_%282020%E2%80%93present%29.svg/200px-Golden_State_Warriors_logo_%282020%E2%80%93present%29.svg.png`,
  'celtics':         `${W}/thumb/2/2c/Boston_Celtics.svg/200px-Boston_Celtics.svg.png`,
  'boston celtics':  `${W}/thumb/2/2c/Boston_Celtics.svg/200px-Boston_Celtics.svg.png`,
  'miami heat':      `${W}/thumb/5/5e/Miami_Heat_logo_%282012%29.svg/200px-Miami_Heat_logo_%282012%29.svg.png`,
  // NFL
  'kansas city chiefs': `${W}/thumb/e/e1/Kansas_City_Chiefs_logo.svg/200px-Kansas_City_Chiefs_logo.svg.png`,
  'chiefs':          `${W}/thumb/e/e1/Kansas_City_Chiefs_logo.svg/200px-Kansas_City_Chiefs_logo.svg.png`,
  'san francisco 49ers': `${W}/thumb/3/3a/San_Francisco_49ers_logo.svg/200px-San_Francisco_49ers_logo.svg.png`,
  '49ers':           `${W}/thumb/3/3a/San_Francisco_49ers_logo.svg/200px-San_Francisco_49ers_logo.svg.png`,
  'dallas cowboys':  `${W}/thumb/2/27/Dallas_Cowboys_logo.svg/200px-Dallas_Cowboys_logo.svg.png`,
};

// ─────────────────────────────────────────────────────────────────────────────
// POLITICIANS, LEADERS, CELEBS
// ─────────────────────────────────────────────────────────────────────────────
const PEOPLE: Record<string, string> = {
  // US Politics
  'trump':           `${W}/thumb/d/d3/Donald_Trump_official_portrait_%28cropped%29.jpg/200px-Donald_Trump_official_portrait_%28cropped%29.jpg`,
  'donald trump':    `${W}/thumb/d/d3/Donald_Trump_official_portrait_%28cropped%29.jpg/200px-Donald_Trump_official_portrait_%28cropped%29.jpg`,
  'biden':           `${W}/thumb/6/68/Joe_Biden_presidential_portrait.jpg/200px-Joe_Biden_presidential_portrait.jpg`,
  'joe biden':       `${W}/thumb/6/68/Joe_Biden_presidential_portrait.jpg/200px-Joe_Biden_presidential_portrait.jpg`,
  'kamala harris':   `${W}/thumb/4/41/Kamala_Harris_Vice_Presidential_Portrait_%28cropped%29.jpg/200px-Kamala_Harris_Vice_Presidential_Portrait_%28cropped%29.jpg`,
  'harris':          `${W}/thumb/4/41/Kamala_Harris_Vice_Presidential_Portrait_%28cropped%29.jpg/200px-Kamala_Harris_Vice_Presidential_Portrait_%28cropped%29.jpg`,
  'elon musk':       `${W}/thumb/3/34/Elon_Musk_Royal_Society_%28crop2%29.jpg/200px-Elon_Musk_Royal_Society_%28crop2%29.jpg`,
  'musk':            `${W}/thumb/3/34/Elon_Musk_Royal_Society_%28crop2%29.jpg/200px-Elon_Musk_Royal_Society_%28crop2%29.jpg`,
  'obama':           `${W}/thumb/8/8d/President_Barack_Obama.jpg/200px-President_Barack_Obama.jpg`,
  'barack obama':    `${W}/thumb/8/8d/President_Barack_Obama.jpg/200px-President_Barack_Obama.jpg`,
  // Middle East / Israel-Palestine
  'netanyahu':       `${W}/thumb/a/a9/Benjamin_Netanyahu_portrait_%28cropped%29.jpg/200px-Benjamin_Netanyahu_portrait_%28cropped%29.jpg`,
  'benjamin netanyahu': `${W}/thumb/a/a9/Benjamin_Netanyahu_portrait_%28cropped%29.jpg/200px-Benjamin_Netanyahu_portrait_%28cropped%29.jpg`,
  'bibi':            `${W}/thumb/a/a9/Benjamin_Netanyahu_portrait_%28cropped%29.jpg/200px-Benjamin_Netanyahu_portrait_%28cropped%29.jpg`,
  // Africa
  'tinubu':          `${W}/thumb/b/b8/Bola_Tinubu_at_the_G7_summit_%28cropped%29.jpg/200px-Bola_Tinubu_at_the_G7_summit_%28cropped%29.jpg`,
  'bola tinubu':     `${W}/thumb/b/b8/Bola_Tinubu_at_the_G7_summit_%28cropped%29.jpg/200px-Bola_Tinubu_at_the_G7_summit_%28cropped%29.jpg`,
  'atiku':           `${W}/thumb/4/4f/Atiku_Abubakar_%28cropped%29.jpg/200px-Atiku_Abubakar_%28cropped%29.jpg`,
  'peter obi':       `${W}/thumb/7/76/Peter_Obi_in_2023_%28cropped%29.jpg/200px-Peter_Obi_in_2023_%28cropped%29.jpg`,
  'ramaphosa':       `${W}/thumb/e/e0/Official_Portrait_of_President_Cyril_Ramaphosa.jpg/200px-Official_Portrait_of_President_Cyril_Ramaphosa.jpg`,
  'cyril ramaphosa': `${W}/thumb/e/e0/Official_Portrait_of_President_Cyril_Ramaphosa.jpg/200px-Official_Portrait_of_President_Cyril_Ramaphosa.jpg`,
  'kagame':          `${W}/thumb/6/63/Paul_Kagame%2C_46th_Munich_Security_Conference_%28cropped%29.jpg/200px-Paul_Kagame%2C_46th_Munich_Security_Conference_%28cropped%29.jpg`,
  'macron':          `${W}/thumb/f/f4/Emmanuel_Macron_in_2019.jpg/200px-Emmanuel_Macron_in_2019.jpg`,
  'sunak':           `${W}/thumb/e/e5/Rishi_Sunak_official_portrait%2C_2022_%28cropped%29.jpg/200px-Rishi_Sunak_official_portrait%2C_2022_%28cropped%29.jpg`,
  'rishi sunak':     `${W}/thumb/e/e5/Rishi_Sunak_official_portrait%2C_2022_%28cropped%29.jpg/200px-Rishi_Sunak_official_portrait%2C_2022_%28cropped%29.jpg`,
  'starmer':         `${W}/thumb/8/8d/Keir_Starmer_in_the_media_room_%28cropped%29.jpg/200px-Keir_Starmer_in_the_media_room_%28cropped%29.jpg`,
  'keir starmer':    `${W}/thumb/8/8d/Keir_Starmer_in_the_media_room_%28cropped%29.jpg/200px-Keir_Starmer_in_the_media_room_%28cropped%29.jpg`,
  // Tech/Business
  'jeff bezos':      `${W}/thumb/6/6e/Jeff_Bezos_at_Amazon_Spheres_Grand_Opening_in_Seattle_-_2018_%2839074799225%29_%28cropped%29.jpg/200px-Jeff_Bezos_at_Amazon_Spheres_Grand_Opening_in_Seattle_-_2018_%2839074799225%29_%28cropped%29.jpg`,
  'bezos':           `${W}/thumb/6/6e/Jeff_Bezos_at_Amazon_Spheres_Grand_Opening_in_Seattle_-_2018_%2839074799225%29_%28cropped%29.jpg/200px-Jeff_Bezos_at_Amazon_Spheres_Grand_Opening_in_Seattle_-_2018_%2839074799225%29_%28cropped%29.jpg`,
  'zuckerberg':      `${W}/thumb/1/18/Mark_Zuckerberg_F8_2019_Keynote_%2832830578717%29_%28cropped%29.jpg/200px-Mark_Zuckerberg_F8_2019_Keynote_%2832830578717%29_%28cropped%29.jpg`,
  'mark zuckerberg': `${W}/thumb/1/18/Mark_Zuckerberg_F8_2019_Keynote_%2832830578717%29_%28cropped%29.jpg/200px-Mark_Zuckerberg_F8_2019_Keynote_%2832830578717%29_%28cropped%29.jpg`,
  // Sports people
  'messi':           `${W}/thumb/b/b4/Lionel-Messi-Argentina-2022-FIFA-World-Cup_%28cropped%29.jpg/200px-Lionel-Messi-Argentina-2022-FIFA-World-Cup_%28cropped%29.jpg`,
  'lionel messi':    `${W}/thumb/b/b4/Lionel-Messi-Argentina-2022-FIFA-World-Cup_%28cropped%29.jpg/200px-Lionel-Messi-Argentina-2022-FIFA-World-Cup_%28cropped%29.jpg`,
  'ronaldo':         `${W}/thumb/8/8c/Cristiano_Ronaldo_2018.jpg/200px-Cristiano_Ronaldo_2018.jpg`,
  'cristiano ronaldo': `${W}/thumb/8/8c/Cristiano_Ronaldo_2018.jpg/200px-Cristiano_Ronaldo_2018.jpg`,
  'cr7':             `${W}/thumb/8/8c/Cristiano_Ronaldo_2018.jpg/200px-Cristiano_Ronaldo_2018.jpg`,
  'lebron':          `${W}/thumb/c/cf/LeBron_James_-_51959723161_%28cropped%29.jpg/200px-LeBron_James_-_51959723161_%28cropped%29.jpg`,
  'lebron james':    `${W}/thumb/c/cf/LeBron_James_-_51959723161_%28cropped%29.jpg/200px-LeBron_James_-_51959723161_%28cropped%29.jpg`,
  // Entertainment / Music
  'wizkid':          `${W}/thumb/b/b0/Wizkid_at_Art_of_Living_Festival_2020_%28cropped%29.jpg/200px-Wizkid_at_Art_of_Living_Festival_2020_%28cropped%29.jpg`,
  'davido':          `${W}/thumb/d/d3/Davido_at_an_Afrobeats_event_%28cropped%29.jpg/200px-Davido_at_an_Afrobeats_event_%28cropped%29.jpg`,
  'burna boy':       `${W}/thumb/9/95/Burna_Boy_at_Wireless_Festival_2019_%28cropped%29.jpg/200px-Burna_Boy_at_Wireless_Festival_2019_%28cropped%29.jpg`,
  'burna':           `${W}/thumb/9/95/Burna_Boy_at_Wireless_Festival_2019_%28cropped%29.jpg/200px-Burna_Boy_at_Wireless_Festival_2019_%28cropped%29.jpg`,
  'drake':           `${W}/thumb/b/b5/Drake_-_Aubrey_Drake_Graham.jpg/200px-Drake_-_Aubrey_Drake_Graham.jpg`,
  'kendrick lamar':  `${W}/thumb/b/b7/Kendrick_Lamar_%282_Chainz_%26_Big_Sean_HHNM_Crop%29.jpg/200px-Kendrick_Lamar_%282_Chainz_%26_Big_Sean_HHNM_Crop%29.jpg`,
  'kendrick':        `${W}/thumb/b/b7/Kendrick_Lamar_%282_Chainz_%26_Big_Sean_HHNM_Crop%29.jpg/200px-Kendrick_Lamar_%282_Chainz_%26_Big_Sean_HHNM_Crop%29.jpg`,
  'taylor swift':    `${W}/thumb/b/b1/Taylor_Swift_at_the_2023_MTV_Video_Music_Awards_%283%29_%28cropped%29.jpg/200px-Taylor_Swift_at_the_2023_MTV_Video_Music_Awards_%283%29_%28cropped%29.jpg`,
  'taylor':          `${W}/thumb/b/b1/Taylor_Swift_at_the_2023_MTV_Video_Music_Awards_%283%29_%28cropped%29.jpg/200px-Taylor_Swift_at_the_2023_MTV_Video_Music_Awards_%283%29_%28cropped%29.jpg`,
  // Yes/No or abstract sides
  'yes':             `${W}/thumb/5/5c/Green_check.svg/200px-Green_check.svg.png`,
  'yes - they will': `${W}/thumb/5/5c/Green_check.svg/200px-Green_check.svg.png`,
  'yes - it will':   `${W}/thumb/5/5c/Green_check.svg/200px-Green_check.svg.png`,
  'no':              `${W}/thumb/5/54/Red_X.svg/200px-Red_X.svg.png`,
  "no - they won't": `${W}/thumb/5/54/Red_X.svg/200px-Red_X.svg.png`,
  "no - it won't":   `${W}/thumb/5/54/Red_X.svg/200px-Red_X.svg.png`,
};

// ─────────────────────────────────────────────────────────────────────────────
// COUNTRY FLAGS
// ─────────────────────────────────────────────────────────────────────────────
const COUNTRY_CODES: Record<string, string> = {
  'nigeria': 'ng', 'ghana': 'gh', 'kenya': 'ke', 'south africa': 'za',
  'ethiopia': 'et', 'senegal': 'sn', 'egypt': 'eg', 'morocco': 'ma',
  'cameroon': 'cm', 'ivory coast': 'ci', "cote d'ivoire": 'ci',
  'tanzania': 'tz', 'rwanda': 'rw', 'uganda': 'ug', 'zambia': 'zm',
  'zimbabwe': 'zw', 'angola': 'ao', 'mozambique': 'mz', 'mali': 'ml',
  'usa': 'us', 'united states': 'us', 'america': 'us', 'us': 'us',
  'uk': 'gb', 'britain': 'gb', 'united kingdom': 'gb', 'england': 'gb-eng',
  'france': 'fr', 'germany': 'de', 'spain': 'es', 'italy': 'it',
  'portugal': 'pt', 'brazil': 'br', 'argentina': 'ar', 'colombia': 'co',
  'russia': 'ru', 'china': 'cn', 'india': 'in', 'japan': 'jp',
  'israel': 'il', 'palestine': 'ps', 'iran': 'ir', 'turkey': 'tr',
  'saudi arabia': 'sa', 'uae': 'ae', 'qatar': 'qa',
  'canada': 'ca', 'australia': 'au', 'new zealand': 'nz',
  'ukraine': 'ua', 'poland': 'pl', 'sweden': 'se', 'norway': 'no',
};

// ─────────────────────────────────────────────────────────────────────────────
// CRYPTO / TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const CRYPTO: Record<string, string> = {
  'bitcoin':   `${CG}/1/large/bitcoin.png`,
  'btc':       `${CG}/1/large/bitcoin.png`,
  'ethereum':  `${CG}/279/large/ethereum.png`,
  'eth':       `${CG}/279/large/ethereum.png`,
  'bnb':       `${CG}/825/large/bnb-icon2_2x.png`,
  'binance':   `${CG}/825/large/bnb-icon2_2x.png`,
  'solana':    `${CG}/4128/large/solana.png`,
  'sol':       `${CG}/4128/large/solana.png`,
  'xrp':       `${CG}/44/large/xrp-symbol-white-128.png`,
  'ripple':    `${CG}/44/large/xrp-symbol-white-128.png`,
  'cardano':   `${CG}/975/large/cardano.png`,
  'ada':       `${CG}/975/large/cardano.png`,
  'dogecoin':  `${CG}/5/large/dogecoin.png`,
  'doge':      `${CG}/5/large/dogecoin.png`,
  'polkadot':  `${CG}/12171/large/polkadot.png`,
  'dot':       `${CG}/12171/large/polkadot.png`,
  'chainlink': `${CG}/877/large/chainlink-new-logo.png`,
  'link':      `${CG}/877/large/chainlink-new-logo.png`,
  'avalanche': `${CG}/12559/large/Avalanche_Circle_RedWhite_Trans.png`,
  'avax':      `${CG}/12559/large/Avalanche_Circle_RedWhite_Trans.png`,
  'matic':     `${CG}/4713/large/matic-token-icon.png`,
  'polygon':   `${CG}/4713/large/matic-token-icon.png`,
  'shib':      `${CG}/11939/large/shiba.png`,
  'shiba inu': `${CG}/11939/large/shiba.png`,
  'pepe':      `${CG}/29850/large/pepe-token.jpeg`,
  'arx':       `https://arxon.io/favicon.ico`,
  'arxon':     `https://arxon.io/favicon.ico`,
  'tether':    `${CG}/325/large/Tether.png`,
  'usdt':      `${CG}/325/large/Tether.png`,
  'usdc':      `${CG}/6319/large/USD_Coin_icon.png`,
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN RESOLVER FUNCTION
// ─────────────────────────────────────────────────────────────────────────────
export function resolveBattleImage(
  name: string,
  existingUrl: string | null,
  category: string,
): string | null {
  // Always prefer admin-uploaded image
  if (existingUrl) return existingUrl;

  const key = name.toLowerCase().trim();

  // 1. Try exact club match
  if (CLUBS[key]) return CLUBS[key];
  // 2. Partial club match (e.g. "FC Barcelona" → "barcelona")
  for (const [k, v] of Object.entries(CLUBS)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  // 3. Try exact people match
  if (PEOPLE[key]) return PEOPLE[key];
  // 4. Partial people match
  for (const [k, v] of Object.entries(PEOPLE)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  // 5. Crypto
  if (CRYPTO[key]) return CRYPTO[key];
  for (const [k, v] of Object.entries(CRYPTO)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  // 6. Country flag
  const cc = COUNTRY_CODES[key];
  if (cc) return `${F}/${cc}.png`;
  for (const [k, v] of Object.entries(COUNTRY_CODES)) {
    if (key.includes(k)) return `${F}/${v}.png`;
  }

  // 7. Infer from category if name is generic (Yes/No, Team A, etc.)
  if (category === 'crypto') {
    // Try to find a crypto name in the key
    for (const [k, v] of Object.entries(CRYPTO)) {
      if (key.includes(k)) return v;
    }
  }

  return null; // Fallback to branded initials in SideImg
}

/**
 * Parse a battle title to extract subject names when side names are generic
 * e.g. "Will Trump and Netanyahu hug?" → extract "Trump" and "Netanyahu"
 */
export function extractSubjectsFromTitle(title: string): [string, string] | null {
  const t = title.toLowerCase();

  // Pattern: "X vs Y"
  const vsMatch = t.match(/^(.+?)\s+vs\.?\s+(.+?)(?:\?|$|\s+-\s+)/);
  if (vsMatch) return [vsMatch[1].trim(), vsMatch[2].trim()];

  // Pattern: "Will X and Y ..."
  const andMatch = t.match(/will\s+(.+?)\s+and\s+(.+?)\s+/);
  if (andMatch) return [andMatch[1].trim(), andMatch[2].trim()];

  // Pattern: "X or Y"
  const orMatch = t.match(/^(.+?)\s+or\s+(.+?)(?:\?|$)/);
  if (orMatch) return [orMatch[1].trim(), orMatch[2].trim()];

  return null;
}
