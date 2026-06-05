# Развёртывание в Coolify

Репозиторий: [github.com/maksim994/widget-chat](https://github.com/maksim994/widget-chat)

Один Docker-контейнер отдаёт **API**, **WebSocket**, **widget.js** и **личный кабинет** (статика). База — **PostgreSQL** (отдельный сервис в Coolify).

---

## 1. Загрузка кода на GitHub

Если репозиторий пустой, с локальной машины (из папки проекта):

```bash
git init
git add .
git commit -m "Initial commit: Widget Chat MVP"
git branch -M main
git remote add origin https://github.com/maksim994/widget-chat.git
git push -u origin main
```

Дальше Coolify подключается к этому репозиторию по ветке `main`.

---

## 2. PostgreSQL в Coolify

1. **+ New Resource** → **Database** → **PostgreSQL** (16+).
2. Запомните внутренний URL, например:
   `postgres://postgres:ПАРОЛЬ@postgres-xxx:5432/postgres`
3. Создайте БД `widget` (через UI или позже — `db push` создаст таблицы в указанной БД).

Для приложения используйте URL с именем БД `widget`:

```text
postgresql://postgres:ПАРОЛЬ@HOST:5432/widget
```

В Coolify часто есть кнопка **Copy Internal URL** — подставьте имя базы `widget` в конце пути.

---

## 3. Приложение (Dockerfile)

1. **+ New Resource** → **Application**.
2. **Source**: GitHub → репозиторий `maksim994/widget-chat`, ветка `main`.
3. **Build Pack**: **Dockerfile** (файл в корне репозитория).
4. **Port**: `3001` (переменная `PORT` уже в образе).
5. **Health Check**: путь `/health`, ожидается `200`.

### Домен

Привяжите домен, например `https://chat.ваш-домен.ru` — один домен для кабинета и API.

В Coolify для приложения включите **HTTPS** (Let's Encrypt).

---

## 4. Переменные окружения

Обязательные:

| Переменная | Пример | Описание |
|------------|--------|----------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/widget` | URL PostgreSQL из Coolify |
| `JWT_SECRET` | длинная случайная строка (32+ символа) | Секрет для JWT |
| `CORS_ORIGIN` | `https://chat.ваш-домен.ru` | URL кабинета (тот же домен) |
| `PUBLIC_API_URL` | `https://chat.ваш-домен.ru` | Публичный URL для кода виджета |
| `NODE_ENV` | `production` | Уже в Dockerfile |
| `SERVE_CABINET` | `true` | Уже в Dockerfile |

Один раз при первом деплое (демо-данные):

| Переменная | Значение |
|------------|----------|
| `RUN_SEED` | `true` |

После успешного входа в кабинет **удалите** `RUN_SEED` или поставьте `false` и перезапустите приложение.

Опционально:

| Переменная | Описание |
|------------|----------|
| `PUBLIC_WIDGET_URL` | Если `widget.js` на другом домене (обычно не нужно) |

---

## 5. WebSocket (важно)

В Coolify для приложения должен быть включён прокси с поддержкой **WebSocket** (часто по умолчанию для Traefik/Caddy).

Проверка: в кабинете откройте диалог — без WebSocket сообщения не приходят в реальном времени.

Путь сокета: `/socket.io` на том же домене, что и сайт.

---

## 6. Первый деплой

1. Сохраните переменные → **Deploy**.
2. Дождитесь сборки образа (5–10 минут при первой сборке).
3. В логах контейнера должны быть строки `Applying database schema...` и при `RUN_SEED=true` — `Seeding database...`.
4. Откройте `https://chat.ваш-домен.ru/health` → `{"ok":true}`.
5. Откройте `https://chat.ваш-домен.ru` → страница входа в кабинет.

### Демо-вход (после seed)

| Роль | Email | Пароль |
|------|-------|--------|
| Админ | `admin@demo.local` | `demo1234` |
| Оператор | `operator@demo.local` | `operator123` |

В **Сайты → Код** скопируйте скрипт виджета — в нём будут ваш `PUBLIC_API_URL` и `publicKey`.

---

## 7. Проверка виджета

1. `GET https://chat.ваш-домен.ru/widget.js` — должен вернуть JavaScript.
2. Вставьте код установки на тестовую HTML-страницу.
3. Откройте кабинет под оператором в другой вкладке.
4. Отправьте сообщение из виджета — диалог появится в кабинете.

Чеклист: [CHECKLIST.md](./CHECKLIST.md).

---

## 8. Обновление версии

Push в `main` → в Coolify **Redeploy** (или автодеплой по webhook, если настроен).

`RUN_SEED` при обновлениях не включайте — иначе демо-данные могут конфликтовать.

---

## 9. Типичные проблемы

| Симптом | Решение |
|---------|---------|
| 502 / контейнер падает | Проверьте `DATABASE_URL`, доступность Postgres из сети Coolify |
| Пустая страница кабинета | В логах сборки: успешен ли `npm run build:prod`; проверьте `SERVE_CABINET=true` |
| CORS / не логинится | `CORS_ORIGIN` = точный URL с `https://`, без слэша в конце |
| Виджет не грузится | `PUBLIC_API_URL` совпадает с доменом; проверьте `/widget.js` |
| Нет realtime | WebSocket для домена; прокси не режет `/socket.io` |
| Ошибка Prisma | PostgreSQL 14+; в URL указана БД `widget` |

---

## 10. Локальная проверка Docker-образа (опционально)

```bash
docker compose up -d postgres
export DATABASE_URL="postgresql://widget:widget@localhost:5432/widget"
docker build -t widget-chat .
docker run --rm -p 3001:3001 \
  -e DATABASE_URL \
  -e JWT_SECRET=dev-secret-change-me \
  -e CORS_ORIGIN=http://localhost:3001 \
  -e PUBLIC_API_URL=http://localhost:3001 \
  -e RUN_SEED=true \
  widget-chat
```

Откройте http://localhost:3001

---

## Архитектура в Coolify

```text
[Браузер клиента]
       │
       ▼
[Traefik / Caddy — HTTPS]
       │
       ├──► Application :3001  (API + SPA + widget.js + socket.io)
       │
       └──► PostgreSQL :5432   (только внутренняя сеть)
```

Отдельный nginx не обязателен — Coolify терминирует TLS и проксирует на контейнер.

Пример ручного nginx (если не Coolify): [nginx.example.conf](./nginx.example.conf).
