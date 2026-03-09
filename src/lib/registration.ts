// Registration data types and storage

export interface UserRegistration {
  firstName: string;
  lastName: string;
  country: string;
  allergies: string[];
  customAllergies: string[];
  age: string;
  gender: string;
  height: string;
  heightInches: string;
  heightUnit: 'cm' | 'ft';
  currentWeight: string;
  goalWeight: string;
  weightUnit: 'kg' | 'lbs';
  email: string;
  weeklyReports: boolean;
  monthlyReports: boolean;
  schedule: {
    wakeUpTime: string;
    breakfastTime: string;
    workStartTime: string;
    lunchTime: string;
    workEndTime: string;
    dinnerTime: string;
    bedTime: string;
    worksOutside: boolean;
  };
  registrationCompleted: boolean;
}

const REGISTRATION_KEY = 'leantrack_registration';

export const getRegistration = (): UserRegistration | null => {
  try {
    const data = localStorage.getItem(REGISTRATION_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const saveRegistration = (data: UserRegistration) => {
  localStorage.setItem(REGISTRATION_KEY, JSON.stringify(data));
};

export const getDefaultRegistration = (): UserRegistration => ({
  firstName: '',
  lastName: '',
  country: '',
  allergies: [],
  customAllergies: [],
  age: '',
  gender: '',
  height: '',
  heightInches: '',
  heightUnit: 'cm',
  currentWeight: '',
  goalWeight: '',
  weightUnit: 'kg',
  email: '',
  weeklyReports: true,
  monthlyReports: true,
  schedule: {
    wakeUpTime: '06:00',
    breakfastTime: '07:30',
    workStartTime: '09:00',
    lunchTime: '13:00',
    workEndTime: '17:00',
    dinnerTime: '19:00',
    bedTime: '22:00',
    worksOutside: true,
  },
  registrationCompleted: false,
});

export const COMMON_ALLERGIES = [
  { id: 'fish', label: 'Fish & Seafood', icon: 'Fish', keywords: ['fish', 'seafood', 'shrimp', 'crab', 'lobster', 'tuna', 'salmon', 'sardine', 'mackerel', 'catfish', 'tilapia', 'prawns'] },
  { id: 'dairy', label: 'Dairy & Milk', icon: 'Milk', keywords: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'dairy'] },
  { id: 'eggs', label: 'Eggs', icon: 'Egg', keywords: ['egg', 'eggs'] },
  { id: 'nuts', label: 'Nuts & Peanuts', icon: 'Nut', keywords: ['peanut', 'almond', 'cashew', 'walnut', 'pistachio', 'nut', 'groundnut'] },
  { id: 'gluten', label: 'Gluten & Wheat', icon: 'Wheat', keywords: ['wheat', 'bread', 'pasta', 'spaghetti', 'flour', 'gluten', 'semo', 'semolina'] },
  { id: 'soy', label: 'Soy', icon: 'Bean', keywords: ['soy', 'soya', 'tofu', 'soybean'] },
  { id: 'shellfish', label: 'Shellfish', icon: 'Shell', keywords: ['shrimp', 'crab', 'lobster', 'oyster', 'mussel', 'clam', 'prawns'] },
  { id: 'red-meat', label: 'Red Meat', icon: 'Beef', keywords: ['beef', 'pork', 'lamb', 'goat', 'venison', 'red meat'] },
  { id: 'poultry', label: 'Poultry', icon: 'Bird', keywords: ['chicken', 'turkey', 'duck', 'poultry'] },
  { id: 'spicy', label: 'Spicy Foods', icon: 'Flame', keywords: ['pepper', 'chili', 'spicy', 'hot sauce'] },
  { id: 'plantain', label: 'Plantain & Banana', icon: 'Banana', keywords: ['plantain', 'banana'] },
  { id: 'yam', label: 'Yam & Tubers', icon: 'Carrot', keywords: ['yam', 'cassava', 'potato', 'sweet potato'] },
];

export const COUNTRIES_BY_REGION: Record<string, string[]> = {
  'West Africa': ['Nigeria', 'Ghana', 'Senegal', 'Cameroon', 'Ivory Coast', 'Mali', 'Burkina Faso', 'Guinea', 'Benin', 'Togo', 'Sierra Leone', 'Liberia', 'Niger', 'Gambia'],
  'East Africa': ['Kenya', 'Tanzania', 'Ethiopia', 'Uganda', 'Rwanda', 'Somalia', 'Eritrea', 'Djibouti', 'Burundi'],
  'Southern Africa': ['South Africa', 'Zimbabwe', 'Mozambique', 'Zambia', 'Botswana', 'Namibia', 'Malawi', 'Lesotho', 'Eswatini'],
  'North Africa': ['Egypt', 'Morocco', 'Algeria', 'Tunisia', 'Libya', 'Sudan'],
  'Asia': ['India', 'China', 'Japan', 'South Korea', 'Thailand', 'Vietnam', 'Philippines', 'Indonesia', 'Malaysia', 'Pakistan', 'Bangladesh', 'Sri Lanka', 'Nepal', 'Myanmar'],
  'Middle East': ['Turkey', 'Iran', 'Iraq', 'Saudi Arabia', 'UAE', 'Lebanon', 'Jordan', 'Israel', 'Syria', 'Yemen', 'Oman', 'Qatar', 'Bahrain', 'Kuwait'],
  'Europe': ['United Kingdom', 'France', 'Germany', 'Italy', 'Spain', 'Netherlands', 'Belgium', 'Portugal', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Ireland', 'Switzerland', 'Austria', 'Poland', 'Greece', 'Czech Republic', 'Romania', 'Hungary'],
  'Americas': ['United States', 'Canada', 'Mexico', 'Brazil', 'Argentina', 'Colombia', 'Peru', 'Chile', 'Venezuela', 'Ecuador', 'Cuba', 'Jamaica', 'Trinidad and Tobago', 'Haiti', 'Dominican Republic', 'Puerto Rico'],
  'Oceania': ['Australia', 'New Zealand', 'Fiji', 'Papua New Guinea'],
};

export const getAllCountries = (): string[] => {
  return Object.values(COUNTRIES_BY_REGION).flat().sort();
};
