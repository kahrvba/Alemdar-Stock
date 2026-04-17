import packageJson from "@/package.json";
import { getLatestDeploymentUpdate } from "@/lib/deployment-events";
import { incrementPatch, normalizeBaseVersion } from "@/lib/versioning";

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
  const isProduction = process.env.NODE_ENV === "production";

  if (!isProduction || deploymentKey === "development-build") {
    return {
      appVersion: baseVersion,
      deploymentKey,
    };
  }

  const latest = await getLatestDeploymentUpdate();

  const appVersion =
    !latest ? baseVersion : latest.deploymentKey === deploymentKey ? latest.appVersion : incrementPatch(latest.appVersion);

  return {
    appVersion,
    deploymentKey,
  };
}
