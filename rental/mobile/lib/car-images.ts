const LOCAL_CAR_IMAGES = [
  require("../assets/cars/yaris.webp"),
  require("../assets/cars/elantra.webp"),
  require("../assets/cars/camry.webp"),
  require("../assets/cars/tucson.webp"),
  require("../assets/cars/fortuner.webp"),
  require("../assets/cars/mercedes-a200.webp"),
] as const;

const MODEL_IMAGE: Record<string, (typeof LOCAL_CAR_IMAGES)[number]> = {
  yaris: LOCAL_CAR_IMAGES[0],
  يارس: LOCAL_CAR_IMAGES[0],
  elantra: LOCAL_CAR_IMAGES[1],
  النترا: LOCAL_CAR_IMAGES[1],
  camry: LOCAL_CAR_IMAGES[2],
  كامري: LOCAL_CAR_IMAGES[2],
  tucson: LOCAL_CAR_IMAGES[3],
  توسان: LOCAL_CAR_IMAGES[3],
  fortuner: LOCAL_CAR_IMAGES[4],
  فورتشنر: LOCAL_CAR_IMAGES[4],
  mercedes: LOCAL_CAR_IMAGES[5],
  مرسيدس: LOCAL_CAR_IMAGES[5],
};

/** Keeps Miyar's shared database untouched while the Smo preview gets complete imagery. */
export function carImageSource(car: {
  id: string;
  make: string;
  model: string;
  cover_image?: string | null;
}) {
  if (car.cover_image) return { uri: car.cover_image };

  const name = `${car.make} ${car.model}`.toLocaleLowerCase();
  const matched = Object.entries(MODEL_IMAGE).find(([key]) => name.includes(key));
  if (matched) return matched[1];

  const stableIndex = [...car.id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % LOCAL_CAR_IMAGES.length;
  return LOCAL_CAR_IMAGES[stableIndex];
}
