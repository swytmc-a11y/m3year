// Every car card frames its photo with `object-fit: contain` inside a fixed
// box (the rail card, the detail hero) specifically so a photo is never
// cropped — but "never cropped" only reads as consistent when every photo
// already shares the same canvas shape and the same margin around the car.
// Two photos shot/generated at different zoom levels still look mismatched
// side by side even though neither is cropped.
//
// This normalizes at upload time: draws whatever was uploaded onto a fixed
// 1600×900 (16:9 — the same ratio the detail-page hero already uses)
// transparent canvas, contain-fit and centered, so every stored image has
// identical outer dimensions. It cannot know where "the car" is in an
// arbitrary photo, so it can't fix a source photo that was already zoomed
// in tight — that part still depends on the photo following the framing
// guidance (car ~70-80% of frame width, centered) when it's created.
const TARGET_WIDTH = 1600;
const TARGET_HEIGHT = 900;

export async function normalizeCarImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const canvas = document.createElement("canvas");
  canvas.width = TARGET_WIDTH;
  canvas.height = TARGET_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  const scale = Math.min(TARGET_WIDTH / bitmap.width, TARGET_HEIGHT / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  const x = (TARGET_WIDTH - w) / 2;
  const y = (TARGET_HEIGHT - h) / 2;

  ctx.clearRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);
  ctx.drawImage(bitmap, x, y, w, h);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return file;

  const name = file.name.replace(/\.[^.]+$/, "") + ".png";
  return new File([blob], name, { type: "image/png" });
}
