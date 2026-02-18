import { getUser } from '@/actions';
import ConnectTelegram from '@/components/connectTelegram';
import { USER_TELEGRAM_SESSION_COOKIE_NAME } from '@/lib/consts';
import { User } from '@/lib/types';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

async function Page() {
	const user = await getUser();
	if (!user) {
		redirect('/login');
	}

	const cookieStore = await cookies();
	const stringSession = cookieStore.get(USER_TELEGRAM_SESSION_COOKIE_NAME)?.value;

	const mode = user.authType;

	const doesHeOrSheHasAChannel = user.accessHash && user.channelId;

	if (mode === 'user' && stringSession && doesHeOrSheHasAChannel) {
		return redirect('/files');
	} else if (mode === 'bot' && user?.botTokens?.length && doesHeOrSheHasAChannel) {
		return redirect('/files');
	}
	return (
		<div>
			<ConnectTelegram user={{ ...user, telegramSession: stringSession ?? null }} />
		</div>
	);
}

export default Page;
