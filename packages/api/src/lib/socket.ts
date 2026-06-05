import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { verifyToken, type JwtPayload } from "./auth.js";
import { prisma } from "./prisma.js";

let io: Server | null = null;

export function initSocket(httpServer: HttpServer) {
  const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:5173";
  io = new Server(httpServer, {
    cors: {
      origin: [corsOrigin, /^http:\/\/localhost:\d+$/],
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    const token = socket.handshake.auth?.token as string | undefined;
    const dialogId = socket.handshake.query?.dialogId as string | undefined;
    const role = socket.handshake.auth?.role as string | undefined;

    if (role === "operator" && token) {
      try {
        const user = verifyToken(token);
        socket.join(`company:${user.companyId}`);
        socket.data.user = user;
        socket.emit("connected", { role: "operator", companyId: user.companyId });
      } catch {
        socket.disconnect();
        return;
      }
    } else if (dialogId) {
      socket.join(`dialog:${dialogId}`);
      socket.emit("connected", { role: "visitor", dialogId });
    }

    socket.on("join:dialog", async (payload: { dialogId?: string }) => {
      const user = socket.data.user as JwtPayload | undefined;
      if (!user?.companyId || !payload?.dialogId) return;
      const dialog = await prisma.dialog.findFirst({
        where: { id: payload.dialogId, companyId: user.companyId },
        select: { id: true },
      });
      if (dialog) socket.join(`dialog:${dialog.id}`);
    });

    socket.on("leave:dialog", (payload: { dialogId?: string }) => {
      if (payload?.dialogId) socket.leave(`dialog:${payload.dialogId}`);
    });

    socket.on("typing", (payload: { dialogId: string; typing: boolean }) => {
      if (!payload.dialogId) return;
      const user = socket.data.user as JwtPayload | undefined;
      const data = user
        ? { ...payload, from: "operator" as const }
        : { ...payload, from: "visitor" as const };
      socket.to(`dialog:${payload.dialogId}`).emit("typing", data);
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error("Socket not initialized");
  return io;
}

export function emitToDialog(dialogId: string, event: string, data: unknown) {
  io?.to(`dialog:${dialogId}`).emit(event, data);
}

export function emitToCompany(companyId: string, event: string, data: unknown) {
  io?.to(`company:${companyId}`).emit(event, data);
}
