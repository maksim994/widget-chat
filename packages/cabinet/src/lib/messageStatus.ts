export type MessageStatus = "SENDING" | "DELIVERED" | "READ";

export function messageStatusLabel(status: string | undefined, sender: string): string | null {
  if (sender !== "OPERATOR") return null;
  switch (status) {
    case "SENDING":
      return "Отправляется…";
    case "DELIVERED":
      return "Доставлено";
    case "READ":
      return "Прочитано";
    default:
      return null;
  }
}
