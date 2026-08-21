// Simple robust QR Code Generator utility for URLs & Text
export function getQRCodeUrl(text: string, size = 250): string {
  const encoded = encodeURIComponent(text);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&margin=10`;
}
