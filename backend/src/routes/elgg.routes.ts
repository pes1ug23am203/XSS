// src/routes/elgg.routes.ts
//
// Simulates the Elgg social networking application that is the XSS attack target.
// Endpoints mirror what the real Elgg exposes, so the frontend portal is authentic.

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { labSessions } from './lab.routes';

export const elggSessions = new Map<string, { username: string; labToken: string }>();

// User definitions (passwords kept server-side for login verification)
const elggUsers: Record<string, { displayName: string; password: string; guid: number }> = {
  samy:    { displayName: 'Samy',    password: 'seedsamy',    guid: 59 },
  alice:   { displayName: 'Alice',   password: 'seedalice',   guid: 56 },
  boby:    { displayName: 'Boby',    password: 'seedboby',    guid: 58 },
  charlie: { displayName: 'Charlie', password: 'seedcharlie', guid: 57 },
  admin:   { displayName: 'Admin',   password: 'seedadmin',   guid: 1  },
};

// Helper — resolve the Elgg session from the cookie
function getElggSession(req: Request) {
  const sessionId = req.cookies?.elgg_session;
  if (!sessionId) return null;
  return elggSessions.get(sessionId) || null;
}

// Helper — retrieve the LabSession for a given labToken
function getLabSession(labToken: string) {
  return labSessions.get(labToken) || null;
}

// Helper — build a CSRF token pair that mimics Elgg's elgg.security.token
function makeElggTokens() {
  const ts    = String(Math.floor(Date.now() / 1000));
  const token = uuidv4().replace(/-/g, '');
  return { __elgg_ts: ts, __elgg_token: token };
}

// Helper — log an activity event
function logActivity(labToken: string, user: string, action: string) {
  const lab = getLabSession(labToken);
  if (!lab) return;
  lab.elggState.activityLog.unshift({ time: Date.now(), user, action });
}

// ── Check for active XSS payload on a profile (runs when victim views a profile)
// Returns an array of events that fired: cookie_stolen | friend_added | profile_modified | worm_propagated
function simulateXssOnView(
  labToken: string,
  viewerUsername: string,          // who is viewing
  profileOwner: string,            // whose profile is being viewed
  viewerSessionCookie: string,
): string[] {
  const lab = getLabSession(labToken);
  if (!lab) return [];
  const profile = lab.elggState.profiles[profileOwner];
  if (!profile) return [];
  const events: string[] = [];

  const desc = profile.description.toLowerCase();

  // ── Task 3: Cookie theft via <img> exfiltration ──────────────────────────
  if (
    desc.includes('document.write') &&
    (desc.includes('document.cookie') || desc.includes('escape(document.cookie)')) &&
    desc.includes('img')
  ) {
    lab.elggState.cookiesStolen.push({
      time: Date.now(),
      from: viewerUsername,
      value: viewerSessionCookie,
    });
    logActivity(labToken, profileOwner, `Cookie stolen from ${viewerUsername} via img exfiltration.`);
    events.push('cookie_stolen');
  }

  // ── Task 4: Friend-add AJAX GET ──────────────────────────────────────────
  if (
    desc.includes('action/friends/add') &&
    desc.includes('xmlhttprequest') &&
    (desc.includes('ajax.open("get"') || desc.includes("ajax.open('get'"))
  ) {
    const viewer = lab.elggState.profiles[viewerUsername];
    const targetOwner = lab.elggState.profiles[profileOwner];
    if (viewer && targetOwner && !viewer.friends.includes(profileOwner)) {
      viewer.friends.push(profileOwner);
      logActivity(labToken, viewerUsername, `XSS forced ${viewerUsername} to add ${profileOwner} as a friend.`);
      events.push('friend_added');
    }
  }

  // ── Task 5 & 6: Profile modification POST ───────────────────────────────
  if (
    desc.includes('action/profile/edit') &&
    desc.includes('xmlhttprequest') &&
    (desc.includes('ajax.open("post"') || desc.includes("ajax.open('post'"))
  ) {
    const viewer = lab.elggState.profiles[viewerUsername];
    if (viewer && viewerUsername !== profileOwner) {
      viewer.description = 'Samy is my hero!';
      viewer.briefDescription = 'samy is my hero';
      logActivity(labToken, viewerUsername, `XSS from ${profileOwner}'s profile overwrote ${viewerUsername}'s description.`);
      events.push('profile_modified');
    }

    // ── Task 6: Self-propagating worm — copy worm code to viewer's profile
    if (desc.includes('id="worm"') || desc.includes("id='worm'")) {
      const viewer = lab.elggState.profiles[viewerUsername];
      if (viewer && viewerUsername !== profileOwner) {
        // Copy the worm payload into victim's profile too
        viewer.description = profile.description;
        logActivity(labToken, viewerUsername, `Self-propagating XSS worm copied to ${viewerUsername}'s profile from ${profileOwner}.`);
        events.push('worm_propagated');
      }
    }
  }

  return events;
}

// ── Router ────────────────────────────────────────────────────────────────────

const router = Router();

// POST /login
router.post('/login', (req: Request, res: Response) => {
  try {
    const { username, password, labToken } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    const userKey = String(username).toLowerCase();
    const userDef = elggUsers[userKey];
    if (!userDef || userDef.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Resolve labToken — from body or most recent session
    let resolvedToken = labToken as string;
    if (!resolvedToken) {
      const sessions = Array.from(labSessions.values()).sort((a, b) => b.startedAt - a.startedAt);
      if (sessions.length > 0) resolvedToken = sessions[0].token;
    }

    const sessionId = uuidv4();
    elggSessions.set(sessionId, { username: userKey, labToken: resolvedToken || '' });

    // Update the elggSessionUser on the lab session for portal tracking
    if (resolvedToken) {
      const lab = getLabSession(resolvedToken);
      if (lab) lab.elggSessionUser = userKey;
    }

    res.cookie('elgg_session', sessionId, { httpOnly: false, path: '/', sameSite: 'lax' });

    const tokens = makeElggTokens();
    res.json({
      success: true,
      user: {
        username: userKey,
        displayName: userDef.displayName,
        guid: userDef.guid,
        elggSecurityTokens: tokens, // returned so the portal can inject elgg.security.token.*
      },
    });
  } catch (err) {
    console.error('Elgg login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /logout
router.post('/logout', (req: Request, res: Response) => {
  const sessionId = req.cookies?.elgg_session;
  if (sessionId) elggSessions.delete(sessionId);
  res.clearCookie('elgg_session');
  res.json({ success: true });
});

// GET /profile/:username — view a profile (may trigger XSS simulation)
router.get('/profile/:username', (req: Request, res: Response) => {
  const session = getElggSession(req);
  if (!session) return res.status(401).json({ error: 'Not logged in' });

  const { username } = req.params;
  const { labToken } = session;

  const lab = getLabSession(labToken);
  if (!lab) return res.status(404).json({ error: 'Lab session not found' });

  const profile = lab.elggState.profiles[username];
  if (!profile) return res.status(404).json({ error: 'Profile not found' });

  // Simulate XSS fires when viewer is different from the profile owner
  let xssEvents: string[] = [];
  if (session.username !== username) {
    const cookie = req.cookies?.elgg_session || 'elgg_session=SIMULATED_TOKEN';
    xssEvents = simulateXssOnView(labToken, session.username, username, `elgg_session=${cookie}`);
  }

  const tokens = makeElggTokens();
  const userDef = elggUsers[username];

  res.json({
    profile: {
      ...profile,
      guid: userDef?.guid || 0,
    },
    xssEvents,
    elggSecurityTokens: tokens,
    viewerGuid: elggUsers[session.username]?.guid || 0,
  });
});

// GET /my-profile — get the currently logged-in user's own profile
router.get('/my-profile', (req: Request, res: Response) => {
  const session = getElggSession(req);
  if (!session) return res.status(401).json({ error: 'Not logged in' });

  const { username, labToken } = session;
  const lab = getLabSession(labToken);
  if (!lab) return res.status(404).json({ error: 'Lab session not found' });

  const profile = lab.elggState.profiles[username];
  const userDef = elggUsers[username];
  const tokens = makeElggTokens();

  res.json({
    profile: { ...profile, guid: userDef?.guid || 0 },
    elggSecurityTokens: tokens,
    viewerGuid: userDef?.guid || 0,
  });
});

// POST /action/profile/edit — edit a profile (Samy uses this to inject payloads)
router.post('/action/profile/edit', (req: Request, res: Response) => {
  const session = getElggSession(req);
  if (!session) return res.status(401).json({ error: 'Not logged in' });

  const { username, labToken } = session;
  const lab = getLabSession(labToken);
  if (!lab) return res.status(404).json({ error: 'Lab session not found' });

  const { description, briefdescription, name } = req.body;
  const profile = lab.elggState.profiles[username];
  if (!profile) return res.status(404).json({ error: 'Profile not found' });

  if (description !== undefined) profile.description = String(description);
  if (briefdescription !== undefined) profile.briefDescription = String(briefdescription);
  if (name !== undefined) profile.displayName = String(name);

  logActivity(labToken, username, `${username} updated their profile.`);

  const tokens = makeElggTokens();
  res.json({ success: true, profile: { ...profile, guid: elggUsers[username]?.guid || 0 }, elggSecurityTokens: tokens });
});

// POST /action/friends/add — add a friend (victim's browser is tricked into calling this)
router.post('/action/friends/add', (req: Request, res: Response) => {
  const session = getElggSession(req);
  if (!session) return res.status(401).json({ error: 'Not logged in' });

  const { username, labToken } = session;
  const lab = getLabSession(labToken);
  if (!lab) return res.status(404).json({ error: 'Lab session not found' });

  const friendGuid = Number(req.query.friend || req.body.friend);
  // Resolve username from guid
  const friendEntry = Object.entries(elggUsers).find(([, u]) => u.guid === friendGuid);
  if (!friendEntry) return res.status(404).json({ error: 'User not found' });
  const friendUsername = friendEntry[0];

  const profile = lab.elggState.profiles[username];
  if (!profile) return res.status(404).json({ error: 'Profile not found' });

  if (!profile.friends.includes(friendUsername)) {
    profile.friends.push(friendUsername);
    logActivity(labToken, username, `${username} added ${friendUsername} as a friend.`);
  }

  res.json({ success: true, message: `${friendUsername} added to friends.` });
});

// GET /friends — list current user's friends
router.get('/friends', (req: Request, res: Response) => {
  const session = getElggSession(req);
  if (!session) return res.status(401).json({ error: 'Not logged in' });

  const { username, labToken } = session;
  const lab = getLabSession(labToken);
  if (!lab) return res.status(404).json({ error: 'Lab session not found' });

  const profile = lab.elggState.profiles[username];
  const friends = (profile?.friends || []).map(f => ({
    username: f,
    displayName: elggUsers[f]?.displayName || f,
    guid: elggUsers[f]?.guid || 0,
  }));

  res.json({ friends });
});

// GET /activity — get the Elgg activity log for the current lab session
router.get('/activity', (req: Request, res: Response) => {
  const session = getElggSession(req);
  if (!session) return res.status(401).json({ error: 'Not logged in' });

  const { labToken } = session;
  const lab = getLabSession(labToken);
  if (!lab) return res.status(404).json({ error: 'Lab session not found' });

  res.json({
    activityLog: lab.elggState.activityLog,
    cookiesStolen: lab.elggState.cookiesStolen,
  });
});

// GET /users — list all Elgg users (for the portal dropdown)
router.get('/users', (_req: Request, res: Response) => {
  const users = Object.entries(elggUsers).map(([username, u]) => ({
    username,
    displayName: u.displayName,
    guid: u.guid,
  }));
  res.json({ users });
});

export default router;
