const { Markup } = require('telegraf');
const fs = require('fs').promises;

// Функция для загрузки данных из файла
async function loadData() {
  try {
    const data = await fs.readFile('data.json', 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Ошибка при загрузке данных:', error);
    return {};
  }
}

// Функция для сохранения данных в файл
async function saveData(data) {
  try {
    await fs.writeFile('data.json', JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Ошибка при сохранении данных:', error);
  }
}

// Функция для поиска чата по ID
function findChat(data, chatId) {
  return data[chatId];
}

// Функция для проверки, замучен ли пользователь
function isUserBanned(chatData, userId) {
  return chatData.bannedUsers.some(user => user.id === userId);
}

// Основная функция обработки сообщений
async function handleMessage(ctx, userState, adminState) {
  const chatId = ctx.chat.id.toString();  // Чат ID как строка
  const userId = ctx.from.id;
  const input = ctx.message.text.trim();
  const state = userState.get(userId);
  const admState = adminState.get(userId);

  try {
    // Загружаем данные
    const data = await loadData();
    let chatData = findChat(data, chatId);

    // Если чат не найден, создаем новый
    if (!chatData) {
      chatData = {
        chatName: ctx.chat.title || 'Неизвестный чат',
        isAdmin: false,
        isGroup: ctx.chat.type === 'group',
        admins: [],
        bannedUsers: [],
        streets: []
      };
      data[chatId] = chatData;
    }

    // Проверка на мут
    if (isUserBanned(chatData, userId)) {
      const allowedCommands = ['📋 Список перекрытых улиц', '🔙 Вернуться в главное меню'];
      if (!allowedCommands.some(cmd => input.startsWith(cmd))) {
        return ctx.reply('🚫 Вы замучены и не можете отправлять сообщения.');
      }
    }

    // Обработка состояний
    if (state === 'checking_street') {
      await handleCheckStreet(ctx, chatData, input, userState, userId);
    } else if (state === 'changing_status') {
      await handleChangeStatus(ctx, chatData, input, userState, userId);
    } else if (admState === 'adding_street') {
      await handleAddStreet(ctx, chatData, input, adminState, userId);
    } else if (admState === 'removing_street') {
      await handleRemoveStreet(ctx, chatData, input, adminState, userId);
    }

    // Сохраняем данные после изменений
    await saveData(data);
  } catch (error) {
    console.error('Ошибка в обработке сообщения:', error);
    await ctx.reply('❗ Произошла ошибка при обработке вашего запроса. Попробуйте позже.');
  }
}

// Функция для проверки статуса улицы
async function handleCheckStreet(ctx, chatData, input, userState, userId) {
  const street = chatData.streets.find(s => s.name.toLowerCase() === input.toLowerCase());

  if (!street) {
    return await ctx.reply(`⚠ Улица *${input}* не найдена в базе.`);
  }

  const statusEmoji = street.status === 'closed' ? '❌' : '✅';
  const statusText = street.status === 'closed' ? 'закрыта' : 'открыта';
  const dateClosedText = street.status === 'closed' && street.dateClosed ? `\n📅 Закрыта: ${street.dateClosed}` : '';
  const noteText = street.note ? `\n📝 Примечание: ${street.note}` : '';

  await ctx.reply(`🚧 Статус улицы *${street.name}*:\n\n${statusEmoji} Улица *${statusText}*${dateClosedText}${noteText}`);
  userState.delete(userId);
  await ctx.reply(
    '🏠 Главное меню. Выберите действие:',
    Markup.keyboard([[ '📋 Список перекрытых улиц', '🚦 Изменить статус улицы']]).resize()
  );
}

// Функция для изменения статуса улицы
async function handleChangeStatus(ctx, chatData, input, userState, userId) {
  const match = input.match(/(.+)-(закрыта|открыта)(?:\((.+)\))?/i);

  if (!match) {
    return await ctx.reply('⚠ Ошибка! Введите данные в правильном формате: *ул. Ленина-закрыта* или *ул. Ленина-закрыта(ремонт)*');
  }

  const streetName = match[1].trim();
  const newStatus = match[2].toLowerCase() === 'закрыта' ? 'closed' : 'open';
  let note = match[3] ? match[3].trim() : null;

  // Ограничение примечания до 12 символов
  if (note && note.length > 12) {
    return await ctx.reply('⚠ Примечание не должно превышать 12 символов.');
  }

  let streetFound = false;
  chatData.streets.forEach((street) => {
    if (street.name.toLowerCase() === streetName.toLowerCase()) {
      street.status = newStatus;
      street.note = note;
      street.dateClosed = newStatus === 'closed' ? new Date().toLocaleString('ru-RU') : null;
      streetFound = true;
    }
  });

  if (!streetFound) {
    return await ctx.reply('❌ Улица не найдена. Проверьте правильность написания.');
  }

  await ctx.reply(`✅ Статус улицы *${streetName}* изменён на *${newStatus === 'closed' ? 'закрыта' : 'открыта'}*!` + (note ? `\n📌 Примечание: ${note}` : ''));
  userState.delete(userId);

  await ctx.reply(
    '🏠 Главное меню. Выберите действие:',
    Markup.keyboard([[ '📋 Список перекрытых улиц', '🚦 Изменить статус улицы']]).resize()
  );
}

// Функция для добавления улицы
async function handleAddStreet(ctx, chatData, input, adminState, userId) {
  const existingStreet = chatData.streets.find(s => s.name.toLowerCase() === input.toLowerCase());
  if (existingStreet) {
    return await ctx.reply('⚠ Улица уже существует в базе.');
  }

  chatData.streets.push({ name: input, status: 'open' });
  await ctx.reply(`✅ Улица *${input}* успешно добавлена в базу!`);
  adminState.delete(userId);
  await ctx.reply(
    '🏠 Главное меню. Выберите действие:',
    Markup.keyboard([['📋 Список перекрытых улиц', '🚦 Изменить статус улицы']]).resize()
  );
}

// Функция для удаления улицы
async function handleRemoveStreet(ctx, chatData, input, adminState, userId) {
  const streetIndex = chatData.streets.findIndex(s => s.name.toLowerCase() === input.toLowerCase());
  if (streetIndex === -1) {
    return await ctx.reply('⚠ Улица не найдена в базе.');
  }

  chatData.streets.splice(streetIndex, 1);
  await ctx.reply(`✅ Улица *${input}* успешно удалена из базы!`);
  adminState.delete(userId);
  await ctx.reply(
    '🏠 Главное меню. Выберите действие:',
    Markup.keyboard([[ '📋 Список перекрытых улиц', '🚦 Изменить статус улицы']]).resize()
  );
}

module.exports = {
  handleMessage
};
