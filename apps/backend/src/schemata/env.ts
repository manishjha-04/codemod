import { isNeitherNullNorUndefined } from "@codemod-com/utilities";
import {
  type InferOutput,
  array,
  literal,
  object,
  optional,
  parse,
  pipe,
  string,
  transform,
  union,
  unknown,
} from "valibot";

export const environmentSchema = object({
  PORT: pipe(string(), transform(Number)),
  ENCRYPTION_KEY: string(),
  AWS_ACCESS_KEY_ID: optional(string()),
  AWS_SECRET_ACCESS_KEY: optional(string()),
  AWS_PUBLIC_BUCKET_NAME: string(),
  AWS_PRIVATE_BUCKET_NAME: string(),
  DATABASE_URI: string(),
  VERIFIED_PUBLISHERS: pipe(
    unknown(),
    transform((input) => {
      if (!isNeitherNullNorUndefined(input)) {
        return [];
      }

      if (Array.isArray(input)) {
        return parse(array(string()), input);
      }

      if (typeof input === "string") {
        return input.split(",").map((p) => p.trim());
      }

      return [];
    }),
  ),
  REDIS_HOST: optional(string()),
  REDIS_PORT: optional(string()),
  TASK_MANAGER_QUEUE_NAME: optional(string()),
  POSTHOG_API_KEY: optional(string()),
  POSTHOG_PROJECT_ID: optional(string()),
  SLACK_TOKEN: optional(string()),
  SLACK_CHANNEL: optional(string()),
  BACKEND_API_URL: optional(string()),
  AUTH_SERVICE_URL: string(),
  MODGPT_SERVICE_URL: optional(string()),
  CODEMOD_AI_SERVICE_URL: optional(string()),
  RUN_SERVICE_URL: optional(string()),
  NODE_ENV: union([
    literal("development"),
    literal("staging"),
    literal("production"),
    literal("test"),
  ]),
  FRONTEND_URL: string(),
  ZAPIER_PUBLISH_HOOK: string(),
});

export type Environment = InferOutput<typeof environmentSchema>;

export const parseEnvironment = (input: unknown) =>
  parse(environmentSchema, input);
