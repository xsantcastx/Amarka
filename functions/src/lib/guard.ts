import * as functions from "firebase-functions/v1";
import { getBackendFlags } from "../config/flags.runtime";
import { BackendFlags } from "../config/backend.flags";

type FlagName = keyof typeof BackendFlags;

interface GuardOptions {
  ok?: number;
  disabledMsg?: string;
}

export function withFlag<T extends (...args: any[]) => any>(
  flag: FlagName,
  handler: T,
  options: GuardOptions = {}
): (...handlerArgs: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  const { ok = 200, disabledMsg = `${String(flag)} disabled` } = options;

  return async (...args: Parameters<T>) => {
    const flags = await getBackendFlags();
    if (!flags[flag]) {
      const maybeReq = args[0] as { method?: string } | undefined;
      const maybeRes = args[1] as { status?: (code: number) => any; send?: (body: any) => any } | undefined;

      if (maybeReq?.method && maybeRes?.status && maybeRes?.send) {
        maybeRes.status(ok).send(disabledMsg);
        return;
      }

      throw new functions.https.HttpsError("failed-precondition", disabledMsg);
    }

    return await handler(...args);
  };
}
