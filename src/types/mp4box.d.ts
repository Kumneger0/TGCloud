declare module "mp4box" {
    export interface MP4File {
        onReady: ((info: MP4Info) => void) | null;
        onError: ((error: unknown) => void) | null;
        onSegment: ((
            id: number,
            user: unknown,
            buffer: ArrayBuffer,
            sampleNumber: number,
            isLast: boolean
        ) => void) | null;

        appendBuffer(data: ArrayBuffer & { fileStart: number }): number;
        flush(): void;
        start(): void;

        setSegmentOptions(
            trackId: number,
            user: unknown,
            options: {
                nbSamples?: number;
                rapAlignement?: boolean;
            }
        ): void;

        initializeSegmentation(): Array<{
            id: number;
            user: unknown;
            buffer: ArrayBuffer;
        }>;
    }

    export interface MP4Track {
        id: number;
        type: "video" | "audio" | string;
        codec: string;
        timescale: number;
        duration: number;
        nb_samples: number;
    }

    export interface MP4Info {
        duration: number;
        timescale: number;
        tracks: MP4Track[];
    }

    export function createFile(): MP4File;

    const MP4Box: {
        createFile: typeof createFile;
    };

    export default MP4Box;
}