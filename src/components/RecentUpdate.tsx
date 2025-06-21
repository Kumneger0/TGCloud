import { getLatestChangelogDate, UPDATE_BANNER_DURATION_DAYS } from '@/lib/latestUpdate';
import UpdateBannerClient from './recentUpdateClient';

function getIsRecentUpdate() {
	const latestUpdateDate = getLatestChangelogDate();
	if (!latestUpdateDate) return false;
	console.log('latestUpdateDate', latestUpdateDate);
	const lastUpdate = new Date(latestUpdateDate);
	const now = new Date();
	const diffDays = now.getTime() - lastUpdate.getTime();
	const diffDaysNumber = diffDays / (1000 * 60 * 60 * 24);
	return {
		isRecentUpdate: diffDaysNumber < UPDATE_BANNER_DURATION_DAYS,
		updateDate: latestUpdateDate
	};
}

export default function UpdateBanner() {
	const result = getIsRecentUpdate();
	if (!result) return null;
	const { isRecentUpdate, updateDate } = result;
	return <UpdateBannerClient isRecentUpdate={isRecentUpdate} updateDate={updateDate} />;
}
