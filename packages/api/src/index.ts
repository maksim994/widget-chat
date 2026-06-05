import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { resolveWidgetJsPath } from "./lib/widget-asset.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
import { authRouter } from "./routes/auth.js";
import { sitesRouter } from "./routes/sites.js";
import { operatorsRouter } from "./routes/operators.js";
import { dialogsRouter } from "./routes/dialogs.js";
import { widgetRouter } from "./routes/widget.js";
import { analyticsRouter } from "./routes/analytics.js";
import { initSocket } from "./lib/socket.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFound } from "./middleware/not-found.js";
import { requestLogger } from "./middleware/request-logger.js";

const PORT = parseInt(process.env.PORT ?? "3001", 10);
const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:5173";

const app = express();
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (
        origin === corsOrigin ||
        /^http:\/\/localhost:\d+$/.test(origin) ||
        process.env.NODE_ENV !== "production"
      ) {
        cb(null, true);
      } else {
        cb(null, true);
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(requestLogger);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/widget.js", (_req, res) => {
  const file = resolveWidgetJsPath();
  if (!file) {
    res
      .status(404)
      .type("text/plain")
      .send("Widget bundle not found. Run: npm run build --workspace=@widget/embed");
    return;
  }
  res.setHeader("Cache-Control", "public, max-age=300");
  res.sendFile(file);
});

app.use("/api/auth", authRouter);
app.use("/api/sites", sitesRouter);
app.use("/api/operators", operatorsRouter);
app.use("/api/dialogs", dialogsRouter);
app.use("/api/widget", widgetRouter);
app.use("/api/analytics", analyticsRouter);

if (process.env.SERVE_CABINET === "true") {
  const cabinetDist =
    process.env.CABINET_DIST_PATH ??
    path.resolve(__dirname, "../../cabinet/dist");
  if (fs.existsSync(path.join(cabinetDist, "index.html"))) {
    app.use(express.static(cabinetDist));
    app.get(/^(?!\/api\/|\/socket\.io|\/widget\.js$|\/health$).*/, (_req, res) => {
      res.sendFile(path.join(cabinetDist, "index.html"));
    });
  }
}

app.use(notFound);
app.use(errorHandler);

const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
