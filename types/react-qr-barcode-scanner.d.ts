declare module "react-qr-barcode-scanner" {
  import * as React from "react";

  type Result = { text?: string } | null;
  type UpdateHandler = (error: unknown, result: Result) => void;

  export type BarcodeScannerComponentProps = {
    onUpdate: UpdateHandler;
    onError?: (error: unknown) => void;
    width?: number | string;
    height?: number | string;
    facingMode?: "environment" | "user";
    torch?: boolean;
    delay?: number;
    stopStream?: boolean;
    videoConstraints?: MediaTrackConstraints;
  };

  const BarcodeScannerComponent: React.ComponentType<BarcodeScannerComponentProps>;
  export default BarcodeScannerComponent;
}

