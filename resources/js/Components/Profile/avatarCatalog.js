// System-provided crypto-themed avatars. `file_name` on adm_user_profiles stores these as
// `avatar:<key>` (a synthetic value, never a real uploaded filename) so no schema change or
// extra prop plumbing was needed — every place that already carries a profile "file name"
// around (session, Inertia props, React context) keeps working unchanged.
export const AVATAR_PREFIX = 'avatar:';

export const AVATAR_CATALOG = [
    { key: 'bull', emoji: '🐂', label: 'Bull', gradient: 'from-orange-500 to-red-600' },
    { key: 'bear', emoji: '🐻', label: 'Bear', gradient: 'from-slate-600 to-slate-800' },
    { key: 'ape', emoji: '🐵', label: 'Ape', gradient: 'from-amber-600 to-yellow-700' },
    { key: 'shiba', emoji: '🐕', label: 'Shiba', gradient: 'from-amber-400 to-orange-500' },
    { key: 'fox', emoji: '🦊', label: 'Fox', gradient: 'from-orange-400 to-red-500' },
    { key: 'wolf', emoji: '🐺', label: 'Wolf', gradient: 'from-slate-500 to-slate-700' },
    { key: 'whale', emoji: '🐳', label: 'Whale', gradient: 'from-blue-500 to-cyan-600' },
    { key: 'shark', emoji: '🦈', label: 'Shark', gradient: 'from-slate-400 to-blue-600' },
    { key: 'lion', emoji: '🦁', label: 'Lion', gradient: 'from-yellow-500 to-amber-600' },
    { key: 'turtle', emoji: '🐢', label: 'Turtle', gradient: 'from-emerald-500 to-teal-600' },
    { key: 'eagle', emoji: '🦅', label: 'Eagle', gradient: 'from-indigo-500 to-blue-700' },
    { key: 'octopus', emoji: '🐙', label: 'Octopus', gradient: 'from-purple-500 to-fuchsia-600' },
];

export function getAvatarFromFileName(fileName) {
    if (!fileName || !fileName.startsWith(AVATAR_PREFIX)) return null;
    const key = fileName.slice(AVATAR_PREFIX.length);
    return AVATAR_CATALOG.find(item => item.key === key) ?? null;
}
