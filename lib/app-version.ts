import packageJson from "@/package.json";
import { normalizeBaseVersion } from "@/lib/versioning";

export type DeploymentVersion = {
  appVersion: string;
  deploymentKey: string;
};

function resolveDeploymentKey() {
  return process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA || "development-build";
}

export async function getDeploymentVersion(): Promise<DeploymentVersion> {
  const deploymentKey = resolveDeploymentKey();
  const baseVersion = normalizeBaseVersion(packageJson.version);

  return {
    appVersion: baseVersion,
    deploymentKey,
  };
}
