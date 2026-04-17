import packageJson from "@/package.json";

export type DeploymentVersion = {
  appVersion: string;
  deploymentKey: string;
};

function resolveDeploymentKey() {
  return process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA || "development-build";
}

export function getDeploymentVersion(): DeploymentVersion {
  return {
    appVersion: packageJson.version,
    deploymentKey: resolveDeploymentKey(),
  };
}
