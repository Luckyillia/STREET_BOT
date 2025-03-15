const fs = require('fs');

async function isAdmin(ctx, chatId) {
    try {
        const data = await fs.promises.readFile('data.json', 'utf8');
        const chats = JSON.parse(data);

        // Проверяем, что chatId существует
        if (!chatId) {
            console.error('Не удалось получить ID чата');
            return false;
        }

        const chatData = chats[chatId]; // Используем переданный chatId для поиска данных о чате

        if (!chatData || !Array.isArray(chatData.admins)) {
            return false;
        }

        // Проверяем, является ли пользователь администратором
        return chatData.admins.some(admin => admin.id === ctx.from.id);
    } catch (error) {
        console.error('Ошибка при проверке администратора:', error);
        return false;
    }
}


function parseDate(dateString) {
    const [datePart, timePart] = dateString.split(', ');

    let day, month, year, hours, minutes, seconds;

    // Проверяем формат даты
    if (datePart.includes('/')) {
        // Американский формат: MM/DD/YYYY
        [month, day, year] = datePart.split('/').map(Number);
    } else if (datePart.includes('.')) {
        // Европейский формат: DD.MM.YYYY
        [day, month, year] = datePart.split('.').map(Number);
    } else if (datePart.includes('-')) {
        // Формат: YYYY-MM-DD
        [year, month, day] = datePart.split('-').map(Number);
    } else {
        throw new Error('Неверный формат даты');
    }

    let [time, modifier] = timePart.split(' ');
    [hours, minutes, seconds] = time.split(':').map(Number);

    if (modifier) {
        if (modifier === 'PM' && hours < 12) {
            hours += 12;
        }
        if (modifier === 'AM' && hours === 12) {
            hours = 0;
        }
    }

    const parsedDate = new Date(year, month - 1, day, hours, minutes, seconds);

    if (isNaN(parsedDate.getTime())) {
        throw new Error('Неверный формат даты или времени');
    }
    return parsedDate;
}

async function checkStreetStatus(bot) {
    try {
        const data = await fs.promises.readFile('data.json', 'utf8');
        const chats = JSON.parse(data);
        const currentTime = new Date();
        let updated = false;

        // Перебор чатов
        for (const chatId in chats) {
            const chat = chats[chatId];
            if (!Array.isArray(chat.streets) || chat.streets.length === 0) continue;

            for (const street of chat.streets) {
                if (street.status !== 'closed' || !street.dateClosed) continue;

                const closedTime = parseDate(street.dateClosed);
                if (isNaN(closedTime.getTime())) {
                    console.error(`Ошибка: Неверный формат даты у улицы ${street.name} в чате ${chat.chatName}: ${street.dateClosed}`);
                    continue;
                }

                const timeDiff = (currentTime - closedTime) / 1000 / 60;
                console.log(`Проверяем улицу ${street.name} в чате ${chat.chatName}. Текущее время: ${currentTime}, время закрытия: ${closedTime}, разница: ${timeDiff} минут.`);

                if (timeDiff > 30) {
                    street.status = 'open';
                    street.dateClosed = null;
                    street.note = null;
                    updated = true;

                    const message = `✅ Улица *${street.name}* была открыта автоматически для чата *${chat.chatName}*, так как прошло больше 30 минут с момента закрытия.`;
                    const message_private = `✅ Улица *${street.name}* была открыта автоматически для этого чата, так как прошло больше 30 минут с момента закрытия.`;

                    try {
                        if (Array.isArray(chat.admins) && chat.admins.length > 0) {
                            await Promise.all(chat.admins.map(admin => bot.telegram.sendMessage(admin.id, message)));
                        } else {
                            await bot.telegram.sendMessage(chat.chatId, message_private);
                        }
                    } catch (error) {
                        console.error(`Ошибка при отправке уведомления в чат ${chat.chatName}:`, error);
                    }
                }
            }
        }

        if (updated) {
            await fs.promises.writeFile('data.json', JSON.stringify(chats, null, 2), 'utf8');
            console.log('Файл data.json обновлен.');
        } else {
            console.log('Изменений не обнаружено.');
        }
    } catch (error) {
        console.error('Ошибка при проверке статуса улиц:', error);
    }
}

async function resetDislikes() {
    try {
        const data = await fs.promises.readFile('data.json', 'utf8');
        let chats = JSON.parse(data);

        Object.values(chats).forEach(chat => {
            if (chat.dislikes) {
                chat.dislikes = {}; // Очищаем дизлайки
            }
        });

        await fs.promises.writeFile('data.json', JSON.stringify(chats, null, 2), 'utf8');
        console.log('✅ Репутация сброшена.');
    } catch (error) {
        console.error('❌ Ошибка при очистке репутации:', error);
    }
}

module.exports = {
    isAdmin,
    checkStreetStatus,
    resetDislikes
};