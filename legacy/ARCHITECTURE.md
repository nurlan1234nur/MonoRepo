# nous app architecture review

## Одоогийн байдал

Энэ folder одоогоор single-page PWA prototype байна.

- `nous_app.html` нь UI, CSS, markup, JavaScript бүгдийг нэг файлд агуулсан.
- `manifest.json` нь installable PWA metadata болон icons зааж байна.
- `sw.js` нь app shell болон runtime GET cache хийдэг cache-first service worker.
- `make_icons.py` нь icon PNG-үүдийг үүсгэдэг туслах script.

## Бодит боломжууд

Одоогийн app дараах screen-үүдтэй:

- `home`: moment card, daily question, mood card, quick stats.
- `timeline`: static milestone list.
- `chat`: static эхлэл messages, local DOM дээр нэмэгдэх simulated chat.
- `memories`: static emoji/photo grid.
- `more`: Dream Jar, Song of Us, Time Capsule, Memory Map, games, notes, reminders гэсэн feature entry points.

JavaScript-ийн бодит behavior:

- `switchScreen(name)` bottom nav-аар screen солих.
- `showToast(msg)` temporary toast харуулах.
- `reactMoment(btn, emoji)` moment reaction-ийн button text/style өөрчлөх.
- `sendMsg()` chat input-оос message DOM-д нэмээд random canned reply үүсгэх.
- `setMood(emoji, text)` mood card-ийн DOM text солих.
- `saveCapsule()` capsule textarea-г шалгаад modal хаах, гэхдээ data хадгалахгүй.
- Service worker registration.

## Data хадгалалтын үнэлгээ

Одоогоор persistent app data байхгүй.

- `localStorage`, `sessionStorage`, `IndexedDB` ашиглаагүй.
- Chat messages refresh хийхэд алга болно.
- Mood refresh хийхэд default руу буцна.
- Capsule text save хийхэд DOM input цэвэрлэгдэнэ, хадгалагдахгүй.
- Timeline, memories, profile/stat counters бүгд hardcoded.
- Backend, auth, sync, realtime API байхгүй.

Энэ нь prototype/demo-д тохиромжтой боловч жинхэнэ couple app болгоход хамгийн түрүүнд data model болон persistence layer хэрэгтэй.

## Offline логикийн үнэлгээ

`sw.js`:

- Install дээр `nous_app.html`, manifest, icons-ийг cache-д хийж байна.
- Activate дээр хуучин cache устгаж байна.
- Fetch дээр GET request бүрт cache-first strategy ашиглаж байна.
- Successful basic/cors response-уудыг runtime cache-д нэмнэ.

Сул тал:

- `CACHE = 'nous-v1'` гараар bump хийхгүй бол шинэ HTML/CSS/JS update хэрэглэгч дээр удаан гацаж магадгүй.
- Cache-first strategy HTML-д ашиглагдаж байгаа тул шинэ хувилбар татах UX байхгүй.
- Offline fallback page байхгүй.
- Runtime cache expiry/limit байхгүй.
- Google Fonts cache-д орох магадлалтай ч font failure-д local fallback strategy алга.
- User-generated data cache биш, огт persistence байхгүй.

## Эрсдэлүүд

- `addMsg()` user input-ийг `innerHTML`-ээр оруулж байгаа тул XSS эрсдэлтэй.
- Inline `onclick`-ууд олон тул component/state рүү задлахад саадтай.
- Бүх feature hardcoded тул нэг feature нэмэх бүрт HTML томорч, regression амархан үүснэ.
- Date/counter утгууд static учраас өнөөдрийн огноотой нийцэхгүй.
- Manifest text өмнөх command output дээр encoding mojibake болж харагдсан; файлыг UTF-8 гэж баталгаажуулах хэрэгтэй.

## Санал болгох өсөлтийн архитектур

### Phase 1: Single-file prototype-оо найдвартай болгох

Зорилго: backend оруулахгүйгээр app refresh/offline-д data алдахгүй болгох.

- `appState` object үүсгэх:
  - `profile`
  - `moods`
  - `messages`
  - `moments`
  - `memories`
  - `milestones`
  - `capsules`
  - `settings`
- `storage.js` маягийн layer гаргах, эхний хувилбарт `localStorage` ашиглах.
- Render functions гаргах:
  - `renderHome(state)`
  - `renderChat(state)`
  - `renderTimeline(state)`
  - `renderMemories(state)`
  - `renderMore(state)`
- User input DOM-д хийхдээ `textContent` ашиглаж XSS засах.
- Inline `onclick`-уудыг `addEventListener` event delegation рүү шилжүүлэх.
- Static counters-ийг state-ээс тооцдог болгох.

Энэ phase-д build tool хэрэггүй. Одоогийн HTML ажилладаг хэвээр, JS-ийг бага багаар салгана.

### Phase 2: File structure салгах

Зорилго: нэг том HTML-ээс maintainable static app болгох.

Санал болгох бүтэц:

```text
/
  index.html
  manifest.json
  sw.js
  assets/
    icons/
  src/
    app.js
    state.js
    storage.js
    router.js
    ui/
      home.js
      chat.js
      timeline.js
      memories.js
      more.js
      modals.js
    styles/
      base.css
      components.css
      screens.css
```

Build step оруулахгүйгээр native ES modules ашиглаж болно:

```html
<script type="module" src="./src/app.js"></script>
```

### Phase 3: Offline-first local database

Зорилго: зураг, messages, capsule зэрэг structured data-г илүү найдвартай хадгалах.

- `localStorage`-оос `IndexedDB` рүү шилжих.
- Жижиг wrapper ашиглах эсвэл өөрийн `db` module бичих.
- Object stores:
  - `messages`
  - `moods`
  - `moments`
  - `memories`
  - `capsules`
  - `settings`
  - `outbox`
- File/image data-г Blob хэлбэрээр хадгалах.
- `outbox` store ашиглаж future backend sync-д бэлдэх.

### Phase 4: Backend sync

Зорилго: хоёр хүний хооронд бодитоор sync хийх.

Хамгийн хурдан сонголтууд:

- Supabase: auth, Postgres, storage, realtime бүгд нэг дор.
- Firebase: auth, Firestore, storage, realtime хурдан эхэлнэ.

Domain model:

- `users`
- `couples`
- `couple_members`
- `messages`
- `moods`
- `moments`
- `memories`
- `milestones`
- `capsules`
- `reactions`
- `reminders`

Security:

- Couple-level authorization заавал.
- Capsule unlock date server-side validation.
- Private media storage signed URL эсвэл access rules.

### Phase 5: PWA update strategy

Зорилго: offline хэвээр, update найдвартай.

- Cache names-ийг version эсвэл build hash-аар удирдах.
- HTML-д network-first, static assets-д cache-first strategy ашиглах.
- Offline fallback route нэмэх.
- Update available toast харуулах.
- Runtime cache-д limit/expiry нэмэх.
- Data sync pending indicator нэмэх.

## Эхний хэрэгжүүлэх дараалал

1. XSS fix: chat `innerHTML`-ийг safe DOM creation болгох.
2. `appState` + `localStorage` persistence нэмэх.
3. Chat, mood, capsule-г persistent болгох.
4. Hardcoded demo data-г seed state рүү зөөх.
5. Service worker cache version/update UX сайжруулах.
6. HTML/CSS/JS-ийг modules болгон салгах.
7. IndexedDB рүү migrate хийх.
8. Backend сонгоод auth/sync нэмэх.

## Минимум дараагийн код өөрчлөлт

Эхний practical PR нь дараах scope-той байвал хамгийн бага эрсдэлтэй:

- `src/storage.js` үүсгэхгүйгээр түр inline `loadState()` / `saveState()` нэмэх.
- `messages`, `mood`, `capsules`-ийг `localStorage`-д хадгалах.
- `addMsg()`-ийг `textContent` ашиглахаар засах.
- `saveCapsule()`-ийг capsule object хадгалдаг болгох.
- Refresh дараа chat/mood/capsule count сэргээх.

Үүний дараа л файлуудыг салгах нь дээр. Шууд framework рүү үсрэхээс өмнө domain state-ээ тогтвортой болгох хэрэгтэй.
