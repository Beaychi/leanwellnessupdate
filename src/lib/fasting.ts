// Intermittent Fasting utilities

export interface FastingProtocol {
  id: string;
  name: string;
  fastingHours: number;
  eatingHours: number;
  description: string;
  icon: string;
}

export const FASTING_PROTOCOLS: FastingProtocol[] = [
  {
    id: '16-8',
    name: '16:8',
    fastingHours: 16,
    eatingHours: 8,
    description: 'Most popular beginner-friendly protocol',
    icon: 'sunrise',
  },
  {
    id: '18-6',
    name: '18:6',
    fastingHours: 18,
    eatingHours: 6,
    description: 'Intermediate level, enhanced fat burning',
    icon: 'flame',
  },
  {
    id: '20-4',
    name: '20:4',
    fastingHours: 20,
    eatingHours: 4,
    description: 'Warrior Diet - One meal a day approach',
    icon: 'sword',
  },
  {
    id: '23-1',
    name: 'OMAD',
    fastingHours: 23,
    eatingHours: 1,
    description: 'One Meal A Day - Advanced fasters only',
    icon: 'target',
  },
  {
    id: 'custom',
    name: 'Custom',
    fastingHours: 0,
    eatingHours: 0,
    description: 'Set your own fasting window',
    icon: 'settings',
  },
];

export interface FastingSession {
  id: string;
  protocolId: string;
  startTime: string;
  endTime: string;
  targetDurationHours: number;
  completed: boolean;
  completedAt?: string;
  notes?: string;
}

export interface FastingState {
  isActive: boolean;
  currentSession: FastingSession | null;
  completedSessions: FastingSession[];
  totalFastingHours: number;
  longestFast: number;
  currentStreak: number;
}

const FASTING_STORAGE_KEY = 'leantrack_fasting';

export const getFastingState = (): FastingState => {
  try {
    const data = localStorage.getItem(FASTING_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading fasting state:', error);
  }
  return {
    isActive: false,
    currentSession: null,
    completedSessions: [],
    totalFastingHours: 0,
    longestFast: 0,
    currentStreak: 0,
  };
};

export const saveFastingState = (state: FastingState) => {
  try {
    localStorage.setItem(FASTING_STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent('fastingUpdated'));
  } catch (error) {
    console.error('Error saving fasting state:', error);
  }
};

export const startFastingSession = (protocolId: string, durationHours: number): FastingSession => {
  const state = getFastingState();
  const now = new Date();
  const endTime = new Date(now.getTime() + durationHours * 60 * 60 * 1000);

  const session: FastingSession = {
    id: `fast_${Date.now()}`,
    protocolId,
    startTime: now.toISOString(),
    endTime: endTime.toISOString(),
    targetDurationHours: durationHours,
    completed: false,
  };

  state.isActive = true;
  state.currentSession = session;
  saveFastingState(state);

  return session;
};

export const endFastingSession = (completed: boolean = true, notes?: string) => {
  const state = getFastingState();
  
  if (state.currentSession) {
    const session = { ...state.currentSession };
    const startTime = new Date(session.startTime);
    const endTime = new Date();
    const actualHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    
    session.completed = completed && actualHours >= session.targetDurationHours * 0.9; // 90% counts as complete
    session.completedAt = endTime.toISOString();
    session.notes = notes;

    state.completedSessions.push(session);
    state.totalFastingHours += actualHours;
    
    if (actualHours > state.longestFast) {
      state.longestFast = actualHours;
    }

    if (session.completed) {
      state.currentStreak += 1;
    } else {
      state.currentStreak = 0;
    }
  }

  state.isActive = false;
  state.currentSession = null;
  saveFastingState(state);
};

export const getFastingProgress = (): { elapsed: number; remaining: number; percentage: number } | null => {
  const state = getFastingState();
  
  if (!state.currentSession) return null;

  const now = new Date();
  const startTime = new Date(state.currentSession.startTime);
  const endTime = new Date(state.currentSession.endTime);
  
  const totalDuration = endTime.getTime() - startTime.getTime();
  const elapsed = now.getTime() - startTime.getTime();
  const remaining = Math.max(0, endTime.getTime() - now.getTime());
  const percentage = Math.min(100, (elapsed / totalDuration) * 100);

  return { elapsed, remaining, percentage };
};

export const formatDuration = (ms: number): { hours: number; minutes: number; seconds: number } => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { hours, minutes, seconds };
};
