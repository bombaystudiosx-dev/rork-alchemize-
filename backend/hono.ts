import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import { initSurrealDB } from "./lib/surrealdb";

const app = new Hono();

app.use("*", cors());

initSurrealDB()
  .then((db) => {
    if (db) {
      console.log('[Hono] SurrealDB initialized successfully');
    } else {
      console.log('[Hono] Running without remote database sync');
    }
  })
  .catch((error) => {
    console.warn('[Hono] SurrealDB initialization failed, continuing without remote sync:', error);
  });

app.use(
  "/api/trpc/*",
  trpcServer({
    router: appRouter,
    createContext,
  }),
);

app.get("/", (c) => {
  return c.json({ status: "ok", message: "API is running" });
});

export default app;
