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

## Shopping List and Google Tasks Sync

`shopping.html` lists the required ingredients you are missing for the drinks marked as favorites. Ticking an item
marks that ingredient as owned in "My bar". The list can also be kept in sync with a Google Tasks list named
**Drinks shopping**, so you can tick items off on your phone while shopping:

- Sync pushes every missing ingredient as a task, with the drinks that need it as the task notes.
- Tasks you complete in Google Tasks mark the ingredient as owned here on the next sync and are then removed.
- Tasks whose title is not a known ingredient are left alone, so you can add other things to the same list.

Google Keep has no API for personal Google accounts, which is why the sync targets Google Tasks. Everything runs in
the browser: there is no backend, and the Google access token lives in the tab session storage for about an hour.

### One-time Google setup

1. Open the [Google Cloud console](https://console.cloud.google.com/) and create a project (for example `drinks`).
2. In **APIs & Services > Library**, enable the **Google Tasks API**.
3. In **Google Auth Platform** (formerly the OAuth consent screen):
   - **Branding**: set an app name and support email.
   - **Audience**: choose **External**, keep the publishing status as **Testing**, and add your own Google account
     under **Test users**. Testing mode is enough for personal use and avoids app verification.
   - **Data access**: add the scopes `https://www.googleapis.com/auth/tasks` and
     `https://www.googleapis.com/auth/userinfo.email`.
4. In **Google Auth Platform > Clients**, create an **OAuth client ID** of type **Web application** and add these
   **Authorized JavaScript origins** (no redirect URIs are needed):
   - `http://127.0.0.1:5173`
   - `http://localhost:5173`
   - `https://alisterlf.github.io`
5. Copy the client ID into `DEFAULT_GOOGLE_CLIENT_ID` in `src/config.ts`. Client IDs for browser apps are public, so
   committing it is fine. For local-only experiments you can instead create a `.env` file with
   `VITE_GOOGLE_CLIENT_ID=<your client id>`.
6. Run `npm run dev`, open `shopping.html`, and click **Connect Google account**.

Access tokens expire after about an hour; when that happens the page asks you to connect again.

### Getting the app verified by Google

Accounts enrolled in Google's Advanced Protection Program (and Workspace accounts with strict admin policies) refuse
the Tasks permission with `Error 400: policy_enforced` until the app passes Google's OAuth verification for sensitive
scopes. Verification happens once in the Google Cloud console. Reviewers open the live site, so deploy first. Google
quotes 3 to 10 business days for sensitive-scope reviews.

1. **Deploy** so that `https://alisterlf.github.io/drinks/` (homepage) and `https://alisterlf.github.io/drinks/privacy.html`
   (privacy policy) are live. Both pages exist in this repo and the footer of every page links to the policy.
2. **Verify the domain** in [Google Search Console](https://search.google.com/search-console) with the same Google
   account that owns the Cloud project: add a URL-prefix property for `https://alisterlf.github.io/drinks/` and verify
   it with the HTML tag or HTML file method. If Google refuses `alisterlf.github.io` as an authorized domain because
   github.io is a shared host, point a custom domain you own at GitHub Pages and use it everywhere below.
3. **Branding** (Google Auth Platform > Branding): app name `Drinks`, your support email, home page
   `https://alisterlf.github.io/drinks/`, privacy policy `https://alisterlf.github.io/drinks/privacy.html`, authorized
   domain `alisterlf.github.io`. Leave the logo empty; adding one triggers a separate brand review.
4. **Data access**: keep exactly `https://www.googleapis.com/auth/tasks` (sensitive) and
   `https://www.googleapis.com/auth/userinfo.email` (non-sensitive). Justification for the tasks scope:

   > Drinks is a static cocktail index. On its shopping list page the user can connect a Google account so that the
   > required ingredients missing for their favorite drinks are mirrored as tasks in a single Google Tasks list named
   > "Drinks shopping". The app creates that list if it does not exist, inserts one task per missing ingredient,
   > updates task titles when the user changes language, deletes tasks for ingredients that are no longer missing, and
   > reads completed tasks to mark those ingredients as owned in the app. Tasks in any other list are never read or
   > modified. The read-only scope is not sufficient because the app must create, update and delete tasks, and no
   > narrower scope exists for a single task list. No Google user data is stored outside the user's browser.

5. **Demo video** (required for sensitive scopes): while the app is still in Testing, record an unlisted YouTube video
   in English with a Google account that is **not** in Advanced Protection and is listed as a test user. Show the
   browser address bar on the live site, click **Connect Google account**, show the full consent screen with the app
   name "Drinks" and the tasks permission, let the list sync, open Google Tasks and show the "Drinks shopping" list with
   the same items, complete one task there, then press **Sync now** and show the ingredient becoming owned in the app.
6. **Audience**: switch the publishing status from Testing to **In production**.
7. **Submit** in Google Auth Platform > Verification Center with the video link and the justification above, then answer
   reviewer emails from the support address. Once the status is "Verified", Advanced Protection accounts can grant the
   permission like any other account.

## Project Structure

- `index.html` - drink list page.
- `drink.html` - drink detail page.
- `ingredients.html` - "My bar" ingredient inventory page.
- `shopping.html` - shopping list page with Google Tasks sync.
- `privacy.html` - privacy policy required for Google OAuth verification.
- `app.ts` and `src/` - custom elements, filtering, language selection, favorites, and data loading.
- `src/shopping/` - shopping list builder and the Google Tasks sync algorithm.
- `src/google/` - browser-only Google sign-in (Google Identity Services) and Google Tasks API client.
- `styles.css` - shared styling.
- `public/drinks.json` - canonical drink recipe data: images, links, measurements, ingredient keys, and English fallback text.
- `public/drinks.pt-BR.json` - Brazilian Portuguese text overlay keyed by drink slug and ingredient key.

Alexander - https://iba-world.com/iba-cocktail/alexander/
Americano - https://iba-world.com/iba-cocktail/americano/
Angel Face - https://iba-world.com/iba-cocktail/angel-face/
Aviation - https://iba-world.com/iba-cocktail/aviation/
Bee’s Knees - https://iba-world.com/iba-cocktail/bees-knees/
Bellini - https://iba-world.com/iba-cocktail/bellini/
Between the Sheets - https://iba-world.com/iba-cocktail/between-the-sheets/
Black Russian - https://iba-world.com/iba-cocktail/black-russian/
Bloody Mary - https://iba-world.com/iba-cocktail/bloody-mary/
Boulevardier - https://iba-world.com/iba-cocktail/boulevardier/
Bramble - https://iba-world.com/iba-cocktail/bramble/
Brandy Crusta - https://iba-world.com/iba-cocktail/brandy-crusta/
Caipirinha - https://iba-world.com/iba-cocktail/caipirinha/
Canchanchara - https://iba-world.com/iba-cocktail/canchanchara/
Cardinale - https://iba-world.com/iba-cocktail/cardinale/
Casino - https://iba-world.com/iba-cocktail/casino/
Champagne Cocktail - https://iba-world.com/iba-cocktail/champagne-cocktail/
Chartreuse Swizzle - https://iba-world.com/iba-cocktail/chartreuse-swizzle/
Clover Club - https://iba-world.com/iba-cocktail/clover-club/
Corpse Reviver #2 - https://iba-world.com/iba-cocktail/corpse-reviver-2/
Cosmopolitan - https://iba-world.com/iba-cocktail/cosmopolitan/
Cuba Libre - https://iba-world.com/iba-cocktail/cuba-libre/
Daiquiri - https://iba-world.com/iba-cocktail/daiquiri/
Dark 'N' Stormy - https://iba-world.com/iba-cocktail/dark-n-stormy/
Don's Special Daiquiri - https://iba-world.com/iba-cocktail/dons-special-daiquiri/
Dry Martini - https://iba-world.com/iba-cocktail/dry-martini/
Espresso Martini - https://iba-world.com/iba-cocktail/espresso-martini/
Fernandito - https://iba-world.com/iba-cocktail/fernandito/
French 75 - https://iba-world.com/iba-cocktail/french-75/
French Connection - https://iba-world.com/iba-cocktail/french-connection/
French Martini - https://iba-world.com/iba-cocktail/french-martini/
Garibaldi - https://iba-world.com/iba-cocktail/garibaldi/
Gin Basil Smash - https://iba-world.com/iba-cocktail/gin-basil-smash/
Gin Fizz - https://iba-world.com/iba-cocktail/gin-fizz/
Grand Margarita - https://iba-world.com/iba-cocktail/grand-margarita/
Grasshopper - https://iba-world.com/iba-cocktail/grasshopper/
Hanky Panky - https://iba-world.com/iba-cocktail/hanky-panky/
Hemingway Special - https://iba-world.com/iba-cocktail/hemingway-special/
Horse's Neck - https://iba-world.com/iba-cocktail/horses-neck/
IBA Tiki - https://iba-world.com/iba-cocktail/iba-tiki/
Illegal - https://iba-world.com/iba-cocktail/illegal/
Irish Coffee - https://iba-world.com/iba-cocktail/irish-coffee/
John Collins - https://iba-world.com/iba-cocktail/john-collins/
Jungle Bird - https://iba-world.com/iba-cocktail/jungle-bird/
Kir - https://iba-world.com/iba-cocktail/kir/
Last Word - https://iba-world.com/iba-cocktail/last-word/
Lemon Drop Martini - https://iba-world.com/iba-cocktail/lemon-drop-martini/
Long Island Iced Tea - https://iba-world.com/iba-cocktail/long-island-iced-tea/
Mai-Tai - https://iba-world.com/iba-cocktail/mai-tai/
Manhattan - https://iba-world.com/iba-cocktail/manhattan/
Margarita - https://iba-world.com/iba-cocktail/margarita/
Martinez - https://iba-world.com/iba-cocktail/martinez/
Mary Pickford - https://iba-world.com/iba-cocktail/mary-pickford/
Mimosa - https://iba-world.com/iba-cocktail/mimosa/
Mint Julep - https://iba-world.com/iba-cocktail/mint-julep/
Missionary's Downfall - https://iba-world.com/iba-cocktail/missionarys-downfall/
Mojito - https://iba-world.com/iba-cocktail/mojito/
Monkey Gland - https://iba-world.com/iba-cocktail/monkey-gland/
Moscow Mule - https://iba-world.com/iba-cocktail/moscow-mule/
Naked and Famous - https://iba-world.com/iba-cocktail/naked-and-famous/
Negroni - https://iba-world.com/iba-cocktail/negroni/
New York Sour - https://iba-world.com/iba-cocktail/new-york-sour/
Old Cuban - https://iba-world.com/iba-cocktail/old-cuban/
Old Fashioned - https://iba-world.com/iba-cocktail/old-fashioned/
Paloma - https://iba-world.com/iba-cocktail/paloma/
Paper Plane - https://iba-world.com/iba-cocktail/paper-plane/
Paradise - https://iba-world.com/iba-cocktail/paradise/
Penicillin - https://iba-world.com/iba-cocktail/penicillin/
Pina Colada - https://iba-world.com/iba-cocktail/pina-colada/
Pisco Punch - https://iba-world.com/iba-cocktail/pisco-punch/
Pisco Sour - https://iba-world.com/iba-cocktail/pisco-sour/
Planters Punch - https://iba-world.com/iba-cocktail/planters-punch/
Porn Star Martini - https://iba-world.com/iba-cocktail/porn-star-martini/
Porto Flip - https://iba-world.com/iba-cocktail/porto-flip/
Rabo de Galo - https://iba-world.com/iba-cocktail/rabo-de-galo/
Ramos Fizz - https://iba-world.com/iba-cocktail/ramos-fizz/
Remember the Maine - https://iba-world.com/iba-cocktail/remember-the-maine/
Russian Spring Punch - https://iba-world.com/iba-cocktail/russian-spring-punch/
Rusty Nail - https://iba-world.com/iba-cocktail/rusty-nail/
Sazerac - https://iba-world.com/iba-cocktail/sazerac/
Sea Breeze - https://iba-world.com/iba-cocktail/sea-breeze/
Sex on the Beach - https://iba-world.com/iba-cocktail/sex-on-the-beach/
Sherry Cobbler - https://iba-world.com/iba-cocktail/sherry-cobbler/
Sidecar - https://iba-world.com/iba-cocktail/sidecar/
Singapore Sling - https://iba-world.com/iba-cocktail/singapore-sling/
South Side - https://iba-world.com/iba-cocktail/south-side/
Spicy Fifty - https://iba-world.com/iba-cocktail/spicy-fifty/
Spritz - https://iba-world.com/iba-cocktail/spritz/
Stinger - https://iba-world.com/iba-cocktail/stinger/
Suffering Bastard - https://iba-world.com/iba-cocktail/suffering-bastard/
Tequila Sunrise - https://iba-world.com/iba-cocktail/tequila-sunrise/
Three Dots and a Dash - https://iba-world.com/iba-cocktail/three-dots-and-a-dash/
Tipperary - https://iba-world.com/iba-cocktail/tipperary/
Tommy's Margarita - https://iba-world.com/iba-cocktail/tommys-margarita/
Trinidad Sour - https://iba-world.com/iba-cocktail/trinidad-sour/
Tuxedo - https://iba-world.com/iba-cocktail/tuxedo/
Ve.N.To - https://iba-world.com/iba-cocktail/ve-n-to/
Vesper - https://iba-world.com/iba-cocktail/vesper/
Vieux Carré - https://iba-world.com/iba-cocktail/vieux-carre/
Whiskey Sour - https://iba-world.com/iba-cocktail/whiskey-sour/
White Lady - https://iba-world.com/iba-cocktail/white-lady/
Zombie - https://iba-world.com/iba-cocktail/zombie/

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
