// 7-Day Nigerian Diet Plan Data (2 Meals per Day)

export interface Meal {
  id: string;
  type: 'meal1' | 'meal2';
  name: string;
  description: string;
  time: string;
  ingredients: string[];
  instructions: string[];
  nutritionalInfo: {
    calories: number;
    protein: string;
    carbs: string;
    fats: string;
  };
}

export interface DayPlan {
  day: number;
  meals: Meal[];
  waterIntake: string;
  notes: string;
}

export const dietPlan: DayPlan[] = [
  {
    day: 1,
    meals: [
      {
        id: 'd1-meal1',
        type: 'meal1',
        name: 'Rice with Chicken & Vegetables',
        description: 'Small plate rice, 1 small chicken, cabbage + carrots',
        time: '12:00',
        ingredients: [
          '1 small plate rice (150g)',
          '1 small chicken piece',
          '1 cup cabbage (shredded)',
          '1 medium carrot (sliced)',
          '1 tbsp vegetable oil',
          'Salt and pepper to taste'
        ],
        instructions: [
          'Cook rice with minimal oil',
          'Grill or boil chicken piece',
          'Steam cabbage and carrots lightly',
          'Serve rice with chicken on top',
          'Add vegetables on the side'
        ],
        nutritionalInfo: {
          calories: 420,
          protein: '28g',
          carbs: '52g',
          fats: '10g'
        }
      },
      {
        id: 'd1-meal2',
        type: 'meal2',
        name: 'Boiled Eggs with Sweet Potato',
        description: '2 boiled eggs, 1–2 sweet potatoes, cucumber',
        time: '18:00',
        ingredients: [
          '2 eggs',
          '1-2 small sweet potatoes',
          '1 cucumber (sliced)'
        ],
        instructions: [
          'Boil eggs for 10 minutes',
          'Boil sweet potatoes until tender',
          'Slice cucumber',
          'Serve all together'
        ],
        nutritionalInfo: {
          calories: 350,
          protein: '16g',
          carbs: '48g',
          fats: '10g'
        }
      }
    ],
    waterIntake: '2-3 liters',
    notes: 'Start strong! Keep oil low and eat slowly.'
  },
  {
    day: 2,
    meals: [
      {
        id: 'd2-meal1',
        type: 'meal1',
        name: 'Beans with Plantain',
        description: 'Small portion beans, 1 small plantain',
        time: '12:00',
        ingredients: [
          '1 cup cooked beans',
          '1 small ripe plantain',
          '1 tsp palm oil',
          'Onions and pepper'
        ],
        instructions: [
          'Cook beans until soft',
          'Boil or fry plantain with minimal oil',
          'Season beans with onions and pepper',
          'Serve together'
        ],
        nutritionalInfo: {
          calories: 380,
          protein: '18g',
          carbs: '62g',
          fats: '6g'
        }
      },
      {
        id: 'd2-meal2',
        type: 'meal2',
        name: 'Spaghetti with Vegetables',
        description: 'Small portion spaghetti, veggie mix',
        time: '18:00',
        ingredients: [
          '100g spaghetti',
          'Mixed vegetables (carrots, green beans, bell pepper)',
          '2 tbsp tomato sauce',
          'Garlic and onions'
        ],
        instructions: [
          'Cook spaghetti according to package',
          'Sauté vegetables with garlic and onions',
          'Mix with tomato sauce',
          'Combine with spaghetti'
        ],
        nutritionalInfo: {
          calories: 320,
          protein: '12g',
          carbs: '58g',
          fats: '4g'
        }
      }
    ],
    waterIntake: '2-3 liters',
    notes: 'Great protein day! Add vegetables to everything.'
  },
  {
    day: 3,
    meals: [
      {
        id: 'd3-meal1',
        type: 'meal1',
        name: 'Jollof Rice with Meat',
        description: 'Small Jollof rice, 1 meat piece',
        time: '12:00',
        ingredients: [
          '1 small plate rice (150g)',
          '1 piece of beef or chicken',
          'Tomato paste (2 tbsp)',
          'Onions, pepper, curry, thyme',
          'Minimal vegetable oil'
        ],
        instructions: [
          'Prepare jollof rice with minimal oil',
          'Grill or boil meat separately',
          'Use plenty of vegetables in the rice',
          'Keep portion small',
          'Serve meat on the side'
        ],
        nutritionalInfo: {
          calories: 440,
          protein: '26g',
          carbs: '56g',
          fats: '12g'
        }
      },
      {
        id: 'd3-meal2',
        type: 'meal2',
        name: 'Eggs with Salad & Sweet Potato',
        description: '2 eggs, tomato + cucumber salad, 1 small sweet potato',
        time: '18:00',
        ingredients: [
          '2 eggs',
          '1 tomato (diced)',
          '1 cucumber (sliced)',
          '1 small sweet potato',
          'Lemon juice for dressing'
        ],
        instructions: [
          'Boil or scramble eggs',
          'Boil sweet potato',
          'Mix tomato and cucumber',
          'Add lemon juice to salad',
          'Serve together'
        ],
        nutritionalInfo: {
          calories: 340,
          protein: '16g',
          carbs: '44g',
          fats: '10g'
        }
      }
    ],
    waterIntake: '2-3 liters',
    notes: 'Midweek energy! Stay consistent.'
  },
  {
    day: 4,
    meals: [
      {
        id: 'd4-meal1',
        type: 'meal1',
        name: 'Semo with Okra Soup',
        description: 'Small semo, okra soup (low oil)',
        time: '12:00',
        ingredients: [
          'Small portion of semo',
          'Fresh okra (chopped)',
          'Fish or meat (small)',
          'Minimal palm oil',
          'Pepper, onions, seasoning'
        ],
        instructions: [
          'Prepare semo (keep portion small)',
          'Cook okra soup with minimal oil',
          'Add fish or meat',
          'Season lightly',
          'Serve soup with semo'
        ],
        nutritionalInfo: {
          calories: 400,
          protein: '22g',
          carbs: '54g',
          fats: '10g'
        }
      },
      {
        id: 'd4-meal2',
        type: 'meal2',
        name: 'Beans with Vegetables & Egg',
        description: 'Beans + vegetables, 1 egg',
        time: '18:00',
        ingredients: [
          '1 cup cooked beans',
          'Mixed vegetables (spinach, carrots)',
          '1 boiled egg',
          'Onions and pepper'
        ],
        instructions: [
          'Cook beans until tender',
          'Steam vegetables',
          'Boil egg',
          'Mix beans with vegetables',
          'Serve with egg'
        ],
        nutritionalInfo: {
          calories: 360,
          protein: '24g',
          carbs: '48g',
          fats: '8g'
        }
      }
    ],
    waterIntake: '2-3 liters',
    notes: 'Great progress! Keep oil low.'
  },
  {
    day: 5,
    meals: [
      {
        id: 'd5-meal1',
        type: 'meal1',
        name: 'Rice with Egg Stew',
        description: 'Rice, egg stew (1–2 eggs)',
        time: '12:00',
        ingredients: [
          '1 small plate rice (150g)',
          '1-2 eggs',
          'Tomato sauce (2 tbsp)',
          'Onions, pepper',
          'Minimal oil'
        ],
        instructions: [
          'Cook rice',
          'Prepare egg stew with tomatoes, onions',
          'Use minimal oil',
          'Pour stew over rice'
        ],
        nutritionalInfo: {
          calories: 410,
          protein: '18g',
          carbs: '54g',
          fats: '12g'
        }
      },
      {
        id: 'd5-meal2',
        type: 'meal2',
        name: 'Boiled Yam with Veggie Sauce',
        description: 'Small boiled yam, veggie sauce',
        time: '18:00',
        ingredients: [
          '1 small yam portion',
          'Mixed vegetables (spinach, tomatoes)',
          'Onions and pepper',
          'Minimal palm oil'
        ],
        instructions: [
          'Boil yam until soft',
          'Prepare veggie sauce with minimal oil',
          'Add plenty of vegetables',
          'Serve yam with sauce'
        ],
        nutritionalInfo: {
          calories: 330,
          protein: '8g',
          carbs: '62g',
          fats: '6g'
        }
      }
    ],
    waterIntake: '2-3 liters',
    notes: 'Almost there! Stay hydrated.'
  },
  {
    day: 6,
    meals: [
      {
        id: 'd6-meal1',
        type: 'meal1',
        name: 'Beans & Rice Combo',
        description: 'Small beans & rice combo',
        time: '12:00',
        ingredients: [
          '1/2 cup cooked beans',
          '1/2 cup rice',
          'Tomato stew (light)',
          'Onions and pepper'
        ],
        instructions: [
          'Cook beans and rice separately',
          'Mix together',
          'Prepare light tomato stew',
          'Serve stew on the side or mixed in'
        ],
        nutritionalInfo: {
          calories: 390,
          protein: '16g',
          carbs: '64g',
          fats: '6g'
        }
      },
      {
        id: 'd6-meal2',
        type: 'meal2',
        name: 'Sweet Potato with Salad & Egg',
        description: 'Sweet potato, salad, 1 egg',
        time: '18:00',
        ingredients: [
          '1 medium sweet potato',
          'Mixed salad greens',
          '1 tomato',
          '1 cucumber',
          '1 boiled egg'
        ],
        instructions: [
          'Boil sweet potato',
          'Prepare fresh salad',
          'Boil egg',
          'Serve together with light dressing'
        ],
        nutritionalInfo: {
          calories: 320,
          protein: '12g',
          carbs: '52g',
          fats: '6g'
        }
      }
    ],
    waterIntake: '2-3 liters',
    notes: 'Weekend discipline! You\'re doing great.'
  },
  {
    day: 7,
    meals: [
      {
        id: 'd7-meal1',
        type: 'meal1',
        name: 'Okra with Semo',
        description: 'Okra soup, small semo',
        time: '12:00',
        ingredients: [
          'Fresh okra (chopped)',
          'Small semo portion',
          'Fish or lean meat',
          'Minimal palm oil',
          'Pepper and seasoning'
        ],
        instructions: [
          'Prepare semo (small portion)',
          'Cook okra soup with minimal oil',
          'Add protein',
          'Season lightly',
          'Serve together'
        ],
        nutritionalInfo: {
          calories: 400,
          protein: '24g',
          carbs: '52g',
          fats: '10g'
        }
      },
      {
        id: 'd7-meal2',
        type: 'meal2',
        name: 'Rice & Beans with Vegetables',
        description: 'Small rice + beans, vegetables',
        time: '18:00',
        ingredients: [
          '1/2 cup rice',
          '1/2 cup beans',
          'Mixed vegetables (plenty)',
          'Light seasoning'
        ],
        instructions: [
          'Cook rice and beans together or separately',
          'Steam vegetables',
          'Mix everything',
          'Season lightly'
        ],
        nutritionalInfo: {
          calories: 380,
          protein: '18g',
          carbs: '62g',
          fats: '6g'
        }
      }
    ],
    waterIntake: '2-3 liters',
    notes: 'Week complete! Ready to restart the cycle.'
  }
];

export const getDayPlan = (dayNumber: number): DayPlan => {
  return dietPlan.find(d => d.day === dayNumber) || dietPlan[0];
};

export const getTodaysMeals = (dayNumber: number): Meal[] => {
  return getDayPlan(dayNumber).meals;
};
