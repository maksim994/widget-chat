# Widget Chat Platform

Масштабируемый monorepo: чат-виджет для сайтов, личный кабинет операторов, API с WebSocket, интеграция с Яндекс Метрикой.

## Архитектура

```
packages/
  shared/     — общие типы, Zod-схемы, формат ошибок API
  api/        — Express API, Prisma, Socket.IO
  cabinet/    — React + TailAdmin (Tailwind CSS)
  embed/      — встраиваемый JS-виджет
```

- **Масштабирование:** вынесен `@widget/shared`, единый формат ошибок, Turbo для сборки, PostgreSQL через Docker для продакшена.
- **Стабильность:** централизованный `AuthProvider`, защищённые маршруты, корректная обработка 401 без циклов редиректа.
- **UI:** [Tailwind CSS](https://tailwindcss.com) + [DaisyUI](https://daisyui.com) (готовые компоненты).

## Быстрый старт

```bash
npm install
npm run build --workspace=@widget/shared
npm run db:push --workspace=@widget/api
npm run db:seed --workspace=@widget/api
```

Три терминала:

```bash
npm run dev:api
npm run dev:cabinet   # http://localhost:5173
npm run dev:widget    # http://localhost:5174
```

### Демо-вход

| Email | Пароль |
|-------|--------|
| admin@demo.local | demo1234 |
| operator@demo.local | operator123 |

## PostgreSQL

```bash
docker compose up -d
```

В `packages/api/.env` (см. `.env.example`):

```
DATABASE_URL="postgresql://widget:widget@localhost:5432/widget"
```

Затем `npm run db:push` и `npm run db:seed`.

## Coolify

Пошаговая инструкция: [docs/COOLIFY.md](./docs/COOLIFY.md). Репозиторий: [github.com/maksim994/widget-chat](https://github.com/maksim994/widget-chat).

## Документация

| Файл | Описание |
|------|----------|
| [docs/INSTALL.md](./docs/INSTALL.md) | Установка виджета на сайт |
| [docs/METRIKA.md](./docs/METRIKA.md) | Цели Яндекс Метрики |
| [docs/CHECKLIST.md](./docs/CHECKLIST.md) | Чеклист перед пилотом |
| [docs/DEPLOY.md](./docs/DEPLOY.md) | Сборка и деплой |
| [docs/nginx.example.conf](./docs/nginx.example.conf) | Пример nginx |
| [docs/COOLIFY.md](./docs/COOLIFY.md) | Деплой в Coolify |

В кабинете: раздел **Справка** (`/help`).

## Roadmap

[ROADMAP.md](./ROADMAP.md)
