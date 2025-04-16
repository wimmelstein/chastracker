class ProfileManager {
    constructor() {
        this.initializeElements();
        this.initializeProfileHandling();
    }

    initializeElements() {
        this.avatarContainer = document.getElementById('avatarContainer');
        this.avatarLetter = this.avatarContainer.querySelector('.avatar-letter');
        this.usernameDisplay = this.avatarContainer.querySelector('.username');
        this.logoutButton = this.avatarContainer.querySelector('.logout-button');
        this.profileModal = document.getElementById('profileModal');
        this.profileForm = document.getElementById('profileForm');
        this.profileButton = this.avatarContainer.querySelector('.profile-button');
        this.deviceTypeSelect = document.getElementById('deviceType');
        this.customDeviceGroup = document.getElementById('customDeviceGroup');
        this.customDeviceInput = document.getElementById('customDevice');
        this.closeButton = document.querySelector('#profileModal .close-button');
        this.cancelButton = document.querySelector('#profileModal .cancel-button');
    }

    initializeProfileHandling() {
        this.deviceTypeSelect.addEventListener('change', () => this.handleDeviceTypeChange());
        this.profileForm.addEventListener('submit', (e) => this.handleProfileSubmit(e));
        this.closeButton.addEventListener('click', () => this.closeProfileModal());
        this.cancelButton.addEventListener('click', () => this.closeProfileModal());
        this.profileButton.addEventListener('click', () => this.openProfileModal());

        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
            this.loadProfile(currentUser);
        }
    }

    openProfileModal() {
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
            this.loadProfile(currentUser);
            this.profileModal.classList.remove('hidden');
        }
    }

    handleDeviceTypeChange() {
        const selectedType = this.deviceTypeSelect.value;
        this.customDeviceGroup.classList.toggle('hidden', selectedType !== 'custom');
    }

    async handleProfileSubmit(e) {
        e.preventDefault();
        const currentUser = localStorage.getItem('currentUser');
        if (!currentUser) return;

        const profile = {
            displayName: document.getElementById('displayName').value,
            keyholder: document.getElementById('keyholder').value,
            deviceType: this.deviceTypeSelect.value,
            customDevice: this.deviceTypeSelect.value === 'custom' ? this.customDeviceInput.value : null
        };

        await this.saveProfile(currentUser, profile);
        this.updateProfileDisplay(profile);
        this.closeProfileModal();
    }

    async saveProfile(username, profile) {
        localStorage.setItem(`profile_${username}`, JSON.stringify(profile));
    }

    loadProfile(username) {
        const profile = JSON.parse(localStorage.getItem(`profile_${username}`) || '{}');
        this.updateProfileDisplay(profile);
        return profile;
    }

    updateProfileDisplay(profile) {
        this.avatarLetter.textContent = profile.displayName ? profile.displayName.charAt(0).toUpperCase() : '?';
        this.usernameDisplay.textContent = profile.displayName || 'Anonymous';

        // Update profile info in dropdown
        const profileInfo = this.avatarContainer.querySelector('.profile-info');
        if (profileInfo) {
            profileInfo.innerHTML = `
                <div class="profile-detail">
                    <span class="label">Name:</span>
                    <span class="value">${profile.displayName || 'Anonymous'}</span>
                </div>
                <div class="profile-detail">
                    <span class="label">Keyholder:</span>
                    <span class="value">${profile.keyholder || 'Self-locked'}</span>
                </div>
                <div class="profile-detail">
                    <span class="label">Device:</span>
                    <span class="value">${profile.deviceType === 'custom' ? profile.customDevice : profile.deviceType || 'Not set'}</span>
                </div>
            `;
        }

        document.getElementById('displayName').value = profile.displayName || '';
        document.getElementById('keyholder').value = profile.keyholder || '';
        
        if (profile.deviceType) {
            this.deviceTypeSelect.value = profile.deviceType;
            this.handleDeviceTypeChange();
            
            if (profile.deviceType === 'custom' && profile.customDevice) {
                this.customDeviceInput.value = profile.customDevice;
            }
        }

        const timer = document.querySelector('.timer');
        if (timer) {
            timer.classList.remove('has-keyholder', 'self-locked');
            
            if (profile.keyholder && profile.keyholder !== 'self-locked') {
                timer.classList.add('has-keyholder');
            } else {
                timer.classList.add('self-locked');
            }
        }
    }

    setCurrentUser(username) {
        this.currentUser = username;
        this.loadProfile(username);
    }

    closeProfileModal() {
        this.profileModal.classList.add('hidden');
    }
}

export default ProfileManager; 