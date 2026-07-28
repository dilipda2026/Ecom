interface InlineButton {
  text: string;
  callback_data: string;
}

interface TelegramMessageResult {
  message_id?: number;
  chat?: { id: number };
}

async function callBot(method: string, body: Record<string, unknown>) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    return json as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function sendTelegramMessage(text: string) {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) {
    if (process.env.NODE_ENV === 'development') console.log(`[DEV TELEGRAM] ${text}`);
    return null;
  }
  return callBot('sendMessage', { chat_id: Number(chatId), text, parse_mode: 'HTML' }) as Promise<TelegramMessageResult | null>;
}

export async function sendTelegramMessageWithButtons(
  text: string,
  buttons: InlineButton[][]
): Promise<TelegramMessageResult | null> {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) {
    if (process.env.NODE_ENV === 'development') console.log(`[DEV TELEGRAM] ${text}`, buttons);
    return null;
  }
  return callBot('sendMessage', {
    chat_id: Number(chatId),
    text,
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: buttons },
  }) as Promise<TelegramMessageResult | null>;
}

export async function editTelegramMessage(
  chatId: number,
  messageId: number,
  text: string,
  buttons?: InlineButton[][]
) {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML',
  };
  if (buttons) body.reply_markup = { inline_keyboard: buttons };
  else body.reply_markup = { inline_keyboard: [] };
  return callBot('editMessageText', body);
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  return callBot('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text: text ?? '',
    show_alert: false,
  });
}
