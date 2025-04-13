const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const UserManager = require('./user-manager');

class ChastityTimer {
    constructor() {
        this.userManager = new UserManager();
        this.startTime = null;
        this.timerInterval = null;
        this.dataPath = null;
        this.events = [];
        this.stoppedEvents = new Set();
        this.logbookEntries = [];
        this.currentEventId = null;
        this.initializeElements();
        
        // Set default value for date picker
        const now = new Date();
        this.customDateTime.value = now.toISOString().slice(0, 16);
        
        // Force initial state
        this.startNowBtn.classList.remove('hidden');
        this.startCustomBtn.classList.remove('hidden');
        this.customTimeContainer.classList.add('hidden');
        this.timerDisplay.classList.add('hidden');
        this.stopTimerBtn.classList.add('hidden');
        
        this.attachEventListeners();
        this.checkAuthState();
        
        ipcRenderer.send('get-user-data-path');
        ipcRenderer.on('user-data-path', (event, path) => {
            this.dataPath = path;
            this.loadSavedState();
        });

        // Handle app quit
        window.addEventListener('beforeunload', () => {
            if (!document.getElementById('rememberMe').checked) {
                this.logout();
            }
        });
    }

    initializeElements() {
        this.startNowBtn = document.getElementById('startNow');
        this.startCustomBtn = document.getElementById('startCustom');
        this.customTimeContainer = document.getElementById('customTimeInput');
        this.customDateTime = document.getElementById('customDateTime');
        this.confirmCustomBtn = document.getElementById('confirmCustom');
        this.timerDisplay = document.getElementById('timerDisplay');
        this.stopTimerBtn = document.getElementById('stopTimer');
        this.eventsList = document.getElementById('eventsList');
        this.clearEventsBtn = document.getElementById('clearEvents');
        this.logbookIcon = document.querySelector('.logbook-icon');
        
        // Initialize modal elements
        this.modal = document.getElementById('logbookModal');
        console.log('Modal element:', this.modal); // Debug log
        
        this.logbookForm = document.getElementById('logbookForm');
        console.log('Form element:', this.logbookForm); // Debug log
        
        this.closeButton = document.querySelector('.close-button');
        this.cancelButton = document.querySelector('.cancel-button');
        this.logbookEntriesList = document.getElementById('logbookEntriesList');

        if (!this.modal || !this.logbookForm) {
            console.error('Modal elements not found!');
        }
        
        // Debug element initialization
        console.log('Elements initialized:');
        console.log('Start Now button:', this.startNowBtn);
        console.log('Start Custom button:', this.startCustomBtn);
        console.log('Date picker container:', this.customTimeContainer);
        console.log('Timer display:', this.timerDisplay);
        console.log('Stop button:', this.stopTimerBtn);

        // Add auth elements
        this.authContainer = document.getElementById('authContainer');
        this.appContainer = document.getElementById('appContainer');
        this.loginForm = document.getElementById('loginForm');
        this.registerForm = document.getElementById('registerForm');
        this.authTabs = document.querySelectorAll('.auth-tab');
        this.rememberMeCheckbox = document.getElementById('rememberMe');
        this.loginUsername = document.getElementById('loginUsername');
        
        // Restore remembered username if it exists
        const rememberedUsername = localStorage.getItem('rememberedUsername');
        if (rememberedUsername) {
            this.loginUsername.value = rememberedUsername;
            this.rememberMeCheckbox.checked = true;
        }

        // Add profile elements
        this.avatarContainer = document.getElementById('avatarContainer');
        this.avatarLetter = this.avatarContainer.querySelector('.avatar-letter');
        this.usernameDisplay = this.avatarContainer.querySelector('.username');
        this.logoutButton = this.avatarContainer.querySelector('.logout-button');
        
        // Initially hide the profile
        this.avatarContainer.classList.add('hidden');
    }

    showStartButtons() {
        // Show start buttons
        this.startNowBtn.classList.remove('hidden');
        this.startCustomBtn.classList.remove('hidden');
        // Hide everything else
        this.customTimeContainer.classList.add('hidden');
        this.timerDisplay.classList.add('hidden');
        this.stopTimerBtn.classList.add('hidden');
        this.logbookIcon.classList.add('hidden');
    }

    showDatePicker() {
        // Show date picker and confirm button
        this.customTimeContainer.classList.remove('hidden');
        // Hide start buttons
        this.startNowBtn.classList.add('hidden');
        this.startCustomBtn.classList.add('hidden');
    }

    showTimer() {
        // Show timer and stop button
        this.timerDisplay.classList.remove('hidden');
        this.stopTimerBtn.classList.remove('hidden');
        this.logbookIcon.classList.remove('hidden');
        
        // Add this: Update logbook icon to show if there are entries
        if (this.startTime) {
            const hasEntries = this.logbookEntries.some(entry => entry.eventId === this.startTime.toISOString());
            this.logbookIcon.classList.toggle('has-entries', hasEntries);
        }
        
        // Hide everything else
        this.customTimeContainer.classList.add('hidden');
        this.startNowBtn.classList.add('hidden');
        this.startCustomBtn.classList.add('hidden');
    }

    attachEventListeners() {
        this.startNowBtn.addEventListener('click', () => {
            this.startTimer(new Date());
        });

        // Add click handler for the main logbook icon
        if (this.logbookIcon) {
            this.logbookIcon.addEventListener('click', () => {
                console.log('Main logbook icon clicked');
                if (this.startTime) {  // Only open if timer is running
                    this.modal.classList.remove('hidden');
                    this.currentEventId = this.startTime.toISOString();
                    this.logbookForm.reset();
                    this.updateLogbookEntriesList();
                }
            });
        }

        this.startCustomBtn.addEventListener('click', () => {
            this.showDatePicker();
        });

        this.confirmCustomBtn.addEventListener('click', () => {
            const customDate = new Date(this.customDateTime.value);
            if (customDate && !isNaN(customDate)) {
                this.startTimer(customDate);
            }
        });

        this.stopTimerBtn.addEventListener('click', () => {
            this.stopTimer();
        });

        this.clearEventsBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all past events? This cannot be undone.')) {
                this.clearEvents();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (!this.customTimeContainer.classList.contains('hidden')) {
                    this.showStartButtons();
                } else if (this.startTime) {
                    this.stopTimer();
                }
            }
        });

        // Close modal when clicking the close button
        if (this.closeButton) {
            this.closeButton.addEventListener('click', () => {
                console.log('Close button clicked');
                this.modal.classList.add('hidden');
            });
        }

        // Close modal when clicking the cancel button
        if (this.cancelButton) {
            this.cancelButton.addEventListener('click', () => {
                console.log('Cancel button clicked');
                this.modal.classList.add('hidden');
            });
        }

        // Close modal when clicking outside
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                console.log('Clicked outside modal');
                this.modal.classList.add('hidden');
            }
        });

        // Handle form submission
        this.logbookForm.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('Form submitted');
            
            const entry = {
                eventId: this.currentEventId,
                title: document.getElementById('logbookTitle').value,
                note: document.getElementById('logbookNote').value,
                timestamp: new Date().toISOString()
            };

            this.logbookEntries.push(entry);
            this.saveState();
            this.updateLogbookEntriesList();
            this.updateEventsList();
            
            // Add this: Update the main logbook icon if this entry is for the current timer
            if (this.startTime && this.currentEventId === this.startTime.toISOString()) {
                this.logbookIcon.classList.add('has-entries');
            }
            
            this.modal.classList.add('hidden');
        });

        // Add auth event listeners
        this.loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = this.loginUsername.value;
            const password = document.getElementById('loginPassword').value;
            const rememberMe = this.rememberMeCheckbox.checked;
            
            try {
                await this.userManager.login(username, password);
                this.handleAuthSuccess(username, rememberMe);
            } catch (error) {
                document.getElementById('loginError').textContent = error.message;
            }
        });

        this.registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('registerUsername').value;
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            if (password !== confirmPassword) {
                document.getElementById('registerError').textContent = 'Passwords do not match';
                return;
            }
            
            try {
                await this.userManager.register(username, password);
                this.handleAuthSuccess(username);
            } catch (error) {
                document.getElementById('registerError').textContent = error.message;
            }
        });

        this.authTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetForm = tab.dataset.tab;
                this.authTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                if (targetForm === 'login') {
                    this.loginForm.classList.remove('hidden');
                    this.registerForm.classList.add('hidden');
                } else {
                    this.loginForm.classList.add('hidden');
                    this.registerForm.classList.remove('hidden');
                }
            });
        });

        // Clear remembered username when remember me is unchecked
        this.rememberMeCheckbox.addEventListener('change', (e) => {
            if (!e.target.checked) {
                localStorage.removeItem('rememberedUsername');
            }
        });

        // Add logout handler
        this.logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });
    }

    loadSavedState() {
        if (!this.dataPath) return;
        
        try {
            if (fs.existsSync(this.dataPath)) {
                const data = JSON.parse(fs.readFileSync(this.dataPath, 'utf8'));
                if (data.events) {
                    this.events = data.events;
                }
                if (data.stoppedEvents) {
                    this.stoppedEvents = new Set(data.stoppedEvents);
                }
                if (data.logbookEntries) {
                    this.logbookEntries = data.logbookEntries;
                }
                if (data.startTime) {
                    this.startTimer(new Date(data.startTime));
                }
                this.updateEventsList();
                this.updateLogbookEntriesList();
            }
        } catch (error) {
            console.error('Error loading saved state:', error);
        }
    }

    saveState() {
        if (!this.dataPath) return;
        
        try {
            const data = {
                startTime: this.startTime ? this.startTime.toISOString() : null,
                lastUpdated: new Date().toISOString(),
                events: this.events,
                stoppedEvents: Array.from(this.stoppedEvents),
                logbookEntries: this.logbookEntries
            };
            fs.writeFileSync(this.dataPath, JSON.stringify(data));
        } catch (error) {
            console.error('Error saving state:', error);
        }
    }

    saveEvent(date) {
        // Normalize dates for consistency
        const normalizedStartDate = new Date(date);
        normalizedStartDate.setMilliseconds(0);
        const normalizedEndDate = new Date();
        normalizedEndDate.setMilliseconds(0);
        
        const event = {
            startDate: normalizedStartDate.toISOString(),
            endDate: normalizedEndDate.toISOString(),
            duration: this.calculateDuration(normalizedStartDate, normalizedEndDate)
        };
        this.events.push(event);
        this.stoppedEvents.add(normalizedStartDate.toISOString());
        this.saveState();
        this.updateEventsList();
    }

    calculateDuration(startDate, endDate) {
        const diff = endDate - startDate;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return { days, hours, minutes };
    }

    updateEventsList() {
        if (!this.eventsList) return;
        
        this.eventsList.innerHTML = '';
        this.events.forEach((event, index) => {
            const eventElement = document.createElement('div');
            eventElement.className = 'event-item';
            
            // Check if there are entries for this specific event
            const hasEntries = this.logbookEntries.some(entry => entry.eventId === event.startDate);
            
            eventElement.innerHTML = `
                <div class="event-dates">
                    <div class="event-date">From: ${new Date(event.startDate).toLocaleString()}</div>
                    <div class="event-date">To: ${new Date(event.endDate).toLocaleString()}</div>
                </div>
                <div class="event-info">
                    <div class="event-duration">${event.duration.days}d ${event.duration.hours}h ${event.duration.minutes}m</div>
                    <div class="logbook-icon ${hasEntries ? 'has-entries' : ''}" style="cursor: pointer;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                            <line x1="8" y1="7" x2="16" y2="7"></line>
                            <line x1="8" y1="12" x2="16" y2="12"></line>
                            <line x1="8" y1="17" x2="12" y2="17"></line>
                        </svg>
                    </div>
                </div>
            `;

            // Add direct click handler to the logbook icon
            const logbookIcon = eventElement.querySelector('.logbook-icon');
            logbookIcon.onclick = () => {
                console.log('Logbook icon clicked');
                const modal = document.getElementById('logbookModal');
                modal.classList.remove('hidden');
                this.currentEventId = event.startDate;
                this.logbookForm.reset();
                this.updateLogbookEntriesList();
            };

            this.eventsList.appendChild(eventElement);
        });
    }

    startTimer(startDate) {
        // Convert the date to a normalized format (remove milliseconds)
        const normalizedDate = new Date(startDate);
        normalizedDate.setMilliseconds(0);
        const dateString = normalizedDate.toISOString();

        if (this.stoppedEvents.has(dateString)) {
            alert('This timer has been stopped and cannot be restarted.');
            return;
        }

        this.startTime = normalizedDate;
        this.showTimer();
        
        // Add this: Check for existing entries when starting timer
        const hasEntries = this.logbookEntries.some(entry => entry.eventId === dateString);
        this.logbookIcon.classList.toggle('has-entries', hasEntries);
        
        this.updateTimer();
        this.timerInterval = setInterval(() => this.updateTimer(), 1000);
        this.saveState();

        ipcRenderer.send('timer-started', normalizedDate);
    }

    stopTimer() {
        clearInterval(this.timerInterval);
        this.showStartButtons();
        
        if (this.startTime) {
            // Normalize the date before adding to stopped events
            const normalizedDate = new Date(this.startTime);
            normalizedDate.setMilliseconds(0);
            this.stoppedEvents.add(normalizedDate.toISOString());
            this.saveEvent(this.startTime);
        }
        
        this.startTime = null;
        this.saveState();

        ipcRenderer.send('timer-stopped');
    }

    updateTimer() {
        const now = new Date();
        const diff = now - this.startTime;

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        document.getElementById('days').textContent = this.padNumber(days);
        document.getElementById('hours').textContent = this.padNumber(hours);
        document.getElementById('minutes').textContent = this.padNumber(minutes);
        document.getElementById('seconds').textContent = this.padNumber(seconds);

        // Update window title with current time
        ipcRenderer.send('update-title', `${this.padNumber(days)}d ${this.padNumber(hours)}h ${this.padNumber(minutes)}m`);
    }

    padNumber(number) {
        return number.toString().padStart(2, '0');
    }

    clearEvents() {
        this.events = [];
        this.stoppedEvents = new Set();
        this.logbookEntries = [];
        this.saveState();
        this.updateEventsList();
        this.updateLogbookEntriesList();
    }

    updateLogbookEntriesList() {
        if (!this.logbookEntriesList) return;
        
        this.logbookEntriesList.innerHTML = '';
        
        // Filter entries for the current event and sort by timestamp
        const sortedEntries = this.logbookEntries
            .filter(entry => entry.eventId === this.currentEventId)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        sortedEntries.forEach((entry, index) => {
            const entryElement = document.createElement('div');
            entryElement.className = 'logbook-entry';
            entryElement.dataset.index = this.logbookEntries.indexOf(entry);  // Store the index in the main array
            entryElement.innerHTML = `
                <div class="logbook-entry-header">
                    <div class="logbook-entry-title">${entry.title}</div>
                    <button type="button" class="delete-entry-button" title="Delete entry">&times;</button>
                </div>
                <div class="logbook-entry-date">${new Date(entry.timestamp).toLocaleString()}</div>
                <div class="logbook-entry-note">${entry.note}</div>
            `;

            // Add click handler for delete button
            const deleteButton = entryElement.querySelector('.delete-entry-button');
            deleteButton.addEventListener('click', () => {
                const indexInMainArray = parseInt(entryElement.dataset.index);
                this.logbookEntries.splice(indexInMainArray, 1);
                this.saveState();
                this.updateLogbookEntriesList();

                // Check if this was the last entry for this event
                const remainingEntries = this.logbookEntries.some(e => e.eventId === this.currentEventId);
                
                // Update the indicator dot for the current timer if needed
                if (this.startTime && this.currentEventId === this.startTime.toISOString()) {
                    this.logbookIcon.classList.toggle('has-entries', remainingEntries);
                }
                
                // Update the past events list to reflect the changes
                this.updateEventsList();
            });

            this.logbookEntriesList.appendChild(entryElement);
        });
    }

    // Add this method to track which event we're adding entries to
    showLogbookModal(event) {
        this.currentEventId = event.startDate;
        this.modal.classList.remove('hidden');
        this.logbookForm.reset();
        this.updateLogbookEntriesList();
    }

    handleAuthSuccess(username, rememberMe) {
        this.authContainer.classList.add('hidden');
        this.appContainer.classList.remove('hidden');
        
        // Update profile UI
        this.avatarContainer.classList.remove('hidden');
        this.avatarLetter.textContent = username.charAt(0);
        this.usernameDisplay.textContent = username;
        
        // Store username if remember me is checked
        if (rememberMe) {
            localStorage.setItem('rememberedUsername', username);
        } else {
            localStorage.removeItem('rememberedUsername');
        }
        
        // Store current session
        sessionStorage.setItem('currentUser', username);
    }

    logout() {
        sessionStorage.removeItem('currentUser');
        document.getElementById('loginPassword').value = ''; // Clear password field
        this.authContainer.classList.remove('hidden');
        this.appContainer.classList.add('hidden');
        this.avatarContainer.classList.add('hidden');
    }

    checkAuthState() {
        // Only check session storage, not local storage
        const currentUser = sessionStorage.getItem('currentUser');
        if (currentUser) {
            this.handleAuthSuccess(currentUser, this.rememberMeCheckbox.checked);
        } else {
            this.logout();
        }
    }
}

// Initialize the timer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing timer');
    new ChastityTimer();
}); 