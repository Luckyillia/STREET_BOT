const fs = require('fs');

async function isAdmin(ctx) {
    try {
        const data = await fs.promises.readFile('data.json', 'utf8');
        const chats = JSON.parse(data);
        const chatData = chats.find(chat => chat.chatId === ctx.chat.id);

        if (!chatData || !Array.isArray(chatData.admins)) return false;

        return chatData.admins.some(admin => admin.id === ctx.from.id);
    } catch (error) {
        console.error('Ошибка проверки администратора:', error);
        return false;
    }
}

function parseDate(dateString) {
    const [datePart, timePart] = dateString.split(', ');
    const [day, month, year] = datePart.split('.');
    const [hours, minutes, seconds] = timePart.split(':');
    return new Date(year, month - 1, day, hours, minutes, seconds);
}

async function checkStreetStatus(bot) {
    try {
        const data = await fs.promises.readFile('data.json', 'utf8');
        const chats = JSON.parse(data);
        const currentTime = new Date();
        let updated = false;

        for (const chat of chats) {
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

module.exports = {
    isAdmin,
    checkStreetStatus
};
