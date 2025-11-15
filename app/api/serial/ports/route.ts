import { NextResponse } from 'next/server';
import { SerialPort } from 'serialport';

export async function GET() {
  try {
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
