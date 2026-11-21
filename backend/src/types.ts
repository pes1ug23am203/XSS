// src/types.ts

export interface TaskState {
  completed: boolean;
  started: boolean;
  answersCorrect: string[];
  flagEarned: boolean;
}

export interface UserProfile {
  username: string;
  displayName: string;
  description: string;       // "About Me" — this gets overwritten by XSS attacks
  briefDescription: string;  // visible in short profile view
  friends: string[];         // list of usernames in friend list
}

export interface ElggState {
  // Per-user simulated Elgg profile state
  profiles: Record<string, UserProfile>;
  activityLog: Array<{ time: number; user: string; action: string }>;
  cookiesStolen: Array<{ time: number; from: string; value: string }>;
}

export interface LabSession {
  token: string;
  studentName: string;
  score: number;
  hintsUsed: Record<string, number>; // taskId -> number of hints used
  startedAt: number;
  expiresAt: number;
  currentTask: string;
  tasks: Record<string, TaskState>;
  elggState: ElggState;
  // Session ID for the simulated logged-in Elgg user (tracks who is "currently logged in")
  elggSessionUser: string; // username of currently logged-in elgg user
}
