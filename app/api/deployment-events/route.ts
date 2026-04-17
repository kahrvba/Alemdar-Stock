import pool from "@/lib/db";
import {
  DEPLOYMENT_CHANNEL,
  getLatestDeploymentUpdate,
} from "@/lib/deployment-events";

function sseMessage(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const pgClient = await pool.connect();

      const close = async () => {
        try {
          pgClient.removeAllListeners("notification");
          await pgClient.query(`UNLISTEN ${DEPLOYMENT_CHANNEL}`);
        } catch {
          // Ignore cleanup errors.
        } finally {
          pgClient.release();
        }
      };

      try {
        const current = await getLatestDeploymentUpdate();
        if (current) {
          controller.enqueue(encoder.encode(sseMessage("deployment", current)));
        }

        pgClient.on("notification", (notification) => {
          if (notification.channel !== DEPLOYMENT_CHANNEL || !notification.payload) {
            return;
          }

          controller.enqueue(
            encoder.encode(`event: deployment\ndata: ${notification.payload}\n\n`)
          );
        });

        await pgClient.query(`LISTEN ${DEPLOYMENT_CHANNEL}`);
      } catch (error) {
        controller.error(error);
        await close();
        return;
      }

      request.signal.addEventListener("abort", () => {
        controller.close();
        void close();
      });
    },
    cancel() {
      // Request abort handler above performs the cleanup.
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
