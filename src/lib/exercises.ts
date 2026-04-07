// Exercise Library Data

export interface Exercise {
  id: string;
  name: string;
  category: 'cardio' | 'strength' | 'office';
  description: string;
  duration: string; // Display duration
  durationMinutes: number; // For timer (in minutes)
  reps?: string;
  imageUrl: string;
  benefits: string[];
  safetyNotes: string;
}

export const exercises: Exercise[] = [
  {
    id: 'walking',
    name: 'Walking',
    category: 'cardio',
    description: 'Brisk walking for fat burning without bulk. Start with 20-30 minutes daily.',
    duration: '20-30 min',
    durationMinutes: 25,
    imageUrl: 'https://images.unsplash.com/photo-1487956382158-bb926046304a?q=80&w=871&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    benefits: ['Burns calories', 'Tones legs', 'Low impact', 'Reduces thigh fat'],
    safetyNotes: 'Wear comfortable shoes. Stay hydrated.',
  },
  {
    id: 'jogging',
    name: 'Jogging',
    category: 'cardio',
    description: 'Light jogging or slow running. Great for overall fat loss.',
    duration: '15-20 min',
    durationMinutes: 17,
    imageUrl: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=400&h=300&fit=crop',
    benefits: ['High calorie burn', 'Cardiovascular health', 'Leg toning'],
    safetyNotes: 'Start slow. Gradually increase pace and duration.',
  },
  {
    id: 'skipping',
    name: 'Skipping Rope',
    category: 'cardio',
    description: 'Jump rope for intense cardio and leg toning. Very effective for fat loss.',
    duration: '10-15 min',
    durationMinutes: 12,
    reps: '3 sets',
    imageUrl: 'https://images.unsplash.com/photo-1434596922112-19c563067271?w=400&h=300&fit=crop',
    benefits: ['Full body workout', 'Coordination', 'Calf toning', 'Fat burning'],
    safetyNotes: 'Land softly. Take breaks between sets.',
  },
  {
    id: 'stairs',
    name: 'Stair Climbing',
    category: 'cardio',
    description: 'Climb stairs for targeted leg workout. Can be done at home or office.',
    duration: '10-15 min',
    durationMinutes: 12,
    imageUrl: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=400&h=300&fit=crop',
    benefits: ['Tones legs', 'Burns calories', 'Strengthens glutes', 'Improves stamina'],
    safetyNotes: 'Use handrail if needed. Go at your own pace.',
  },
  {
    id: 'cycling',
    name: 'Cycling',
    category: 'cardio',
    description: 'Stationary or outdoor cycling. Excellent low-impact cardio.',
    duration: '20-30 min',
    durationMinutes: 25,
    imageUrl: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400&h=300&fit=crop',
    benefits: ['Low impact', 'Leg toning', 'Cardio health', 'Joint-friendly'],
    safetyNotes: 'Adjust seat properly. Maintain good posture.',
  },
  {
    id: 'planks',
    name: 'Planks',
    category: 'strength',
    description: 'Hold plank position for core strength. Essential for overall stability.',
    duration: '30-60 sec',
    durationMinutes: 1,
    reps: '3 sets',
    imageUrl: 'https://images.unsplash.com/photo-1566241142559-40e1dab266c6?w=400&h=300&fit=crop',
    benefits: ['Core strength', 'Posture', 'Stability', 'Full body engagement'],
    safetyNotes: 'Keep back straight. Don\'t hold breath.',
  },
  {
    id: 'bodyweight-squats',
    name: 'Bodyweight Squats',
    category: 'strength',
    description: 'Light squats with body weight only. Focus on high reps, no weights.',
    duration: '1-2 min',
    durationMinutes: 2,
    reps: '20-30 reps x 3 sets',
    imageUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&h=300&fit=crop',
    benefits: ['Leg toning', 'Glute activation', 'Functional strength'],
    safetyNotes: 'Keep knees behind toes. No added weight.',
  },
  {
    id: 'lunges',
    name: 'Walking Lunges',
    category: 'strength',
    description: 'Forward lunges for leg toning. Slow and controlled movements.',
    duration: '2-3 min',
    durationMinutes: 3,
    reps: '15 reps each leg x 2 sets',
    imageUrl: 'https://images.unsplash.com/photo-1434608519344-49d77a699e1d?w=400&h=300&fit=crop',
    benefits: ['Leg definition', 'Balance', 'Glute toning', 'Hip flexibility'],
    safetyNotes: 'Control descent. Keep torso upright.',
  },
  {
    id: 'desk-stretch',
    name: 'Desk Stretches',
    category: 'office',
    description: 'Simple stretches you can do at your desk without drawing attention.',
    duration: '2-3 min',
    durationMinutes: 2,
    imageUrl: 'https://plus.unsplash.com/premium_photo-1710467003655-a8a0e6295dbb?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    benefits: ['Reduces stiffness', 'Improves circulation', 'Boosts focus'],
    safetyNotes: 'Hold each stretch for 15-30 seconds.',
  },
  {
    id: 'chair-sit-stand',
    name: 'Chair Sit-to-Stand',
    category: 'office',
    description: 'Stand up and sit down from your chair throughout the day.',
    duration: '1 min',
    durationMinutes: 1,
    reps: 'Every 45 minutes',
    imageUrl: 'https://www.iowaclinic.com/content/cms/images/articles/workout_while_working_800x533.jpg',
    benefits: ['Breaks sitting time', 'Activates legs', 'Improves circulation'],
    safetyNotes: 'Use chair for support if needed.',
  },
];

export const officeMovementTips = [
  {
    id: 'rule-20-2',
    title: '20-2 Rule',
    description: 'Stand or move for 2 minutes every 20 minutes of sitting',
    icon: 'Clock',
  },
  {
    id: 'micro-stands',
    title: 'Micro-Stands',
    description: 'Stand during phone calls, reading emails, or thinking',
    icon: 'Phone',
  },
  {
    id: 'posture',
    title: 'Better Posture',
    description: 'Sit with back straight, feet flat, shoulders relaxed',
    icon: 'User',
  },
  {
    id: 'under-desk',
    title: 'Under-Desk Movements',
    description: 'Ankle circles, leg lifts, toe taps while working',
    icon: 'Activity',
  },
  {
    id: 'sneaky-moves',
    title: 'Sneaky Movement Hacks',
    description: 'Park farther, take stairs, walk during breaks',
    icon: 'TrendingUp',
  },
  {
    id: 'after-work',
    title: 'After-Work Stretches',
    description: '10-minute full body stretch routine when you get home',
    icon: 'Home',
  },
];

export const exercisesToAvoid = [
  'Heavy squats with weights',
  'Deadlifts with heavy loads',
  'Weighted glute exercises',
  'Hip thrusts with heavy weights',
  'Leg press with maximum weight',
  'Bulgarian split squats with weights',
];
