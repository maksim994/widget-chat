export type UserRole = "ADMIN" | "OPERATOR";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId: string;
  companyName: string;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

export type DialogStatus =
  | "NEW"
  | "IN_PROGRESS"
  | "WAITING_VISITOR"
  | "CLOSED"
  | "OFFLINE";
