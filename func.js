function getWindDirection(deg) {
    if (deg >= 337.5 || deg < 22.5) return '⬆️ North';
    if (deg >= 22.5 && deg < 67.5) return '↗️ North-East';
    if (deg >= 67.5 && deg < 112.5) return '➡️ East';
    if (deg >= 112.5 && deg < 157.5) return '↘️ South-East';
    if (deg >= 157.5 && deg < 202.5) return '⬇️ South';
    if (deg >= 202.5 && deg < 247.5) return '↙️ South-West';
    if (deg >= 247.5 && deg < 292.5) return '⬅️ West';
    if (deg >= 292.5 && deg < 337.5) return '↖️ North-West';
}

module.exports = { getWindDirection };