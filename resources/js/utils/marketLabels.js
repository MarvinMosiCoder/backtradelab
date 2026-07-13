export function marketCategoryLabel(category) {
    const normalized = String(category ?? '').toLowerCase();
    if (normalized === 'linear' || normalized === 'inverse') return 'Futures / Perpetual';
    if (normalized === 'spot') return 'Spot';
    return category ? String(category) : '';
}
