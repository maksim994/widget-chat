export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Документация</h2>
        <p className="text-theme-sm text-gray-500">Установка виджета и настройка Яндекс Метрики</p>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">Установка виджета</h3>
        <ol className="list-decimal list-inside space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <li>Зарегистрируйтесь и войдите в личный кабинет.</li>
          <li>Откройте раздел «Сайты» и добавьте сайт (название и домен).</li>
          <li>Нажмите «Код» у сайта и скопируйте скрипт.</li>
          <li>Вставьте код перед <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">&lt;/body&gt;</code> на всех страницах.</li>
          <li>Убедитесь, что на сайте есть хотя бы один оператор онлайн в кабинете (heartbeat каждые 30 сек).</li>
        </ol>
        <p className="mt-4 text-sm text-gray-500">
          Скрипт загружает <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">widget.js</code> с API
          (в dev можно также <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">npm run dev:widget</code> на
          порту 5174). Деплой — см. <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">docs/DEPLOY.md</code>.
        </p>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">Яндекс Метрика</h3>
        <p className="text-sm text-gray-600 mb-4">
          В настройках сайта укажите ID счётчика. На сайте должен быть установлен стандартный код Метрики с функцией{" "}
          <code className="rounded bg-gray-100 px-1">ym</code>.
        </p>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Создайте цели с идентификаторами:</p>
        <ul className="grid gap-1 text-sm text-gray-600 sm:grid-cols-2">
          {[
            "chat_widget_shown",
            "chat_widget_opened",
            "chat_first_message_sent",
            "chat_contact_requested",
            "chat_contact_submitted",
            "chat_operator_replied",
            "chat_offline_form_submitted",
            "chat_dialog_closed",
          ].map((e) => (
            <li key={e}>
              <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800">{e}</code>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">Чеклист перед пилотом</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          {[
            "Регистрация и вход администратора",
            "Добавлен сайт, скопирован код установки",
            "Оператор вошёл в кабинет (статус онлайн)",
            "Виджет открывается, первое сообщение создаёт диалог",
            "После сообщения запрашивается контакт",
            "Оператор видит диалог и отвечает в реальном времени",
            "Офлайн-форма при отсутствии операторов / вне рабочих часов",
            "События видны в Метрике (если подключена)",
            "Аналитика в кабинете показывает диалоги",
          ].map((t) => (
            <li key={t} className="flex items-start gap-2">
              <span className="text-success-500">✓</span> {t}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
