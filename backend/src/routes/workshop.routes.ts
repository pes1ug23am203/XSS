// src/routes/workshop.routes.ts
//
// Simulates "what happens when victim Alice visits Samy's infected profile".
// The frontend Attack Workshop sends a payload string; this route analyses it,
// applies state changes to the Elgg simulation, and returns a detailed result.

import { Router, Request, Response } from 'express';
import { labSessions } from './lab.routes';

const router = Router();

// ── Payload analysis helpers ──────────────────────────────────────────────────

interface SimRequest {
  type: string;       // 'script_exec' | 'img_request' | 'ajax_get' | 'ajax_post'
  description: string;
  url?: string;
  method?: string;
  body?: Record<string, string>;
  response: { status: number; message: string; flag?: string };
}

interface SimResult {
  success: boolean;
  attackType: string;
  events: string[];       // cookie_stolen | friend_added | profile_modified | worm_propagated
  requests: SimRequest[];
  stateChanges: string[];
  session?: object;
}

function analysePayload(payload: string): {
  hasCookieDisplay: boolean;
  hasCookieExfil: boolean;
  hasFriendAdd: boolean;
  hasProfileEdit: boolean;
  hasWorm: boolean;
} {
  const p = payload.toLowerCase();
  return {
    hasCookieDisplay: p.includes('alert') && p.includes('document.cookie'),
    hasCookieExfil: (p.includes('img') || p.includes('image')) &&
      p.includes('document.cookie') &&
      (p.includes('src=') || p.includes('src=')),
    hasFriendAdd:
      p.includes('action/friends/add') ||
      (p.includes('friends') && p.includes('add') && p.includes('xmlhttprequest')),
    hasProfileEdit:
      p.includes('action/profile/edit') ||
      (p.includes('profile') && p.includes('edit') && p.includes('xmlhttprequest')),
    hasWorm:
      (p.includes('id="worm"') || p.includes("id='worm'") || p.includes('id=\\"worm\\"')) ||
      (p.includes('getelementbyid') && p.includes('innerhtml') && p.includes('profile/edit')),
  };
}

// POST /simulate — run a payload as "victim Alice" visiting Samy's profile
router.post('/simulate', (req: Request, res: Response) => {
  try {
    const { labToken, payload, viewer = 'alice', profileOwner = 'samy' } = req.body;

    if (!labToken || !payload) {
      return res.status(400).json({ error: 'Missing labToken or payload' });
    }

    const lab = labSessions.get(labToken);
    if (!lab) {
      return res.status(404).json({ error: 'Lab session not found' });
    }

    const analysis = analysePayload(payload);
    const requests: SimRequest[] = [];
    const stateChanges: string[] = [];
    const events: string[] = [];
    let success = false;
    let attackType = 'Script Injection';

    // ── Step 1: Save payload to Samy's profile (simulates "Samy saved his profile")
    const samyProfile = lab.elggState.profiles[profileOwner];
    if (samyProfile) {
      samyProfile.description = payload;
      stateChanges.push(`${profileOwner}'s About Me field set to the injected payload.`);
    }

    // ── Step 2: Simulate Alice (viewer) visiting the infected profile ──────

    // 2a — Cookie display (alert only — visible to victim, not attacker)
    if (analysis.hasCookieDisplay && !analysis.hasCookieExfil) {
      attackType = 'Stored XSS – Cookie Display';
      requests.push({
        type: 'script_exec',
        description: 'Browser executes inline script; alert() fires in victim\'s browser.',
        response: {
          status: 200,
          message: `alert(document.cookie) executed. Victim sees cookie in popup: elgg_session=SIMULATED_TOKEN_${viewer.toUpperCase()}. Attacker cannot see this.`,
        },
      });
      events.push('cookie_displayed');
      success = true;
    }

    // 2b — Cookie exfiltration via <img> tag
    if (analysis.hasCookieExfil) {
      attackType = 'Stored XSS – Cookie Exfiltration';
      const fakeToken = `abc123xyz_${viewer.toUpperCase()}_${Date.now().toString(36)}`;
      const imgUrl = `http://10.9.0.1:5555?c=elgg_session%3D${fakeToken}`;
      requests.push({
        type: 'img_request',
        description: `Browser fires HTTP GET for the <img> src to attacker's netcat listener.`,
        url: imgUrl,
        method: 'GET',
        response: {
          status: 200,
          message: `Attacker's nc -lknv 5555 captures: GET /?c=elgg_session%3D${fakeToken} HTTP/1.1`,
        },
      });
      lab.elggState.cookiesStolen.push({
        time: Date.now(),
        from: viewer,
        value: `elgg_session=${fakeToken}`,
      });
      stateChanges.push(`${viewer}'s session cookie exfiltrated to attacker listener.`);
      events.push('cookie_stolen');
      success = true;
    }

    // 2c — Friend-add AJAX GET
    if (analysis.hasFriendAdd) {
      attackType = analysis.hasWorm
        ? 'Self-Propagating XSS Worm'
        : analysis.hasProfileEdit
        ? 'Stored XSS – Profile Modification'
        : 'Stored XSS – Friend Add';

      const viewerProfile = lab.elggState.profiles[viewer];
      const ownerDef = { samy: 59, alice: 56, boby: 58, charlie: 57 } as Record<string, number>;
      const ownerGuid = ownerDef[profileOwner] || 59;

      requests.push({
        type: 'ajax_get',
        description: `Browser silently sends AJAX GET to add ${profileOwner} as friend.`,
        url: `http://www.seed-server.com/action/friends/add?friend=${ownerGuid}&__elgg_ts=LIVE_TOKEN&__elgg_token=LIVE_TOKEN`,
        method: 'GET',
        response: { status: 200, message: `Friend add request succeeded. ${profileOwner} added to ${viewer}'s friend list.` },
      });

      if (viewerProfile && !viewerProfile.friends.includes(profileOwner)) {
        viewerProfile.friends.push(profileOwner);
        stateChanges.push(`${viewer}'s friends list now includes ${profileOwner}.`);
        events.push('friend_added');
        success = true;

        lab.elggState.activityLog.unshift({
          time: Date.now(),
          user: viewer,
          action: `XSS forced ${viewer} to add ${profileOwner} as a friend.`,
        });
      }
    }

    // 2d — Profile edit AJAX POST
    if (analysis.hasProfileEdit) {
      const viewerProfile = lab.elggState.profiles[viewer];

      requests.push({
        type: 'ajax_post',
        description: `Browser silently sends authenticated POST to overwrite ${viewer}'s profile description.`,
        url: 'http://www.seed-server.com/action/profile/edit',
        method: 'POST',
        body: {
          description: 'Samy is my hero!',
          'accesslevel[description]': '2',
          name: viewerProfile?.displayName || viewer,
          guid: String(({ samy: 59, alice: 56, boby: 58, charlie: 57 } as Record<string, number>)[viewer] || 0),
        },
        response: { status: 200, message: `Profile edit succeeded. ${viewer}'s About Me overwritten.` },
      });

      if (viewerProfile && viewer !== profileOwner) {
        viewerProfile.description = 'Samy is my hero!';
        viewerProfile.briefDescription = 'samy is my hero';
        stateChanges.push(`${viewer}'s About Me changed to "Samy is my hero!"`);
        if (!events.includes('profile_modified')) events.push('profile_modified');
        success = true;

        lab.elggState.activityLog.unshift({
          time: Date.now(),
          user: viewer,
          action: `XSS from ${profileOwner}'s profile overwrote ${viewer}'s description.`,
        });
      }
    }

    // 2e — Worm self-propagation: copy payload to viewer's profile
    if (analysis.hasWorm && viewer !== profileOwner) {
      const viewerProfile = lab.elggState.profiles[viewer];
      if (viewerProfile) {
        viewerProfile.description = payload; // worm copies itself
        stateChanges.push(`Worm self-replicated to ${viewer}'s profile. ${viewer} is now patient zero for the next generation.`);
        if (!events.includes('worm_propagated')) events.push('worm_propagated');
        success = true;

        lab.elggState.activityLog.unshift({
          time: Date.now(),
          user: viewer,
          action: `Self-propagating XSS worm copied to ${viewer}'s profile.`,
        });
      }
    }

    // If nothing matched
    if (requests.length === 0) {
      return res.json({
        success: false,
        attackType: 'Unknown',
        events: [],
        requests: [],
        stateChanges: [],
        error: 'No recognizable XSS attack patterns detected in the payload.',
      } as SimResult & { error: string });
    }

    res.json({
      success,
      attackType,
      events,
      requests,
      stateChanges,
      session: lab,
    } as SimResult);
  } catch (err) {
    console.error('Workshop simulate error:', err);
    res.status(500).json({ error: 'Internal server error during simulation' });
  }
});

// POST /reset-elgg — reset all Elgg profiles / logs for a fresh run
router.post('/reset-elgg', (req: Request, res: Response) => {
  const { labToken } = req.body;
  if (!labToken) return res.status(400).json({ error: 'Missing labToken' });

  const lab = labSessions.get(labToken);
  if (!lab) return res.status(404).json({ error: 'Lab session not found' });

  // Reset profiles
  lab.elggState.profiles = {
    samy:    { username: 'samy',    displayName: 'Samy',    description: '', briefDescription: '', friends: [] },
    alice:   { username: 'alice',   displayName: 'Alice',   description: "Hi, I'm Alice!", briefDescription: 'Security researcher', friends: [] },
    boby:    { username: 'boby',    displayName: 'Boby',    description: 'Hello from Boby.', briefDescription: 'Developer', friends: [] },
    charlie: { username: 'charlie', displayName: 'Charlie', description: 'Charlie here.', briefDescription: 'Student', friends: [] },
  };
  lab.elggState.activityLog = [{ time: Date.now(), user: 'system', action: 'Elgg state reset by student.' }];
  lab.elggState.cookiesStolen = [];

  res.json({ success: true, message: 'Elgg state reset to defaults.' });
});

export default router;
