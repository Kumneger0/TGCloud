import { getAllFiles, useUserProtected } from "@/actions";
import { Dashboard } from "@/components/dashboard";
import Files from "@/components/FilesRender";
import { LoadingItems } from "@/components/loading-files";
import { Suspense } from "react";

export type FilesData = {
  date: string | null;
  id: number;
  userId: string;
  fileName: string;
  mimeType: string;
  size: bigint;
  url: string;
}[];

export default async function Home({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const user = await useUserProtected();

  const searchItem = searchParams.search;
  const page = parseInt(searchParams.page || "1");

  //@ts-ignore
  const [files, total] = await getAllFiles(searchItem, (page - 1) * 8);

  return (
    <Dashboard total={total} user={user}>
      <Suspense fallback={<LoadingItems />}>
        <Files files={files} user={user} />
      </Suspense>
    </Dashboard>
  );
}
