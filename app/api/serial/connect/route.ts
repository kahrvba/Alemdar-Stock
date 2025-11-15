import { NextResponse } from 'next/server';
import { SerialPort } from 'serialport';

declare global {
  var serialConnection: SerialPort | undefined;
  var serialPortPath: string | undefined;
}

export async function POST(req: Request) {
  const { port } = await req.json();

  try {
    // Close existing connection if any
    if (global.serialConnection) {
      await new Promise<void>((resolve) => {
        global.serialConnection?.close(() => resolve());
      });
      global.serialConnection = undefined;
    }

    // Create a new SerialPort connection
    const connection = new SerialPort({
      path: port,
      baudRate: 9600,
      autoOpen: false,
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
    });

    // Open the port with error handling
    await new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Connection timeout after 5 seconds'));
      }, 5000);

      connection.open((error) => {
        clearTimeout(timeoutId);
        if (error) {
          console.error('Port open error:', error);
          reject(new Error(`Failed to open port: ${error.message}`));
          return;
        }
        global.serialConnection = connection;
        global.serialPortPath = port;
        resolve();
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Connection failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to connect to port' },
      { status: 500 }
    );
  }
}
