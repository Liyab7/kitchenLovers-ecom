import {
  GiCookingPot, GiKnifeFork, GiSaucepan, GiCupcake, GiChickenOven,
  GiBlender, GiCoffeePot, GiFruitBowl, GiCannedFish,
  GiSpoon, GiKitchenScale, GiCleaver, GiCakeSlice, GiCookingGlove,
  GiHotMeal, GiCoffeeMug, GiTrashCan, GiTowel, GiHomeGarage, GiForkKnifeSpoon,
  GiFireBowl, GiFactory, GiWoodenChair, GiBowlOfRice,
} from 'react-icons/gi';
import { MdMicrowave, MdLocalDining } from 'react-icons/md';
import { FiGrid } from 'react-icons/fi';

// Ordered list — first keyword match wins. Specific words go before generic ones
// (e.g. "frying pan" should hit pans, not pots; "spice rack" should hit storage).
const RULES = [
  // Cookware
  { match: /\b(pot|pots|saucepan|stew|cauldron)\b/, Icon: GiCookingPot },
  { match: /\b(pan|pans|skillet|wok|griddle|grill)\b/, Icon: GiSaucepan },
  { match: /\b(pressure\s*cooker|rice\s*cooker|slow\s*cooker)\b/, Icon: GiHotMeal },
  { match: /\bcookware\b/, Icon: GiCookingPot },
  { match: /\bcast\s*iron\b/, Icon: GiFireBowl },

  // Bakeware
  { match: /\b(cake|cupcake|muffin|baking|bakeware|pastry|dough)\b/, Icon: GiCupcake },
  { match: /\b(oven|chicken)\b/, Icon: GiChickenOven },
  { match: /\boven\s*dish/, Icon: GiCakeSlice },

  // Appliances
  { match: /\b(blender|juicer|mixer|food\s*processor|smoothie)\b/, Icon: GiBlender },
  { match: /\b(microwave|toaster|sandwich\s*maker|air\s*fryer|deep\s*fryer)\b/, Icon: MdMicrowave },
  { match: /\b(kettle|coffee|tea|espresso)\b/, Icon: GiCoffeePot },
  { match: /\bappliances?\b/, Icon: MdMicrowave },

  // Utensils / cutlery / knives
  { match: /\b(knife|knives|cleaver)\b/, Icon: GiCleaver },
  { match: /\b(spoon|spoons|ladle)\b/, Icon: GiSpoon },
  { match: /\b(fork|forks)\b/, Icon: GiForkKnifeSpoon },
  { match: /\b(cutlery|silverware|flatware)\b/, Icon: GiKnifeFork },
  { match: /\b(utensil|utensils|spatula|whisk|tong|tongs|peeler|scissor)\b/, Icon: GiCookingGlove },
  { match: /\b(scale|measuring)\b/, Icon: GiKitchenScale },
  { match: /\b(chopping\s*board|cutting\s*board)\b/, Icon: GiCleaver },
  { match: /\btools?\b/, Icon: GiCookingGlove },

  // Dinnerware & serving
  { match: /\b(plate|plates|dish|dishes)\b/, Icon: MdLocalDining },
  { match: /\b(bowl|bowls|serving)\b/, Icon: GiFruitBowl },
  { match: /\b(cup|cups|mug|mugs)\b/, Icon: GiCoffeeMug },
  { match: /\b(glass|glassware)\b/, Icon: GiBowlOfRice },
  { match: /\b(dinnerware|tableware|crockery)\b/, Icon: MdLocalDining },

  // Storage & organization
  { match: /\b(spice|herb|jar|jars)\b/, Icon: GiCannedFish },
  { match: /\b(container|lunch\s*box|food\s*storage|fridge\s*organizer|basket)\b/, Icon: GiCannedFish },
  { match: /\b(rack|shelf|shelves|dish\s*rack)\b/, Icon: GiTrashCan },
  { match: /\b(storage|organization|organizer)\b/, Icon: GiCannedFish },

  // Home & dining
  { match: /\b(towel|napkin|curtain|linen|mat)\b/, Icon: GiTowel },
  { match: /\b(table|chair|dining|furniture)\b/, Icon: GiWoodenChair },
  { match: /\b(home|decor|decorative)\b/, Icon: GiHomeGarage },

  // Commercial
  { match: /\b(commercial|industrial|catering)\b/, Icon: GiFactory },
];

export function getCategoryIcon(name) {
  const text = String(name || '').toLowerCase();
  for (const { match, Icon } of RULES) {
    if (match.test(text)) return Icon;
  }
  return FiGrid;
}
