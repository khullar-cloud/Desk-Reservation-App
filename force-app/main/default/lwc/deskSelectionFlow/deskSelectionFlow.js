import { LightningElement, track, wire, api } from 'lwc';
import getLocations from '@salesforce/apex/DeskSelectionController.getLocations';
import getOffices from '@salesforce/apex/DeskSelectionController.getOffices';
import getFloors from '@salesforce/apex/DeskSelectionController.getFloors';
import getDesks from '@salesforce/apex/DeskSelectionController.getDesks';
import createDeskReservation from '@salesforce/apex/DeskSelectionController.createDeskReservation';
import getReservationForDesk from '@salesforce/apex/DeskSelectionController.getReservationForDesk';
import cancelReservation from '@salesforce/apex/DeskSelectionController.cancelReservation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import USER_ID from '@salesforce/user/Id';
import getAllReservations from '@salesforce/apex/DeskSelectionController.getAllReservations';
import { refreshApex } from '@salesforce/apex';

export default class DeskSelectionFlow extends LightningElement {
    @track selectedReservation;
    @track reservationInfo;
    @track showReservationTab = false;
    @track selectedDate = this.getTodayDate();
    @track userReservations = [];
    @track _desksWiredResult;
    @track isCancelled = false;


    locationOptions = [];
    officeOptions = [];
    floorOptions = [];
    deskList = [];

    selectedLocation;
    selectedOffice;
    selectedFloor;
    selectedDeskId;
    selectedDeskNumber;
    reservationName = '';
    reservationDate = '';

    showModal = false;
    canCancel = false;
    userId = USER_ID;
    renderCount = 0;

    connectedCallback() {
        this.loadPicklist(getLocations, 'locationOptions', 'Error fetching locations');
    }

    handleLocationChange(event) {
        this.selectedLocation = event.detail.value;
        this.resetSelections(['office', 'floor', 'desks']);
        this.loadPicklist(() => getOffices({ locationId: this.selectedLocation }), 'officeOptions', 'Error fetching offices');
    }

    handleOfficeChange(event) {
        this.selectedOffice = event.detail.value;
        this.resetSelections(['floor', 'desks']);
        this.loadPicklist(() => getFloors({ officeId: this.selectedOffice }), 'floorOptions', 'Error fetching floors');
    }

    handleFloorChange(event) {
        this.selectedFloor = event.detail.value;
        this.showReservationTab = false;
        this.loadDesks();
    }

    handleDateChange(event) {
        this.selectedDate = event.target.value;
        this.loadDesks();
    }

    handleTabChange(event) {
        this.activeTabValue = event.target.value;
    }

    handleDeskClick(event) {
        const deskId = event.currentTarget.dataset.deskId;
        const desk = this.deskList.find(d => d.Id === deskId);

        if (!desk || ['Under Maintenance', 'Unavailable'].includes(desk.Status__c)) return;

        this.selectedDeskId = desk.Id;
        this.selectedDeskNumber = desk.Desk_Number__c;

        const reservations = desk.Desk_Reservations__r || [];
        const isBooked = reservations.length && ['Booked', 'Checked-In'].includes(reservations[0].Status__c);

        isBooked ? this.fetchReservation(deskId) : this.prepareNewReservation();
        if (isBooked) this.activeTabValue = 'ReservationDetails';
    }

    handleReservationName(event) {
        this.reservationName = event.detail.value;
    }

    handleReservationDate(event) {
        const selected = event.detail.value;
        const today = this.getTodayDate();

        if (selected < today) {
            this.showToast('Invalid Date', 'Reservation date cannot be in the past.', 'error');
            this.reservationDate = '';
        } else {
            this.reservationDate = selected;
        }
    }

    @wire(getAllReservations, { userId: '$userId' })
    wiredUserReservations({ error, data }) {
        if (data) {
            const today = new Date().setHours(0, 0, 0, 0);
            this.userReservations = data.map(res => {
                const resDate = new Date(res.Reservation_Date__c).setHours(0, 0, 0, 0);
                return {
                    ...res,
                    canCancel: res.Status__c === 'Booked' && resDate >= today
                };
            });
            this.showUserReservations = true;
            this.userReservationError = undefined;
        } else if (error) {
            this.userReservationError = error;
            this.userReservations = [];
            this.showUserReservations = false;
            this.showToast('Error', 'Failed to load your reservations', 'error');
        }
    }



    async loadDesks() {
        try {
            this.deskList = [];
            const data = await getDesks({ floorId: this.selectedFloor, selectedDate: this.selectedDate });

            const processedData = data.map(desk => {
                const reservations = desk.Desk_Reservations__r || [];
                const isBooked = reservations.length > 0;

                return {
                    ...desk,
                    deskCssClass: `desk-box ${this.getDeskStatusClass(desk, reservations)}`,
                    title: `Desk ${desk.Desk_Number__c} - ${isBooked ? 'Booked' : 'Available'}`
                };
            });

            this.deskList = processedData;

            if (this.deskList.length > 0) {
                setTimeout(() => {
                    this.deskList = [...this.deskList];
                }, 50);
            }

            console.log('Desks loaded:', this.deskList.length);
            console.log('Sample desk status:', this.deskList.length > 0 ? this.deskList[0].deskCssClass : 'none');
        } catch (error) {
            this.showError('Error fetching desks', error);
        }
    }

    async fetchReservation(deskId) {
        try {
            const result = await getReservationForDesk({
                deskId: deskId,
                reservationDate: this.selectedDate
            });

            this.reservationInfo = {
                Id: result.Id,
                DeskName: result.Desk__r?.Name ?? 'N/A',
                FloorName: result.Desk__r?.Desks__r?.Name ?? 'N/A',
                OfficeName: result.Desk__r?.Desks__r?.Floors__r?.Name ?? 'N/A',
                LocationName: result.Desk__r?.Desks__r?.Floors__r?.Office_Location__r?.Name ?? 'N/A',
                UserName: result.User__r?.Name ?? 'N/A',
                ReservationDate: result.Reservation_Date__c ?? 'N/A',
                Status: result.Status__c ?? 'N/A',
                UserId: result.User__r?.Id,
                CreatedById: result.CreatedById
            };

            this.selectedReservation = result;
            const today = this.getTodayDate();
            const resDate = result.Reservation_Date__c;
            const isFutureOrToday = resDate >= today;

            this.canCancel = isFutureOrToday && [result.User__r?.Id, result.CreatedById].includes(this.userId); this.showReservationTab = true;
        } catch (error) {
            this.showError('Error fetching reservation info', error);
        }
    }
    prepareNewReservation() {
        this.reservationDate = this.selectedDate;
        this.reservationName = '';
        this.showModal = true;
    }

    async handleCancelCheckbox(event) {
        if (event.target.checked) {
            const reservationId = event.target.dataset.id || this.reservationInfo?.Id;

            try {
                await cancelReservation({ reservationId });
                this.showToast('Success', 'Reservation cancelled', 'success');
                this.resetReservationView();
                this.forceComponentRefresh();
                this.isCancelled = true;
            } catch (error) {
                this.showError('Failed to cancel reservation', error);
                this.isCancelled = false;
            }
        } else {
            this.isCancelled = false;
        }
    }


    forceComponentRefresh() {
        const refreshEvent = new CustomEvent('refresh');
        this.dispatchEvent(refreshEvent);

        this.renderCount++;

        if (this.selectedDeskId) {
            this.updateDeskStatusInList(this.selectedDeskId, 'booked');
        }

        this.isLoading = true;

        setTimeout(() => {
            Promise.all([
                this.loadDesks(),
                refreshApex(this._desksWiredResult),
                this.wiredUserReservations.refresh ? this.wiredUserReservations.refresh() : null
            ])
                .finally(() => {
                    this.isLoading = false;
                });
        }, 100);
    }

    updateDeskStatusInList(deskId, newStatus) {
        if (!this.deskList || this.deskList.length === 0) return;

        const updatedDeskList = this.deskList.map(desk => {
            if (desk.Id === deskId) {
                const isBooked = newStatus === 'booked';
                const mockReservations = isBooked ? [{ Status__c: 'Booked' }] : [];

                return {
                    ...desk,
                    Desk_Reservations__r: mockReservations,
                    deskCssClass: `desk-box ${isBooked ? 'booked' : 'available'}`,
                    title: `Desk ${desk.Desk_Number__c} - ${isBooked ? 'Booked' : 'Available'}`
                };
            }
            return desk;
        });

        this.deskList = [...updatedDeskList];
    }

    async submitReservation() {
        if (!this.reservationName || !this.reservationDate) {
            this.showToast('Error', 'Please fill in all fields.', 'error');
            return;
        }

        try {
            await createDeskReservation({
                deskId: this.selectedDeskId,
                reservationDate: this.reservationDate,
                reservationName: this.reservationName
            });

            this.updateDeskStatusInList(this.selectedDeskId, 'booked');

            this.showToast('Success', 'Desk booked successfully', 'success');
            this.closeModal();
        } catch (error) {
            this.showToast('Error', error.body.message || 'Error creating reservation', 'error');
        }
    }


    resetReservationView() {
        this.showReservationTab = false;
        this.reservationInfo = null;
    }

    getTodayDate() {
        return new Date().toISOString().split('T')[0];
    }

    getDeskStatusClass(desk, reservations = []) {
        const status = desk.Status__c;
        const reservationStatus = reservations[0]?.Status__c;

        console.log(`Desk ${desk.Desk_Number__c} status check - Status: ${status}, Reservation status: ${reservationStatus}`);

        if (['Under Maintenance', 'Unavailable'].includes(status)) return 'maintenance';
        if (['Booked', 'Checked-In'].includes(reservationStatus)) return 'booked';
        return 'available';
    }

    async loadPicklist(apiMethod, targetArray, errorMessage) {
        try {
            const data = await apiMethod();
            this[targetArray] = data.map(item => ({ label: item.Name, value: item.Id }));
        } catch (error) {
            this.showError(errorMessage, error);
        }
    }

    resetSelections(parts = []) {
        if (parts.includes('office')) {
            this.selectedOffice = null;
            this.officeOptions = [];
        }
        if (parts.includes('floor')) {
            this.selectedFloor = null;
            this.floorOptions = [];
        }
        if (parts.includes('desks')) {
            this.deskList = [];
        }
    }

    closeModal() {
        this.showModal = false;
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    showError(contextMessage, error) {
        console.error(`${contextMessage}:`, error);
        this.showToast('Error', `Something went wrong. Please try again.`, 'error');
    }
}
