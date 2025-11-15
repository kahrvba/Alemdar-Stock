import { NextResponse } from 'next/server';

// Prevent build-time evaluation of native module
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    // Dynamic import to prevent build-time evaluation
    const { SerialPort } = await import('serialport');
    const ports = await SerialPort.list();

    // extract only the port paths
    const portNames = ports.map(port => port.path);

    if ( portNames.length === 0){
      console.warn("No Arduino is connected currently");
      return NextResponse.json({
        ports: [],
        useWebSerial: true
      });
    }
    return NextResponse.json({
      ports: portNames,
      useWebSerial: false
    });

  } catch (error) {
    console.error("Error to list ports:", error);
    return NextResponse.json({
      ports: [],
      useWebSerial: true
    });
  }
}
