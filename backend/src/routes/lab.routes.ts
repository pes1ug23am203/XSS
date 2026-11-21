// src/routes/lab.routes.ts
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { tasks } from '../data/tasks';
import { LabSession, TaskState, ElggState } from '../types';

export const labSessions = new Map<string, LabSession>();

// Cleanup expired sessions every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of labSessions.entries()) {
    if (session.expiresAt < now) {
      labSessions.delete(token);
    }
  }
}, 10 * 60 * 1000);

// ── Helpers ──────────────────────────────────────────────────────────────────

function checkTaskCompletion(session: LabSession, taskId: string): boolean {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return false;
  const tState = session.tasks[taskId];
  if (!tState) return false;
  const allQuestionsAnswered = task.questions.every(q =>
    tState.answersCorrect.includes(q.id)
  );
  const flagRequirementMet = !task.hasFlag || tState.flagEarned;
  return allQuestionsAnswered && flagRequirementMet;
}

function stripAnswers(taskList: typeof tasks) {
  return taskList.map(task => ({
    ...task,
    questions: task.questions.map(({ answer, ...rest }) => rest),
  }));
}

function makeInitialElggState(): ElggState {
  return {
    profiles: {
      samy: {
        username: 'samy',
        displayName: 'Samy',
        description: '',         // Attacker puts XSS payloads here
        briefDescription: '',
        friends: [],
      },
      alice: {
        username: 'alice',
        displayName: 'Alice',
        description: 'Hi, I\'m Alice!',
        briefDescription: 'Security researcher',
        friends: [],
      },
      boby: {
        username: 'boby',
        displayName: 'Boby',
        description: 'Hello from Boby.',
        briefDescription: 'Developer',
        friends: [],
      },
      charlie: {
        username: 'charlie',
        displayName: 'Charlie',
        description: 'Charlie here.',
        briefDescription: 'Student',
        friends: [],
      },
    },
    activityLog: [
      { time: Date.now(), user: 'system', action: 'Lab environment initialized.' },
    ],
    cookiesStolen: [],
  };
}

// ── Router ────────────────────────────────────────────────────────────────────

const router = Router();

// POST /start
router.post('/start', (req: Request, res: Response) => {
  try {
    const { studentName } = req.body;
    const token = uuidv4();

    const initialTasksState: Record<string, TaskState> = {};
    for (const t of tasks) {
      initialTasksState[t.id] = {
        completed: false,
        started: true,
        answersCorrect: [],
        flagEarned: false,
      };
    }

    const session: LabSession = {
      token,
      studentName: studentName || 'Student',
      score: 0,
      hintsUsed: {},
      startedAt: Date.now(),
      expiresAt: Date.now() + 2 * 60 * 60 * 1000, // 2-hour TTL
      currentTask: 'task1',
      tasks: initialTasksState,
      elggState: makeInitialElggState(),
      elggSessionUser: 'alice', // default logged-in viewer for Elgg portal
    };

    labSessions.set(token, session);

    res.json({
      token,
      session,
      tasks: stripAnswers(tasks),
    });
  } catch (error) {
    console.error('Error starting lab session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /session/:token
router.get('/session/:token', (req: Request, res: Response) => {
  const { token } = req.params;
  const session = labSessions.get(token);
  if (!session) {
    return res.status(404).json({ error: 'Session not found or expired' });
  }
  // Slide expiration window on active use
  session.expiresAt = Date.now() + 2 * 60 * 60 * 1000;
  res.json({ session, tasks: stripAnswers(tasks) });
});

// POST /answer
router.post('/answer', (req: Request, res: Response) => {
  const { token, taskId, questionId, answer } = req.body;
  const session = labSessions.get(token);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const task = tasks.find(t => t.id === taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const question = task.questions.find(q => q.id === questionId);
  if (!question) return res.status(404).json({ error: 'Question not found' });

  const tState = session.tasks[taskId];
  if (!tState) return res.status(500).json({ error: 'Task state missing' });

  // Already answered correctly — idempotent
  if (tState.answersCorrect.includes(questionId)) {
    return res.json({ correct: true, message: 'Already answered correctly', xpAwarded: 0, session });
  }

  const cleanInput = String(answer).trim().toLowerCase();
  const cleanAnswer = question.answer.trim().toLowerCase();

  if (cleanInput === cleanAnswer) {
    tState.answersCorrect.push(questionId);
    session.score += question.xp;

    const wasCompleted = tState.completed;
    tState.completed = checkTaskCompletion(session, taskId);

    res.json({
      correct: true,
      message: tState.completed && !wasCompleted ? 'Correct! Task completed!' : 'Correct!',
      xpAwarded: question.xp,
      session,
    });
  } else {
    res.json({
      correct: false,
      message: 'Incorrect answer. Try again.',
      xpAwarded: 0,
    });
  }
});

// POST /complete-task  — for Setup/Defense tasks with no questions
router.post('/complete-task', (req: Request, res: Response) => {
  const { token, taskId } = req.body;
  const session = labSessions.get(token);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const task = tasks.find(t => t.id === taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const tState = session.tasks[taskId];
  if (tState.completed) {
    return res.json({ completed: true, message: 'Task already completed', xpAwarded: 0, session });
  }

  const isSetupOrDefense = task.category === 'Setup' || task.category === 'Defense';
  if (isSetupOrDefense && task.questions.length === 0) {
    tState.completed = true;
    session.score += task.xp;
    res.json({ completed: true, message: 'Task completed!', xpAwarded: task.xp, session });
  } else {
    res.status(400).json({ error: 'This task must be completed by answering its questions.' });
  }
});

// POST /hint
router.post('/hint', (req: Request, res: Response) => {
  const { token, taskId } = req.body;
  const session = labSessions.get(token);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const task = tasks.find(t => t.id === taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const tState = session.tasks[taskId];
  if (!tState) return res.status(500).json({ error: 'Task state missing' });

  const usedForTask = session.hintsUsed[taskId] || 0;
  if (usedForTask >= task.hints.length) {
    return res.status(400).json({ error: 'No more hints available for this task' });
  }

  const hint = task.hints[usedForTask];
  session.hintsUsed[taskId] = usedForTask + 1;
  session.score = Math.max(0, session.score - 10);

  res.json({ hint, hintIndex: usedForTask, xpDeducted: 10, session });
});

// POST /set-task
router.post('/set-task', (req: Request, res: Response) => {
  const { token, taskId } = req.body;
  const session = labSessions.get(token);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  if (session.tasks[taskId]) {
    session.tasks[taskId].started = true;
  }
  session.currentTask = taskId;
  res.json({ currentTask: taskId, session });
});

// DELETE /session/:token
router.delete('/session/:token', (req: Request, res: Response) => {
  const { token } = req.params;
  labSessions.delete(token);
  res.json({ success: true });
});

export default router;
