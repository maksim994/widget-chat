# Деплой MVP

## Сборка

```bash
npm install
npm run build --workspace=@widget/shared
npm run build --workspace=@widget/embed
npm run build --workspace=@widget/api
npm run build --workspace=@widget/cabinet
```

Виджет отдаётся API по адресу `{PUBLIC_API_URL}/widget.js` (файл из `packages/embed/dist`).

## Переменные окружения

### API (`packages/api/.env`)

| Переменная | Пример | Назначение |
|------------|--------|------------|
| `PORT` | `3001` | Порт API |
| `DATABASE_URL` | `postgresql://...` | БД (SQLite только для dev) |
| `JWT_SECRET` | длинная случайная строка | Подпись токенов |
| `CORS_ORIGIN` | `https://cabinet.example.com` | Origin кабинета |
| `PUBLIC_API_URL` | `https://api.example.com` | URL в коде установки виджета |
| `PUBLIC_WIDGET_URL` | _(опционально)_ | База для `widget.js`; по умолчанию = `PUBLIC_API_URL` |

### Кабинет (сборка Vite)

| Переменная | Назначение |
|------------|------------|
| `VITE_API_PROXY` | Не нужен в prod, если кабинет и API на одном домене за reverse proxy |

В продакшене обычно nginx проксирует:

- `/` → статика кабинета (`packages/cabinet/dist`)
- `/api` → API
- `/socket.io` → API (WebSocket)
- `/widget.js` → API

## PostgreSQL

```bash
docker compose up -d
```

В `packages/api/prisma/schema.prisma` установите `provider = "postgresql"`, затем:

```bash
npm run db:push --workspace=@widget/api
npm run db:seed --workspace=@widget/api
```

## Код установки на сайте

После деплоя в кабинете **Сайты → Код** скрипт указывает `apiUrl` и грузит `widget.js` с того же хоста API (если `PUBLIC_WIDGET_URL` не задан).

Пример:

```html
<script>
  (function(w,d,s,k,u){
    w.WidgetChat=w.WidgetChat||{q:[]};
    w.WidgetChat.init=function(o){w.WidgetChat.q.push(['init',o]);};
    var e=d.createElement(s);e.async=1;e.src=u+'/widget.js';
    e.onload=function(){WidgetChat.init({siteKey:'PUBLIC_KEY',apiUrl:'https://api.example.com'});};
    d.head.appendChild(e);
  })(window,document,'script','PUBLIC_KEY','https://api.example.com');
</script>
```

## Проверка после деплоя

1. `GET https://api.example.com/health` → `{ "ok": true }`
2. `GET https://api.example.com/widget.js` → JS-бандл
3. Вход в кабинет, оператор онлайн
4. Виджет на тестовой странице: сообщение без дублей, ответ оператора в реальном времени

Пример конфигурации nginx: [nginx.example.conf](./nginx.example.conf).

См. также [CHECKLIST.md](./CHECKLIST.md).
