class EventManager {
    constructor() {
        this.events = [];
        this.currentEventId = null;
        this.initializeElements();
    }

    initializeElements() {
        this.eventsList = document.getElementById('eventsList');
        this.clearEventsButton = document.getElementById('clearEvents');
        this.logbookModal = document.getElementById('logbookModal');
        this.logbookForm = document.getElementById('logbookForm');
        this.logbookEntriesList = document.getElementById('logbookEntriesList');
        this.closeLogbookButton = document.querySelector('#logbookModal .close-button');
        this.cancelLogbookButton = document.querySelector('#logbookModal .cancel-button');

        // Add event listeners
        this.clearEventsButton.addEventListener('click', () => this.clearEvents());
        this.closeLogbookButton.addEventListener('click', () => this.closeLogbookModal());
        this.cancelLogbookButton.addEventListener('click', () => this.closeLogbookModal());
        this.logbookForm.addEventListener('submit', (e) => this.handleLogbookSubmit(e));
    }

    addEvent(event) {
        this.events.push(event);
        this.saveEvents();
        this.updateEventsList();
    }

    clearEvents() {
        if (confirm('Are you sure you want to clear all events?')) {
            this.events = [];
            this.saveEvents();
            this.updateEventsList();
        }
    }

    updateEventsList() {
        this.eventsList.innerHTML = '';
        
        // Sort events by date (newest first) and filter out the current timer
        const sortedEvents = this.events
            .filter(event => event.endDate) // Only show completed events
            .sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

        sortedEvents.forEach(event => {
            const eventElement = this.createEventElement(event);
            this.eventsList.appendChild(eventElement);
        });
    }

    createEventElement(event) {
        const eventElement = document.createElement('div');
        eventElement.className = 'event-item';
        eventElement.dataset.id = event.id;

        const startDate = new Date(event.startDate);
        const endDate = event.endDate ? new Date(event.endDate) : null;
        const duration = endDate ? this.calculateDuration(startDate, endDate) : null;

        eventElement.innerHTML = `
            <div class="event-header">
                <span class="event-date">${startDate.toLocaleString()}</span>
                ${endDate ? `<span class="event-duration">${duration.days}d ${duration.hours}h ${duration.minutes}m</span>` : ''}
            </div>
            ${endDate ? `<div class="event-end">Ended: ${endDate.toLocaleString()}</div>` : ''}
            <div class="event-actions">
                <div class="logbook-icon ${event.logbook && event.logbook.length > 0 ? 'has-entries' : ''}">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                        <line x1="8" y1="7" x2="16" y2="7"></line>
                        <line x1="8" y1="12" x2="16" y2="12"></line>
                        <line x1="8" y1="17" x2="12" y2="17"></line>
                    </svg>
                </div>
            </div>
        `;

        const logbookIcon = eventElement.querySelector('.logbook-icon');
        logbookIcon.addEventListener('click', () => this.openLogbookModal(event.id));

        return eventElement;
    }

    openLogbookModal(eventId) {
        this.currentEventId = eventId;
        this.logbookModal.classList.remove('hidden');
        this.updateLogbookEntries();
    }

    closeLogbookModal() {
        this.logbookModal.classList.add('hidden');
        this.currentEventId = null;
        this.logbookForm.reset();
    }

    async handleLogbookSubmit(e) {
        e.preventDefault();
        const title = document.getElementById('logbookTitle').value;
        const note = document.getElementById('logbookNote').value;

        if (!this.currentEventId) return;

        const entry = {
            id: Date.now(),
            title,
            note,
            date: new Date().toISOString()
        };

        this.addLogbookEntry(this.currentEventId, entry);
        this.logbookForm.reset();
        this.updateLogbookEntries();
    }

    addLogbookEntry(eventId, entry) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;

        if (!event.logbook) {
            event.logbook = [];
        }

        event.logbook.push(entry);
        this.saveEvents();
    }

    deleteLogbookEntry(eventId, entryId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event || !event.logbook) return;

        event.logbook = event.logbook.filter(entry => entry.id !== entryId);
        this.saveEvents();
        this.updateLogbookEntries();
    }

    updateLogbookEntries() {
        if (!this.currentEventId) return;

        const event = this.events.find(e => e.id === this.currentEventId);
        if (!event || !event.logbook) {
            this.logbookEntriesList.innerHTML = '<p>No entries yet</p>';
            return;
        }

        // Update the logbook icon indicator for the active timer
        const activeTimerIcon = document.querySelector('#timerDisplay .logbook-icon');
        if (activeTimerIcon) {
            const activeEvent = this.events.find(e => e.type === 'timer_start' && !e.endDate);
            if (activeEvent && activeEvent.logbook && activeEvent.logbook.length > 0) {
                activeTimerIcon.classList.add('has-entries');
            } else {
                activeTimerIcon.classList.remove('has-entries');
            }
        }

        // Update the logbook icon indicator for the current event in the modal
        const currentEventIcon = document.querySelector(`.event-item[data-id="${this.currentEventId}"] .logbook-icon`);
        if (currentEventIcon) {
            if (event.logbook.length > 0) {
                currentEventIcon.classList.add('has-entries');
            } else {
                currentEventIcon.classList.remove('has-entries');
            }
        }

        this.logbookEntriesList.innerHTML = event.logbook
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map(entry => `
                <div class="logbook-entry">
                    <div class="entry-header">
                        <span class="entry-title">${entry.title}</span>
                        <span class="entry-date">${new Date(entry.date).toLocaleString()}</span>
                        <button class="delete-entry-button" data-entry-id="${entry.id}">&times;</button>
                    </div>
                    <div class="entry-note">${entry.note}</div>
                </div>
            `).join('');

        // Add event listeners to delete buttons
        this.logbookEntriesList.querySelectorAll('.delete-entry-button').forEach(button => {
            button.addEventListener('click', () => {
                const entryId = parseInt(button.dataset.entryId);
                this.deleteLogbookEntry(this.currentEventId, entryId);
            });
        });
    }

    calculateDuration(startDate, endDate) {
        const diff = endDate - startDate;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return { days, hours, minutes };
    }

    saveEvents() {
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
            localStorage.setItem(`events_${currentUser}`, JSON.stringify(this.events));
            this.updateEventsList(); // Update the display after saving
        }
    }

    loadSavedState(username) {
        const savedEvents = localStorage.getItem(`events_${username}`);
        if (savedEvents) {
            this.events = JSON.parse(savedEvents);
            this.updateEventsList();
        }
    }
}

export default EventManager; 