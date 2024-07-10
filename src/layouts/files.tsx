'use client'
import { delelteItem } from "@/actions";
import { FilesData } from "@/app/files/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { tgClient } from "@/lib/tgClient";
import { Api } from "telegram";
import { formatBytes } from "@/lib/utils";
import { redirect } from "next/navigation";

type User = {
  id: string;
  name: string;
  email: string;
  telegramSession: string;
  channelId: string;
};

function Files({ files, user }: { files?: FilesData[]; user?: User }) {
  const [allFiles, setAllFiles] = useState<FilesData[]>();

  useEffect(() => {
    const client = tgClient(user?.telegramSession as string);

    console.log("Connecting to Telegram client...");

    (async () => {
      await client.connect();

      console.log("Connection status", client.connected);

      const limit = 100;
      let offsetId = 0;
      let allMessages: Api.Message[] = [];
      let hasMore = true;

      try {
        while (hasMore) {
          console.log(`Fetching messages with offsetId: ${offsetId}`);

          const result = await client.getMessages(user?.channelId, {
            limit: limit,
            offsetId: offsetId,
          });

          console.log(`Fetched ${result.length} messages`);

          allMessages = allMessages.concat(result);
          if (result.length < limit) {
            hasMore = false;
          } else {
            offsetId = result[result.length - 1].id;
          }
        }

        console.log("All messages fetched:", allMessages.length);
        return allMessages
          .filter((message) => message.file)
          .map(({ file, id }) => {
            return {
              title: file?.title,
              name: file?.name,
              size: formatBytes(file?.size as number),
              src: crypto.randomUUID(),
              type: file?.mimeType as string,
              id,
            } satisfies FilesData;
          });
      } catch (err) {
        console.log(err.message);
      }
    })().then((res) => setAllFiles(res));
  }, [user]);

  const filesToDisplay = files ?? allFiles;

  return (
    <div className="grid grid-cols-2 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {filesToDisplay?.map((file, index) => (
        <Card
          key={index}
          className="group relative overflow-hidden rounded-lg shadow-sm transition-all hover:shadow-md"
        >
          <Link
            target="_blank"
            href={`https://t.me/kuneDrive/${file.id}`}
            className="absolute inset-1 z-10"
            prefetch={false}
          >
            <span className="sr-only">View file</span>
          </Link>
          <Image
            src={"https://via.placeholder.com/299x199"}
            alt={file.name}
            width={299}
            height={199}
            className="h-41 w-full object-cover transition-opacity group-hover:opacity-50"
          />
          <CardContent className="p-5 relative">
            <div className="flex items-center justify-between">
              <div className="truncate font-medium">{file.name}</div>
              <Badge
                variant="outline"
                className="rounded-full px-3 py-1 text-xs"
              >
                {file.type}
              </Badge>
            </div>
            <div className="mt-3 text-sm text-muted-foreground">
              <div>Size: {file.size}</div>
            </div>
            <div className="absolute z-50 right-2 bottom-2">
              <Button
                onClick={async () => {
                  await delelteItem(file.id);
                }}
                variant={"destructive"}
              >
                <Delete />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default Files;

// function DisplayImage({
//   buffer,
//   name,
//   type,
// }: {
//   buffer: Buffer;
//   type: string;
//   name: string;
// }) {
//   const blob = new Blob([buffer], { type });

//   const url = URL.createObjectURL(blob);

//   return (
  
//   );
// }


function Delete() {
    return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
}