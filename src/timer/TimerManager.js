class TimerManager {
    constructor(eventManager) {
        this.timer = null;
        this.startTime = null;
        this.endTime = null;
        this.isPaused = false;
        this.pauseStartTime = null;
        this.totalPausedTime = 0;
        this.eventManager = eventManager;
        this.initializeElements();
        this.loadSavedState();
    }

    initializeElements() {
        this.timerDisplay = document.getElementById('timerDisplay');
        this.startNowButton = document.getElementById('startNow');
        this.startCustomButton = document.getElementById('startCustom');
        this.stopButton = document.getElementById('stopTimer');
        this.pauseButton = document.getElementById('pauseTimer');
        this.customTimeInput = document.getElementById('customTimeInput');
        this.confirmCustomButton = document.getElementById('confirmCustom');
        this.customDateTime = document.getElementById('customDateTime');
        this.logbookIcon = this.timerDisplay.querySelector('.logbook-icon');

        // Add event listeners
        this.startNowButton.addEventListener('click', () => this.startTimer());
        this.startCustomButton.addEventListener('click', () => this.showCustomTimeInput());
        this.stopButton.addEventListener('click', () => this.stopTimer());
        this.pauseButton.addEventListener('click', () => this.togglePause());
        this.confirmCustomButton.addEventListener('click', () => this.startCustomTimer());
        this.logbookIcon.addEventListener('click', () => this.openLogbook());
    }

    loadSavedState() {
        const currentUser = localStorage.getItem('currentUser');
        if (!currentUser) return;

        const savedState = JSON.parse(localStorage.getItem(`timer_${currentUser}`) || '{}');
        if (savedState.startTime && !savedState.endTime) {
            this.startTime = new Date(savedState.startTime);
            this.isPaused = savedState.isPaused || false;
            this.pauseStartTime = savedState.pauseStartTime ? new Date(savedState.pauseStartTime) : null;
            this.totalPausedTime = savedState.totalPausedTime || 0;

            this.timerDisplay.classList.remove('hidden');
            this.startNowButton.classList.add('hidden');
            this.startCustomButton.classList.add('hidden');
            this.stopButton.classList.remove('hidden');
            this.logbookIcon.classList.remove('hidden');
            
            // Show Resume button if paused, otherwise show Pause button
            if (this.isPaused) {
                this.pauseButton.textContent = 'Resume Timer';
                this.updateTimer(); // Update display once for paused state
            } else {
                this.pauseButton.textContent = 'Pause Timer';
                this.timer = setInterval(() => this.updateTimer(), 1000);
                this.updateTimer();
            }
            this.pauseButton.classList.remove('hidden');

            // Check for logbook entries to show the red dot
            const events = JSON.parse(localStorage.getItem(`events_${currentUser}`) || '[]');
            const activeEvent = events.find(e => e.type === 'timer_start' && !e.endDate);
            if (activeEvent && activeEvent.logbook && activeEvent.logbook.length > 0) {
                this.logbookIcon.classList.add('has-entries');
            }
        }
    }

    saveState() {
        const currentUser = localStorage.getItem('currentUser');
        if (!currentUser) return;

        const state = {
            startTime: this.startTime ? this.startTime.toISOString() : null,
            endTime: this.endTime ? this.endTime.toISOString() : null,
            isPaused: this.isPaused,
            pauseStartTime: this.pauseStartTime ? this.pauseStartTime.toISOString() : null,
            totalPausedTime: this.totalPausedTime
        };

        localStorage.setItem(`timer_${currentUser}`, JSON.stringify(state));
    }

    startTimer() {
        if (this.timer) return;

        this.startTime = new Date();
        this.endTime = null;
        this.isPaused = false;
        this.pauseStartTime = null;
        this.totalPausedTime = 0;

        this.timerDisplay.classList.remove('hidden');
        this.startNowButton.classList.add('hidden');
        this.startCustomButton.classList.add('hidden');
        this.stopButton.classList.remove('hidden');
        this.pauseButton.classList.remove('hidden');
        this.logbookIcon.classList.remove('hidden');

        this.timer = setInterval(() => this.updateTimer(), 1000);
        this.updateTimer();
        this.saveState();

        // Create a new event
        const event = {
            id: Date.now(),
            startDate: this.startTime.toISOString(),
            type: 'timer_start',
            logbook: []
        };
        this.eventManager.addEvent(event);
    }

    showCustomTimeInput() {
        this.customTimeInput.classList.remove('hidden');
        this.startNowButton.classList.add('hidden');
        this.startCustomButton.classList.add('hidden');
    }

    startCustomTimer() {
        const selectedDateTime = new Date(this.customDateTime.value);
        const now = new Date();

        this.startTime = selectedDateTime;
        this.endTime = null;
        this.isPaused = false;
        this.pauseStartTime = null;
        this.totalPausedTime = 0;

        this.timerDisplay.classList.remove('hidden');
        this.customTimeInput.classList.add('hidden');
        this.stopButton.classList.remove('hidden');
        this.pauseButton.classList.remove('hidden');
        this.logbookIcon.classList.remove('hidden');

        this.timer = setInterval(() => this.updateTimer(), 1000);
        this.updateTimer();
        this.saveState();

        // Create a new event
        const event = {
            id: Date.now(),
            startDate: this.startTime.toISOString(),
            type: 'timer_start',
            logbook: []
        };
        this.eventManager.addEvent(event);
    }

    stopTimer() {
        if (!this.startTime) return;

        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.endTime = new Date();

        this.timerDisplay.classList.add('hidden');
        this.startNowButton.classList.remove('hidden');
        this.startCustomButton.classList.remove('hidden');
        this.stopButton.classList.add('hidden');
        this.pauseButton.classList.add('hidden');
        this.logbookIcon.classList.add('hidden');

        this.saveState();

        // Update the event with end time
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
            const events = JSON.parse(localStorage.getItem(`events_${currentUser}`) || '[]');
            const activeEvent = events.find(e => e.type === 'timer_start' && !e.endDate);
            if (activeEvent) {
                activeEvent.endDate = this.endTime.toISOString();
                localStorage.setItem(`events_${currentUser}`, JSON.stringify(events));
                this.eventManager.events = events; // Update the events array
                this.eventManager.updateEventsList(); // Update the events list immediately
            }
        }
    }

    togglePause() {
        if (this.isPaused) {
            // Resume timer
            this.isPaused = false;
            if (this.pauseStartTime) {
                this.totalPausedTime += (new Date() - this.pauseStartTime);
                this.pauseStartTime = null;
            }
            this.pauseButton.textContent = 'Pause Timer';
            this.timer = setInterval(() => this.updateTimer(), 1000);
            this.updateTimer();
        } else {
            // Show unlock reason modal
            const unlockReasonModal = document.getElementById('unlockReasonModal');
            const reasonButtons = unlockReasonModal.querySelectorAll('.reason-button');
            const otherReasonInput = document.getElementById('otherReasonInput');
            const customReasonInput = document.getElementById('customReason');
            const confirmUnlockButton = document.getElementById('confirmUnlock');
            const cancelUnlockButton = document.getElementById('cancelUnlock');

            // Reset modal state
            otherReasonInput.classList.add('hidden');
            customReasonInput.value = '';
            reasonButtons.forEach(button => button.classList.remove('selected'));

            // Show modal
            unlockReasonModal.classList.remove('hidden');

            // Handle reason selection
            reasonButtons.forEach(button => {
                button.addEventListener('click', () => {
                    reasonButtons.forEach(b => b.classList.remove('selected'));
                    button.classList.add('selected');
                    if (button.dataset.reason === 'other') {
                        otherReasonInput.classList.remove('hidden');
                    } else {
                        otherReasonInput.classList.add('hidden');
                    }
                });
            });

            // Handle confirm button
            const handleConfirm = () => {
                const selectedButton = unlockReasonModal.querySelector('.reason-button.selected');
                if (!selectedButton) return;

                let reason = selectedButton.dataset.reason;
                if (reason === 'other') {
                    reason = customReasonInput.value.trim();
                    if (!reason) return;
                }

                // Pause timer
                this.isPaused = true;
                this.pauseStartTime = new Date();
                this.pauseButton.textContent = 'Resume Timer';
                clearInterval(this.timer);
                this.timer = null;

                // Add reason to logbook
                const currentUser = localStorage.getItem('currentUser');
                if (currentUser) {
                    const events = JSON.parse(localStorage.getItem(`events_${currentUser}`) || '[]');
                    const activeEvent = events.find(e => e.type === 'timer_start' && !e.endDate);
                    if (activeEvent) {
                        if (!activeEvent.logbook) {
                            activeEvent.logbook = [];
                        }
                        activeEvent.logbook.push({
                            id: Date.now(),
                            title: 'Unlock Reason',
                            note: `Device unlocked for: ${reason}`,
                            date: new Date().toISOString()
                        });
                        localStorage.setItem(`events_${currentUser}`, JSON.stringify(events));
                        this.eventManager.events = events;
                        this.eventManager.updateEventsList();
                        
                        // Show logbook icon since we now have entries
                        this.logbookIcon.classList.remove('hidden');
                        this.logbookIcon.classList.add('has-entries');
                    }
                }

                // Close modal and clean up
                unlockReasonModal.classList.add('hidden');
                confirmUnlockButton.removeEventListener('click', handleConfirm);
                cancelUnlockButton.removeEventListener('click', handleCancel);
            };

            // Handle cancel button
            const handleCancel = () => {
                unlockReasonModal.classList.add('hidden');
                confirmUnlockButton.removeEventListener('click', handleConfirm);
                cancelUnlockButton.removeEventListener('click', handleCancel);
            };

            confirmUnlockButton.addEventListener('click', handleConfirm);
            cancelUnlockButton.addEventListener('click', handleCancel);
        }
        this.saveState();
    }

    updateTimer() {
        if (!this.startTime) return;

        const now = new Date();
        let elapsed = now - this.startTime - this.totalPausedTime;

        if (this.isPaused && this.pauseStartTime) {
            elapsed -= (now - this.pauseStartTime);
        }

        const days = Math.floor(elapsed / (1000 * 60 * 60 * 24));
        const hours = Math.floor((elapsed % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);

        document.getElementById('days').textContent = days.toString().padStart(2, '0');
        document.getElementById('hours').textContent = hours.toString().padStart(2, '0');
        document.getElementById('minutes').textContent = minutes.toString().padStart(2, '0');
        document.getElementById('seconds').textContent = seconds.toString().padStart(2, '0');
    }

    openLogbook() {
        const logbookModal = document.getElementById('logbookModal');
        if (logbookModal) {
            const currentUser = localStorage.getItem('currentUser');
            if (currentUser) {
                const events = JSON.parse(localStorage.getItem(`events_${currentUser}`) || '[]');
                const activeEvent = events.find(e => e.type === 'timer_start' && !e.endDate);
                if (activeEvent) {
                    this.eventManager.currentEventId = activeEvent.id;
                    this.eventManager.openLogbookModal(activeEvent.id);
                }
            }
        }
    }
}

export default TimerManager; 