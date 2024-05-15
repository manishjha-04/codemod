import type { IncomingHttpHeaders } from "node:http";
import { type Environment, parseEnvironment } from "./schemata/env.js";

export const areClerkKeysSet = (
  environment: Environment,
): environment is Omit<
  Environment,
  "CLERK_PUBLISH_KEY" | "CLERK_SECRET_KEY" | "CLERK_JWT_KEY"
> & {
  CLERK_PUBLISH_KEY: string;
  CLERK_SECRET_KEY: string;
  CLERK_JWT_KEY: string;
} => {
  return (
    environment.CLERK_PUBLISH_KEY !== undefined &&
    environment.CLERK_SECRET_KEY !== undefined &&
    environment.CLERK_JWT_KEY !== undefined
  );
};

const flattenArray = (
  maybeArray?: string | ReadonlyArray<string> | null,
): string | null => {
  if (typeof maybeArray === "string") {
    return maybeArray;
  }

  return maybeArray?.[0] ?? null;
};

export const getCustomAccessToken = (
  environment: Environment,
  headers: IncomingHttpHeaders,
): string | null =>
  flattenArray(
    headers[environment.X_CODEMOD_ACCESS_TOKEN?.toLocaleLowerCase() ?? ""],
  );

export const buildTimeoutPromise = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });

export const environment = parseEnvironment(process.env);
