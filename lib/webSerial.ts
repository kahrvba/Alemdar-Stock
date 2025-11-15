export class WebSerialController {
  private port: any = null;
  private isConnected: boolean = false;
  private writer: WritableStreamDefaultWriter | null = null;

  async listPorts() {
    try {
      // Check if Web Serial API is supported
      if (!navigator?.serial) {
        throw new Error('Web Serial API is not supported in this browser');
      }

      let ports = await navigator.serial.getPorts();

      if (ports.length === 0) {
        try {
          // This will trigger the browser's port selection dialog
          const port = await navigator.serial.requestPort();
          ports = [port];
        } catch (err) {
          console.warn('No port selected or permission denied');
          return [];
        }
      }

      return ports.map((port) => {
        this.port = port;
        return { path: 'Web Serial Port' };
      });
    } catch (error) {
      console.error('Error listing ports:', error);
      return [];
    }
  }

  async connect() {
    if (this.isConnected) return true;

    try {
      if (!this.port) {
        throw new Error('No port selected');
      }

      await this.port.open({ 
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        bufferSize: 255,
        flowControl: 'none'
      });
      
      // Add delay to ensure port is fully opened
      await new Promise(resolve => setTimeout(resolve, 100));
      
      this.writer = this.port.writable.getWriter();
      this.isConnected = true;
      return true;
    } catch (error) {
      console.error('Connection error details:', error);
      this.isConnected = false;
      this.writer = null;
      throw new Error(`Failed to connect: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async write(message: string) {
    if (!this.isConnected) throw new Error('Not connected');

    try {
      if (!this.writer) {
        throw new Error('Writer not initialized');
      }

      const encoder = new TextEncoder();
      // Add a small delay before sending
      await new Promise(resolve => setTimeout(resolve, 100));
      // Send message in one complete write
      const data = encoder.encode(message);
      await this.writer.write(data);
      // Ensure write is complete
      await this.writer.ready;
      
    } catch (error) {
      console.error('Write error:', error);
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect() {
    if (this.writer) {
      await this.writer.close();
      this.writer = null;
    }
    if (this.port?.close) {
      await this.port.close();
    }
    this.isConnected = false;
    this.port = null;
  }
}
