import { uploadFile } from "@/actions";
import { type ClassValue, clsx } from "clsx";
import TTLCache from "@isaacs/ttlcache";
import { ReadonlyURLSearchParams } from "next/navigation";
import { Dispatch, SetStateAction } from "react";
import { twMerge } from "tailwind-merge";
import { Api, TelegramClient } from "telegram";
import { TypeNotFoundError } from "telegram/errors";
import { ChannelDetails, User } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number) {
  const KB = 1024;
  const MB = KB * 1024;
  const GB = MB * 1024;

  if (bytes < KB) return `${bytes} Bytes`;
  if (bytes < MB) return `${(bytes / KB).toFixed(2)} KB`;
  if (bytes < GB) return `${(bytes / MB).toFixed(2)} MB`;

  return `${(bytes / GB).toFixed(2)} GB`;
}

export async function uploadFiles(
  formData: FormData,
  user: User,
  onProgress: Dispatch<
    SetStateAction<
      | {
          itemName: string;
          itemIndex: number;
          progress: number;
        }
      | undefined
    >
  >,
  client: TelegramClient | undefined
) {
  if (!client) {
    throw new Error("Failed to initialize Telegram client");
  }
  if (!client?.connected) await client.connect();
  const files = formData.getAll("files") as File[];
  try {
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      const toUpload = await client.uploadFile({
        file: file,
        workers: 5,
        onProgress: (progress) => {
          onProgress({
            itemName: file.name,
            itemIndex: index,
            progress: progress,
          });
        },
      });

      const result = await client.sendFile(
        getChannelEntity(user?.channelId!, user?.accessHash!),
        {
          file: toUpload,
          forceDocument: false,
        }
      );

      const uploadToDbResult = await uploadFile({
        fileName: file.name,
        mimeType: file.type,
        size: BigInt(file.size),
        url: !user?.hasPublicTgChannel
          ? `https://t.me/c/${user?.channelId}/${result?.id}`
          : `https://t.me/${user?.channelUsername}/${result?.id}`,
        fileTelegramId: result.id,
      });
      console.log("File uploaded successfully:", uploadToDbResult);
    }
  } catch (err) {
    if (err instanceof TypeNotFoundError) {
      throw new Error(err.message);
    }

    if (err instanceof Error) {
      throw new Error(err.message);
    }

    throw new Error("there was an error");
  } finally {
    await client.disconnect();
  }
}

export async function delelteItem(
  user: User,
  postId: number | string,
  client: TelegramClient | undefined
) {
  if (!client) return alert("You are not connected to Telegram");

  if (!client?.connected) {
    await client.connect();
  }
  try {
    const deleteMediaStatus = await client.deleteMessages(
      getChannelEntity(user?.channelId!, user?.accessHash!),
      [Number(postId)],
      {
        revoke: true,
      }
    );
    return deleteMediaStatus;
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(err.message);
    }
    if (err instanceof TypeNotFoundError) {
      throw new Error(err.message);
    }
    if (err && typeof err == "object" && "message" in err) {
      throw new Error(err.message as string);
    }
    return null;
  } finally {
    await client.disconnect();
  }
}

export async function getChannelDetails(
  client: TelegramClient,
  username: string
) {
  if (!client) {
    alert("Telegram client is not initialized");
    throw new Error("Telegram client is not initialized");
  }

  if (!client?.connected) {
    await client.connect();
  }

  const entity = (await client.getEntity(
    username
  )) as unknown as ChannelDetails & {
    id: { value: string };
    broadcast: boolean;
    creator: any;
  };

  const channelDetails: Partial<ChannelDetails> = {
    title: entity.title,
    username: entity.username,
    channelusername: entity.id.value,
    isCreator: entity.creator,
    isBroadcast: entity.broadcast,
  };

  client.disconnect();
  return channelDetails;
}

export function useCreateQueryString(
  searchParams: ReadonlyURLSearchParams
): (name: string, value: string) => string {
  return (name: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(name, value);
    return params.toString();
  };
}

export const getChannelEntity = (channelId: string, accessHash: string) => {
  return new Api.InputChannel({
    //@ts-ignore
    channelId: channelId,
    //@ts-ignore
    accessHash: accessHash,
  });
};

export const blobCache = new TTLCache<string, Blob>({
  max: 100,
  ttl: 1000 * 60 * 60 * 24 * 7, // 1 week
});


export function getBannerURL(filename: string, isDarkMode: boolean) {
  const width = 600;
  const height = 500;
  const lightBackgroundColor = "ffffff"; 
  const lightTextColor = "000000"; 
  const darkBackgroundColor = "000000";
  const darkTextColor = "ffffff"; 

  const backgroundColor = isDarkMode
    ? darkBackgroundColor
    : lightBackgroundColor;
  const textColor = isDarkMode ? darkTextColor : lightTextColor;

  const bannerUrl = `https://via.placeholder.com/${width}x${height}/${backgroundColor}/${textColor}?text=${filename}`;
  return bannerUrl;
}

export function isDarkMode() {
  return (
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

