const fs = require('node:fs');
const path = require('node:path');

const DATA_FILES = ['drinks.json', 'drinks.pt-BR.json'];
const DATA_DIR = path.resolve(__dirname, '..', 'public');
const REQUIRED_DRINK_FIELDS = ['name', 'photo', 'ingredients', 'method', 'garnish', 'ibaLink'];
const REQUIRED_INGREDIENT_FIELDS = ['name'];
const IBA_LINK_PREFIX = 'https://iba-world.com/iba-cocktail/';

const datasets = new Map(DATA_FILES.map((file) => [file, readJson(path.join(DATA_DIR, file))]));
const errors = [];

for (const [file, drinks] of datasets) {
  validateDataset(file, drinks);
}

validateMatchingSlugs();

if (errors.length > 0) {
  console.error(`Data validation failed with ${errors.length} issue${errors.length === 1 ? '' : 's'}:`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
} else {
  const counts = [...datasets].map(([file, drinks]) => `${file}: ${drinks.length}`).join(', ');
  console.log(`Data validation passed (${counts}).`);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    errors.push(`${path.basename(filePath)} could not be read: ${error.message}`);
    return [];
  }
}

function validateDataset(file, drinks) {
  if (!Array.isArray(drinks)) {
    errors.push(`${file} must contain an array`);
    return;
  }

  const slugs = new Set();

  drinks.forEach((drink, index) => {
    const label = `${file}[${index}] ${drink?.name ?? '(unnamed)'}`;

    if (!drink || typeof drink !== 'object' || Array.isArray(drink)) {
      errors.push(`${label} must be an object`);
      return;
    }

    for (const field of REQUIRED_DRINK_FIELDS) {
      if (!hasValue(drink?.[field])) {
        errors.push(`${label} is missing ${field}`);
      }
    }

    if (!Array.isArray(drink?.ingredients) || drink.ingredients.length === 0) {
      errors.push(`${label} must have at least one ingredient`);
    } else {
      drink.ingredients.forEach((ingredient, ingredientIndex) => {
        validateIngredient(`${label}.ingredients[${ingredientIndex}]`, ingredient);
      });
    }

    if (hasValue(drink?.photo) && !isHttpsUrl(drink.photo)) {
      errors.push(`${label} photo must be an https URL`);
    }

    if (hasValue(drink?.ibaLink) && !drink.ibaLink.startsWith(IBA_LINK_PREFIX)) {
      errors.push(`${label} ibaLink must start with ${IBA_LINK_PREFIX}`);
    }

    if (hasValue(drink?.ibaLink)) {
      const slug = slugFromDrink(drink);
      if (slugs.has(slug)) {
        errors.push(`${file} has duplicate slug ${slug}`);
      }
      slugs.add(slug);
    }
  });
}

function validateIngredient(label, ingredient) {
  if (!ingredient || typeof ingredient !== 'object' || Array.isArray(ingredient)) {
    errors.push(`${label} must be an object`);
    return;
  }

  for (const field of REQUIRED_INGREDIENT_FIELDS) {
    if (!hasValue(ingredient?.[field])) {
      errors.push(`${label} is missing ${field}`);
    }
  }

  if ('quantity' in ingredient && typeof ingredient.quantity !== 'number') {
    errors.push(`${label} quantity must be a number`);
  }

  if ('unit' in ingredient && !hasValue(ingredient.unit)) {
    errors.push(`${label} unit must not be empty`);
  }

  if ('prefix' in ingredient && !hasValue(ingredient.prefix)) {
    errors.push(`${label} prefix must not be empty`);
  }
}

function validateMatchingSlugs() {
  const [firstFile, ...otherFiles] = DATA_FILES;
  const baseSlugs = getDatasetSlugs(firstFile);

  for (const file of otherFiles) {
    const currentSlugs = getDatasetSlugs(file);

    for (const slug of baseSlugs) {
      if (!currentSlugs.has(slug)) {
        errors.push(`${file} is missing slug ${slug}`);
      }
    }

    for (const slug of currentSlugs) {
      if (!baseSlugs.has(slug)) {
        errors.push(`${file} has extra slug ${slug}`);
      }
    }
  }
}

function getDatasetSlugs(file) {
  return new Set(
    datasets
      .get(file)
      .filter((drink) => drink && typeof drink === 'object' && hasValue(drink.ibaLink))
      .map(slugFromDrink),
  );
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

function slugFromDrink(drink) {
  return drink.ibaLink.replace(/\/$/, '').split('/').pop();
}
