const Store = require('electron-store');
const bcrypt = require('bcryptjs');

class UserManager {
    constructor() {
        this.store = new Store();
        this.users = this.store.get('users') || {};
        console.log('Initial users:', this.users);
    }

    async register(username, password) {
        console.log('Registering user:', username);
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
        console.log('Users after registration:', this.store.get('users'));
        return true;
    }

    async login(username, password) {
        console.log('Attempting login for user:', username);
        console.log('Available users:', this.users);
        const user = this.users[username];
        
        if (!user) {
            console.log('User not found');
            throw new Error('Invalid credentials');
        }

        console.log('Found user, comparing password...');
        const isValid = await bcrypt.compare(password, user.passwordHash);
        console.log('Password comparison result:', isValid);
        
        if (!isValid) {
            console.log('Invalid password');
            throw new Error('Invalid credentials');
        }

        console.log('Login successful');
        return true;
    }
}

module.exports = UserManager; 