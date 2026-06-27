// Shared dietary restriction mapping — single source of truth
// Used by: OrderList.jsx, OrderOnline.jsx

const DIETARY_RESTRICTIONS = {
  'vegan': ['milk', 'butter', 'cheese', 'egg', 'eggs', 'honey', 'cream', 'gelatin', 'whey', 'ghee', 'lard', 'buttermilk', 'beef', 'chicken', 'pork', 'mutton', 'fish', 'albumen', 'yolk'],
  'vegetarian': ['gelatin', 'lard', 'beef', 'chicken', 'pork', 'mutton', 'fish'],
  'jain': ['onion', 'garlic', 'potato', 'potatoes', 'carrot', 'carrots', 'radish', 'beetroot', 'root vegetable', 'sweet potato', 'ginger', 'gelatin', 'lard', 'beef', 'chicken', 'pork', 'mutton', 'fish'],
  'gluten-free': ['wheat', 'barley', 'rye', 'flour', 'semolina', 'spelt', 'gluten', 'graham', 'farina'],
  'dairy-free': ['milk', 'butter', 'cheese', 'whey', 'casein', 'cream', 'lactose', 'yogurt', 'ghee', 'buttermilk'],
  'sugar-free': ['sugar', 'honey', 'maple syrup', 'cane sugar', 'brown sugar', 'molasses', 'agave nectar'],
  'keto': ['flour', 'sugar', 'wheat', 'rice', 'potato', 'potatoes', 'honey', 'maple syrup', 'corn', 'milk', 'starch'],
  'halal': ['pork', 'gelatin', 'alcohol', 'lard', 'beer', 'wine', 'rum', 'brandy']
};

export default DIETARY_RESTRICTIONS;
