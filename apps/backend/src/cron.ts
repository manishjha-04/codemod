import { WebClient } from "@slack/web-api";
import axios from "axios";
import { CronJob } from "cron";
import WebSocket from "ws";

import { prisma } from "@codemod-com/database";

import { PostHogService } from "./services/PostHogService.js";
import { environment } from "./util.js";

// TODO: Move crons into independent CronService

const cleanupLoginIntentsCron = new CronJob(
  "* * * * *", // cronTime
  async () => {
    const twoMinutesAgo = new Date();
    twoMinutesAgo.setMinutes(twoMinutesAgo.getMinutes() - 2);

    await prisma.userLoginIntent.deleteMany({
      where: {
        createdAt: {
          lte: twoMinutesAgo,
        },
      },
    });
  }, // onTick
  null, // onComplete
  false, // start
);

const syncDatabaseWithPosthogDataCron = new CronJob(
  "0 * * * *", // cronTime - every hour
  async () => {
    if (environment.NODE_ENV !== "production") {
      return;
    }

    const posthogService = new PostHogService(
      environment.POSTHOG_API_KEY ?? "",
      environment.POSTHOG_PROJECT_ID ?? "",
    );

    let codemodTotalRuns: Awaited<
      ReturnType<typeof posthogService.getCodemodTotalRuns>
    >;
    try {
      codemodTotalRuns = await posthogService.getCodemodTotalRuns();
    } catch (err) {
      console.error("Failed getting total codemod runs from PostHog.");
      console.error((err as Error).message);
      return;
    }

    for (const { slug, runs } of codemodTotalRuns) {
      try {
        const codemod = await prisma.codemod.findFirst({
          where: { slug },
        });

        if (codemod) {
          await prisma.codemod.update({
            where: { id: codemod.id },
            data: { totalRuns: runs },
          });
        }
      } catch (err) {
        console.error("Failed updating codemod runs in the database.");
        console.error((err as Error).message);
      }
    }
  }, // onTick
  null, // onComplete
  false, // start
);

const services: Array<{
  name: string;
  url: string;
  type: "http" | "websocket";
  available: boolean;
  webhook: string;
}> = [
  {
    name: "Backend API",
    url: process.env.BACKEND_API_URL ?? "",
    type: "http",
    available: true,
    webhook:
      "https://api.instatus.com/v3/integrations/webhook/clzbu45yv92737kcn6m7edwvmb",
  },
  {
    name: "Auth Service",
    url: process.env.AUTH_SERVICE_URL ?? "",
    type: "http",
    available: true,
    webhook:
      "https://api.instatus.com/v3/integrations/webhook/cm4l90uo5000i11bu1bb6ryk7",
  },
  {
    name: "ModGPT Service",
    url: process.env.MODGPT_SERVICE_URL ?? "",
    type: "http",
    available: true,
    webhook:
      "https://api.instatus.com/v3/integrations/webhook/clzbu4pvl93329kcn6h9mue4xs",
  },
  {
    name: "Codemod AI Service",
    url: process.env.CODEMOD_AI_SERVICE_URL ?? "",
    type: "websocket",
    available: true,
    webhook:
      "https://api.instatus.com/v3/integrations/webhook/clzbu558m93630kcn6fnvj8yk8",
  },
  {
    name: "Run Service",
    url: process.env.RUN_SERVICE_URL ?? "",
    type: "http",
    available: true,
    webhook:
      "https://api.instatus.com/v3/integrations/webhook/clzbu5gtk93796kcn684qhwhwj",
  },
];

const systemHealthCheckCron = new CronJob(
  "*/15 * * * *",
  async () => {
    if (environment.NODE_ENV === "development") {
      return;
    }

    const env = process.env.NODE_ENV ?? "";
    const token = process.env.SLACK_TOKEN ?? "";
    const channel = process.env.SLACK_CHANNEL ?? "";
    const web = new WebClient(token);

    await Promise.all(
      services.map(async (service) => {
        try {
          if (service.type === "http") {
            const response = await axios.get(service.url);

            if (response.status === 200 && service.available === false) {
              if (env === "production") {
                await axios.post(service.webhook, {
                  trigger: "up",
                });
              }

              await web.chat.postMessage({
                channel: channel,
                text: `[${env}]: ${service.name} is now up.`,
              });
              service.available = true;
            }
          } else if (service.type === "websocket") {
            await new Promise((resolve, reject) => {
              const ws = new WebSocket(service.url);

              ws.on("open", async () => {
                if (service.available === false) {
                  if (env === "production") {
                    await axios.post(service.webhook, {
                      trigger: "up",
                    });
                  }

                  await web.chat.postMessage({
                    channel: channel,
                    text: `[${env}]: ${service.name} is now up.`,
                  });
                }
                service.available = true;

                ws.close();
                resolve(true);
              });

              ws.on("error", (error) => {
                reject(
                  new Error(`WebSocket connection error: ${error.message}`),
                );
              });
            });
          }
        } catch (error) {
          if (service.available === true) {
            if (env === "production") {
              await axios.post(service.webhook, {
                trigger: "down",
              });
            }

            await web.chat.postMessage({
              channel: channel,
              text: `[${env}]: ${service.name} is down. Error: ${error}`,
            });

            service.available = false;
          }
        }
      }),
    );
  }, // onTick
  null, // onComplete
  false, // start
);

export const startCronJobs = () => {
  cleanupLoginIntentsCron.start();
  syncDatabaseWithPosthogDataCron.start();
  systemHealthCheckCron.start();
};
