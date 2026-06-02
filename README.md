# nous — хосуудын app

Хосуудад зориулсан real-time app. Prototype-оос бодит full-stack app руу шилжиж байна.

## Stack

| Давхарга | Технологи |
|----------|-----------|
| Frontend | React + Vite + TypeScript + Tailwind CSS |
| Backend  | Node + Express + TypeScript |
| Database | MongoDB Atlas (Mongoose ODM) |
| Realtime | Socket.IO |
| Auth     | JWT + bcrypt |

## Бүтэц

```text
/
  server/        # Express API + Socket.IO + MongoDB
  client/        # React frontend (Vite)
  legacy/        # Хуучин single-file prototype (l-н лавлагаа)
```

## Эхлүүлэх

### 1. Backend

```bash
cd server
npm install
cp .env.example .env     # дараа нь .env дотор MongoDB Atlas холболтоо бичнэ
npm run dev
```

### 2. Frontend

```bash
cd client
npm install
npm run dev
```

## MongoDB Atlas тохиргоо

1. https://www.mongodb.com/atlas дээр үнэгүй cluster үүсгэнэ.
2. Database user (нэр/нууц үг) үүсгэнэ.
3. Network Access дээр өөрийн IP (эсвэл `0.0.0.0/0` түр) нэмнэ.
4. "Connect" → "Drivers" → connection string-ийг хуулна.
5. `server/.env` доторх `MONGODB_URI`-д буулгана.
