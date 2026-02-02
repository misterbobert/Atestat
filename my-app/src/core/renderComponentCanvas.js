import { batterySVG, resistorSVG, bulbSVG, switchSVG, meterSVG } from "./renderersSvg";

const cache = new Map();

function getCachedImage(svgString) {
  if (cache.has(svgString)) return cache.get(svgString);

  const img = new Image();
  img.src = "data:image/svg+xml;base64," + btoa(svgString);
  cache.set(svgString, img);
  return img;
}

export function renderComponentCanvas(ctx, item, cam) {
  const scale = cam.z;
  const x = item.x * scale + cam.x;
  const y = item.y * scale + cam.y;

  let svg = null;

  switch (item.type) {
    case "battery":
      svg = batterySVG(item.V, item.Rint);
      break;
    case "resistor":
      svg = resistorSVG(item.R);
      break;
    case "bulb":
      svg = bulbSVG(item.brightness);
      break;
    case "switch":
      svg = switchSVG(item.closed);
      break;
    case "voltmeter":
      svg = meterSVG("voltmeter", item.display);
      break;
    case "ammeter":
      svg = meterSVG("ammeter", item.display);
      break;
    case "ohmmeter":
      svg = meterSVG("ohmmeter", item.display);
      break;
  }

  if (!svg) return;

  const img = getCachedImage(svg);

  const w = 200 * scale;
  const h = 120 * scale;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((item.rot * Math.PI) / 180);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}