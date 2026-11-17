
import { QRCodeSVG } from "qrcode.react";

function ProductQR({ productId }) {
  if (!productId) return null;

  const verificationUrl =
    `${window.location.origin}/verify/${productId}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(verificationUrl);
      alert("Smartphone verification link copied!");
    } catch {
      window.prompt("Copy this verification link:", verificationUrl);
    }
  }

  return (
    <div className="qr-section">
      <h3>Smartphone QR Code</h3>

      <p>
        Scan this QR code to view smartphone details
        and ownership history.
      </p>

      <div className="qr-code">
        <QRCodeSVG
          value={verificationUrl}
          size={220}
          level="H"
          includeMargin
        />
      </div>

      <p>
        <strong>Smartphone ID:</strong> {productId}
      </p>

      <p className="verification-link">
        {verificationUrl}
      </p>

      <button type="button" onClick={copyLink}>
        Copy Verification Link
      </button>
    </div>
  );
}

export default ProductQR;
