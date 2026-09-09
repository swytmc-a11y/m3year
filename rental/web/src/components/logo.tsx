import Link from "next/link";
import { RoadMark } from "@/components/road-mark";

export function Logo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 font-heading text-2xl font-extrabold text-ink"
    >
      <RoadMark className="text-[22px]" />
      سمو
    </Link>
  );
}
