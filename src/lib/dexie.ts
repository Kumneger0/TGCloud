import { SyncCandidate } from '@/components/SyncFromTelegramModal';
import Dexie, { type EntityTable } from 'dexie';
import { Api } from 'telegram';
import { TotalList } from 'telegram/Helpers';
interface FileCache {
	id: number;
	data: Blob;
	cacheKey: string;
}

const fileCacheDb = new Dexie('FileCache') as Dexie & {
	fileCache: EntityTable<FileCache, 'id'>;
};

interface MessageCache {
	id: number;
	data: SyncCandidate[]
	cacheKey: string;
}

const messageCacheDb = new Dexie('MessageCache') as Dexie & {
	messageCache: EntityTable<MessageCache, 'id'>;
};


fileCacheDb.version(1).stores({
	fileCache: '++id, data, cacheKey'
});

messageCacheDb.version(1).stores({
	messageCache: '++id, data, cacheKey'
});

export type { FileCache, MessageCache };
export { fileCacheDb, messageCacheDb };
