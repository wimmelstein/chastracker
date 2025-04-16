import AuthManager from './auth/AuthManager.js';
import TimerManager from './timer/TimerManager.js';
import EventManager from './events/EventManager.js';
import ProfileManager from './profile/ProfileManager.js';

class App {
    constructor() {
        // Wait for DOM to be ready before initializing
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeApp());
        } else {
            this.initializeApp();
        }
    }

    initializeApp() {
        this.authManager = new AuthManager();
        this.eventManager = new EventManager();
        this.timerManager = new TimerManager(this.eventManager);
        this.profileManager = new ProfileManager();

        this.setupEventListeners();
        this.setupTimerEventListeners();
        this.setupProfileEventListeners();
        this.setupAuthEventListeners();
    }

    setupAuthEventListeners() {
        this.authManager.onUserAuthenticated = (username) => this.onUserAuthenticated(username);
    }

    setupProfileEventListeners() {
        // Initialize profile handling
        this.profileManager.initializeProfileHandling();
    }

    onUserAuthenticated(username) {
        // Set current user in profile manager
        this.profileManager.setCurrentUser(username);

        // Load user's profile
        const profile = JSON.parse(localStorage.getItem(`profile_${username}`) || '{}');
        this.profileManager.updateProfileDisplay(profile);

        // Load user's events
        this.eventManager.loadSavedState(username);

        // Show main content
        const authContainer = document.getElementById('authContainer');
        const appContainer = document.getElementById('appContainer');
        if (authContainer) authContainer.classList.add('hidden');
        if (appContainer) appContainer.classList.remove('hidden');
    }

    setupTimerEventListeners() {
        const startTimerBtn = document.getElementById('startTimer');
        const startCustomTimerBtn = document.getElementById('startCustomTimer');
        const stopTimerBtn = document.getElementById('stopTimer');

        if (startTimerBtn) {
            startTimerBtn.addEventListener('click', () => {
                const event = this.timerManager.startTimer();
                if (event) {
                    this.eventManager.addEvent(event);
                }
            });
        }

        if (startCustomTimerBtn) {
            startCustomTimerBtn.addEventListener('click', () => {
                const event = this.timerManager.startCustomTimer();
                if (event) {
                    this.eventManager.addEvent(event);
                }
            });
        }

        if (stopTimerBtn) {
            stopTimerBtn.addEventListener('click', () => {
                const event = this.timerManager.stopTimer();
                if (event) {
                    this.eventManager.addEvent(event);
                }
            });
        }
    }

    setupEventListeners() {
        const clearEventsBtn = document.getElementById('clearEvents');
        const addLogbookEntryBtn = document.getElementById('addLogbookEntry');

        if (clearEventsBtn) {
            clearEventsBtn.addEventListener('click', () => {
                this.eventManager.clearEvents();
            });
        }

        if (addLogbookEntryBtn) {
            addLogbookEntryBtn.addEventListener('click', () => {
                const eventId = this.eventManager.currentEventId;
                if (eventId) {
                    const logbookEntryText = document.getElementById('logbookEntryText');
                    if (logbookEntryText) {
                        const entry = {
                            date: new Date().toISOString(),
                            text: logbookEntryText.value
                        };
                        this.eventManager.addLogbookEntry(eventId, entry);
                        logbookEntryText.value = '';
                    }
                }
            });
        }
    }
}

// Initialize the application
window.app = new App(); 