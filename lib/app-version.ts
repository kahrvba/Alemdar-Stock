import packageJson from "@/package.json";
import { normalizeBaseVersion } from "@/lib/versioning";

export async function getAppVersion(): Promise<string> {
  return normalizeBaseVersion(packageJson.version);
}
