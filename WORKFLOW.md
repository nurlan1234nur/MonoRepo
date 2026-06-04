# nous — Ажлын урсгал (Workflow)

Бүх зүйлийг нэг цэгээс удирдах гарын авлага. **Локал** (таны Windows компьютер) дээр код бичиж туршаад, бэлэн болоход **сервер** (AWS EC2) рүү гаргана.

---

## ⚡ Хурдан лавлах (хамгийн чухал нь)

```powershell
# 1. ЛОКАЛД — байнга үүгээр турш
npm run dev                  # → http://localhost:5173

# 2. ЛОКАЛД — бэлэн болоход нэг командаар build + push
npm run release              # image-ийг угсарч DockerHub руу илгээнэ
```
```bash
# 3. СЕРВЕРТ (SSH) — нэг командаар татаж шинэчилнэ
cd ~/nous && bash scripts/deploy.sh
```

> Зөвхөн **2 команд**: `npm run release` (локал) → `bash scripts/deploy.sh` (сервер). Болоо.
> Дэлгэрэнгүйг доороос: build/push тус тусдаа, контейнер удирдах, .env тохиргоо г.м.

---

## 🗺️ Ерөнхий зураг

```
Локал (Windows)                  DockerHub                 Сервер (EC2 Ubuntu)
─────────────────                ─────────                 ───────────────────
код засна
  npm run dev      ← туршина
  npm run release  ─── push ──→   love-server   ─── pull ──→  docker compose up
                                  love-client                 http://16.171.134.139:8080
```

**Алтан дүрэм:** Локалд `npm run dev`-ээр л турш. `docker-compose.prod.yml` бол **зөвхөн серверт** зориулсан — локалд бү ажиллуул.

---

## 1️⃣ Локал хөгжүүлэлт (өдөр тутмын ажил)

Код бичиж, шууд туршихад:

```powershell
npm run dev
```

Энэ нэг команд **server (4000 порт)** болон **client (5173 порт)**-ыг зэрэг асаана.
Дараа нь браузераар нээ: **http://localhost:5173**

> Анх удаа эсвэл шинэ компьютер дээр: эхлээд `npm run install:all` ажиллуулж бүх dependency суулга.

Тусдаа асаах шаардлагатай бол:
```powershell
npm run dev:server     # зөвхөн backend
npm run dev:client     # зөвхөн frontend
```

Зогсоох: терминал дээр **Ctrl + C**.

---

## 2️⃣ Өөрчлөлтийг шалгах (push хийхээс өмнө)

TypeScript алдаагүй эсэхийг шалга:

```powershell
npm run typecheck
```

(server-ийн typecheck + client-ийн build хоёуланг ажиллуулна.)

---

## 3️⃣ Серверт гаргах (deploy) — 2 алхам

### Алхам A — Локалд: image build + push

Код бэлэн болсны дараа, **локал дээр**:

```powershell
npm run release
```

Энэ нь хоёр image-ийг build хийж DockerHub руу push хийнэ.
(Эхлээд нэг удаа `docker login -u nurlannn` хийсэн байх ёстой.)

Хэрэв зөвхөн нэгийг өөрчилсөн бол хурдан:
```powershell
npm run build:server ; docker push nurlannn/love-server:latest
npm run build:client ; docker push nurlannn/love-client:latest
```

### Алхам B — Серверт: pull + restart

Серверт SSH-ээр орж:

```bash
cd ~/nous
bash scripts/deploy.sh
```

Энэ нь шинэ image татаж, контейнеруудыг шинэчилж, төлөв + log-ийг харуулна.

> `scripts/deploy.sh` серверт байхгүй бол: энэ репог `git pull` хийх, эсвэл файлыг гараар хуулна.

---

## 4️⃣ Серверийн контейнер удирдах

Бүгд `~/nous` дотор, `docker compose -f docker-compose.prod.yml ...`:

| Үйлдэл | Команд |
|--------|--------|
| Төлөв харах | `docker compose -f docker-compose.prod.yml ps` |
| Бүгдийг асаах | `docker compose -f docker-compose.prod.yml up -d` |
| Бүгдийг унтраах | `docker compose -f docker-compose.prod.yml down` |
| Зөвхөн server дахин асаах | `docker compose -f docker-compose.prod.yml restart server` |
| Server log (урсгал) | `docker compose -f docker-compose.prod.yml logs -f server` |
| Env өөрчилсний дараа | `docker compose -f docker-compose.prod.yml up -d --force-recreate server` |

---

## 5️⃣ Тохиргоо (.env)

Нууц утгууд `server/.env` дотор (git-д ОРОХГҮЙ). Локал болон серверт **тус тусдаа** байна.

| Хувьсагч | Тайлбар |
|----------|---------|
| `MONGODB_URI` | MongoDB Atlas холболт |
| `JWT_SECRET` | Нэвтрэлтийн токены түлхүүр |
| `CLIENT_ORIGIN` | Локалд `http://localhost:5173`, серверт `http://16.171.134.139:8080` |
| `GMAIL_USER` | OTP илгээх Gmail (`jaz995973@gmail.com`) |
| `GMAIL_APP_PASSWORD` | Gmail App Password (16 тэмдэгт, зайгүй) |

> `GMAIL_*` байхгүй бол **dev горим**: OTP код имэйл явахгүй, дэлгэц/log дээр гарна.
> `.env` өөрчилсний дараа server-ээ дахин асаах хэрэгтэй (локалд Ctrl+C → `npm run dev`, серверт `--force-recreate server`).

---

## 6️⃣ Өгөгдлийн сан (seed)

Серверт жишээ хосуудыг үүсгэх (⚠️ бүх өгөгдлийг устгаад дахин үүсгэнэ):

```bash
docker compose -f docker-compose.prod.yml exec server node dist/seed.js
```

Бүх test нууц үг: `password123`. Нэвтрэх нэр: `bat`, `saraa`, `tom`, `jane`, `aysu`, `nur`.

---

## ⚡ Хамгийн түгээмэл урсгал (тогтоомж)

```
1. код засна
2. npm run dev            → локалд турших
3. npm run typecheck      → алдаагүй эсэхийг шалгах
4. npm run release        → image push (локалд)
5. сервер дээр: bash scripts/deploy.sh
```
