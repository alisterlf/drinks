const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = path.resolve(__dirname, '..', 'public');
const GROUPS_FILE = path.resolve(__dirname, '..', 'src', 'data', 'ingredient-groups.json');
const RECIPE_FILE = 'drinks.json';
const TRANSLATION_FILES = {
  'pt-BR': 'drinks.pt-BR.json',
};
const IBA_LINK_PREFIX = 'https://iba-world.com/iba-cocktail/';
const REQUIRED_RECIPE_FIELDS = ['slug', 'name', 'photo', 'ingredients', 'method', 'ibaLink'];
const REQUIRED_RECIPE_INGREDIENT_FIELDS = ['key', 'name'];
const REQUIRED_TRANSLATION_FIELDS = ['name', 'ingredients', 'method'];
const RECIPE_FIELDS = new Set([...REQUIRED_RECIPE_FIELDS, 'garnish', 'garnishIngredients', 'methodNote', 'videoLink']);
const RECIPE_INGREDIENT_FIELDS = new Set([
  ...REQUIRED_RECIPE_INGREDIENT_FIELDS,
  'action',
  'amountLabel',
  'maxQuantity',
  'note',
  'optional',
  'quantity',
  'substitutions',
  'unit',
]);
const TRANSLATION_FIELDS = new Set([...REQUIRED_TRANSLATION_FIELDS, 'garnish', 'garnishIngredients', 'methodNote']);
const INGREDIENT_TRANSLATION_FIELDS = new Set(['name', 'note', 'substitutions']);
const SUBSTITUTION_TRANSLATION_FIELDS = new Set(['name']);
const SUBSTITUTION_FIELDS = new Set(['key', 'name']);
const UNITS = new Set([
  'bar spoons',
  'dash',
  'dashes',
  'drops',
  'ml',
  'pcs',
  'splash',
  'tablespoon',
  'tablespoons',
  'teaspoon',
  'teaspoons',
  'tsp',
]);
const ACTIONS = new Set(['fill', 'top']);
const AMOUNT_LABELS = new Set(['few']);

const errors = [];
const recipes = readJson(path.join(DATA_DIR, RECIPE_FILE));
const translationsByLanguage = new Map(
  Object.entries(TRANSLATION_FILES).map(([language, file]) => [language, readJson(path.join(DATA_DIR, file))]),
);

validateRecipes(recipes);
validateIngredientGroups(recipes);
validateRecipeNameConsistency(recipes);

for (const [language, translations] of translationsByLanguage) {
  validateTranslations(language, translations, recipes);
  validateTranslationNameConsistency(language, translations);
}

if (errors.length > 0) {
  console.error(`Data validation failed with ${errors.length} issue${errors.length === 1 ? '' : 's'}:`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
} else {
  const translationCounts = [...translationsByLanguage]
    .map(([language, translations]) => `${language}: ${Object.keys(translations).length}`)
    .join(', ');
  console.log(`Data validation passed (${RECIPE_FILE}: ${recipes.length}; translations: ${translationCounts}).`);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    errors.push(`${path.basename(filePath)} could not be read: ${error.message}`);
    return path.basename(filePath) === RECIPE_FILE ? [] : {};
  }
}

function validateRecipes(value) {
  if (!Array.isArray(value)) {
    errors.push(`${RECIPE_FILE} must contain an array`);
    return;
  }

  const slugs = new Set();

  value.forEach((recipe, index) => {
    const label = `${RECIPE_FILE}[${index}] ${recipe?.name ?? '(unnamed)'}`;

    if (!recipe || typeof recipe !== 'object' || Array.isArray(recipe)) {
      errors.push(`${label} must be an object`);
      return;
    }

    validateKnownFields(label, recipe, RECIPE_FIELDS);

    for (const field of REQUIRED_RECIPE_FIELDS) {
      if (!hasValue(recipe[field])) errors.push(`${label} is missing ${field}`);
    }

    if (hasValue(recipe.slug)) {
      if (slugs.has(recipe.slug)) errors.push(`${RECIPE_FILE} has duplicate slug ${recipe.slug}`);
      slugs.add(recipe.slug);
    }

    if (hasValue(recipe.photo) && !isHttpsUrl(recipe.photo)) {
      errors.push(`${label} photo must be an https URL`);
    }

    if (hasValue(recipe.videoLink) && !isYoutubeWatchUrl(recipe.videoLink)) {
      errors.push(`${label} videoLink must be a YouTube watch URL`);
    }

    if (hasValue(recipe.ibaLink)) {
      if (!recipe.ibaLink.startsWith(IBA_LINK_PREFIX)) {
        errors.push(`${label} ibaLink must start with ${IBA_LINK_PREFIX}`);
      }

      const linkSlug = slugFromLink(recipe.ibaLink);
      if (recipe.slug !== linkSlug) {
        errors.push(`${label} slug must match ibaLink slug ${linkSlug}`);
      }
    }

    if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
      errors.push(`${label} must have at least one ingredient`);
    } else {
      validateRecipeIngredients(`${label}.ingredients`, recipe.ingredients);
    }

    if ('methodNote' in recipe && !hasValue(recipe.methodNote)) {
      errors.push(`${label} methodNote must not be empty`);
    }

    if ('garnishIngredients' in recipe) {
      validateRecipeIngredients(`${label}.garnishIngredients`, recipe.garnishIngredients);
    }
  });
}

function validateRecipeIngredients(label, ingredients) {
  const keys = new Set();

  ingredients.forEach((ingredient, index) => {
    const ingredientLabel = `${label}[${index}] ${ingredient?.name ?? '(unnamed)'}`;

    if (!ingredient || typeof ingredient !== 'object' || Array.isArray(ingredient)) {
      errors.push(`${ingredientLabel} must be an object`);
      return;
    }

    validateKnownFields(ingredientLabel, ingredient, RECIPE_INGREDIENT_FIELDS);

    for (const field of REQUIRED_RECIPE_INGREDIENT_FIELDS) {
      if (!hasValue(ingredient[field])) errors.push(`${ingredientLabel} is missing ${field}`);
    }

    if (hasValue(ingredient.key)) {
      if (keys.has(ingredient.key)) errors.push(`${ingredientLabel} has duplicate ingredient key ${ingredient.key}`);
      keys.add(ingredient.key);
    }

    validateSubstitutions(`${ingredientLabel}.substitutions`, ingredient.substitutions, ingredient.key);
    validateIngredientAmount(ingredientLabel, ingredient);

    if ('optional' in ingredient && typeof ingredient.optional !== 'boolean') {
      errors.push(`${ingredientLabel} optional must be a boolean`);
    }

    if ('note' in ingredient && !hasValue(ingredient.note)) {
      errors.push(`${ingredientLabel} note must not be empty`);
    }
  });
}

function validateSubstitutions(label, substitutions, defaultKey) {
  if (substitutions === undefined) return;

  if (!Array.isArray(substitutions) || substitutions.length === 0) {
    errors.push(`${label} must be a non-empty array`);
    return;
  }

  const keys = new Set([defaultKey]);

  substitutions.forEach((substitution, index) => {
    const substitutionLabel = `${label}[${index}]`;

    if (!substitution || typeof substitution !== 'object' || Array.isArray(substitution)) {
      errors.push(`${substitutionLabel} must be an object`);
      return;
    }

    validateKnownFields(substitutionLabel, substitution, SUBSTITUTION_FIELDS);

    if (!hasValue(substitution.key)) errors.push(`${substitutionLabel} is missing key`);
    if (!hasValue(substitution.name)) errors.push(`${substitutionLabel} is missing name`);

    if (hasValue(substitution.key)) {
      if (keys.has(substitution.key))
        errors.push(`${substitutionLabel} has duplicate substitution key ${substitution.key}`);
      keys.add(substitution.key);
    }
  });
}

function validateIngredientAmount(label, ingredient) {
  const hasAction = 'action' in ingredient;
  const hasAmountLabel = 'amountLabel' in ingredient;
  const hasQuantity = 'quantity' in ingredient;
  const hasMaxQuantity = 'maxQuantity' in ingredient;
  const hasUnit = 'unit' in ingredient;

  if (hasAction) {
    if (!ACTIONS.has(ingredient.action)) errors.push(`${label} action must be one of: ${[...ACTIONS].join(', ')}`);
    if (hasAmountLabel || hasQuantity || hasMaxQuantity || hasUnit) {
      errors.push(`${label} action cannot be combined with amount fields`);
    }
    return;
  }

  if (hasAmountLabel) {
    if (!AMOUNT_LABELS.has(ingredient.amountLabel)) {
      errors.push(`${label} amountLabel must be one of: ${[...AMOUNT_LABELS].join(', ')}`);
    }
    if (!hasUnit) errors.push(`${label} amountLabel requires unit`);
    if (hasQuantity || hasMaxQuantity) errors.push(`${label} amountLabel cannot be combined with quantity`);
  }

  if (hasQuantity) validatePositiveNumber(`${label}.quantity`, ingredient.quantity);
  if (hasMaxQuantity) {
    validatePositiveNumber(`${label}.maxQuantity`, ingredient.maxQuantity);
    if (!hasQuantity) errors.push(`${label} maxQuantity requires quantity`);
    if (typeof ingredient.quantity === 'number' && ingredient.maxQuantity <= ingredient.quantity) {
      errors.push(`${label} maxQuantity must be greater than quantity`);
    }
  }

  if (hasUnit && !UNITS.has(ingredient.unit)) {
    errors.push(`${label} unit must be one of: ${[...UNITS].join(', ')}`);
  }

  if (hasUnit && !hasQuantity && !hasAmountLabel) {
    errors.push(`${label} unit requires quantity or amountLabel`);
  }
}

function validateTranslations(language, translations, recipesToValidate) {
  const file = TRANSLATION_FILES[language];

  if (!translations || typeof translations !== 'object' || Array.isArray(translations)) {
    errors.push(`${file} must contain an object keyed by recipe slug`);
    return;
  }

  const recipeSlugs = new Set(recipesToValidate.map((recipe) => recipe.slug));

  for (const slug of Object.keys(translations)) {
    if (!recipeSlugs.has(slug)) errors.push(`${file} has translation for unknown slug ${slug}`);
  }

  for (const recipe of recipesToValidate) {
    const translation = translations[recipe.slug];
    const label = `${file}.${recipe.slug}`;

    if (!translation) {
      errors.push(`${file} is missing translation for ${recipe.slug}`);
      continue;
    }

    if (typeof translation !== 'object' || Array.isArray(translation)) {
      errors.push(`${label} must be an object`);
      continue;
    }

    validateKnownFields(label, translation, TRANSLATION_FIELDS);

    for (const field of REQUIRED_TRANSLATION_FIELDS) {
      if (!hasValue(translation[field])) errors.push(`${label} is missing ${field}`);
    }

    if ('methodNote' in translation && !hasValue(translation.methodNote)) {
      errors.push(`${label} methodNote must not be empty`);
    }

    validateIngredientTranslations(`${label}.ingredients`, translation.ingredients, recipe.ingredients);
    validateOptionalIngredientTranslations(
      `${label}.garnishIngredients`,
      translation.garnishIngredients,
      recipe.garnishIngredients,
    );
  }
}

function validateOptionalIngredientTranslations(label, translations, recipeIngredients) {
  if (!recipeIngredients?.length) {
    if (translations !== undefined) errors.push(`${label} is only allowed when recipe has garnishIngredients`);
    return;
  }

  validateIngredientTranslations(label, translations, recipeIngredients);
}

function validateIngredientTranslations(label, translations, recipeIngredients) {
  if (!translations || typeof translations !== 'object' || Array.isArray(translations)) {
    errors.push(`${label} must be an object keyed by ingredient key`);
    return;
  }

  const ingredientKeys = new Set(recipeIngredients.map((ingredient) => ingredient.key));

  for (const key of Object.keys(translations)) {
    if (!ingredientKeys.has(key)) errors.push(`${label} has translation for unknown ingredient key ${key}`);
  }

  for (const ingredient of recipeIngredients) {
    const translation = translations[ingredient.key];
    const ingredientLabel = `${label}.${ingredient.key}`;

    if (!translation) {
      errors.push(`${label} is missing translation for ${ingredient.key}`);
      continue;
    }

    if (typeof translation !== 'object' || Array.isArray(translation)) {
      errors.push(`${ingredientLabel} must be an object`);
      continue;
    }

    validateKnownFields(ingredientLabel, translation, INGREDIENT_TRANSLATION_FIELDS);

    if (!hasValue(translation.name)) errors.push(`${ingredientLabel} is missing name`);
    if ('note' in translation && !hasValue(translation.note)) errors.push(`${ingredientLabel} note must not be empty`);
    validateSubstitutionTranslations(
      `${ingredientLabel}.substitutions`,
      translation.substitutions,
      ingredient.substitutions,
    );
  }
}

function validateSubstitutionTranslations(label, translations, substitutions) {
  if (!substitutions?.length) {
    if (translations !== undefined) errors.push(`${label} is only allowed when recipe ingredient has substitutions`);
    return;
  }

  if (!translations || typeof translations !== 'object' || Array.isArray(translations)) {
    errors.push(`${label} must be an object keyed by substitution key`);
    return;
  }

  const substitutionKeys = new Set(substitutions.map((substitution) => substitution.key));

  for (const key of Object.keys(translations)) {
    if (!substitutionKeys.has(key)) errors.push(`${label} has translation for unknown substitution key ${key}`);
  }

  for (const substitution of substitutions) {
    const translation = translations[substitution.key];
    const substitutionLabel = `${label}.${substitution.key}`;

    if (!translation) {
      errors.push(`${label} is missing translation for ${substitution.key}`);
      continue;
    }

    if (typeof translation !== 'object' || Array.isArray(translation)) {
      errors.push(`${substitutionLabel} must be an object`);
      continue;
    }

    validateKnownFields(substitutionLabel, translation, SUBSTITUTION_TRANSLATION_FIELDS);

    if (!hasValue(translation.name)) errors.push(`${substitutionLabel} is missing name`);
  }
}

function collectRecipeIngredientKeys(recipesToScan) {
  const keys = new Set();

  for (const recipe of recipesToScan) {
    for (const ingredient of [...(recipe.ingredients ?? []), ...(recipe.garnishIngredients ?? [])]) {
      if (hasValue(ingredient?.key)) keys.add(ingredient.key);
      for (const substitution of ingredient?.substitutions ?? []) {
        if (hasValue(substitution?.key)) keys.add(substitution.key);
      }
    }
  }

  return keys;
}

function validateIngredientGroups(recipesToValidate) {
  const file = path.basename(GROUPS_FILE);
  let data;

  try {
    data = JSON.parse(fs.readFileSync(GROUPS_FILE, 'utf8'));
  } catch (error) {
    errors.push(`${file} could not be read: ${error.message}`);
    return;
  }

  if (!Array.isArray(data?.groups)) {
    errors.push(`${file} must contain a groups array`);
    return;
  }

  const groupIdByKey = new Map();

  for (const group of data.groups) {
    if (!hasValue(group?.id) || !hasValue(group?.labelKey) || !Array.isArray(group?.keys)) {
      errors.push(`${file} group ${group?.id ?? '(unnamed)'} must have id, labelKey and keys`);
      continue;
    }

    for (const key of group.keys) {
      if (groupIdByKey.has(key)) {
        errors.push(`${file} key ${key} appears in groups ${groupIdByKey.get(key)} and ${group.id}`);
      }
      groupIdByKey.set(key, group.id);
    }
  }

  const usedKeys = collectRecipeIngredientKeys(recipesToValidate);

  for (const key of usedKeys) {
    if (!groupIdByKey.has(key)) errors.push(`${file} is missing a group for ingredient key ${key}`);
  }

  for (const key of groupIdByKey.keys()) {
    if (!usedKeys.has(key)) errors.push(`${file} has key ${key} that no recipe uses`);
  }
}

function validateRecipeNameConsistency(recipesToValidate) {
  const nameByKey = new Map();

  const check = (key, name, label) => {
    if (!hasValue(key) || !hasValue(name)) return;
    const existing = nameByKey.get(key);
    if (existing === undefined) {
      nameByKey.set(key, name);
    } else if (existing !== name) {
      errors.push(`${RECIPE_FILE} key ${key} has inconsistent names "${existing}" and "${name}" (${label})`);
    }
  };

  for (const recipe of recipesToValidate) {
    for (const ingredient of [...(recipe.ingredients ?? []), ...(recipe.garnishIngredients ?? [])]) {
      check(ingredient?.key, ingredient?.name, recipe.slug);
      for (const substitution of ingredient?.substitutions ?? []) {
        check(substitution?.key, substitution?.name, recipe.slug);
      }
    }
  }
}

function validateTranslationNameConsistency(language, translations) {
  const file = TRANSLATION_FILES[language];
  const nameByKey = new Map();

  const check = (key, name, label) => {
    if (!hasValue(key) || !hasValue(name)) return;
    const existing = nameByKey.get(key);
    if (existing === undefined) {
      nameByKey.set(key, name);
    } else if (existing !== name) {
      errors.push(`${file} key ${key} has inconsistent names "${existing}" and "${name}" (${label})`);
    }
  };

  if (!translations || typeof translations !== 'object' || Array.isArray(translations)) return;

  for (const [slug, translation] of Object.entries(translations)) {
    const ingredientMaps = [translation?.ingredients ?? {}, translation?.garnishIngredients ?? {}];
    for (const ingredientMap of ingredientMaps) {
      for (const [key, ingredient] of Object.entries(ingredientMap)) {
        check(key, ingredient?.name, slug);
        for (const [substitutionKey, substitution] of Object.entries(ingredient?.substitutions ?? {})) {
          check(substitutionKey, substitution?.name, slug);
        }
      }
    }
  }
}

function validateKnownFields(label, value, allowedFields) {
  for (const field of Object.keys(value)) {
    if (!allowedFields.has(field)) errors.push(`${label} has unknown field ${field}`);
  }
}

function validatePositiveNumber(label, value) {
  if (typeof value !== 'number' || value <= 0) errors.push(`${label} must be a positive number`);
}

function hasValue(value) {
  return value !== undefined && value !== null && value !== '';
}

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function isYoutubeWatchUrl(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.hostname === 'www.youtube.com' &&
      url.pathname === '/watch' &&
      url.searchParams.has('v')
    );
  } catch {
    return false;
  }
}

function slugFromLink(link) {
  return link.replace(/\/$/, '').split('/').pop();
}
