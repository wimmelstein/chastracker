export const hashPassword = async (password) => {
    // Simple hash function for demonstration
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const verifyPassword = async (password, hash) => {
    const hashedPassword = await hashPassword(password);
    return hashedPassword === hash;
}; 