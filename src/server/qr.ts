import "server-only";
import QRCode from "qrcode";

/**
 * QR codes are rendered to an SVG string on the server and inlined into the
 * page. No image request, no third-party generator, and it works with the
 * machine offline — which is the whole point of §1.5.
 */
export async function qrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: {
      dark: "#F2EEE3", // Cloud — the code itself
      light: "#0000", // transparent, so it sits on any surface
    },
  });
}
