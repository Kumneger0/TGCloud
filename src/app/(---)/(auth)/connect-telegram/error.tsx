'use client';

import { Error } from '@/components/error';
import React from 'react';

function ConnecTelegramError(props: { error: { message: string } }) {
	return <Error />;
}

export default ConnecTelegramError;
