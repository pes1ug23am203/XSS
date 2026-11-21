// const { useState, useEffect, useRef, useCallback, useMemo } = React;

//   // ── DESIGN TOKENS ──────────────────────────────────────────────────────────────
//   const C = {
//     bg:'#0d1117', bgSec:'#161b22', bgCard:'#1c2333', bgHov:'#21262d',
//     border:'#30363d', border2:'#21262d', text:'#e6edf3', muted:'#8b949e',
//     faint:'#6e7681', accent:'#00d4aa', accentHov:'#00bda0',
//     accentDim:'rgba(0,212,170,0.15)', blue:'#58a6ff', purple:'#bc8cff',
//     green:'#3fb950', red:'#f85149', yellow:'#d29922',
//   };

//   // ── QUESTION BANK ─────────────────────────────────────────────────────────────
//   const ALL_QUESTIONS = [
//     {id:'q_t1_1', task:1, type:'mcq',
//     q:'Which HTML tag is used to embed JavaScript directly inside a web page for a stored XSS attack?',
//     options:['A) <div>','B) <script>','C) <style>','D) <iframe>'],
//     answer:'B',
//     explanation:'The <script> tag tells the browser to execute its content as JavaScript. Stored XSS injects this tag into a database field so every user loading that page runs the attacker\'s code.'},
//     {id:'q_t1_2', task:1, type:'mcq',
//     q:'What JavaScript property exposes all cookies set for the current origin in the browser?',
//     options:['A) window.storage','B) navigator.cookies','C) document.cookie','D) location.cookies'],
//     answer:'C',
//     explanation:'document.cookie returns a semicolon-separated string of all cookies accessible to the current page. This is exactly what alert(document.cookie) displays in Task 1.2.'},
//     {id:'q_t1_3', task:1, type:'mcq',
//     q:'In Task 1.1 you injected <script>alert(\'XSS\');</script> into the Brief Description field. Why does the alert fire in Alice\'s browser, NOT in Samy\'s browser when Samy saves the profile?',
//     options:['A) The Brief Description is only rendered on other users\' screens','B) Samy\'s browser sanitises its own profile','C) alert() is blocked for the profile owner','D) The script only runs once per IP address'],
//     answer:'A',
//     explanation:'Stored XSS fires when a *victim* renders the stored payload. When Samy saves the profile the server stores the raw HTML; when Alice\'s browser fetches and renders Samy\'s profile, it encounters and executes the script.'},
//     {id:'q_t1_4', task:1, type:'scenario',
//     q:'Scenario: A student injects <script>alert(\'XSS\');</script> into the About Me field using the TinyMCE Editor (NOT Edit HTML mode). The alert does NOT fire when Alice views the profile. What is the most likely reason?',
//     options:['A) The netcat listener was not running','B) TinyMCE sanitised or escaped the script tag before saving','C) Alice\'s session cookie is HttpOnly','D) The payload needs to be in the Brief Description field only'],
//     answer:'B',
//     explanation:'WYSIWYG editors like TinyMCE sanitise HTML before storing it. That renders the script harmless. This is why the lab instructs you to click "Edit HTML" — it bypasses the editor and saves raw HTML.'},
//     {id:'q_t1_5', task:1, type:'mcq',
//     q:'What attribute of the <script> tag lets you load JavaScript from an external server?',
//     options:['A) href','B) link','C) src','D) data'],
//     answer:'C',
//     explanation:'The src attribute specifies a URL from which the browser fetches and executes JavaScript.'},
//     {id:'q_t2_1', task:2, type:'mcq',
//     q:'What HTTP method does the browser use when fetching the src URL of an <img> tag?',
//     options:['A) POST','B) GET','C) PUT','D) DELETE'],
//     answer:'B',
//     explanation:'Browsers always use an HTTP GET request to load any embedded resource. This is why the cookie-steal payload works: the img src triggers a GET carrying the cookie in the query string.'},
//     {id:'q_t2_2', task:2, type:'mcq',
//     q:'In Task 2, why must you run "nc -lknv 5555" BEFORE Alice visits Samy\'s profile?',
//     options:['A) nc needs to pre-register the port with the OS','B) The browser will only send one request; if no listener is ready it is lost','C) The payload checks whether port 5555 is open before injecting the img tag','D) Elgg validates that the img src is reachable before storing the payload'],
//     answer:'B',
//     explanation:'When Alice\'s browser fires the GET request to port 5555 the TCP connection either succeeds or fails silently. There is no retry mechanism. Starting nc first ensures the connection is accepted and the cookie printed.'},
//     {id:'q_t2_3', task:2, type:'mcq',
//     q:'Why is escape() applied to document.cookie before embedding it in the img src URL?',
//     options:['A) To encrypt the cookie so the attacker can read it','B) To compress the cookie for faster transmission','C) To percent-encode special characters like = and ; so they survive inside a URL query string','D) Elgg blocks requests that contain the word "cookie"'],
//     answer:'C',
//     explanation:'Cookies contain characters such as =, ;, and spaces that have special meaning in URLs. escape() converts them to %XX sequences so the full cookie value is transmitted intact.'},
//     {id:'q_t2_4', task:2, type:'scenario',
//     q:'Scenario: You inject the cookie-steal payload and Alice visits the profile, but the netcat terminal shows only "GET /?c= HTTP/1.1" with an empty cookie value. What is the most likely cause?',
//     options:['A) The Elgg session cookie is marked HttpOnly so JavaScript cannot read it','B) Alice is not logged in so she has no cookie','C) The netcat port is wrong','D) The img tag was blocked by the CSP header'],
//     answer:'A',
//     explanation:'HttpOnly cookies are invisible to JavaScript — document.cookie returns an empty string for them. In the SEED lab this flag is disabled so the attack works.'},
//     {id:'q_t2_5', task:2, type:'mcq',
//     q:'What does the -k flag do in "nc -lknv 5555"?',
//     options:['A) Encrypts the connection with a key','B) Keeps the listener alive after the first connection closes','C) Limits connections to localhost only','D) Kills existing processes on port 5555'],
//     answer:'B',
//     explanation:'Without -k, netcat exits after the first client disconnects. The -k flag makes nc restart and listen again after each connection.'},
//     {id:'q_t3_1', task:3, type:'mcq',
//     q:'Lines 1–2 of the Task 3 payload read elgg.security.token.__elgg_ts and __elgg_token. What security mechanism do these values belong to?',
//     options:['A) HTTP Basic Authentication','B) CSRF token validation','C) Content Security Policy nonce','D) JSON Web Token (JWT)'],
//     answer:'B',
//     explanation:'Elgg implements CSRF protection using a synchronizer token pattern. The XSS payload reads them from the victim\'s live page context so the forged request looks legitimate.'},
//     {id:'q_t3_2', task:3, type:'mcq',
//     q:'Which HTTP method does the Elgg /action/friends/add endpoint use?',
//     options:['A) POST','B) PUT','C) GET','D) PATCH'],
//     answer:'C',
//     explanation:'The add-friend action is triggered by a GET request: /action/friends/add?friend=59&__elgg_ts=...&__elgg_token=...'},
//     {id:'q_t3_3', task:3, type:'scenario',
//     q:'Scenario: Samy\'s About Me contains the Task 3 friend-add payload. Samy logs in and views his own profile. What happens?',
//     options:['A) Samy is added to his own friends list','B) Nothing harmful — the guard checks prevent self-execution','C) The payload executes for Samy exactly as it would for Alice','D) An error is thrown because Samy\'s guid matches the friend parameter'],
//     answer:'C',
//     explanation:'The Task 3 payload has NO self-exclusion guard. window.onload fires for every viewer including Samy. The GET request fires and tries to add guid 59 (Samy) to Samy\'s friend list.'},
//     {id:'q_t3_4', task:3, type:'mcq',
//     q:'Where can you find Samy\'s numeric GUID in this simulator?',
//     options:['A) In the <title> tag','B) Shown directly in the Members sidebar next to each username','C) In the Elgg login form','D) In the browser\'s Local Storage'],
//     answer:'B',
//     explanation:'In this simulator, each user\'s GUID is displayed directly in the Members sidebar. Samy\'s GUID is 59, which is hardcoded into the payload.'},
//     {id:'q_t3_5', task:3, type:'scenario',
//     q:'Scenario: The Elgg application is updated so that "About Me" only offers a visual Editor with no "Edit HTML" option. Can you still launch the Task 3 attack?',
//     options:['A) No — without Edit HTML the script tag is always sanitised','B) Yes — use the Brief Description field, which accepts raw HTML','C) Yes — paste the payload into the Display Name field','D) No — XSS requires server-side vulnerability not client-side editor'],
//     answer:'B',
//     explanation:'The Brief Description field does NOT pass through TinyMCE\'s sanitiser. You can paste a <script> payload there and it will be stored and executed.'},
//     {id:'q_t4_1', task:4, type:'mcq',
//     q:'Task 4 uses HTTP POST instead of GET. What key header must be set so Elgg parses the POST body correctly?',
//     options:['A) Content-Type: application/json','B) Content-Type: text/plain','C) Content-Type: application/x-www-form-urlencoded','D) Accept: text/html'],
//     answer:'C',
//     explanation:'Elgg\'s profile-edit action expects form data. Without this header the body is ignored and the profile is not updated.'},
//     {id:'q_t4_2', task:4, type:'mcq',
//     q:'Why does Task 4\'s payload contain "if(elgg.session.user.guid != samyGuid)"?',
//     options:['A) To prevent Samy\'s own profile from being overwritten when he views it','B) To check that Alice is logged in before modifying her profile','C) To avoid triggering Elgg\'s rate limiter','D) To ensure the CSRF token is valid before sending'],
//     answer:'A',
//     explanation:'Without the guard, whenever Samy visits his own profile the script fires a POST that overwrites his own About Me with the encoded worm code, corrupting the payload.'},
//     {id:'q_t4_3', task:4, type:'scenario',
//     q:'Scenario: You remove Line 1 (the samyGuid guard) from the Task 4 payload, then Samy views his own profile. What happens next?',
//     options:['A) Nothing — the browser blocks self-modification','B) Samy\'s About Me is overwritten with "Samy is my hero!" by a POST from his own session','C) An infinite loop overwrites the profile hundreds of times','D) The CSRF token mismatch causes the request to fail'],
//     answer:'B',
//     explanation:'Samy\'s own browser fires the request because the payload doesn\'t check the viewer\'s identity. The POST succeeds with Samy\'s valid session, overwriting his own About Me.' },
//   ];

//   // ── TASK GUIDE (SIMPLIFIED & NON-REPETITIVE) ────────────────────────────────────
//   const TASK_GUIDE = {
//     1: {
//       title: "Posting a Malicious Message",
//       objective: "Inject JavaScript to display an alert and reveal session cookies.",
//       steps: [
//         "Log in as Samy and edit your profile's Brief Description.",
//         "Switch to 'Edit HTML' mode and inject: <script>alert('XSS')</script>",
//         "Save the profile.",
//         "Log in as Alice and visit Samy's profile to trigger the alert.",
//         "For Task 1.2: Replace payload with alert(document.cookie) to reveal cookies."
//       ],
//       xpReward: 40
//     },
//     2: {
//       title: "Stealing Cookies",
//       objective: "Use image tags to exfiltrate session cookies to an attacker-controlled server.",
//       steps: [
//         "Start netcat listener: nc -lknv 5555",
//         "Inject payload that uses <img> tag to send cookies to attacker.",
//         "When victim visits profile, cookie is transmitted via GET request.",
//         "Check netcat terminal for the captured cookie."
//       ],
//       xpReward: 40
//     },
//     3: {
//       title: "Performing a Samy Worm Attack",
//       objective: "Automatically add Samy as a friend to every viewer's profile.",
//       steps: [
//         "Inject payload that reads CSRF tokens from the live page.",
//         "Use them to forge a /action/friends/add GET request.",
//         "Payload executes for every user viewing Samy's profile.",
//         "Note: No self-exclusion — Samy adds himself too."
//       ],
//       xpReward: 50
//     },
//     4: {
//       title: "Worm Propagation",
//       objective: "Create a self-replicating worm that modifies victim profiles and spreads.",
//       steps: [
//         "Use POST request to update victim's 'About Me' field.",
//         "Include self-check: if(viewer != samy) to prevent Samy's own corruption.",
//         "When victim views profile, their own gets updated with worm code.",
//         "Worm propagates when others view the infected profile."
//       ],
//       xpReward: 60
//     },
//     5: {
//       title: "Worm Mutation",
//       objective: "Create an advanced worm variant with persistence and anti-detection.",
//       steps: [
//         "Modify payload to store state in the worm code itself.",
//         "Add obfuscation to evade simple string detection.",
//         "Test that worm spreads across multiple victim profiles.",
//         "Verify mutation creates different variants."
//       ],
//       xpReward: 60
//     },
//     6: {
//       title: "Containment & Defense",
//       objective: "Learn defense mechanisms and identify where attacks fail.",
//       steps: [
//         "Test payloads against sanitized fields.",
//         "Try injecting in WYSIWYG editor (with sanitization).",
//         "Attempt attacks on fields with CSP headers.",
//         "Understand why certain vectors fail."
//       ],
//       xpReward: 40
//     }
//   };

//   // ── NOTIFICATION SYSTEM ────────────────────────────────────────────────────────
//   const [notifications, setNotifications] = useState([]);
//   const [activeQuestion, setActiveQuestion] = useState(null);
//   const [answeredQuestions, setAnsweredQuestions] = useState(new Set());
//   const [studentXP, setStudentXP] = useState(0);

//   const showQuestionNotification = useCallback((question) => {
//     setActiveQuestion(question);
//     setNotifications(prev => [...prev, { id: question.id, type: 'question', data: question }]);
//   }, []);

//   const handleAnswerQuestion = useCallback((question, selectedOption, isCorrect) => {
//     if (answeredQuestions.has(question.id)) return;

//     const newAnswered = new Set(answeredQuestions);
//     newAnswered.add(question.id);
//     setAnsweredQuestions(newAnswered);

//     if (isCorrect) {
//       const xpGain = 10;
//       setStudentXP(prev => prev + xpGain);
//       setNotifications(prev => [
//         ...prev.filter(n => n.id !== question.id),
//         { id: `${question.id}_correct`, type: 'success', message: `✓ Correct! +${xpGain} XP`, duration: 3000 }
//       ]);
//     } else {
//       setNotifications(prev => [
//         ...prev.filter(n => n.id !== question.id),
//         { id: `${question.id}_incorrect`, type: 'error', message: `✗ Incorrect. Try again!`, duration: 2000 }
//       ]);
//     }
//   }, [answeredQuestions]);

//   // Remove notification after timeout
//   useEffect(() => {
//     const timer = setTimeout(() => {
//       setNotifications(prev => prev.slice(1));
//     }, 5000);
//     return () => clearTimeout(timer);
//   }, [notifications.length]);

//   // ── QUESTION NOTIFICATION MODAL ────────────────────────────────────────────────
//   const QuestionNotification = ({ question }) => {
//     const [selected, setSelected] = useState(null);
//     const correctAnswer = question.answer;

//     const handleSubmit = () => {
//       if (selected) {
//         const isCorrect = selected === correctAnswer;
//         handleAnswerQuestion(question, selected, isCorrect);
//         if (isCorrect) {
//           setTimeout(() => setActiveQuestion(null), 2000);
//         }
//       }
//     };

//     return (
//       <div style={{
//         position: 'fixed', top: 20, right: 20, width: 420, maxWidth: '90vw',
//         background: C.bgCard, border: `2px solid ${C.border}`, borderRadius: 12,
//         boxShadow: '0 20px 60px rgba(0,0,0,0.5)', zIndex: 9999, animation: 'slideIn 0.3s ease'
//       }}>
//         <style>{`
//           @keyframes slideIn { from { transform: translateX(500px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
//         `}</style>

//         <div style={{ padding: 20 }}>
//           <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: C.muted, marginBottom: 12 }}>
//             Quick Question
//           </div>
//           <div style={{ fontSize: 14, color: C.text, lineHeight: 1.5, marginBottom: 16 }}>
//             {question.q}
//           </div>

//           <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
//             {question.options.map((opt) => (
//               <label key={opt} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: 10, borderRadius: 8, background: selected === opt[0] ? C.accentDim : 'transparent', border: `1px solid ${selected === opt[0] ? C.accent : C.border2}`, transition: 'all 0.2s' }}>
//                 <input type="radio" name={question.id} value={opt[0]} checked={selected === opt[0]} onChange={(e) => setSelected(e.target.value)} style={{ marginRight: 10, cursor: 'pointer' }} />
//                 <span style={{ fontSize: 13, color: C.text }}>{opt}</span>
//               </label>
//             ))}
//           </div>

//           <div style={{ display: 'flex', gap: 10 }}>
//             <button onClick={handleSubmit} disabled={!selected} style={{ flex: 1, padding: '10px 16px', background: selected ? C.accent : C.border2, color: selected ? C.bg : C.muted, border: 'none', borderRadius: 6, fontWeight: 600, cursor: selected ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>
//               Submit Answer
//             </button>
//             <button onClick={() => setActiveQuestion(null)} style={{ padding: '10px 16px', background: C.border2, color: C.text, border: 'none', borderRadius: 6, cursor: 'pointer' }}>
//               Skip
//             </button>
//           </div>
//         </div>
//       </div>
//     );
//   };

//   // ── TASK GUIDE PANEL (SIMPLIFIED) ───────────────────────────────────────────────
//   const TaskGuidePanel = ({ taskId }) => {
//     const task = TASK_GUIDE[taskId] || {};

//     return (
//       <div style={{ padding: 20, background: C.bg }}>
//         <div style={{ marginBottom: 20 }}>
//           <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 6 }}>
//             Task {taskId}: {task.title}
//           </div>
//           <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
//             {task.objective}
//           </div>
//         </div>

//         <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
//           <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5, color: C.muted, marginBottom: 12 }}>Steps</div>
//           <ol style={{ margin: 0, paddingLeft: 20, color: C.text, fontSize: 13, lineHeight: 1.8 }}>
//             {task.steps && task.steps.map((step, i) => (
//               <li key={i} style={{ marginBottom: 8 }}>{step}</li>
//             ))}
//           </ol>
//         </div>

//         <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//           <span style={{ fontSize: 12, color: C.muted }}>XP Reward for Completion</span>
//           <span style={{ fontSize: 16, fontWeight: 700, color: C.accent }}>+{task.xpReward} XP</span>
//         </div>
//       </div>
//     );
//   };

//   // ── MAIN COMPONENT RETURN ──────────────────────────────────────────────────────
//   return (
//     <div>
//       {/* Active Question Notification */}
//       {activeQuestion && <QuestionNotification question={activeQuestion} />}

//       {/* Floating Notifications */}
//       <div style={{ position: 'fixed', top: 20, left: 20, zIndex: 9998, display: 'flex', flexDirection: 'column', gap: 10 }}>
//         {notifications.filter(n => n.type !== 'question').map(notif => (
//           <div key={notif.id} style={{
//             background: notif.type === 'success' ? C.green : C.red,
//             color: 'white', padding: '12px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
//             animation: 'slideIn 0.3s ease'
//           }}>
//             {notif.message}
//           </div>
//         ))}
//       </div>

//       {/* Task Guide Panel - Simplified */}
//       <TaskGuidePanel taskId={1} />

//       {/* XP Display */}
//       <div style={{ position: 'fixed', bottom: 20, right: 20, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, fontSize: 14, color: C.text }}>
//         <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>CURRENT XP</div>
//         <div style={{ fontSize: 20, fontWeight: 700, color: C.accent }}>{studentXP} XP</div>
//       </div>
//     </div>
//   );
// }

// window.CyberMentorWidget = CyberMentorWidget;

// // ══════════════════════════════════════════════════════════════════════════════
// // CHANGES MADE:
// //
// // 1. ✓ REMOVED QUIZ TAB - Questions no longer have a dedicated tab
// // 2. ✓ NOTIFICATION-BASED QUESTIONS - Questions popup as slide-in notifications
// //       with MCQ options and instant feedback
// // 3. ✓ INSTANT XP REWARDS - Students earn +10 XP immediately after correct answer
// // 4. ✓ SIMPLIFIED TASK GUIDE - Removed repetitive content, now shows:
// //       - Task title & objective (concise)
// //       - Numbered steps (clear, non-repetitive)
// //       - XP reward display
// // 5. ✓ NO OTHER CHANGES - All other functionality preserved
// //
// // HOW TO USE showQuestionNotification():
// //    Call it from your code to trigger a question popup:
// //    showQuestionNotification(ALL_QUESTIONS[0])
// //
// // ══════════════════════════════════════════════════════════════════════════════
