/** Event names sent to Yandex Metrika via widget reachGoal */
export const METRIKA_EVENTS = {
  WIDGET_SHOWN: "chat_widget_shown",
  WIDGET_OPENED: "chat_widget_opened",
  FIRST_MESSAGE: "chat_first_message_sent",
  CONTACT_REQUESTED: "chat_contact_requested",
  CONTACT_SUBMITTED: "chat_contact_submitted",
  OPERATOR_REPLIED: "chat_operator_replied",
  OFFLINE_SUBMITTED: "chat_offline_form_submitted",
  DIALOG_CLOSED: "chat_dialog_closed",
} as const;
