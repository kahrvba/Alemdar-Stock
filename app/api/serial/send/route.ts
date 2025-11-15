import { NextRequest, NextResponse } from 'next/server';

// Prevent build-time evaluation of native module
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

declare global {
  var serialConnection: any;
}

export async function POST(req: NextRequest) {
  const { message } = await req.json();

  if (!global.serialConnection) {
    return NextResponse.json({ error: 'Not connected' }, { status: 400 });
  }

  try {
    await new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Write timeout'));
      }, 3000); // 3 second timeout

      global.serialConnection!.write(message, (err: Error | null | undefined) => {
        clearTimeout(timeoutId);
        if (err) {
          console.error('Write error:', err);
          reject(err);
        } else {
          // Add a small delay to ensure the message is sent
          setTimeout(resolve, 50);
        }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Send failed:', error);
    return NextResponse.json({ error: 'Send failed' }, { status: 500 });
  }
}
