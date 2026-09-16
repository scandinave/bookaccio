# Audit du dépôt Bookaccio

> Document d'analyse et feuille de route. **Phases 1 à 5 exécutées** (voir les journaux en fin de document).

## Contexte

Point de départ : deux symptômes signalés.

1. La recherche de livre par **ISBN** et par **titre** est cassée.
2. L'application **crashe** à l'ajout manuel d'une couverture.

L'audit part de ces deux bugs puis élargit à l'ensemble du dépôt.

**Décision produit retenue** : la clé API Google Books reste **obligatoire**. L'app doit le dire explicitement au lieu d'afficher « livre non trouvé ».

### Limites de l'analyse

L'audit initial a été mené sans `node_modules/` : ni `tsc --noEmit`, ni `expo lint`, ni aucun build n'avaient pu être exécutés. Il repose donc sur la lecture du code, de `package.json` / `package-lock.json` et de l'historique git.

Depuis, l'exécution de la phase 1 a permis de valider empiriquement les sections A2 et C1 (voir le journal). Les points marqués **[à confirmer]** demandent une exécution réelle **sur device** et restent ouverts.

Stack : React Native 0.81.5 / Expo SDK 54 / expo-router 6 / New Architecture activée (`newArchEnabled=true`). Persistance = **AsyncStorage uniquement** (clé `bookList`), pas de base de données.

---

## A. Bug 1 — Recherche par ISBN et par titre

### A1. Cause principale : `key=` part vide quand aucune clé n'est configurée

`helpers/getBookDetails.ts:6` et `helpers/getBookByIsbn.ts:5` concatènent **systématiquement** `&key=${apiKey}` :

```ts
// helpers/getBookDetails.ts:6
const URL = `https://www.googleapis.com/books/v1/volumes?q=${searchTitle}&key=${apiKey}`;
// helpers/getBookByIsbn.ts:5
`https://www.googleapis.com/books/v1/volumes?q=isbn:${value.trim()}&key=${apiKey}`
```

`apiKey` vient de `providers/apiKeyProvider.tsx:9-19`, dont l'état initial est `''` et qui charge la vraie valeur **de façon asynchrone** depuis AsyncStorage. Deux conséquences :

- utilisateur sans clé configurée → URL terminée par `&key=` → Google Books répond **HTTP 400 `keyInvalid`** ;
- même avec une clé enregistrée, toute recherche lancée **avant la résolution de la promesse** du provider part avec `&key=` vide.

Dans les deux cas le `catch` renvoie `undefined` (`getBookDetails.ts:10-13`, `getBookByIsbn.ts:8-11`) et l'écran affiche l'alerte générique `book-not-found`. **Le message est trompeur : le problème est l'authentification, pas l'absence de résultat.**

Avant le commit `8b7fe58` (« Added API key feature ») les requêtes ne portaient aucun paramètre `key` et fonctionnaient en anonyme. C'est cette régression qui est observée.

Vérification possible sans device, en deux commandes :

```bash
curl -s -o /dev/null -w '%{http_code}\n' 'https://www.googleapis.com/books/v1/volumes?q=isbn:9780802162182'
curl -s -o /dev/null -w '%{http_code}\n' 'https://www.googleapis.com/books/v1/volumes?q=isbn:9780802162182&key='
```

### A2. `app/(unfinished)/unfinished.tsx` n'a jamais été migré

Cet écran appelle les helpers avec **un seul argument** :

| Ligne | Appel | `apiKey` reçu |
|---|---|---|
| `unfinished.tsx:62` | `getBookDetails(title)` | `undefined` |
| `unfinished.tsx:74` | `getBookByIsbn(isbn)` | `undefined` |
| `unfinished.tsx:100` | `getBookByIsbn(barcode)` | `undefined` |

L'URL contient littéralement `&key=undefined`. **Toute recherche depuis l'onglet « Non terminés » échoue, quelle que soit la configuration.**

De plus `unfinished.tsx:84-90` utilise encore l'ancien chemin `selfLink` :

```ts
async function handleBookSelection(url: string, state: string) {
  const res = await axios.get(url);   // selfLink : perd la clé → 403, et aucun try/catch
```

Ce sont des erreurs d'arité : `tsc --noEmit` remonte trois `Expected 2 arguments, but got 1` — **confirmé à l'exécution**. C'est le marqueur de régression le plus fiable du dépôt.

Le même fichier porte une quatrième erreur, sans rapport : `unfinished.tsx:195` utilise le nom d'icône `"search1"` (TS2820), qui n'existe pas — l'icône ne s'affiche pas.

### A3. Un résultat vide est indiscernable d'une erreur

- **Titre** : quand Google renvoie `totalItems: 0`, la réponse est **HTTP 200 sans champ `items`** → `res.data.items` vaut `undefined` → branche « non trouvé ». Correct, mais par accident.
- **ISBN** : `getBookByIsbn.ts:6` fait `res.data.items[0]` → **TypeError** sur 0 résultat → attrapé par le `catch` → `undefined`.

Résultat : 400 (clé invalide), 403 (quota), timeout réseau et « aucun résultat » produisent tous exactement la même alerte. Ni l'utilisateur ni le développeur ne peuvent distinguer les cas.

### A4. La requête n'est pas encodée

`getBookDetails.ts:5` :

```ts
const searchTitle = bookTitle.toLowerCase().split(' ').join('+');
```

Pas de `encodeURIComponent` : seuls les espaces sont traités. Un titre contenant `&`, `#`, `?`, `+`, `:` ou `'` casse ou tronque la requête — cas courant en français. Le `toLowerCase()` est par ailleurs inutile côté Google Books et dégrade la saisie utilisateur.

Le même défaut existe dans `helpers/getBookDetailsOL.ts:7`, actuellement inutilisé (voir G).

### A5. Pas de normalisation de l'ISBN

`getBookByIsbn.ts:5` fait seulement `value.trim()`. Un ISBN saisi avec tirets (`978-2-07-036822-8`), ou un code-barres retourné avec des espaces / un saut de ligne par `rn-barcode-zxing-scan`, part tel quel dans `q=isbn:`. Aucun filtrage de chiffres, aucune validation de longueur, aucune conversion ISBN-10 ↔ ISBN-13. Scanner un produit non-livre donne « livre non trouvé » au lieu de « code invalide ».

### A6. `finally` navigue même en cas d'échec

`app/(tabs)/home.tsx:131-143`, identique dans `read.tsx:88-100` et `to-read.tsx:88-100` :

```ts
try   { const res = await axios.get(url); setSelectedBook(res.data); }
catch (err) { console.log(err); }
finally { … router.push({ pathname: '/(addBook)/[addBook]', … }); }
```

Si la requête de détail échoue, l'app ouvre quand même le formulaire d'ajout, **pré-rempli avec le `selectedBook` de la recherche précédente**. L'utilisateur peut enregistrer le mauvais livre sans s'en apercevoir.

### A7. Aucune garde sur clé manquante

Aucun appelant ne vérifie `apiKey !== ''` avant de lancer une recherche. `helpers/checkApiKey.ts` existe mais n'est utilisé que dans la modale des réglages (`settings.tsx:158-170`), jamais dans le flux de recherche.

### A8. Quatre copies du même code

`home.tsx`, `read.tsx`, `to-read.tsx` et `unfinished.tsx` dupliquent chacun ~100 lignes quasi identiques (`handleBookSearch`, `handleBookSearchByIsbn`, `handleBookSelection`, `barcodeScanned`, `handleBarcodeSearch`). `diff read.tsx to-read.tsx` ne retourne qu'un changement d'ordre d'imports et la valeur de `BookState`.

**C'est la cause racine directe de A2** : la migration vers la clé API a été faite dans 3 fichiers sur 4.

Détail annexe : `read.tsx:88` et `to-read.tsx:88` déclarent `handleBookSelection(url, state, id)` puis redéfinissent `const url` dans le bloc `try` — le premier paramètre est mort (shadowing légal, pas une erreur de syntaxe, mais les appelants passent encore `book.selfLink` en premier argument).

---

## B. Bug 2 — Crash à l'ajout manuel d'une couverture

Code concerné, identique dans les deux écrans (`app/(addBook)/[addBook].tsx:121-130`, `app/(editBook)/[editBook].tsx:108-117`, seul `aspect` diffère : `[10,16]` vs `[11,16]`) :

```ts
async function handleGalleryImage() {
  const result = await ImagePicker.launchImageLibraryAsync({
    aspect: [10, 16],
    allowsEditing: true,
    quality: 1,
  });
  if (!result.canceled) {
    setImgUrl(result.assets[0].uri);
    setBookDetails({ ...bookDetails, imageLinks: { thumbnail: result.assets[0].uri } });
  }
}
```

Déclenché depuis `[addBook].tsx:305-309` / `[editBook].tsx:284-288` :

```ts
onPress={() => { setIsFirstModalVisible(false); handleGalleryImage(); }}
```

Le crash n'a pas pu être reproduit ici. Hypothèses classées, avec leur protocole de confirmation.

### H1 — Mort du process pendant que le picker est au premier plan **[à confirmer]**

C'est l'hypothèse qui explique le plus précisément « crash *au moment* d'ajouter une couverture ».

`launchImageLibraryAsync` lance une **activité séparée**. Bookaccio passe en arrière-plan et peut être tué (mémoire basse, ou option développeur « Ne pas conserver les activités »). Au retour, expo-router restaure la route, `FullBooksListProvider` se remonte avec `useState<Book[]>([])`, et `app/(editBook)/[editBook].tsx:45` :

```ts
const selectedBook = fullBookList.find((book) => book.id.toString() === editBook);
…
const [bookDetails, setBookDetails] = useState<Book>({
  id: selectedBook!.id,          // ← TypeError: Cannot read property 'id' of undefined
```

`app/(bookDetails)/[bookdetails].tsx:56-62` porte exactement la même mine (`book!.currentPage / book!.pageCount`, `new Date(book!.startDate)`) sur l'écran vers lequel on revient. Dans `addBook`, le même événement remet `selectedBook` à `{}` et perd silencieusement la saisie en cours.

**Confirmation :**
```bash
adb shell settings put global always_finish_activities 1
# reproduire : Modifier un livre → couverture → galerie → choisir
adb logcat -s ReactNativeJS:V ActivityTaskManager:I
# chercher : "Destroying ... com.bugsdev2.bookaccio/.MainActivity"
#            puis "TypeError ... of undefined" mentionnant [editBook] / [bookdetails]
adb shell settings put global always_finish_activities 0   # ne pas oublier
```

### H2 — `allowsEditing: true` + `aspect` : l'activité de recadrage **[à confirmer]**

Sur Android 13/14, `launchImageLibraryAsync` utilise le Photo Picker système ; le recadrage qui suit est une **activité tierce** et reste la première source connue d'échec d'image picker (handler de crop absent, `ActivityNotFoundException`, ou plantage de l'app galerie/appareil photo du constructeur). Les ratios inhabituels `[10,16]` / `[11,16]` sollicitent ce chemin.

**Confirmation :**
```bash
adb logcat -b crash
adb logcat -s ReactNativeJS:V ExpoImagePicker:V AndroidRuntime:E
# chercher : "Failed to crop", "ActivityNotFoundException",
#            ou un crash de com.google.android.apps.photos / com.android.camera
```
**Bisection :** passer `allowsEditing: false` et retirer `aspect`. Si l'échec disparaît, c'est H2.

### H3 — Aucune gestion d'erreur

`handleGalleryImage` n'a **pas de `try/catch`**, et il est appelé en fire-and-forget depuis un `onPress`. Un rejet natif devient une promesse rejetée non gérée : **red box en dev** (ce qui se lit comme « l'app a crashé »), **no-op silencieux en release**. Quelle que soit la cause réelle, ce point masque le diagnostic.

### H4 — OOM natif au décodage **[à confirmer]**

`quality: 1`, aucun redimensionnement : un JPEG 50 Mpx d'appareil photo est décodé par Fresco pour un `<Image>` de 80×120.

**Confirmation :** `adb logcat -b crash | grep -i outofmemory`, ou `adb logcat -s Fresco:V`. **Bisection :** comparer une capture d'écran légère et une photo pleine résolution.

### H5 — Dérive du manifeste Android

`app.json:22` déclare `READ_MEDIA_IMAGES`, mais `android/app/src/main/AndroidManifest.xml` ne contient que `CAMERA`, `INTERNET`, `READ_EXTERNAL_STORAGE`, `SYSTEM_ALERT_WINDOW`, `WRITE_EXTERNAL_STORAGE`. Le manifeste a été régénéré pour la dernière fois au commit `8f55b9d`, antérieur à l'ajout de la permission dans `app.json`.

La dérive est **réelle**, mais sur Android 13+ le Photo Picker ne requiert **aucune** permission : à elle seule elle ne provoque pas de crash. En revanche elle deviendrait bloquante dès qu'on ajouterait un `requestMediaLibraryPermissionsAsync()` — la permission doit donc être remise dans le manifeste **avant** toute gestion de permission, pas après.

**Confirmation :** `adb shell dumpsys package com.bugsdev2.bookaccio | grep -A 30 'requested permissions'`

> ⚠️ **Ne pas corriger cette dérive avec `npx expo prebuild --clean`.** Le dossier `android/` est versionné **avec des modifications manuelles qu'aucun config plugin ne reproduit** : `dependenciesInfo { includeInApk = false; includeInBundle = false }` (`build.gradle:102-105`, exigence F-Droid), le bloc `splits { abi }` (`:107-115`), le bloc de signature lisant `.env` (`:125-132`), `versionCode 400`, et `SYSTEM_ALERT_WINDOW` (hérité de `rn-barcode-zxing-scan`, qui n'est pas un plugin Expo). Un prebuild propre détruit tout cela. Ajouter la ligne à la main, ou prebuild dans un worktree jetable pour diffusion comparative.

### H6 — Course avec la modale

`setIsFirstModalVisible(false)` puis `handleGalleryImage()` sur le **même tick** : l'activité native démarre pendant que `react-native-modal` joue son animation de sortie, en New Architecture.

**Bisection :** ajouter temporairement un bouton hors modale qui appelle `handleGalleryImage()`. Si ce chemin ne casse jamais, c'est H6.

### H7 — Écarté : `mediaTypes`

Le code ne passe aucun `mediaTypes` et repose sur le défaut SDK 54 (`['images']`). `MediaTypeOptions` (supprimé en expo-image-picker 17) **n'est utilisé nulle part** dans le dépôt — vérifié par grep. Ce n'est pas la cause de dépréciation classique.

### Bug certain, indépendant du crash : la couverture se perd

L'URI retourné par le picker sur Android est un chemin de **cache** :

```
file:///data/user/0/com.bugsdev2.bookaccio/cache/ImagePicker/xxxx.jpeg
```

Il est stocké **verbatim** dans AsyncStorage comme couverture permanente (`handleAddBook` → `storeBooks` → `setData('bookList', …)`). Aucune copie vers `documentDirectory`, aucun redimensionnement, aucune compression.

Android purge `cache/` quand il veut ; un « vider le cache » ou une réinstallation le fait à coup sûr. **Les couvertures ajoutées manuellement finissent en image cassée**, silencieusement : aucun `onError` sur les `<Image>` pour retomber sur le placeholder.

Corollaire : `handleImageChange` et `handleGalleryImage` **remplacent tout l'objet `imageLinks`** par `{ thumbnail: … }`, écrasant les autres tailles éventuellement présentes.

---

## C. Blocage de build

### C1. `android/app/build.gradle` exige un `.env` absent du dépôt

```groovy
def loadEnvProperties() {
    def properties = new Properties()
    file("../.env").withInputStream { properties.load(it) }   // ← FileNotFoundException
    return properties
}
def env = loadEnvProperties()
…
signingConfigs { release {
    storeFile file(env['KEYSTORE_FILE'])
    storePassword env['KEYSTORE_PASSWORD']
    keyAlias env['KEY_ALIAS']
    keyPassword env['KEY_PASSWORD']
} }
```

Dans un script de sous-projet Gradle, `file()` se résout par rapport au **répertoire du projet**, ici `android/app`. `../.env` désigne donc **`android/.env`** — absent du dépôt, et couvert par le motif `.env` du `.gitignore` (qui matche à n'importe quelle profondeur).

`loadEnvProperties()` est appelé **inconditionnellement à la phase de configuration**. **N'importe quelle tâche Gradle échoue sur un clone frais, y compris `assembleDebug`.** Aucun `.env.example` n'est fourni, ni aucune mention dans le README.

C'est le premier point à débloquer : sans lui, aucune des hypothèses de la section B n'est vérifiable.

### C2. `react-native.config.js` pointe vers un mauvais package

```js
project: {
  android: { packageName: 'com.bookaccio.app' },   // réel : com.bugsdev2.bookaccio (build.gradle:117)
  ios: { project: 'ios/bookaccio.xcworkspace' }    // le dossier ios/ n'existe pas
}
```

### C3. `index.js` est un fichier mort et cassé

```js
import App from './App';   // ./App n'existe pas
registerRootComponent(App);
```

`package.json` a `"main": "expo-router/entry"`, donc ce fichier n'est jamais chargé. Il n'est pas non plus couvert par `tsconfig.include` (`*.ts` / `*.tsx` uniquement), donc `tsc` ne l'a jamais signalé. `expo-doctor`, si.

### C4. `android/` versionné + `app.json` avec `plugins` : configuration hybride

Les `plugins` et `android.permissions` d'`app.json` ne s'appliquent qu'au `prebuild`, mais le dossier `android/` généré est versionné **et édité à la main** et ne suit plus. C'est la cause racine de H5, et cela se reproduira à chaque changement de configuration. `app.json.backup` (versionné, version 0.3.2, avec un `newArchEnabled: true` depuis supprimé) confirme la dérive.

Il faut trancher : soit `android/` est généré et les éditions manuelles passent en config plugins, soit `android/` est la source de vérité et `app.json` ne doit plus prétendre le décrire.

---

## D. Crashs latents ailleurs dans l'app

### D1. `imageLinks` déréférencé sans optional chaining

| Fichier | Ligne | Expression |
|---|---|---|
| `components/bookItem.tsx` | 196, 260 | `data.imageLinks.thumbnail !== ''` |
| `app/(bookDetails)/[bookdetails].tsx` | 275 | `book?.imageLinks.thumbnail !== ''` |
| `app/(editBook)/[editBook].tsx` | 64, 149 | `selectedBook?.imageLinks.thumbnail` |
| `app/(addBook)/[addBook].tsx` | 159 | `bookDetails.imageLinks.thumbnail` |

Le `?.` s'arrête à `book` / `selectedBook` et ne protège pas `imageLinks`. Tout enregistrement sans `imageLinks` fait tomber l'écran entier. Or `handleImport` (`settings.tsx:104-122`) ne valide que `fileData[0].id` et `fileData[0].title` : **un JSON importé d'une ancienne version suffit**.

Second effet : le test `!== ''` est vrai quand `thumbnail` vaut `undefined`, donc RN reçoit `source={{ uri: undefined }}` au lieu du placeholder.

### D2. Initialiseurs `useState` qui supposent le livre déjà chargé

`app/(bookDetails)/[bookdetails].tsx:56-62` :

```ts
const book = fullBookList.find((b) => b.id.toString() === bookdetails);
…
const [bookProgress, setBookProgress] = useState(book!.currentPage / book!.pageCount);
const [startDate, setStartDate]       = useState(new Date(book!.startDate));
const [rating, setRating]             = useState(book!.rating);
```

Même schéma dans `app/(editBook)/[editBook].tsx:45,56-78` (sept `selectedBook!`).

Les `!` masquent le fait que `fullBookList` est rempli **de façon asynchrone** — et l'écran lui-même le recharge dans son propre `useEffect` au montage (`[bookdetails].tsx:72-76`, `[editBook].tsx:49-53`). Sur cold start, deep link, retour de picker (voir H1) ou juste après un import, `book` est `undefined` → `TypeError` immédiat. Le garde `if (book === undefined)` plus bas dans `[bookdetails].tsx` n'a jamais l'occasion de s'exécuter.

### D3. Regex globale réutilisée avec `.test()`

`app/(bookDetails)/[bookdetails].tsx:66,111` :

```ts
const regexNumber = /\d/g;
…
if (!regexNumber.test(currentPage!.toString()) || !regexNumber.test(pageCount!.toString())) { … }
```

Une regex portant le flag `g` conserve `lastIndex` entre les appels de `.test()`. Les résultats **alternent** : la même saisie valide est acceptée une fois sur deux et rejetée l'autre. Bug reproductible à coup sûr côté utilisateur (« nombre invalide » sur un nombre correct). Correction triviale : retirer le `/g`.

### D4. `formatDate` lève une `RangeError` sur une date invalide

`helpers/formatDate.ts:3-5` :

```ts
let dateMSEC = Date.parse(date.toString());
let isoDate  = new Date(dateMSEC).toISOString();   // RangeError: Invalid time value
```

Le garde `if (!date) return ''` ne couvre pas le cas d'une `Date` **invalide**. Les appelants (`[bookdetails].tsx:370,377`) passent `startDate` / `endDate`, initialisés par `new Date(book!.startDate)` : si le champ manque dans l'enregistrement — typiquement un JSON importé — on obtient `Invalid Date`, puis `NaN`, puis une `RangeError` non attrapée.

### D5. `statistics.tsx` — `authors` supposé toujours présent

`app/(statistics)/statistics.tsx:69` :

```ts
stats.authorsRead.push(...book.authors.map((author) => author));
```

Aucune garde : un livre sans `authors` (ajout manuel, import) fait crasher l'écran Statistiques.

L'écran est de toute façon inachevé : le calcul `authourCount` (`:72-81`) est incohérent (`count++` s'incrémente inconditionnellement, la condition `includes` est toujours vraie), trois `console.log` tournent à chaque rendu (`:75,83,85`), et seule une statistique sur six est affichée — le reste est commenté (`:101-116`).

### D6. `authors.join()` sans garde dans la recherche locale

`app/(tabs)/_layout.tsx:47,64` et `app/(unfinished)/_layout.tsx:48,65` :

```ts
book?.authors.join(',').toLowerCase().includes(…)
```

Le `?.` protège `book` mais pas `authors`. Filtrer la bibliothèque locale crashe si un seul livre n'a pas d'auteur.

---

## E. Gestion d'état et persistance

### E1. `helpers/storage.ts` renvoie l'objet `Error` au lieu de lever

```ts
export async function getData(key: string) {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value !== null) return JSON.parse(value);
  } catch (error) {
    return error;          // ← une instance Error remonte comme si c'était la donnée
  }
}
```

En cas de valeur corrompue, `getData('apiKey')` retourne un `Error`, que `apiKeyProvider.tsx:13` accepte (`data !== undefined` est vrai) et injecte dans l'état `apiKey`, puis dans l'URL. Même piège dans `helpers/getBookList.ts:11-13`, qui renvoie aussi `err` depuis son catch alors que sa signature annonce `Book[]`.

Tous les appelants traitent déjà correctement un résultat `undefined` — le `return error` est donc strictement nuisible.

### E2. `bookSourceProvider.tsx` appelle AsyncStorage **pendant le rendu**

```ts
const BookSourceProvider = ({ children }) => {
  const [bookSource, setBookSource] = useState('google-books');
  getData('bookSource').then((data) => {        // ← pas dans un useEffect
    if (data !== undefined) setBookSource(data);
  });
```

Effet de bord en phase de rendu : une lecture AsyncStorage **et** un `setState` à chaque rendu d'un provider qui enveloppe toute l'app. React finit par stabiliser (bail-out sur valeur identique) mais les lectures de stockage, elles, ne s'arrêtent jamais. À comparer avec `apiKeyProvider.tsx:11-19`, qui utilise correctement `useEffect`.

Ce provider est de toute façon inutilisé : son consommateur est commenté (`home.tsx:41`), tout comme la section « source de données » des réglages (`settings.tsx:283-290`).

### E3. Mutation directe de l'état

- `app/(addBook)/[addBook].tsx:140-141` : `let updatedBookList = fullBookList; updatedBookList.push(bookDetails);` — même référence que l'état, donc mutation en place avant le `setFullBookList([...])`.
- `components/bookItem.tsx:45-59` : `deleteBook` fait `data.splice(...)` **à l'intérieur d'un `.map()`** sur le tableau en cours d'itération.

### E4. `handleExport` écrit une liste périmée

`app/(settings)/settings.tsx:136-152` :

```ts
getBookList().then((data) => { setFullBookList(data); });   // asynchrone, non attendu
await FileSystem.StorageAccessFramework.createFileAsync(…)
  .then(async (fileUri) => {
    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(fullBookList), …);  // ← valeur du rendu courant
```

`fullBookList` capturé dans la closure est celui du rendu courant, pas celui que `getBookList()` vient de charger. L'export peut contenir des données obsolètes — sur la seule fonction de sauvegarde de l'app.

### E5. La bibliothèque est relue depuis AsyncStorage à chaque écran et à chaque frappe

`getBookList()` est appelé dans les `useEffect` de montage de `home.tsx`, `read.tsx`, `to-read.tsx`, `unfinished.tsx`, `[addBook].tsx`, `[editBook].tsx`, `[bookdetails].tsx`, plus **à chaque caractère saisi** dans `onSearch` (`app/(tabs)/_layout.tsx:56-69`, `app/(unfinished)/_layout.tsx`) — sans debounce.

Le filtre de recherche **remplace** la liste globale partagée au lieu d'être un état dérivé local : c'est ce qui explique les désynchronisations d'affichage entre onglets.

---

## F. Sécurité et vie privée

### F1. La clé API est affichée en entier dans une `Alert`

`app/(settings)/settings.tsx:165` :

```ts
Alert.alert('Success', `Your Google Books API Key -- ${apiKey} -- has been updated`);
```

La clé complète s'affiche à l'écran, et peut se retrouver dans une capture ou un enregistrement — alors même que l'app propose une option « désactiver les captures d'écran ».

### F2. Les erreurs axios complètes sont journalisées

`getBookDetails.ts:11`, `getBookByIsbn.ts:9`, `checkApiKey.ts:8` font `console.log(err)` sur une `AxiosError`, dont la `config.url` **contient la clé API**. 23 `console.log` au total subsistent en production.

### F3. Stockage en clair

La clé vit dans AsyncStorage en clair, pas dans `expo-secure-store`. Acceptable pour une clé Books restreinte, mais à assumer explicitement.

### F4. L'état global est muté pendant la saisie

Le `TextInput` de la modale (`settings.tsx:416-424`) est lié directement au `apiKey` du **contexte global** : chaque caractère tapé modifie la clé utilisée par toute l'app. `getWorkingKey()` (`:64-72`, appelé en `:403-413`) sert à restaurer la valeur si l'utilisateur ferme la modale — un contournement là où un état local suffirait.

### F5. `deleteApiKey` n'utilise pas `deleteData`

`settings.tsx:172-185` écrit `setData('apiKey', '')` au lieu d'appeler `deleteData('apiKey')`, ajouté dans le même commit et jamais utilisé nulle part.

### F6. `SYSTEM_ALERT_WINDOW` dans le manifeste

`android/app/src/main/AndroidManifest.xml:5` déclare `SYSTEM_ALERT_WINDOW`, absente d'`app.json` et sans usage dans le code (elle vient de `rn-barcode-zxing-scan`). Permission sensible, signalée par les scanners F-Droid.

---

## G. Qualité, i18n, dette

**Internationalisation.** Les 4 fichiers de `locales/` sont en parité parfaite (143 lignes, 116 clés, même ordre). Mais plusieurs zones sont en anglais codé en dur alors que le reste de l'écran utilise `t(…)` :

- toute la section clé API de `settings.tsx` (`:163-166`, `:173-174`, `:230`, `:246-259`, `:429`) ;
- l'intégralité de `components/apiKeyInstructions.tsx` ;
- `app/(statistics)/statistics.tsx:92,96`.

À noter aussi une traduction allemande corrompue : `locales/de.json:120` → `"try-search-or-add": "VerTitelsuchsuche es einem anderen Titel oder füge das Buch manuell hinzu"`.

**Composants.**

- `components/customInput.tsx:27-30,38` : le champ affiche `cleanText` (HTML strippé) mais remonte la valeur brute via `onChangeText` — l'affichage et la donnée divergent dès que le texte contient des chevrons. Et si `value` est un tableau, `cleanText` reste `''` : c'est ce qui arrive au champ Catégories quand `bookDetails.categories` est absent, `[editBook].tsx:205` passant alors `['']`.
- `helpers/readingMotivation.ts:18` : `phrases[Math.floor(Math.random() * …)]` est évalué à chaque rendu → le message de motivation change à chaque re-render.
- `throw new Error` dans le corps du rendu (`[addBook].tsx:27-29`, `[bookdetails].tsx:30`, `[editBook].tsx:25-27`) : sans ErrorBoundary, c'est un écran blanc.
- `useState` / setters déstructurés et jamais utilisés dans presque tous les composants (`const [isDarkMode, setIsDarkMode] = useDarkModeContext()` où `setIsDarkMode` ne sert pas) — bruit systématique.

**Code mort.**

- Branche Open Library entièrement commentée mais toujours câblée : `helpers/getBookDetailsOL.ts`, `components/bookSearchItemsOL.tsx`, `providers/selectedBookOLProvider.tsx`, `providers/bookSourceProvider.tsx`, `constants/booksDataBase.ts`, les états `bookSearchResultsOL` de `home.tsx`.
- `index.js` (voir C3), `app.json.backup`.

**Dépendances** (confirmé par `npx expo-doctor`, 3 checks en échec).

- `react-native-worklets` est une **peer dependency de `react-native-reanimated` 4** et n'est **pas déclarée** dans `package.json`. Elle fonctionne aujourd'hui : elle est installée transitivement, et l'autolinking Android la reprend bien (`android/app/build/generated/autolinking/src/main/jni/Android-autolinking.cmake:17`). Mais c'est une dépendance **native** qui ne tient qu'au hoisting npm. À déclarer explicitement (`npx expo install react-native-worklets`). Corollaire rassurant : `babel.config.js` peut garder `react-native-reanimated/plugin`, qui n'est qu'un shim ré-exportant `react-native-worklets/plugin`.
- **10 paquets en retard** de version patch par rapport au SDK 54 (`expo` 54.0.31 vs 54.0.37, `expo-image-picker` 17.0.10 vs 17.0.11, `expo-file-system` 19.0.21 vs 19.0.24, …). À traiter **avant** de creuser le crash de la couverture : un correctif amont peut déjà l'avoir réglé.
- `android/app/debug.keystore` est versionné mais **jamais référencé** : le bloc `signingConfigs` ne déclare que `release`, donc les builds debug utilisent le keystore par défaut d'AGP (`~/.android/debug.keystore`). Fichier mort, ou bloc `signingConfigs.debug` manquant.

**Outillage.**

- **Aucun test.** `jest` et `jest-expo` sont dans les devDependencies, `npm test` est câblé, mais il n'existe aucun fichier de test dans le dépôt.
- **Aucune CI.** `.github/` ne contient que `FUNDING.yml`.

---

## H. Priorisation

| # | Problème | Réf. | Impact | Effort |
|---|---|---|---|---|
| 1 | `.env` absent → toute tâche Gradle échoue | C1 | Bloque tout diagnostic | Faible |
| 2 | `&key=` vide → recherche cassée sans clé | A1 | **Bug signalé** | Faible |
| 3 | `unfinished.tsx` appelle les helpers sans clé | A2 | **Bug signalé** | Faible |
| 4 | Erreurs indiscernables (« livre non trouvé » à tort) | A3, A7 | **Bug signalé** | Moyen |
| 5 | `handleGalleryImage` sans `try/catch` | H3 | **Masque le crash** | Trivial |
| 6 | `allowsEditing: true` + `aspect` | H2 | **Crash probable** | Trivial |
| 7 | Mort du process pendant le picker → `selectedBook!` | H1, D2 | **Crash probable** | Moyen |
| 8 | URI de cache stocké comme couverture permanente | B | Couvertures perdues | Moyen |
| 9 | `imageLinks` / `authors` / `formatDate` sans garde | D1, D4, D5, D6 | Crash sur données importées | Faible |
| 10 | `READ_MEDIA_IMAGES` absente du manifeste | H5, C4 | Latent, bloquant à terme | Trivial |
| 11 | Regex `/\d/g` réutilisée avec `.test()` | D3 | Saisie rejetée 1 fois sur 2 | Trivial |
| 12 | `getData` renvoie un `Error` comme donnée | E1 | Corruption silencieuse | Trivial |
| 13 | `bookSourceProvider` lit AsyncStorage au rendu | E2 | Perf, lectures en boucle | Trivial |
| 14 | Clé API affichée et journalisée en clair | F1, F2 | Fuite | Trivial |
| 15 | `handleExport` écrit une liste périmée | E4 | Perte de données | Faible |
| 16 | 4 copies du flux de recherche | A8 | Cause racine de #3 | Élevé |

---

## I. Feuille de route de remédiation

Découpage proposé, chaque phase étant vérifiable indépendamment.

### Phase 1 — Débloquer le build ✅ FAIT

Rendre la signature release conditionnelle dans `android/app/build.gradle` (garde `hasReleaseKeystore` : le `.env` existe **et** le keystore existe), ajouter `android/.env.example` + une section « Release builds » au README, corriger `react-native.config.js` (`com.bugsdev2.bookaccio`, supprimer la clé `ios`), supprimer `index.js`, et **ajouter `READ_MEDIA_IMAGES` à la main** dans le manifeste (pas de `prebuild --clean`, cf. H5).

*Sortie de phase :* `cd android && ./gradlew :app:assembleDebug` réussit sur un clone vierge, sans `.env`. **Vérifié** — voir le journal d'exécution en fin de document.

### Phase 2 — Recherche ✅ FAIT

Centraliser la construction d'URL et la classification d'erreurs dans un module unique (`helpers/googleBooksApi.ts`) :

- `encodeURIComponent` sur la valeur de `q` ; l'opérateur `isbn:` reste littéral ;
- normalisation ISBN (`replace(/[^0-9Xx]/g, '')`, validation longueur 10/13) ;
- `sanitizeApiKey` tolérant `undefined` et l'objet `Error` d'E1 ;
- classification `network` / `auth` / `rate-limit` / `server` / `invalid-isbn` à partir du statut HTTP et de `error.errors[0].reason`.

Les helpers retournent `[]` / `undefined` pour « aucun résultat » et **lèvent** sinon — c'est ce qui rend A3 réparable. Un mapper unique traduit chaque cas en alerte, avec 12 nouvelles clés à ajouter **aux quatre** fichiers de `locales/` (en profiter pour corriger `de.json:120`).

Puis appliquer le même diff aux 4 écrans : ajouter `useApiKeyContext` dans `unfinished.tsx`, remplacer le `axios.get(selfLink)` par un appel à l'endpoint `/volumes/{id}`, sortir le `router.push` du `finally`, et supprimer le paramètre `url` mort de `handleBookSelection`.

*Sortie de phase :* `npx tsc --noEmit` — les 3 erreurs d'arité de `unfinished.tsx` ont disparu. **Vérifié**, voir le journal. Sur device : recherche par titre avec `&`, ISBN avec tirets, ISBN trop court, mode avion, clé bogus, et les 4 onglets doivent se comporter identiquement.

### Phase 3 — Couverture ✅ FAIT

1. `try/catch` + alerte utilisateur autour de `launchImageLibraryAsync` (corrige H3, qui masque tout le reste).
2. `allowsEditing: false`, retirer `aspect`, `quality: 0.8`, `mediaTypes: ['images']` explicite (H2, H4).
3. Lancer le picker depuis `onModalHide` plutôt que dans le même tick que la fermeture (H6).
4. Copier l'image choisie du cache vers `documentDirectory/covers/` avant de la persister, et supprimer l'ancien fichier au remplacement et à la suppression du livre.

Sur le choix d'API `expo-file-system` : utiliser la **nouvelle** API `File` / `Directory` / `Paths` (l'entrée principale de la v19), pas `/legacy`. `settings.tsx` doit rester sur `/legacy` de toute façon, parce que `StorageAccessFramework` n'existe que là — la « cohérence » n'est donc pas atteignable et n'est pas le bon critère.

**Pas de migration des enregistrements existants.** Ces URI de cache pointent déjà, par définition, vers des fichiers purgés ou sur le point de l'être ; réécrire tout le `bookList` au démarrage, dans une app dont la seule persistance est un blob JSON sans version ni sauvegarde, est un risque de perte de données pour un bénéfice quasi nul. La panne est rendue inoffensive à la place, via le `onError` de la phase 4.

*Sortie de phase :* après `adb shell pm trim-caches 999G`, une couverture ajoutée manuellement s'affiche toujours.

### Phase 4 — Durcissement ✅ FAIT

Un composant `BookCover` unique (`uri?: string | null`, `onError` → placeholder) remplace les cinq sites de rendu de D1 ; initialiseurs `useState` tolérants dans `[editBook].tsx` et `[bookdetails].tsx` (D2, H1) — en gardant les hooks inconditionnels et en sortant le `return` anticipé **après** le dernier hook ; `/\d/` sans `g` (D3) ; garde de date dans `formatDate` (D4) ; `getData` renvoyant `undefined` (E1) ; `useEffect` dans `bookSourceProvider` (E2) ; clé API retirée des alertes et des logs (F1, F2).

*Test de régression le plus rentable :* exporter la bibliothèque, retirer à la main `imageLinks` d'un enregistrement et pointer le `thumbnail` d'un autre vers un fichier de cache inexistant, réimporter. Les deux doivent afficher le placeholder, sans crash en liste, en détail ni en édition.

### Phase 5 — Suite ✅ FAIT

Extraire un hook `useBookSearch(targetState)` regroupant les ~100 lignes dupliquées dans les 4 écrans (A8). **À ne pas mélanger avec les phases 2-3** : le diff de la phase 2 est mécanique et relisible ligne à ligne ; fusionner un refactor dedans rendrait impossible de distinguer un changement de comportement d'un déplacement de code, dans un dépôt sans aucun test. C'est cette duplication qui a causé A2 — le refactor est la prévention, pas le correctif.

---

## J. Protocole de vérification

Rien n'a pu être exécuté pendant l'audit. Dans l'ordre :

```bash
npm install
npx tsc --noEmit          # attendu : 3 erreurs d'arité dans app/(unfinished)/unfinished.tsx
npx expo lint
npx expo-doctor
```

Débloquer le build :

```bash
printf 'KEYSTORE_FILE=debug.keystore\nKEYSTORE_PASSWORD=android\nKEY_ALIAS=androiddebugkey\nKEY_PASSWORD=android\n' > android/.env
cd android && ./gradlew :app:assembleDebug --console=plain
cd .. && npx expo run:android
```

Crash couverture :

```bash
adb logcat -c
adb logcat -b crash & adb logcat -s ReactNativeJS:V ExpoImagePicker:V AndroidRuntime:E Fresco:V
# reproduire l'ajout de couverture, conserver la trace
```

Puis bisecter dans cet ordre : `allowsEditing: false` (H2) → `always_finish_activities 1` (H1) → photo pleine résolution vs capture d'écran (H4).

Recherche : tester les 4 écrans (Accueil, Lus, À lire, **Non terminés**), par titre et par ISBN, avec et sans clé configurée. L'onglet « Non terminés » doit échouer dans **tous** les cas — c'est le marqueur de A2.


---

## K. Journal d'exécution — Phase 1

Exécutée le 2026-09-13. Aucun commit n'a été créé ; les modifications sont dans l'arbre de travail.

### Modifications

| Fichier | Changement |
|---|---|
| `android/app/build.gradle` | `loadEnvProperties()` tolère l'absence de `android/.env` ; garde `hasReleaseKeystore` (4 propriétés présentes **et** keystore existant) ; `signingConfig = hasReleaseKeystore ? signingConfigs.release : null` |
| `android/.env.example` | **Nouveau** — template commenté des 4 variables de signature |
| `README.md` | Section « Building from source » (debug vs release) |
| `react-native.config.js` | `com.bookaccio.app` → `com.bugsdev2.bookaccio` ; clé `ios` supprimée |
| `index.js` | **Supprimé** (importait `./App`, inexistant ; `main` est `expo-router/entry`) |
| `android/app/src/main/AndroidManifest.xml` | `READ_MEDIA_IMAGES` ajoutée à la main, **sans** `prebuild --clean` |

Choix assumé : sans `android/.env`, la release est laissée **non signée** plutôt que repliée sur la clé debug. C'est le comportement par défaut d'AGP, c'est ce qu'attend un build F-Droid reproductible, et cela rend impossible la publication accidentelle d'une release signée en debug. Basculer sur `signingConfigs.debug` si l'on préfère un APK release installable en local.

### Vérifications

**C1 prouvé, pas déduit.** Avec l'ancien `build.gradle` restauré et aucun `.env` :

```
* Where: Build file 'android/app/build.gradle' line: 9
* What went wrong: A problem occurred evaluating project ':app'.
  > /home/scandinave/Developpement/bookaccio/android/.env (Aucun fichier ou dossier de ce nom)
```

Ce qui confirme au passage que le chemin visé est bien `android/.env` (résolution relative à `android/app`), et non le `.env` de la racine.

Après correctif, sans `.env` (conditions d'un clone vierge) :

```
android/.env not found - release signing is disabled (see android/.env.example)
BUILD SUCCESSFUL in 2m 35s
365 actionable tasks: 341 executed, 24 up-to-date
```

APK produits : `app-{arm64-v8a,armeabi-v7a,x86,x86_64,universal}-debug.apk`. La variante release configure également (`:app:assembleRelease --dry-run` → `BUILD SUCCESSFUL`).

Environnement : JDK 21 (Gradle 8.14.3 ne supporte pas le JDK 25 installé par défaut), `ANDROID_HOME=~/Android/Sdk`, pas de `android/local.properties`.

**A2 confirmé.** `npx tsc --noEmit` :

```
app/(unfinished)/unfinished.tsx(62,24): error TS2554: Expected 2 arguments, but got 1.
app/(unfinished)/unfinished.tsx(74,24): error TS2554: Expected 2 arguments, but got 1.
app/(unfinished)/unfinished.tsx(100,24): error TS2554: Expected 2 arguments, but got 1.
app/(unfinished)/unfinished.tsx(195,17): error TS2820: Type '"search1"' is not assignable…
```

Ces 4 erreurs sont la **baseline** : la phase 2 doit les faire disparaître sans en introduire d'autres.

### Reste ouvert

- `npx expo-doctor` : 3 checks en échec (peer dep `react-native-worklets`, dérive CNG, 10 paquets en retard de patch) — détaillés en section G.
- Le crash de la couverture (section B) n'est toujours **pas** reproduit : il demande un device.


---

## L. Journal d'exécution — Tests sur appareil réel

Exécutés le 2026-09-14 sur **Xiaomi M2007J3SY / LineageOS / Android 16 (API 36) / arm64-v8a**, build debug issu de la phase 1, Metro en `adb reverse`, aucune clé API configurée (installation neuve).

### Bug 1 — Recherche : **REPRODUIT**

| Chemin | Ce que voit l'utilisateur | Ce que dit le log |
|---|---|---|
| ISBN `9780747532699` | « Book not found / Try searching with the title or add the book manually » | `[AxiosError: Request failed with status code 429]` |
| Titre `1984` | « Book not found / Sorry! Your book isn't in the database… » | `[AxiosError: Request failed with status code 429]` |

La chaîne A1 → A3 est confirmée bout en bout : aucune clé → `&key=` vide → Google rejette → `catch` → `undefined` → alerte générique. **L'utilisateur est informé d'une absence de résultat alors qu'il s'agit d'un échec d'authentification/quota.**

**Correction d'une prédiction de l'audit.** La section A1 annonçait un **HTTP 400 `keyInvalid`**. Le rejet observé aujourd'hui est un **HTTP 429 `rateLimitExceeded`** :

```
$ curl -s 'https://www.googleapis.com/books/v1/volumes?q=isbn:9780747532699'
HTTP 429
reason: rateLimitExceeded
message: Quota exceeded for quota metric 'Queries' and limit 'Queries per day'
         of service 'books.googleapis.com' for consumer 'project_number:624717413613'
```

`624717413613` est le projet **anonyme partagé** de Google : les requêtes sans clé sont plafonnées globalement et sont actuellement saturées. Le code de statut exact diffère donc de la prédiction, mais l'effet sur l'app est identique, et cela **renforce** la décision produit de rendre la clé obligatoire — l'accès anonyme n'est pas fiable. Le correctif de la phase 2 doit donc traiter `429` comme un cas de premier ordre, au même titre que `400`/`403`.

### Bug 2 — Crash couverture : **NON REPRODUIT**

Le flux complet a été exercé depuis l'écran d'ajout **et** depuis l'écran d'édition :

couverture → « Select Image from Gallery » → Photo Picker système → sélection → `expo.modules.imagepicker.ExpoCropImageActivity` → « REDIMENSIONNER » → retour au formulaire, couverture affichée.

Aucun crash. PID inchangé (24033) sur toute la séquence. Testé avec :

- une image 1000×1500 (~48 Ko) ;
- une image **8000×6000 (~48 Mpx)** — pas d'`OutOfMemoryError`, rien côté Fresco → **H4 non confirmée** ;
- `always_finish_activities=1` → pas de crash, l'état du formulaire est restauré.

**Corrections d'hypothèses :**

- **H2 est à écarter sous cette forme.** Le recadrage n'est pas un intent tiers susceptible d'être absent : `expo-image-picker` embarque sa propre activité `ExpoCropImageActivity`, présente et fonctionnelle. `allowsEditing: true` reste discutable (étape imposée, qualité `1`), mais ce n'est pas un « activity not found ».
- **H1 reste non testée.** `always_finish_activities` ne détruit que l'Activity : le contexte JS survit, donc `fullBookList` n'est pas vidé et la condition de crash n'est pas atteinte. Tuer le process pendant que le picker est au premier plan nécessite `adb root`, désactivé sur cet appareil (`am kill` refuse tant que la tâche est visible). L'analyse statique de D2 reste valable, la reproduction reste à faire.
- **H5 : angle mort méthodologique.** `READ_MEDIA_IMAGES` a été ajoutée au manifeste **en phase 1, avant ce test**. On ne peut donc pas savoir si elle était la cause et si la phase 1 a déjà corrigé le bug. Pour trancher : retirer la ligne, rebuild, réinstaller, rejouer le flux.

### Perte de couverture : **CONFIRMÉE ET DÉMONTRÉE**

Contenu réel d'AsyncStorage après ajout d'une couverture (lu via `adb shell run-as … cat databases/RKStorage`) :

```json
{ "id": 566629725, "title": "1984",
  "imageLinks": { "thumbnail":
    "file:///data/user/0/com.bugsdev2.bookaccio/cache/ImagePicker/2669c0a0-…-50da5d38efa4.jpeg" } }
```

Après `rm -rf cache/ImagePicker` (ce qu'Android fait de lui-même) et redémarrage : **la couverture a disparu de la fiche, sans retomber sur le placeholder** — l'emplacement est simplement vide. Cela confirme d'un coup le stockage d'un URI éphémère **et** l'absence de `onError` sur les `<Image>` (D1).

### Confirmations annexes

- **E2 touche aussi `providers/options/preventScreenShotProvider.tsx`**, et c'est pire qu'ailleurs : l'appel `getData(...).then(...)` en phase de rendu y déclenche en plus `ScreenCapture.preventScreenCaptureAsync()` / `allowScreenCaptureAsync()`, donc un aller-retour vers un **module natif à chaque rendu** d'un provider qui enveloppe toute l'app.

### Artefacts de l'environnement de dev (à ne pas confondre avec des bugs de l'app)

- Au démarrage, une red box `Uncaught (in promise) Error: Unable to activate keep awake` : c'est `expo-keep-awake` du mode dev, refusé par LineageOS. Absent en release.
- Piloter la saisie avec `adb shell input text` sur un texte contenant un **`r`** recharge l'application : le raccourci clavier « R = Reload » du dev menu React Native intercepte les touches injectées même quand un champ a le focus. Utiliser des saisies sans `r` pour les tests automatisés.


---

## M. Journal d'exécution — Phase 2 (recherche)

Exécutée le 2026-09-14. Code uniquement : aucune branche, aucun commit créé.

### Fichiers

| Fichier | Nature |
|---|---|
| `helpers/googleBooksApi.ts` | **Nouveau** — construction d'URL, `sanitizeApiKey`, `normalizeIsbn`, `classifyAxiosError`, type `BookApiResult` |
| `helpers/getVolumeById.ts` | **Nouveau** — remplace les `axios.get` inline et le `selfLink` de `unfinished.tsx` |
| `helpers/bookSearchAlert.ts` | **Nouveau** — `alertBookApiFailure` / `alertNoResult` |
| `helpers/getBookDetails.ts`, `helpers/getBookByIsbn.ts` | Réécrits sur `BookApiResult` |
| `app/(tabs)/home.tsx`, `read.tsx`, `to-read.tsx`, `app/(unfinished)/unfinished.tsx` | Même diff, `BookState` près |
| `locales/{en,fr,de,it}.json` | 13 clés ajoutées (+ correction de la chaîne allemande corrompue) |

Le diff est de ~90 lignes par écran et **+57/−1** sur les locales : l'insertion est textuelle, la mise en forme d'origine (lignes vides de regroupement) est préservée.

Choix d'implémentation notable : **type `Result` en union discriminée plutôt qu'une sous-classe d'`Error`**. `class X extends Error` passe par le helper Babel `wrapNativeSuper` — dont la trace apparaissait dans la red box d'`expo-keep-awake` pendant les tests de la session précédente — et `instanceof` y est un piège connu sous Hermes.

Correctif de sécurité inclus au passage : les `console.log(err)` journalisaient l'`AxiosError` complète, **dont `config.url` qui contient la clé API** (F2). Remplacés par un `logApiError` qui ne sort que `err.message`. Vérifié sur appareil : les logs montrent `'Request failed with status code 400'`, sans URL.

### Vérification statique

`npx tsc --noEmit` — les **3 erreurs `TS2554`** d'arité dans `unfinished.tsx` ont disparu. Il ne reste que la 4ᵉ, hors périmètre et attendue :

```
app/(unfinished)/unfinished.tsx(231,17): error TS2820: Type '"search1"' is not assignable...
```

Cette icône invalide est d'ailleurs **visible à l'écran** : le bouton « Search Title » de l'onglet Unfinished affiche un `?` à la place du pictogramme. Correctif d'une ligne, à planifier.

`npx expo lint` — aucun avertissement sur les trois nouveaux helpers ; les imports `Alert` devenus inutilisés ont été retirés des quatre écrans. Les avertissements restants préexistent.

> Note : `npx expo lint` installe ESLint à sa première exécution (`eslint`, `eslint-config-expo` dans `package.json`, création d'`eslint.config.js`, ~6000 lignes de `package-lock.json`). Ces modifications ont été retirées de l'arbre de travail : elles n'appartiennent pas à la phase 2. À intégrer délibérément si l'on veut du lint en CI.

### Vérification sur appareil

Xiaomi M2007J3SY / Android 16, bundle Metro reconstruit (1675 modules).

| Scénario | Résultat | Preuve |
|---|---|---|
| Titre, **sans clé** | « **API key required** » | Remplace « Book not found » — le bug d'origine |
| ISBN `12345` | « **Invalid ISBN** » | **Aucun log réseau** : validation locale, aucune requête émise |
| Titre, clé bidon, **mode avion** | « **Network error** » | `'[bookSearch] title search:', 'Network Error'` |
| Titre, clé bidon, réseau OK | « **API key problem** » | `'Request failed with status code 400'` |
| **Onglet Unfinished**, clé bidon | « **API key problem** » | `'Request failed with status code 400'` — un vrai 400 de Google prouve que **la clé est enfin transmise** ; l'écran envoyait `key=undefined` |

Les branches `missing-key`, `invalid-isbn`, `network` et `auth` sont donc validées de bout en bout, et **A2 est corrigé et prouvé**.

Non testés, faute de moyen : le **chemin nominal** (nécessite une vraie clé Google Books, que je n'ai pas) et la branche **`rate-limit`** (429 difficile à provoquer avec une clé dédiée). Le 429 avait été observé en session précédente sur l'endpoint anonyme, ce qui a motivé son traitement en cas de premier ordre.

Méthode : la clé bidon a été injectée directement dans AsyncStorage (`adb shell run-as` + SQLite), l'UI des réglages refusant d'enregistrer une clé invalide via `checkApiKey`.

### État de l'appareil

Restauré : clé bidon, `showUnfinished` et la bibliothèque de test supprimés d'AsyncStorage ; mode avion remis sur **activé**, son état initial. L'application reste installée.

### Complément — test du chemin nominal avec une clé valide

Réalisé le 2026-09-14 avec une clé Google Books fournie temporairement par le mainteneur, injectée dans AsyncStorage puis **supprimée de l'appareil** ; elle n'apparaît dans aucun fichier du dépôt et a été révoquée après le test.

| Scénario | Résultat |
|---|---|
| Titre `1984`, clé valide | Résultats affichés, identiques à ceux de l'API en direct |
| Sélection d'un résultat | Formulaire pré-rempli (titre, auteur, 1251 pages, ISBN) — `getVolumeById` OK |
| ISBN `978-0-7475-3269-9` (tirets) | « Harry Potter and the Philosopher's Stone » |
| ISBN `978 0747 532699` (espaces internes) | Livre trouvé |
| **Onglet Unfinished**, titre `1984` | Résultats affichés, et sélection → formulaire pré-rempli avec le statut Unfinished |

Les 5 branches d'erreur plus le chemin nominal sont donc couverts. **Phase 2 entièrement validée.**

**Correction d'une affirmation de l'audit (A5).** L'audit supposait que l'absence de normalisation faisait échouer les ISBN à tirets. C'est faux : Google tolère les tirets, les espaces de bord et les sauts de ligne. Vérifié :

| Requête | Résultat |
|---|---|
| `isbn:978-0-7475-3269-9` | `totalItems: 1` — fonctionnait déjà |
| `isbn:978 0747 532699` | **`totalItems: 0`** — échouait |

La valeur réelle de `normalizeIsbn` est donc double : les **espaces internes** (saisie manuelle plausible), et surtout la **validation de longueur**, qui transforme un code non-livre en « ISBN invalide » immédiat, sans requête réseau.

**Confirmation de A4 (encodage), elle bien réelle.** Pour le titre `Q & A` :

| Code | URL envoyée | 1er résultat |
|---|---|---|
| Ancien (`join('+')`) | `q=q+&+a` | « La source des paroles de Jésus (Q) » — la requête est tronquée au `&`, on cherche `q` seul |
| Nouveau (`encodeURIComponent`) | `q=Q%20%26%20A` | « Mergers, Acquisitions, and Buyouts » — on cherche bien `Q & A` |

**L'icône `search1` confirmée à l'exécution.** Metro émet `WARN "search1" is not a valid icon name for family "anticon"`, et le bouton « Search Title » de l'onglet Unfinished affiche un `?`. L'erreur `TS2820` n'est pas théorique ; correctif d'une ligne à planifier.

**F2 revérifié avec une vraie clé en circulation** : les logs Metro ne montrent que `[bookSearch] title search: Request failed with status code 400`, sans URL ni clé.

### Reste à faire pour clore la phase

- Relecture **DE et IT** par un locuteur natif (13 chaînes chacune) — à signaler dans la PR.
- ~~Test du chemin nominal avec une clé Google Books valide.~~ **Fait**, voir ci-dessus.


---

## N. Journal d'exécution — Phase 3 (couverture)

Exécutée le 2026-09-14. Code uniquement : aucune branche, aucun commit.

### Fichiers

| Fichier | Nature |
|---|---|
| `helpers/bookCoverStorage.ts` | **Nouveau** — `persistCoverIfNeeded`, `deleteBookCover`, `isManagedCover` |
| `app/(addBook)/[addBook].tsx`, `app/(editBook)/[editBook].tsx` | Picker durci, persistance à l'enregistrement, lancement via `onModalHide` |
| `components/bookItem.tsx` | Suppression du fichier de couverture avec le livre |
| `locales/{en,fr,de,it}.json` | 1 clé (`image-pick-failed`) |

Diff : **+99 / −44** hors nouveau fichier.

### Deux décisions prises contre le plan initial, sur la base des tests

**Le recadrage est conservé.** Le plan prévoyait `allowsEditing: false` pour neutraliser H2. Les tests de la session précédente ont montré que `ExpoCropImageActivity` — une activité fournie par Expo, pas un intent tiers — fonctionne parfaitement, y compris sur une image 48 Mpx. Supprimer une fonctionnalité qui marche pour une hypothèse invalidée n'aurait pas été justifié. Seuls `quality` (1 → 0.8) et `mediaTypes: ['images']` explicite ont changé.

**La persistance se fait à l'enregistrement, pas au choix de l'image.** Le plan copiait le fichier dès la sélection, ce qui laissait un orphelin si l'utilisateur abandonnait le formulaire, et imposait un `pruneOrphanCovers` de rattrapage. En copiant au moment du `handleAddBook` / `handleEditBook`, le fichier n'existe que pour un livre qui existe : plus d'orphelins, et le `pruneOrphanCovers` prévu en 4.4 devient inutile.

**Piège évité.** Le plan suggérait `selectionLimit: 1`. Les types d'`expo-image-picker` 17 sont explicites : l'option est **mutuellement exclusive avec `allowsEditing`**, et l'aurait silencieusement désactivé. Non passée.

Corrections d'accompagnement, dans des fonctions réécrites de toute façon : `handleAddBook` ne mute plus `fullBookList` en place via `.push()`, et `deleteBook` ne fait plus de `splice` pendant un `.map()` sur le tableau en cours d'itération (E3).

### Vérification sur appareil

Xiaomi M2007J3SY / Android 16.

| Étape | Résultat |
|---|---|
| Choix d'une image, avant enregistrement | `files/covers/` **n'existe pas** — la persistance à l'enregistrement est bien effective |
| Après « Add Book » | `files/covers/cover-7742577268-1789418164125.jpeg`, et l'URI stockée pointe vers `documentDirectory`, plus vers le cache |
| **`rm -rf cache/ImagePicker` + redémarrage** | **La couverture reste affichée** — capture à l'appui. C'était le scénario qui échouait |
| Remplacement de la couverture en édition | Un seul fichier dans `files/covers/`, le nouveau ; l'ancien est supprimé |
| Suppression du livre | `files/covers/` vide |
| Lancement du picker via `onModalHide` | Photo Picker puis recadrage, sans incident |

Le bug de perte de couverture, démontré en session précédente par un carton vide, est corrigé et vérifié visuellement.

`npx tsc --noEmit` : seule subsiste l'erreur `search1` préexistante.

### Non couvert par cette phase

- Le `try/catch` ajouté autour du picker n'a **pas pu être déclenché** : aucun échec ne s'est produit sur cet appareil. C'est du durcissement non testé.
- **H1 reste ouverte** (mort du process pendant le picker → `selectedBook!.id`), volontairement renvoyée en phase 4 avec le reste du durcissement des écrans.
- Les enregistrements **existants** qui portent encore une URI de cache ne sont pas migrés — décision assumée. Ils resteront sans image tant que la phase 4 n'aura pas ajouté le repli `onError` vers le placeholder.

### État de l'appareil

Restauré : AsyncStorage vidé, `files/covers/` et `cache/ImagePicker` supprimés, images de test retirées de la galerie, veille remise à 60 s, mode avion réactivé.


---

## O. Journal d'exécution — Phase 4 (durcissement)

Exécutée le 2026-09-14, découpée en **4 commits** sur `main`.

| Commit | Portée |
|---|---|
| `ffcec1f` | 4a — composant `BookCover` unique, 6 sites de rendu |
| `d9ec6b3` | 4b — gardes anti-crash, `types.d.ts` |
| `cd9eb18` | 4c — providers, `storage.ts`, fuite de clé API |
| `800a588` | 4d — i18n de la section clé API (36 clés × 4 langues) |

### Deux constats qui ont changé l'ampleur prévue

**E2 était très sous-estimé dans l'audit.** Il annonçait 2 providers fautifs ; il y en avait **11 sur 12**. Tous appelaient `getData` dans le corps du rendu. `apiKeyProvider` était le seul correct et a servi de modèle.

**Le typage ne couvrait rien.** `imageLinks` et `authors` étaient déclarés obligatoires sur `Book`, alors que les données persistées ne les ont jamais garantis — donc `tsc` ne signalait aucun déréférencement non gardé. Les passer en optionnel n'a produit que **3 erreurs**, toutes dans des fichiers déjà en périmètre : la condition d'abandon du plan n'était pas atteinte, le changement est conservé. Le compilateur vérifie désormais les gardes.

### Deux bugs trouvés en cours de route, absents de l'audit

- `[bookdetails].tsx` : la garde était `if (!book) { null; }` — une expression sans effet, pas un `return`. Le composant renvoyait `undefined`, que React rejette.
- `categories` est optionnel mais lu à travers un double `!`. **Le test de régression l'a fait tomber** : `Cannot read property 'join' of undefined`. Extrait dans `helpers/formatCategories.ts`.

### Vérification sur appareil

Jeu de données volontairement dégradé injecté dans AsyncStorage : un livre sans `imageLinks`, un avec une URI de cache morte, un sans `authors`, un sans `startDate`.

| Écran | Avant | Après |
|---|---|---|
| Liste | crash sur le livre sans `imageLinks` | les 4 s'affichent avec le **placeholder** (capture à l'appui) |
| Détail | crash | s'ouvre, date vide au lieu d'une `RangeError` |
| Édition | crash | s'ouvre |
| Progression, 2 sauvegardes d'affilée | la 2ᵉ rejetée (« invalid number ») | 25 % → 38 %, les deux acceptées |
| Clé API hors ligne | « clé incorrecte » | « Network error » |
| Clé API valide | alerte contenant la clé en clair | « Votre clé API a été mise à jour », 0 occurrence de la clé à l'écran |
| Réglages + instructions en FR | anglais codé en dur | intégralement traduits, sans erreur de rendu |

Un **503** transitoire de Google a été rencontré en cours de test : classé « Service unavailable », ce qui est le comportement attendu.

### Limites

- L'écran **Statistiques est inatteignable** : son lien est commenté dans `app/(tabs)/_layout.tsx:312`. La garde sur `authors` y est donc corrigée mais non testable par l'UI.
- H1 (mort du process pendant le picker) reste **non reproduite** faute de `adb root`, mais sa conséquence — l'écran d'édition sur une liste vide — est désormais traitée.
- L'erreur `TS2820` sur l'icône `"search1"` subsiste volontairement : hors périmètre, correctif d'une ligne à planifier.
- **DE et IT** des 36 nouvelles chaînes sont à faire relire.

### État de l'appareil

AsyncStorage vidé, `files/covers` et `cache/ImagePicker` supprimés, clé API effacée (0 occurrence), veille remise à 60 s, mode avion réactivé.


---

## P. Journal d'exécution — Phase 5 (déduplication + multi-sources)

Exécutée le 2026-09-15. **Aucun commit** : tout est dans l'arbre de travail.

La phase prévoyait d'extraire un hook et de *supprimer* la branche Open Library morte. La consigne a changé la seconde moitié : **implémenter Open Library**, avec choix des sources actives et de leur ordre.

### Architecture

| Fichier | Rôle |
|---|---|
| `helpers/bookApi.ts` | **Nouveau** — noyau neutre : `BookApiResult`, `normalizeIsbn`, `classifyHttpError`, `logApiError` |
| `helpers/googleBooksApi.ts` | Réduit au spécifique Google : endpoints, `sanitizeApiKey`, `classifyGoogleError` |
| `helpers/sources/{types,googleBooksSource,openLibrarySource,index}.ts` | **Nouveaux** — contrat `BookSource` et cascade |
| `hooks/useBookSearch.ts` | **Nouveau** — état + handlers des 4 écrans |
| `providers/bookSourcesProvider.tsx`, `components/bookSourceSettings.tsx` | **Nouveaux** — configuration et UI |

Découpage du noyau fait **avant** d'écrire la source Open Library, pour qu'elle n'importe rien de `googleBooksApi.ts` : les deux sources sont sœurs.

Chaque source expose `isConfigured(apiKey)` plutôt qu'un drapeau `requiresApiKey` — le noyau n'a pas à savoir ce qu'est une clé.

### Résultat chiffré

Les 4 écrans passent de 1697 à 1247 lignes ; le hook en fait 146. **~300 lignes nettes en moins**, et 120 lignes de types OL supprimées. 5 fichiers morts supprimés.

**`tsc` est à zéro erreur** : le refactor a emporté le JSX fautif, donc l'icône `"search1"` qui constituait la baseline depuis la phase 1 a disparu — corrigée en `"search"`, elle s'affichait comme un `?` à l'écran.

### Vérification sur appareil

| Scénario | Résultat |
|---|---|
| Open Library seule, **aucune clé** | Recherche, couvertures et formulaire fonctionnels |
| Google en tête **sans clé** | Ignoré en silence, résultats d'Open Library, **aucune alerte** |
| Google en tête **avec clé** | Résultats Google, Open Library non interrogée |
| Google en tête, **Google renvoie 503** | Repli automatique sur Open Library, résultats affichés |
| Réglages : décocher la dernière source | Refusé, « At least one source must stay enabled. » |
| Réglages : réordonner + redémarrer | Ordre conservé (`[google-books, open-library]`) |
| **Onglet Unfinished** | Identique aux trois autres — la garantie du hook |

Le cas 503 s'est produit spontanément et a démontré la cascade mieux qu'un test monté de toutes pièces.

### Deux défauts de mon code, trouvés par les tests

- `useSelectedBookContext` levait une erreur sur `selectedBook === undefined`, or `undefined` est devenu la valeur initiale légitime (« aucun livre sélectionné »). Le garde ne teste plus que le setter.
- `BouncyCheckbox` rend son propre `<Text>` en pleine largeur même sans libellé : mon `<Text>` voisin restait vide et poussait les flèches hors écran. Corrigé en utilisant sa prop `text`.

### Caractéristique d'Open Library à connaître

`number_of_pages_median` est **absent de certaines œuvres** (vérifié : `/works/OL30827457W` pour « 1984 » de George Orwell). Le nombre de pages arrive alors à 0 et doit être saisi à la main. Ce n'est pas un défaut du mappage mais de la donnée source.

### Hors périmètre, signalé

`app/(tabs)/_layout.tsx` et `app/(unfinished)/_layout.tsx` partagent **~380 lignes** — duplication plus grosse que celle traitée ici. Deux vrais défauts y subsistent : `(unfinished)/_layout.tsx:275,281,287` code en dur trois libellés anglais de tri (bug d'i18n), et son `CustomIcon` (lignes 105-116) n'est jamais utilisé.

### Reste à faire

- Relecture **DE et IT** des 2 nouvelles chaînes, et des 36 de la phase 4.
- `helpers/getBookDetails.ts` / `getBookByIsbn.ts` / `getVolumeById.ts` ne sont plus appelés que par `googleBooksSource.ts` ; ils pourraient y être absorbés.

### État de l'appareil

AsyncStorage vidé, clé API effacée (0 occurrence), couvertures et cache supprimés, veille à 60 s, mode avion réactivé.
