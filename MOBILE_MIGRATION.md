# PWA -> React Native migration

Энэ баримт нь `nous` app-ийг одоогийн PWA хувилбараас React Native mobile app руу аажмаар шилжүүлэх явцыг тэмдэглэнэ. PWA-г ажиллаж байгаа хэвээр хадгалж, native app-ийг зэрэгцээ хөгжүүлнэ.

## Гол зорилго

- Одоогийн `client` PWA-г эвдэхгүй хадгалах.
- `server` backend-ийг аль болох хэвээр ашиглах.
- `mobile` гэсэн тусдаа Expo React Native app нэмэх.
- Feature бүрийг жижиг алхмаар port хийж, явцыг энэ doc дээр тэмдэглэх.
- Шууд App Store/Play Store release хийхээс өмнө internal build ашиглаж төхөөрөмж дээр турших.

## Одоогийн бүтэц

```text
/
  client/   # Vite React PWA
  server/   # Express API + Socket.IO + MongoDB
  legacy/   # хуучин prototype
```

Төлөвлөж буй бүтэц:

```text
/
  client/   # PWA хэвээр
  server/   # shared backend хэвээр
  mobile/   # Expo React Native app
```

## Технологийн шийдвэр

| Хэсэг | Сонголт | Тайлбар |
| --- | --- | --- |
| Native framework | Expo + React Native | Build, native module, internal distribution хийхэд хурдан |
| Navigation | Expo Router эсвэл React Navigation | Scaffold хийх үед нэгийг нь сонгоно |
| API | Одоогийн Express API | Endpoint-уудыг хадгална |
| Auth token | SecureStore/AsyncStorage | PWA-ийн `localStorage`-ийг native storage-оор солино |
| Realtime | `socket.io-client` | Одоогийн socket backend-ийг ашиглана |
| Push notification | Expo Notifications | Web Push/service worker-ийг native push-ээр солино |

## Шилжүүлэх phase-үүд

### Phase 0: Documentation ба migration суурь

- [x] Migration document үүсгэх.
- [x] `mobile` app-ийн scaffold хийхээс өмнө feature inventory гаргах.
- [x] PWA/browser-only хэсгүүдийг тэмдэглэх.

### Phase 1: Native app scaffold

- [x] `mobile/` Expo app үүсгэх.
- [x] TypeScript тохируулах.
- [x] Dev environment config нэмэх.
- [x] Backend API origin тохируулах.
- [x] Root script нэмэх эсэхийг шийдэх.

### Phase 2: Auth ба couple setup

- [ ] API client port хийх.
- [ ] Token storage-г native-д тааруулах.
- [ ] Login/register/OTP flow port хийх.
- [ ] Couple setup screen port хийх.
- [ ] Logout/session restore шалгах.

### Phase 3: Core app navigation

- [ ] Bottom tabs/stack navigation хийх.
- [ ] Home screen port хийх.
- [ ] More/settings screen port хийх.
- [ ] Basic profile UI port хийх.

### Phase 4: Chat ба realtime

- [ ] Socket connection native дээр ажиллуулах.
- [ ] Chat text message flow port хийх.
- [ ] App background/foreground reconnect шалгах.
- [ ] Message list performance шалгах.

### Phase 5: Media ба memories

- [ ] Image picker нэмэх.
- [ ] Upload API-г native FormData дээр шалгах.
- [ ] Memories/timeline list port хийх.
- [ ] Server asset URL-ууд mobile дээр absolute URL болж байгаа эсэхийг шалгах.

### Phase 6: Native push notification

- [ ] Expo notification permission flow хийх.
- [ ] Device push token хадгалах backend model/route нэмэх.
- [ ] Native push send logic нэмэх.
- [ ] Android/iOS device дээр notification шалгах.

### Phase 7: Internal build

- [ ] EAS project тохируулах.
- [ ] Android internal build гаргах.
- [ ] iOS TestFlight/ad hoc боломжийг шалгах.
- [ ] Real device QA checklist ажиллуулах.

## Web-only хэсгүүд

Эдгээрийг React Native дээр шууд хуулж болохгүй, native equivalent хэрэгтэй.

| PWA хэсэг | Native хувилбар |
| --- | --- |
| `localStorage` | `expo-secure-store` эсвэл AsyncStorage |
| Service worker | Native app lifecycle |
| Web Push `PushManager` | Expo Notifications / APNs / FCM |
| DOM elements | `View`, `Text`, `Pressable`, `FlatList` |
| Tailwind CSS classes | React Native styles эсвэл NativeWind |
| Browser file input | `expo-image-picker` |
| Browser audio APIs | `expo-av` эсвэл RN audio library |

## Feature inventory

| Feature | PWA source | Native status | Тайлбар |
| --- | --- | --- | --- |
| Auth | `client/src/pages/AuthPage.tsx` | In progress | Native login/session restore, show password, forgot password, register эхэлсэн |
| Couple setup | `client/src/pages/CoupleSetup.tsx` | In progress | Native create/join flow эхэлсэн |
| Home | `client/src/pages/Home.tsx` | Not started | Эхний tab |
| Timeline | `client/src/pages/Timeline.tsx` | Not started | Phase 5 |
| Memories | `client/src/pages/Memories.tsx` | Not started | Phase 5 |
| Chat | `client/src/pages/Chat.tsx` | Not started | Phase 4 |
| More/settings | `client/src/pages/More.tsx` | In progress | Profile/account card, password change, logout эхэлсэн |
| Notifications | `client/src/lib/notifications.ts` | Needs native rewrite | Web Push биш native push |
| Socket | `client/src/lib/socket.ts` | Not started | Backend хэвээр |
| API client | `client/src/lib/api.ts` | Not started | Storage/env ялгаатай |

## Migration log

| Огноо | Өөрчлөлт | Тайлбар |
| --- | --- | --- |
| 2026-06-28 | Migration document эхлүүлэв | PWA-г хадгалж, Expo React Native app-ийг `mobile/` дээр зэрэгцээ хөгжүүлэхээр төлөвлөв |
| 2026-06-28 | `mobile/` Expo app scaffold хийв | Expo TypeScript app, root `dev:mobile`, mobile `typecheck`, `EXPO_PUBLIC_API_ORIGIN` config нэмэв |
| 2026-06-28 | Native auth суурь нэмэв | `expo-secure-store`, API client, AuthProvider, login screen, session restore, logout placeholder home нэмэв |
| 2026-06-28 | Expo Go compatibility тохируулав | Expo Go дээр SDK 56 runtime таарахгүй байсан тул `mobile` app-ийг Expo SDK 55 dependency set рүү буулгав |
| 2026-06-28 | Expo Go fallback SDK 54 болгов | Төхөөрөмж дээрх Expo Go SDK 55-г дэмжихгүй байсан тул `mobile` app-ийг SDK 54 dependency set рүү буулгаж `expo install --check` OK болгов |
| 2026-06-29 | Native couple setup эхлүүлэв | Login хийсэн user `couple`-гүй бол create/join invite code screen харуулах flow нэмэв |
| 2026-06-29 | Native tab navigation scaffold нэмэв | Home, Timeline, Memories, Chat, More tab shell нэмэж, Home-оос бусдыг placeholder screen болгож бэлдэв |
| 2026-06-29 | Native More эхлүүлэв | More tab дээр profile card, recovery email display, logout нэмэв; password/notifications дараагийн sub-feature болно |
| 2026-06-29 | Native auth detail нэмэв | Login дээр show/hide password, forgot password request OTP, reset password flow нэмэв |
| 2026-06-29 | Native register flow нэмэв | Gmail OTP request, code + username + password verify, login руу буцах flow нэмэв |
| 2026-06-29 | Native password change нэмэв | More tab дээр current/new/confirm password form, show passwords, `/auth/me/password` submit flow нэмэв |
| 2026-06-29 | Native CoupleContext нэмэв | `/couples/me`-ээс couple мэдээлэл татаж Home/More дээр invite code болон partner info бодитоор харуулдаг болов |
| 2026-06-29 | PWA Тоо олох тоглоом нэмэв | Couples game menu-д 4 оронтой нууц тоо таах alpha/betta тоглоом нэмэв; backend model/route, realtime refresh, PWA sheet UI орсон |
| 2026-06-29 | PWA Тоо олох UI сайжруулав | Дүрмийг `!`/help товчоор нээгддэг болгож, тоглоом дундаас шинэ тоглоом эхлэх action нэмэв |

## Working rules

- PWA болон native app хоёр нэг backend ашиглана.
- PWA дээр ажиллаж байгаа feature-ийг native рүү port хийхдээ эхлээд behavior-ийг ойлгоод дараа нь UI-г native component-оор дахин бүтээнэ.
- Browser-specific API-г shared helper дотор оруулахгүй.
- Shared code гаргахдаа зөвхөн бодитоор давхардсан API/type/helper logic-ийг салгана.
- Том feature бүрийн дараа энэ doc-ийн `Feature inventory` болон `Migration log`-ийг шинэчилнэ.

## Дараагийн алхам

1. `mobile/` Expo app scaffold хийх.
2. `mobile`-ийн dev start/build command-уудыг root workflow-д нэмэх.
3. Auth API client болон token storage-г эхлүүлж login flow ажиллуулах.
