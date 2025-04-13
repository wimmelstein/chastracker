const Store = require('electron-store');
const bcrypt = require('bcryptjs');

class UserManager {
    constructor() {
        this.store = new Store();
        this.users = this.store.get('users') || {};
    }

    async register(username, password) {
        if (this.users[username]) {
            throw new Error('Username already exists');
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        this.users[username] = {
            passwordHash: hash,
            createdAt: new Date().toISOString()
        };

        this.store.set('users', this.users);
        return true;
    }

    async login(username, password) {
        const user = this.users[username];
        if (!user) {
            throw new Error('User not found');
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            throw new Error('Invalid password');
        }

        return true;
    }
}

module.exports = UserManager; 