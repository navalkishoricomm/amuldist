function formatUnitQty(qty, conv) {
    const major = Math.floor(qty / conv);
    const minor = qty % conv;
    return `${major} Major ${minor} Minor`;
}

function formatUnitQtyFixed(qty, conv) {
    const major = Math.trunc(qty / conv); // Changed from floor to trunc
    const minor = qty % conv;
    return `${major} Major ${minor} Minor`;
}

const qty = -210;
const conv = 20;

console.log(`Qty: ${qty}, Conv: ${conv}`);
console.log(`Current (Math.floor): ${formatUnitQty(qty, conv)}`);
console.log(`Expected: -10 Major -10 Minor`);
console.log(`Proposed Fix (Math.trunc): ${formatUnitQtyFixed(qty, conv)}`);
