# Drinks

A small static cocktail index with localized drink data, ingredient filters, favorites, and detail pages.

## Development

Install dependencies:

```bash
npm install
```

Start the local development server with hot reload:

```bash
npm run dev
```

Then open the local URL Vite prints in the terminal, usually `http://127.0.0.1:5173/`.

## Quality Checks

Run the full check suite:

```bash
npm run lint
```

That runs JavaScript linting, CSS linting, HTML linting, and data validation.

Format HTML, CSS, JavaScript, and JSON:

```bash
npm run format
```

Check formatting without writing changes:

```bash
npm run format:check
```

Validate only the drink data:

```bash
npm run validate:data
```

## Production Build

Build both HTML pages and copy the static drink data:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Project Structure

- `index.html` - drink list page.
- `drink.html` - drink detail page.
- `app.ts` and `src/` - custom elements, filtering, language selection, favorites, and data loading.
- `styles.css` - shared styling.
- `public/drinks.json` - canonical drink recipe data: images, links, measurements, ingredient keys, and English fallback text.
- `public/drinks.pt-BR.json` - Brazilian Portuguese text overlay keyed by drink slug and ingredient key.

Americano - https://iba-world.com/iba-cocktail/americano/
Bee’s Knees - https://iba-world.com/iba-cocktail/bees-knees/
Between the Sheets - https://iba-world.com/iba-cocktail/between-the-sheets/
Black Russian - https://iba-world.com/iba-cocktail/black-russian/
Bloody Mary - https://iba-world.com/iba-cocktail/bloody-mary/
Boulevardier - https://iba-world.com/iba-cocktail/boulevardier/
Caipirinha - https://iba-world.com/iba-cocktail/caipirinha/
Canchanchara - https://iba-world.com/iba-cocktail/canchanchara/
Cardinale - https://iba-world.com/iba-cocktail/cardinale/
Champagne Cocktail - https://iba-world.com/iba-cocktail/champagne-cocktail/
Cosmopolitan - https://iba-world.com/iba-cocktail/cosmopolitan/
Cuba Libre - https://iba-world.com/iba-cocktail/cuba-libre/
Daiquiri - https://iba-world.com/iba-cocktail/daiquiri/
Dry Martini - https://iba-world.com/iba-cocktail/dry-martini/
Espresso Martini - https://iba-world.com/iba-cocktail/espresso-martini/
Fernandito - https://iba-world.com/iba-cocktail/fernandito/
French 75 - https://iba-world.com/iba-cocktail/french-75/
French Connection - https://iba-world.com/iba-cocktail/french-connection/
Garibaldi - https://iba-world.com/iba-cocktail/garibaldi/
Gin Basil Smash - https://iba-world.com/iba-cocktail/gin-basil-smash/
Gin Fizz - https://iba-world.com/iba-cocktail/gin-fizz/
Hanky Panky - https://iba-world.com/iba-cocktail/hanky-panky/
Irish Coffee - https://iba-world.com/iba-cocktail/irish-coffee/
John Collins - https://iba-world.com/iba-cocktail/john-collins/
Jungle Bird - https://iba-world.com/iba-cocktail/jungle-bird/
Lemon Drop Martini - https://iba-world.com/iba-cocktail/lemon-drop-martini/
Long Island Iced Tea - https://iba-world.com/iba-cocktail/long-island-iced-tea/
Manhattan - https://iba-world.com/iba-cocktail/manhattan/
Margarita - https://iba-world.com/iba-cocktail/margarita/
Mimosa - https://iba-world.com/iba-cocktail/mimosa/
Mint Julep - https://iba-world.com/iba-cocktail/mint-julep/
Mojito - https://iba-world.com/iba-cocktail/mojito/
Moscow Mule - https://iba-world.com/iba-cocktail/moscow-mule/
Negroni - https://iba-world.com/iba-cocktail/negroni/
New York Sour - https://iba-world.com/iba-cocktail/new-york-sour/
Old Cuban - https://iba-world.com/iba-cocktail/old-cuban/
Old Fashioned - https://iba-world.com/iba-cocktail/old-fashioned/
Pina Colada - https://iba-world.com/iba-cocktail/pina-colada/
Rabo de Galo - https://iba-world.com/iba-cocktail/rabo-de-galo/
Sex on the Beach - https://iba-world.com/iba-cocktail/sex-on-the-beach/
Sidecar - https://iba-world.com/iba-cocktail/sidecar/
South Side - https://iba-world.com/iba-cocktail/south-side/
Spritz - https://iba-world.com/iba-cocktail/spritz/
Whiskey Sour - https://iba-world.com/iba-cocktail/whiskey-sour/
White Lady - https://iba-world.com/iba-cocktail/white-lady/

## Drink Data

Recipe data is centralized in `public/drinks.json`. Localized files should only contain text that changes by language: drink names, methods, garnish text, ingredient names, and translated ingredient notes.

Canonical recipe example:

```json
{
  "slug": "boulevardier",
  "name": "Boulevardier",
  "photo": "https://iba-world.com/wp-content/uploads/2024/07/iba-cocktail-the-unforgettables-boulevardier-6694910552acd.webp",
  "ibaLink": "https://iba-world.com/iba-cocktail/boulevardier/",
  "ingredients": [
    {
      "key": "bourbon",
      "name": "Bourbon",
      "quantity": 45,
      "unit": "ml",
      "substitutions": [
        {
          "key": "rye-whiskey",
          "name": "Rye Whiskey"
        }
      ]
    },
    {
      "key": "campari",
      "name": "Campari",
      "quantity": 30,
      "unit": "ml"
    },
    {
      "key": "vermouth-rosso",
      "name": "Vermouth Rosso",
      "quantity": 30,
      "unit": "ml"
    }
  ],
  "method": "Pour all ingredients into mixing glass with ice cubes. Stir well. Strain into chilled cocktail glass.",
  "garnish": "Garnish with a orange zest, optionally a lemon zest."
}
```

Portuguese overlay example:

```json
{
  "boulevardier": {
    "name": "Boulevardier",
    "ingredients": {
      "bourbon": {
        "name": "Whiskey bourbon",
        "substitutions": {
          "rye-whiskey": {
            "name": "Whiskey de centeio"
          }
        }
      },
      "campari": {
        "name": "Campari"
      },
      "vermouth-rosso": {
        "name": "Vermute tinto doce"
      }
    },
    "method": "Despeje todos os ingredientes em um mixing glass com cubos de gelo. Mexa bem. Coe para uma taça de coquetel resfriada.",
    "garnish": "Guarneça com uma casca de laranja; opcionalmente, uma casca de limão-siciliano."
  }
}
```

For substitutable ingredients, the top-level ingredient is the default. Alternatives are listed in `substitutions`; the UI treats any listed option as valid for inventory and "Can make" filtering.
