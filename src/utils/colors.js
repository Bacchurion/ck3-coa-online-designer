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
  red: "#732217",
  blue: "#143F66",
  yellow: "#BF8630",
  green: "#1F4D23",
  black: "#1A1713",
  white: "#CCCAC8",
  purple: "#591B40",
  orange: "#993A00",
  grey: "#808080",
  brown: "#733C1E",
  blue_light: "#2A5D8C",
  green_light: "#336638",
  yellow_light: "#FFAD33"
};

