import { textWidth } from "./width.ts";

export const colors = {
  good: "#2e7d32",
  average: "#b45309",
  poor: "#c62828",
  neutral: "#0b6aa8",
  label: "#555",
} as const;

export type BadgeOptions = { label: string; message: string; color: string };

const PADDING = 6;
const HEIGHT = 20;

export function renderBadge({ label, message, color }: BadgeOptions): string {
  const labelWidth = Math.round(textWidth(label) + PADDING * 2);
  const messageWidth = Math.round(textWidth(message) + PADDING * 2);
  const width = labelWidth + messageWidth;
  const title = escapeXml(`${label}: ${message}`);
  const text = (value: string, x: number, w: number) =>
    `<text x="${x * 10}" y="140" transform="scale(.1)" textLength="${Math.round((w - PADDING * 2) * 10)}">${escapeXml(value)}</text>`;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${HEIGHT}" role="img" aria-label="${title}">`,
    `<title>${title}</title>`,
    `<clipPath id="r"><rect width="${width}" height="${HEIGHT}" rx="3" fill="#fff"/></clipPath>`,
    `<g clip-path="url(#r)">`,
    `<rect width="${labelWidth}" height="${HEIGHT}" fill="${colors.label}"/>`,
    `<rect x="${labelWidth}" width="${messageWidth}" height="${HEIGHT}" fill="${escapeXml(color)}"/>`,
    `</g>`,
    `<g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="110">`,
    text(label, labelWidth / 2, labelWidth),
    text(message, labelWidth + messageWidth / 2, messageWidth),
    `</g>`,
    `</svg>`,
  ].join("");
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
