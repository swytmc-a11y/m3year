import Link from "next/link";
import { CaliperMark } from "@/components/caliper-mark";

export function Logo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 font-heading text-2xl font-extrabold text-ink"
    >
      <CaliperMark className="text-verify text-[22px]" />
      معيار
    </Link>
  );
}
