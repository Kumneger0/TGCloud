"use client";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { useCreateQueryString } from "@/lib/utils";
import { useMediaQuery } from "@uidotdev/usehooks";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ElementRef, useEffect, useRef, useState } from "react";

export function FileModalView({
  children,
  ItemThatWillShowOnModal,
  id,
}: {
  children: React.ReactNode;
  ItemThatWillShowOnModal: () => JSX.Element;
  id: number;
}) {
  const searchParams = useSearchParams();
  const idInURL = searchParams.get("open");
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const pathname = usePathname();
  const dialogRef = useRef<ElementRef<typeof DialogTrigger> | null>(null); // Initialize useRef with proper type or null

  const createQueryString = useCreateQueryString(searchParams);
  const router = useRouter();

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (value) {
      router.push(pathname + "?" + createQueryString("open", id.toString()));
    } else {
      router.push(pathname);
    }
  };

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger className="w-full">{children}</DialogTrigger>
        <DialogContent className="md:min-w-[760px] lg:min-w-[1000px] w-full max-h-[90dvh] h-full overflow-y-auto">
          <ItemThatWillShowOnModal />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerTrigger>
        {children} {/* Ensure children are passed correctly */}
      </DrawerTrigger>
      <DrawerContent className="max-h-[90dvh] h-full">
        <ItemThatWillShowOnModal />
      </DrawerContent>
    </Drawer>
  );
}