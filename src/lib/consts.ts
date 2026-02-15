export const USER_TELEGRAM_SESSION_COOKIE_NAME = 'telegramSession';


export const TELEGRAM_ERRORS = {
    BOT_PAYMENTS_DISABLED: {
        code: 400,
        description: 'Please enable bot payments in botfather before calling this method.'
    },
    BROADCAST_PUBLIC_VOTERS_FORBIDDEN: {
        code: 400,
        description: "You can't forward polls with public voters."
    },
    BUTTON_DATA_INVALID: {
        code: 400,
        description: 'The data of one or more of the buttons you provided is invalid.'
    },
    BUTTON_TYPE_INVALID: {
        code: 400,
        description: 'The type of one or more of the buttons you provided is invalid.'
    },
    BUTTON_URL_INVALID: { code: 400, description: 'Button URL invalid.' },
    CHANNEL_INVALID: { code: 400, description: 'The provided channel is invalid.' },
    CHANNEL_PRIVATE: { code: 400, description: "You haven't joined this channel/supergroup." },
    CHAT_ADMIN_REQUIRED: { code: 400, description: 'You must be an admin in this chat to do this.' },
    CHAT_FORWARDS_RESTRICTED: {
        code: 400,
        description: "You can't forward messages from a protected chat."
    },
    CHAT_RESTRICTED: {
        code: 400,
        description: "You can't send messages in this chat, you were restricted."
    },
    CHAT_SEND_GIFS_FORBIDDEN: { code: 403, description: "You can't send gifs in this chat." },
    CHAT_SEND_MEDIA_FORBIDDEN: { code: 403, description: "You can't send media in this chat." },
    CHAT_SEND_POLL_FORBIDDEN: { code: 403, description: "You can't send polls in this chat." },
    CHAT_SEND_STICKERS_FORBIDDEN: { code: 403, description: "You can't send stickers in this chat." },
    CHAT_WRITE_FORBIDDEN: { code: 403, description: "You can't write in this chat." },
    CURRENCY_TOTAL_AMOUNT_INVALID: {
        code: 400,
        description: 'The total amount of all prices is invalid.'
    },
    EMOTICON_INVALID: { code: 400, description: 'The specified emoji is invalid.' },
    EXTERNAL_URL_INVALID: { code: 400, description: 'External URL invalid.' },
    FILE_PARTS_INVALID: { code: 400, description: 'The number of file parts is invalid.' },
    FILE_PART_LENGTH_INVALID: { code: 400, description: 'The length of a file part is invalid.' },
    FILE_REFERENCE_EMPTY: { code: 400, description: 'An empty file reference was specified.' },
    FILE_REFERENCE_EXPIRED: {
        code: 400,
        description: 'File reference expired, it must be refetched as described in the documentation.'
    },
    GAME_BOT_INVALID: { code: 400, description: "Bots can't send another bot's game." },
    IMAGE_PROCESS_FAILED: {
        code: 400,
        description: "We're having trouble processing your image. Please try again!"
    },
    INPUT_USER_DEACTIVATED: {
        code: 400,
        description:
            "The user you're trying to interact with has deactivated their account. Please try again!"
    },
    MD5_CHECKSUM_INVALID: { code: 400, description: 'The MD5 checksums do not match.' },
    MEDIA_CAPTION_TOO_LONG: { code: 400, description: 'The caption is too long.' },
    MEDIA_EMPTY: { code: 400, description: 'The provided media object is invalid.' },
    MEDIA_INVALID: { code: 400, description: 'Media invalid.' },
    MSG_ID_INVALID: { code: 400, description: 'Invalid message ID provided.' },
    PAYMENT_PROVIDER_INVALID: {
        code: 400,
        description: 'The specified payment provider is invalid.'
    },
    PEER_ID_INVALID: { code: 400, description: 'The provided peer id is invalid.' },
    PHOTO_EXT_INVALID: { code: 400, description: 'The extension of the photo is invalid.' },
    PHOTO_INVALID_DIMENSIONS: { code: 400, description: 'The photo dimensions are invalid.' },
    PHOTO_SAVE_FILE_INVALID: { code: 400, description: 'Internal issues, try again later.' },
    POLL_ANSWERS_INVALID: { code: 400, description: 'Invalid poll answers were provided.' },
    POLL_ANSWER_INVALID: { code: 400, description: 'One of the poll answers is not acceptable.' },
    POLL_OPTION_DUPLICATE: { code: 400, description: 'Duplicate poll options provided.' },
    POLL_OPTION_INVALID: { code: 400, description: 'Invalid poll option provided.' },
    POLL_QUESTION_INVALID: { code: 400, description: 'One of the poll questions is not acceptable.' },
    QUIZ_CORRECT_ANSWERS_EMPTY: { code: 400, description: 'No correct quiz answer was specified.' },
    QUIZ_CORRECT_ANSWERS_TOO_MUCH: {
        code: 400,
        description:
            'You specified too many correct answers in a quiz, quizzes can only have one right answer!'
    },
    QUIZ_CORRECT_ANSWER_INVALID: {
        code: 400,
        description: 'An invalid value was provided to the correct_answers field.'
    },
    QUIZ_MULTIPLE_INVALID: {
        code: 400,
        description: "Quizzes can't have the multiple_choice flag set!"
    },
    RANDOM_ID_DUPLICATE: {
        code: 500,
        description: 'You provided a random ID that was already used.'
    },
    REPLY_MARKUP_BUY_EMPTY: { code: 400, description: 'Reply markup for buy button empty.' },
    REPLY_MARKUP_INVALID: { code: 400, description: 'The provided reply markup is invalid.' },
    SCHEDULE_BOT_NOT_ALLOWED: { code: 400, description: 'Bots cannot schedule messages.' },
    SCHEDULE_DATE_TOO_LATE: {
        code: 400,
        description: "You can't schedule a message this far in the future."
    },
    SCHEDULE_TOO_MUCH: { code: 400, description: 'There are too many scheduled messages.' },
    SEND_AS_PEER_INVALID: {
        code: 400,
        description: "You can't send messages as the specified peer."
    },
    SLOWMODE_WAIT: {
        code: 420,
        description:
            'Slowmode is enabled in this chat: wait %d seconds before sending another message to this chat.'
    },
    TTL_MEDIA_INVALID: { code: 400, description: 'Invalid media Time To Live was provided.' },
    USER_BANNED_IN_CHANNEL: {
        code: 400,
        description: "You're banned from sending messages in supergroups/channels."
    },
    USER_IS_BLOCKED: { code: 403, description: 'You were blocked by this user.' },
    USER_IS_BOT: { code: 400, description: "Bots can't send messages to other bots." },
    VIDEO_CONTENT_TYPE_INVALID: { code: 400, description: "The video's content type is invalid." },
    WEBPAGE_CURL_FAILED: { code: 400, description: 'Failure while fetching the webpage with cURL.' },
    WEBPAGE_MEDIA_EMPTY: { code: 400, description: 'Webpage media empty.' },
    YOU_BLOCKED_USER: { code: 400, description: 'You blocked this user.' }
} as const;