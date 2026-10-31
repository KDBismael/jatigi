import Image from "next/image";
import { cn } from "@/lib/utils";
export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-bold", className)}>
      <Image src="/icon.svg" width={24} height={24} alt="" />
      <span>Warko</span>
    </span>
  );
}
