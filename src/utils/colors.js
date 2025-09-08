export function hexToRgb(hex) {
  hex = hex.replace('#', '')
  if (hex.length === 3) hex = hex.split('').map(x => x + x).join('')
  const num = parseInt(hex, 16)
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

export function rgbToHex(r, g, b) {
  const toHex = (c) => {
    const hex = Math.round(c).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return "#" + toHex(r) + toHex(g) + toHex(b);
}

export const namedColors = {
  red: "#73472e",
  blue: "#293e66",
  yellow: "#a8964c",
  green: "#4d7a4d",
  black: "#191a19",
  white: "#cccccc",
  purple: "#6e2d72",
  orange: "#996c00",
  grey: "#808080",
  brown: "#6d492e",
  blue_light: "#476b8f",
  green_light: "#668066",
  yellow_light: "#ffcc33"
};

