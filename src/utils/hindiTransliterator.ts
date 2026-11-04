/**
 * Utility to auto-translate and transliterate English text (School Name, Block, District, Headmaster, etc.)
 * into accurate Devanagari Hindi for Bihar PM POSHAN reporting.
 * Includes both offline high-coverage Bihar dictionary + phonetic engine + Google Input Tools API integration.
 */

// In-memory cache for transliteration lookups
const transliterationCache = new Map<string, string>();

// Comprehensive dictionary of Bihar administrative terms, schools, blocks, and places
const KEYWORD_MAP: Record<string, string> = {
  // School types & abbreviations
  'ums': 'उत्क्रमित मध्य विद्यालय',
  'u.m.s': 'उत्क्रमित मध्य विद्यालय',
  'u.m.s.': 'उत्क्रमित मध्य विद्यालय',
  'ups': 'उत्क्रमित प्राथमिक विद्यालय',
  'u.p.s': 'उत्क्रमित प्राथमिक विद्यालय',
  'u.p.s.': 'उत्क्रमित प्राथमिक विद्यालय',
  'ps': 'प्राथमिक विद्यालय',
  'p.s': 'प्राथमिक विद्यालय',
  'p.s.': 'प्राथमिक विद्यालय',
  'ms': 'मध्य विद्यालय',
  'm.s': 'मध्य विद्यालय',
  'm.s.': 'मध्य विद्यालय',
  'nps': 'नवसृजित प्राथमिक विद्यालय',
  'n.p.s': 'नवसृजित प्राथमिक विद्यालय',
  'n.p.s.': 'नवसृजित प्राथमिक विद्यालय',
  'kps': 'कन्या प्राथमिक विद्यालय',
  'kms': 'कन्या मध्य विद्यालय',
  'hs': 'उच्च विद्यालय',
  'h.s': 'उच्च विद्यालय',
  'h.s.': 'उच्च विद्यालय',
  'hss': 'उच्च माध्यमिक विद्यालय',
  'primary school': 'प्राथमिक विद्यालय',
  'middle school': 'मध्य विद्यालय',
  'high school': 'उच्च विद्यालय',
  'secondary school': 'माध्यमिक विद्यालय',
  'higher secondary school': 'उच्च माध्यमिक विद्यालय',
  'upgraded middle school': 'उत्क्रमित मध्य विद्यालय',
  'upgraded primary school': 'उत्क्रमित प्राथमिक विद्यालय',
  'girls primary school': 'कन्या प्राथमिक विद्यालय',
  'girls middle school': 'कन्या मध्य विद्यालय',
  'girls high school': 'कन्या उच्च विद्यालय',
  'boys school': 'बालक विद्यालय',
  'prathmik vidyalaya': 'प्राथमिक विद्यालय',
  'madhya vidyalaya': 'मध्य विद्यालय',
  'utkramit madhya vidyalaya': 'उत्क्रमित मध्य विद्यालय',
  'utkramit prathmik vidyalaya': 'उत्क्रमित प्राथमिक विद्यालय',
  'navsrijit prathmik vidyalaya': 'नवसृजित प्राथमिक विद्यालय',
  'kanya prathmik vidyalaya': 'कन्या प्राथमिक विद्यालय',
  'kanya madhya vidyalaya': 'कन्या मध्य विद्यालय',
  'uchcha vidyalaya': 'उच्च विद्यालय',
  'uchcha madhyamik vidyalaya': 'उच्च माध्यमिक विद्यालय',
  'madarsa': 'मदरसा',
  'sanskrit vidyalaya': 'संस्कृत विद्यालय',
  'kanya': 'कन्या',
  'balak': 'बालक',
  'adarsh': 'आदर्श',
  'balika': 'बालिका',

  // Administrative terms
  'block': 'प्रखंड',
  'prakhand': 'प्रखंड',
  'district': 'जिला',
  'zila': 'जिला',
  'jila': 'जिला',
  'ward': 'वार्ड',
  'panchayat': 'पंचायत',
  'nagar': 'नगर',
  'gram': 'ग्राम',
  'sadar': 'सदर',
  'purv': 'पूर्व',
  'pashchim': 'पश्चिम',
  'uttar': 'उत्तर',
  'dakshin': 'दक्षिण',
  'east': 'पूर्व',
  'west': 'पश्चिम',
  'north': 'उत्तर',
  'south': 'दक्षिण',
  'headmaster': 'प्रधानाध्यापक',
  'principal': 'प्रधानाचार्य',
  'incharge': 'प्रभारी',
  'coordinator': 'समन्वयक',
  'secretary': 'सचिव',
  'president': 'अध्यक्ष',
  'smc': 'विद्यालय प्रबंध समिति',
  'vss': 'विद्यालय शिक्षा समिति',

  // All 38 Bihar Districts
  'purnea': 'पूर्णियाँ',
  'purnia': 'पूर्णियाँ',
  'katihar': 'कटिहार',
  'araria': 'अररिया',
  'kishanganj': 'किशनगंज',
  'gaya': 'गया',
  'patna': 'पटना',
  'bhagalpur': 'भागलपुर',
  'muzaffarpur': 'मुजफ्फरपुर',
  'darbhanga': 'दरभंगा',
  'saharasa': 'सहरसा',
  'saharsa': 'सहरसा',
  'supaul': 'सुपौल',
  'madhepura': 'मधेपुरा',
  'samastipur': 'समस्तीपुर',
  'madhubani': 'मधुबनी',
  'begusarai': 'बेगूसराय',
  'khagaria': 'खगड़िया',
  'munger': 'मुंगेर',
  'lakhisarai': 'लखीसराय',
  'sheikhpura': 'शेखपुरा',
  'jamui': 'जमुई',
  'banka': 'बांका',
  'nawada': 'नवादा',
  'aurangabad': 'औरंगाबाद',
  'jehanabad': 'जहानाबाद',
  'jahanabad': 'जहानाबाद',
  'arwal': 'अरवल',
  'rohtas': 'रोहतास',
  'sasaram': 'सासाराम',
  'kaimur': 'कैमूर',
  'bhabhua': 'भभुआ',
  'buxar': 'बक्सर',
  'bhojpur': 'भोजपुर',
  'arrah': 'आरा',
  'saran': 'सारण',
  'chhapra': 'छपरा',
  'siwan': 'सीवान',
  'gopalganj': 'गोपालगंज',
  'vaishali': 'वैशाली',
  'hajipur': 'हाजीपुर',
  'sheohar': 'शिवहर',
  'sitamarhi': 'सीतामढ़ी',
  'motihari': 'मोतिहारी',
  'bettiah': 'बेतिया',
  'west champaran': 'पश्चिम चम्पारण',
  'east champaran': 'पूर्वी चम्पारण',

  // Purnea, Seemanchal & Common Bihar Blocks
  'kasba': 'कसबा',
  'baisi': 'बायसी',
  'dhamdaha': 'धमदाहा',
  'amour': 'अमौर',
  'banmankhi': 'बनमनखी',
  'barhara': 'बड़हरा',
  'barhara kothi': 'बड़हरा कोठी',
  'bhawanipur': 'भवानीपुर',
  'dagarua': 'डगरुआ',
  'jalalgarh': 'जलालगढ़',
  'krityanand nagar': 'कृत्यानंद नगर',
  'krityanand': 'कृत्यानंद',
  'k.nagar': 'के० नगर',
  'knagar': 'के० नगर',
  'ruppoli': 'रुपौली',
  'rupauli': 'रुपौली',
  'srinagar': 'श्रीनगर',
  'barari': 'बरारी',
  'korha': 'कोढ़ा',
  'manihari': 'मनिहारी',
  'kadwa': 'कदवा',
  'azamnagar': 'आज़मनगर',
  'falka': 'फलका',
  'kursela': 'कुरसेला',
  'sameli': 'समेली',
  'amarpur': 'अमरपुर',
  'belaganj': 'बेलागंज',
  'bodhgaya': 'बोधगया',
  'wazirganj': 'वज़ीरगंज',
  'fatehpur': 'फतेहपुर',
  'sherghati': 'शेरघाटी',
  'tekari': 'टिकारी',
  'dobhi': 'डोभी',
  'manpur': 'मानपुर',
  'danapur': 'दानापुर',
  'phulwari': 'फुलवारी',
  'phulwarisharif': 'फुलवारीशरीफ',
  'fatuha': 'फतुहा',
  'bakhtiyarpur': 'बख्तियारपुर',
  'barh': 'बाढ़',
  'mokama': 'मोकामा',
  'masaurhi': 'मसौढ़ी',
  'bikram': 'बिक्रम',
  'paliganj': 'पालीगंज',
  'bihta': 'बिहटा',
  'maner': 'मनेर',
  'khagaul': 'खगौल',
  'raniganj': 'रानीगंज',
  'forbesganj': 'फारबिसगंज',
  'jokihat': 'जोकीहाट',
  'sikti': 'सिकटी',
  'palasi': 'पलासी',
  'narpatganj': 'नरपतगंज',
  'bhargama': 'भरगामा',
  'kursakanta': 'कुर्साकांटा',
  'thakurganj': 'ठाकुरगंज',
  'bahadurganj': 'बहादुरगंज',
  'dighalbank': 'दिघलबैंक',
  'kochadhaman': 'कोचाधामन',
  'pothia': 'पोठिया',
  'terhagachh': 'टेढ़ागाछ',

  // Common school place names in Bihar
  'rampur': 'रामपुर',
  'mohanpur': 'मोहनपुर',
  'kalyanpur': 'कल्याणपुर',
  'harinagar': 'हरिनगर',
  'sitapur': 'सीतापुर',
  'shivpur': 'शिवपुर',
  'govindpur': 'गोविंदपुर',
  'bhagwanpur': 'भगवानपुर',
  'madhopur': 'माधोपुर',
  'bela': 'बेला',
  'balthi': 'बलथी',
  'majhua': 'मझुआ',
  'jalalpur': 'जलालपुर',
  'shahpur': 'शाहपुर',
  'durgapur': 'दुर्गापुर',
  'chandpur': 'चाँदपुर',
  'gopalpur': 'गोपालपुर',
  'maheshpur': 'महेशपुर',
  'narayanpur': 'नारायणपुर',
  'kishunpur': 'किशुनपुर',
  'vishunpur': 'विशुनपुर',
  'raghopur': 'राघोपुर',
  'chhatapur': 'छातापुर',
  'triveniganj': 'त्रिवेणीगंज',
  'pipra': 'पिपरा',
  'simri': 'सिमरी',
  'bakhtiarpur': 'बख्तियारपुर',
  'sonbarsa': 'सोनबरसा',
  'singheshwar': 'सिंहेश्वर',
  'kumarkhand': 'कुमारखंड',
  'shankarpur': 'शंकरपुर',
  'gwalpara': 'ग्वालपाड़ा',
  'bihariganj': 'बिहारीगंज',
  'chausa': 'चौसा',
  'puraini': 'पुरैनी',
  'murliganj': 'मुरलीगंज',
  'gamharia': 'गमहरिया',
  'ghailadh': 'घैलाढ़',
  'sourbazar': 'सौरबाजार',
  'mahishi': 'महिषी',
  'sattarkataiya': 'सत्तरकटैया',
  'sonbarsa raj': 'सोनबरसा राज',
  'nauhatta': 'नौहट्टा',
  'patepur': 'पातेपुर',
  'mahua': 'महुआ',
  'lalganj': 'लालगंज',
  'jandaha': 'जंदाहा',
  'goroul': 'गोरौल',
  'chehrakalan': 'चेहराकलां',
  'bidupur': 'बिदुपुर',
  'desri': 'देसरी',
  'sahdai': 'सहदेई',
  'patori': 'पटोरी',
  'mohiuddinnagar': 'मोहिउद्दीननगर',
  'dalsinghsarai': 'दलसिंहसराय',
  'rosera': 'रोसड़ा',
  'hasanpur': 'हसनपुर',
  'bibhutipur': 'विभूतिपुर',
  'singhia': 'सिंघिया',
  'warisnagar': 'वारिसनगर',
  'khanpur': 'खानपुर',
  'shivajinagar': 'शिवाजीनगर',
  'morwa': 'मोरवा',
  'tajpur': 'ताजपुर',
  'sarairanjan': 'सरायरंजन',
  'ujiyarpur': 'उजियारपुर',
  'benipatti': 'बेनीपट्टी',
  'jhanjharpur': 'झंझारपुर',
  'babubarhi': 'बाबूबरही',
  'khajauli': 'खजौली',
  'ladania': 'लदनियां',
  'jainagar': 'जयनगर',
  'madhwapur': 'माधवापुर',
  'harlakhi': 'हरलाखी',
  'bisfi': 'बिस्फी',
  'pandaul': 'पंडौल',
  'sakri': 'सकरी',
  'rajanagar': 'राजनगर',
  'andhrathari': 'अंधराठाढ़ी',
  'ghoghardiha': 'घोघरडीहा',
  'laukahi': 'लौकही',
  'laukaha': 'लौकाहा',
  'fulparas': 'फुलपरास',
  'khutauna': 'खुंटौना',
  'tamuria': 'तमुरिया',
  'marhaura': 'मढ़ौरा',
  'dighwara': 'दिघवारा',
  'sonpur': 'सोनपुर',
  'parsa': 'परसा',
  'garkha': 'गड़खा',
  'amnour': 'अमनौर',
  'taraiya': 'तरैया',
  'panapur': 'पानापुर',
  'mashrakh': 'मशरख',
  'ishaopur': 'ईशुआपुर',
  'baniapur': 'बनियापुर',
  'lahladpur': 'लहलादपुर',
  'ekma': 'एकमा',
  'manjhi': 'मांझी',
  'revelganj': 'रिविलगंज',
  'ramnagar': 'रामनगर',
  'narkatiaganj': 'नरकटियागंज',
  'gaunaha': 'गौनाहा',
  'mainatand': 'मैनाटांड़',
  'sikta': 'सिकटा',
  'lauriya': 'लौरिया',
  'bagaha': 'बगहा',
  'piprasi': 'पिपरासी',
  'bhita': 'भीटा',
  'thakaraha': 'ठकराहा',
  'bhithaha': 'भीतहा',
  'yadavpur': 'यादवपुर',
  'manjha': 'मांझा',
  'barauli': 'बरौली',
  'sidhwalia': 'सिधवलिया',
  'baikunthpur': 'बैकुंठपुर',
  'uchkagaon': 'उचकागांव',
  'thawe': 'थावे',
  'hathua': 'हथुआ',
  'phulwaria': 'फुलवरिया',
  'katiya': 'कटेया',
  'bhorey': 'भोरे',
  'vijayipur': 'विजयीपुर',
  'mairwa': 'मैरवा',
  'darauli': 'दरौली',
  'guthani': 'गुठनी',
  'andar': 'आंदर',
  'raghunathpur': 'रघुनाथपुर',
  'siswan': 'सिसवन',
  'hasanpura': 'हसनपुरा',
  'hussainganj': 'हुसैनगंज',
  'barharia': 'बड़हरिया',
  'goriakothi': 'गोरियाकोठी',
  'maharajganj': 'महाराजगंज',
  'daraundha': 'दरौंदा',
  'duraundha': 'दुरौंधा',
  'bhagwanpur hat': 'भगवानपुर हाट',
  'pachrukhi': 'पचरूखी',
  'nauhatan': 'नौतन',
  'jiradei': 'जीरादेई',
  'lakri nabiganj': 'लकड़ी नबीगंज',
};

// Common Indian place name suffix patterns
const SUFFIX_MAP: [RegExp, string][] = [
  [/pur$/i, 'पुर'],
  [/nagar$/i, 'नगर'],
  [/dih$/i, 'डीह'],
  [/tola$/i, 'टोला'],
  [/toli$/i, 'टोली'],
  [/chak$/i, 'चक'],
  [/ganj$/i, 'गंज'],
  [/bazar$/i, 'बाज़ार'],
  [/bazaar$/i, 'बाज़ार'],
  [/patti$/i, 'पट्टी'],
  [/haat$/i, 'हाट'],
  [/chawk$/i, 'चौक'],
  [/chauk$/i, 'चौक'],
  [/ghat$/i, 'घाट'],
  [/garh$/i, 'गढ़'],
  [/bari$/i, 'बारी'],
  [/bathan$/i, 'बथान'],
  [/diara$/i, 'दियारा'],
  [/kalan$/i, 'कलां'],
  [/khurd$/i, 'खुर्द'],
  [/bigha$/i, 'बीघा'],
  [/sarai$/i, 'सराय'],
  [/puram$/i, 'पुरम'],
  [/bad$/i, 'बाद'],
  [/kothi$/i, 'कोठी'],
];

// Multi-character consonant patterns
const MULTI_CONSONANTS: [string, string][] = [
  ['shri', 'श्री'],
  ['shree', 'श्री'],
  ['ksh', 'क्ष'],
  ['tra', 'त्र'],
  ['gya', 'ज्ञ'],
  ['chh', 'छ'],
  ['kh', 'ख'],
  ['gh', 'घ'],
  ['ch', 'च'],
  ['jh', 'झ'],
  ['th', 'थ'],
  ['dh', 'ध'],
  ['ph', 'फ'],
  ['bh', 'भ'],
  ['sh', 'श'],
  ['zh', 'ज़'],
  ['ng', 'ंग'],
  ['nk', 'ंक'],
  ['nd', 'न्द'],
  ['nt', 'न्त'],
  ['mp', 'म्प'],
  ['mb', 'म्ब'],
  ['st', 'स्त'],
  ['sp', 'स्प'],
  ['sk', 'स्क'],
  ['pr', 'प्र'],
  ['kr', 'क्र'],
  ['gr', 'ग्र'],
  ['br', 'ब्र'],
  ['dr', 'द्र'],
  ['tr', 'त्र'],
];

const SINGLE_CONSONANTS: Record<string, string> = {
  'k': 'क',
  'g': 'ग',
  'c': 'क',
  'j': 'ज',
  't': 'ट',
  'd': 'द',
  'n': 'न',
  'p': 'प',
  'f': 'फ',
  'b': 'ब',
  'm': 'म',
  'y': 'य',
  'r': 'र',
  'l': 'ल',
  'v': 'व',
  'w': 'व',
  's': 'स',
  'h': 'ह',
  'z': 'ज़',
  'q': 'क',
  'x': 'क्स',
};

const VOWEL_MATRA_MAP: [string, string][] = [
  ['aaa', 'ा'],
  ['aa', 'ा'],
  ['ai', 'ै'],
  ['au', 'ौ'],
  ['ee', 'ी'],
  ['oo', 'ू'],
  ['a', 'ा'], // Trailing 'a' or stressed 'a' in names
  ['i', 'ि'],
  ['u', 'ु'],
  ['e', 'े'],
  ['o', 'ो'],
];

const INDEPENDENT_VOWELS_MAP: [string, string][] = [
  ['aaa', 'आ'],
  ['aa', 'आ'],
  ['ai', 'ऐ'],
  ['au', 'औ'],
  ['ee', 'ई'],
  ['oo', 'ऊ'],
  ['a', 'अ'],
  ['i', 'इ'],
  ['u', 'उ'],
  ['e', 'ए'],
  ['o', 'ओ'],
];

/**
 * Phonetically transliterates a single English word to Hindi using rule-based grammar
 */
export function transliterateWordOffline(word: string): string {
  const clean = word.toLowerCase().trim();
  if (!clean) return '';

  // 1. Check exact dictionary match
  if (KEYWORD_MAP[clean]) {
    return KEYWORD_MAP[clean];
  }

  // 2. If already Devanagari or numbers
  if (/^[\u0900-\u097F0-9]+$/.test(clean)) {
    return word;
  }

  // 3. Check suffix patterns (e.g. Rampur -> Ram + pur, Harinagar -> Hari + nagar)
  for (const [regex, hindiSuffix] of SUFFIX_MAP) {
    if (regex.test(clean)) {
      const stem = clean.replace(regex, '');
      if (stem.length >= 2) {
        const hindiStem = KEYWORD_MAP[stem] || transliterateWordOffline(stem);
        return hindiStem + hindiSuffix;
      }
    }
  }

  let result = '';
  let i = 0;
  const len = clean.length;

  while (i < len) {
    // Check initial independent vowels
    if (i === 0) {
      let vowelMatched = false;
      for (const [latin, devanagari] of INDEPENDENT_VOWELS_MAP) {
        if (clean.startsWith(latin, i)) {
          result += devanagari;
          i += latin.length;
          vowelMatched = true;
          break;
        }
      }
      if (vowelMatched) continue;
    }

    // Check multi-character consonants (sh, th, dh, ksh, pr, etc.)
    let consonantMatched = false;
    for (const [latin, devanagari] of MULTI_CONSONANTS) {
      if (clean.startsWith(latin, i)) {
        result += devanagari;
        i += latin.length;
        consonantMatched = true;

        // Check if immediately followed by vowel
        let matraMatched = false;
        for (const [vLatin, matra] of VOWEL_MATRA_MAP) {
          if (clean.startsWith(vLatin, i)) {
            // For 'a' in the middle of word, it's schwa unless at end of word or 'aa'
            if (vLatin === 'a') {
              if (i + 1 >= len) {
                result += 'ा'; // trailing 'a' is 'ा' in Indian names like 'Kasba', 'Patna'
              }
              // else inherent schwa 'a' sound (no matra needed)
            } else {
              result += matra;
            }
            i += vLatin.length;
            matraMatched = true;
            break;
          }
        }
        break;
      }
    }
    if (consonantMatched) continue;

    // Check single consonants
    const char = clean[i];
    if (SINGLE_CONSONANTS[char]) {
      result += SINGLE_CONSONANTS[char];
      i++;

      // Check following vowel matra
      let matraMatched = false;
      for (const [vLatin, matra] of VOWEL_MATRA_MAP) {
        if (clean.startsWith(vLatin, i)) {
          if (vLatin === 'a') {
            if (i + 1 >= len) {
              result += 'ा'; // Trailing 'a' in words like Kasba, Gaya, Dhamdaha
            }
          } else {
            result += matra;
          }
          i += vLatin.length;
          matraMatched = true;
          break;
        }
      }
      continue;
    }

    // Standalone vowel in middle of word
    let middleVowel = false;
    for (const [vLatin, matra] of VOWEL_MATRA_MAP) {
      if (clean.startsWith(vLatin, i)) {
        if (vLatin === 'a') {
          if (i + 1 >= len) result += 'ा';
        } else {
          result += matra;
        }
        i += vLatin.length;
        middleVowel = true;
        break;
      }
    }
    if (middleVowel) continue;

    // Fallback for symbols/digits
    result += word[i] || '';
    i++;
  }

  return result || word;
}

/**
 * Fetch online transliteration from Google Input Tools API with instant fallback
 */
export async function fetchGoogleTransliteration(text: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return '';
  if (/^[\u0900-\u097F0-9\s.,\-_()/]+$/.test(trimmed)) {
    return trimmed;
  }

  // Check cache first
  const cacheKey = trimmed.toLowerCase();
  if (transliterationCache.has(cacheKey)) {
    return transliterationCache.get(cacheKey)!;
  }

  try {
    const url = `https://inputtools.google.com/request?text=${encodeURIComponent(trimmed)}&itc=hi-t-i0-und&num=1`;
    const res = await fetch(url, { method: 'GET' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data[0] === 'SUCCESS' && Array.isArray(data[1])) {
        const item = data[1][0];
        if (Array.isArray(item) && Array.isArray(item[1]) && item[1].length > 0) {
          const result = item[1][0] as string;
          if (result && result.trim()) {
            transliterationCache.set(cacheKey, result);
            return result;
          }
        }
      }
    }
  } catch (err) {
    // Ignore network error and fall back to local engine
  }

  // Fallback to offline engine
  const offline = autoTranslateToHindi(trimmed);
  transliterationCache.set(cacheKey, offline);
  return offline;
}

/**
 * Synchronous Auto-translator (Uses dictionary + phonetic rules)
 */
export function autoTranslateToHindi(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();

  // If already Devanagari Hindi, return directly
  if (/^[\u0900-\u097F0-9\s.,\-_()/]+$/.test(trimmed)) {
    return input;
  }

  // Check exact cache or full phrase dictionary
  const lower = trimmed.toLowerCase();
  if (transliterationCache.has(lower)) {
    return transliterationCache.get(lower)!;
  }
  if (KEYWORD_MAP[lower]) {
    return KEYWORD_MAP[lower];
  }

  // Tokenize by spaces and punctuation
  const tokens = input.split(/(\s+|[.,\-_/()])/);

  const translatedTokens = tokens.map((tok) => {
    if (!tok || !tok.trim()) return tok;
    const cleanTok = tok.toLowerCase().trim();
    if (KEYWORD_MAP[cleanTok]) {
      return KEYWORD_MAP[cleanTok];
    }
    if (/[a-z]/i.test(cleanTok)) {
      return transliterateWordOffline(cleanTok);
    }
    return tok;
  });

  const finalStr = translatedTokens.join('');
  transliterationCache.set(lower, finalStr);
  return finalStr;
}

/**
 * Async transliterator that enhances with Google API when available
 */
export async function translateToHindiAsync(input: string): Promise<string> {
  if (!input) return '';
  const trimmed = input.trim();
  if (/^[\u0900-\u097F0-9\s.,\-_()/]+$/.test(trimmed)) {
    return input;
  }

  // Check dictionary first for compound terms (e.g. UMS, Primary School)
  const lower = trimmed.toLowerCase();
  if (KEYWORD_MAP[lower]) {
    return KEYWORD_MAP[lower];
  }

  // Split tokens (preserve spaces)
  const tokens = input.split(/(\s+)/);
  const translated = await Promise.all(
    tokens.map(async (tok) => {
      if (!tok || !tok.trim()) return tok;
      const clean = tok.toLowerCase().trim();
      if (KEYWORD_MAP[clean]) {
        return KEYWORD_MAP[clean];
      }
      if (/[a-z]/i.test(clean)) {
        return await fetchGoogleTransliteration(clean);
      }
      return tok;
    })
  );

  const result = translated.join('');
  transliterationCache.set(lower, result);
  return result;
}
