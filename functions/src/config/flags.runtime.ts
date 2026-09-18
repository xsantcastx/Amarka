import { getFirestore } from "firebase-admin/firestore";
import { BackendFlags } from "./backend.flags";

let cachedFlags = BackendFlags;

const getBrandKey = (): string => {
  return process.env.APP_BRAND_KEY || "amarka";
};

export async function getBackendFlags() {
  try {
    const snap = await getFirestore()
      .doc(`site_settings/${getBrandKey()}`)
      .get();
    const liveFlags = (snap.get("backendFlags") || {}) as Partial<typeof BackendFlags>;
    cachedFlags = { ...BackendFlags, ...liveFlags };
  } catch (error) {
    void 0;
  }

  return cachedFlags;
}
