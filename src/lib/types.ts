import { getFolderContents, getUser } from '@/actions';
import { db } from '@/db';

export interface ChannelDetails {
	title: string;
	username: string;
	channelusername: number | string;
	accessHash: number | string;
	isCreator: boolean;
	isBroadcast: boolean;
}

interface Message {
	flags: number;
	out: boolean;
	mentioned: boolean;
	mediaUnread: boolean;
	silent: boolean;
	post: boolean;
	fromScheduled: boolean;
	legacy: boolean;
	editHide: boolean;
	pinned: boolean;
	noforwards: boolean;
	invertMedia: boolean;
	flags2: number;
	offline: boolean;
	id: number;
	fromId: null;
	fromBoostsApplied: null;
	peerId: {
		channelId: string;
		className: string;
	};
	savedPeerId: null;
	fwdFrom: null;
	viaBotId: null;
	viaBusinessBotId: null;
	replyTo: null;
	date: number;
	message: string;
	media: {
		flags: number;
		nopremium: boolean;
		spoiler: boolean;
		video: boolean;
		round: boolean;
		voice: boolean;
		document: {
			flags: number;
			id: string;
			accessHash: string;
			fileReference: {
				type: 'Buffer';
				data: number[];
			};
			date: number;
			mimeType: string;
			size: string | number | { value: string | number | bigint };
			thumbs: (
				| {
						type: 'i';
						bytes: {
							type: 'Buffer';
							data: number[];
						};
						className: string;
				  }
				| {
						type: 'm';
						w: number;
						h: number;
						size: number;
						className: string;
				  }
			)[];
			videoThumbs: null;
			dcId: number;
			attributes: {
				w?: number;
				h?: number;
				fileName?: string;
				className: string;
			}[];
			className: string;
		};
		altDocument: null;
		ttlSeconds: null;
		className: string;
	};
	replyMarkup: null;
	entities: null;
	views: number;
	forwards: number;
	replies: null;
	editDate: null;
	postAuthor: null;
	groupedId: null;
	reactions: null;
	restrictionReason: null;
	ttlPeriod: null;
	quickReplyShortcutId: null;
	className: string;
}

export default Message;

export type FilesData = {
	date: string | null;
	id: number;
	userId: string;
	fileName: string;
	mimeType: string;
	size: bigint;
	url: string;
	fileTelegramId: string;
	category: string;
}[];

export type User = Awaited<ReturnType<typeof getUser>> & {
	telegramSession: string | undefined;
};

export interface MessageMediaPhoto {
	flags: number;
	spoiler: boolean;
	photo: Photo;
	ttlSeconds: number | null;
	className: string;
}

interface Photo {
	flags: number;
	hasStickers: boolean;
	id: string;
	accessHash: string;
	fileReference: FileReference;
	date: number;
	sizes: PhotoSize[];
	videoSizes: null;
	dcId: number;
	className: string;
}

interface FileReference {
	type: string;
	data: number[];
}

interface PhotoSize {
	type: string;
	bytes?: {
		type: string;
		data: number[];
	};
	className: string;
	w?: number;
	h?: number;
	size?: number;
	sizes?: number[];
}

export type ChapaInitializePaymentRequestBody = {
	amount: string;
	currency: string;
	email: string;
	first_name: string;
	last_name?: string;
	tx_ref: `${string}-${string}-${string}-${string}-${string}`;
	return_url: string;
	customization?: {
		title?: string;
		description?: string;
		logo?: string;
	};
};

export type Folder = Awaited<ReturnType<typeof db.query.folders.findFirst>>;

export type GetAllFilesReturnType = Awaited<ReturnType<typeof getFolderContents>>;

export type FileItem = {
	url: string;
	date: string;
	id: number;
	userId: string;
	folderId: string | null;
	fileName: string;
	mimeType: string;
	size: bigint;
	fileTelegramId: string;
	category: string;
};
