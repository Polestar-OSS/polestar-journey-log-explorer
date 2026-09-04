/** Number formatting shared by tiles, tooltips and tables. */
export const formatNumber = (n, digits) => {
    if (n === null || n === undefined || !isFinite(n)) return '–';
    const d = digits ?? (Math.abs(n) >= 100 ? 0 : Math.abs(n) >= 10 ? 1 : 2);
    return n.toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: 0 });
};

export const formatCompact = (n) => {
    if (n === null || n === undefined || !isFinite(n)) return '–';
    if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 10_000) return `${(n / 1000).toFixed(1)}K`;
    return formatNumber(n);
};
