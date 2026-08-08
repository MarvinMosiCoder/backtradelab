export default function getInitials(fullName) {
    const names = String(fullName ?? '').trim().split(' ').filter(Boolean);
    if (!names.length) return '?';
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
}
