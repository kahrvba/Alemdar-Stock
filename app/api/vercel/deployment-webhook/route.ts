import { NextResponse } from "next/server";
import { publishDeploymentUpdate } from "@/lib/deployment-events";
import packageJson from "@/package.json";

type VercelDeploymentWebhookPayload = {
  type?: string;
  payload?: {
    target?: string | null;
    deployment?: {
      id?: string;
      meta?: {
        [key: string]: string | undefined;
      };
    };
  };
};

export async function POST(request: Request) {
  const rawBody = await request.text();

  let body: VercelDeploymentWebhookPayload;
  try {
    body = JSON.parse(rawBody) as VercelDeploymentWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const isDeploymentSucceeded =
    body.type === "deployment.succeeded" || body.type === "deployment.ready";

  if (!isDeploymentSucceeded || body.payload?.target !== "production") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const deploymentId = body.payload?.deployment?.id?.trim();
  const commitSha = body.payload?.deployment?.meta?.githubCommitSha?.trim();
  const deploymentKey = deploymentId || commitSha;

  if (!deploymentKey) {
    return NextResponse.json(
      { error: "Missing deployment identity in webhook payload" },
      { status: 400 }
    );
  }

  const record = await publishDeploymentUpdate({
    deploymentKey,
    baseVersion: packageJson.version,
  });

  return NextResponse.json({ ok: true, record });
}
