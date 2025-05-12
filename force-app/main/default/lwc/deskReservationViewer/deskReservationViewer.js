import { LightningElement, api, wire, track } from 'lwc';
import getUpcomingReservationsForUser from '@salesforce/apex/DeskSelectionController.getUpcomingReservationsForUser';

export default class DeskReservationViewer extends LightningElement {
    @api selectedReservation; 
    @track userReservations = [];
    @track showUserReservations = false;
    @track error;

    handleSeeAllClick() {
        const userId = this.selectedReservation?.User__r?.Id;
        if (!userId) {
            this.setError('User ID not found in reservation.');
            return;
        }

        getUpcomingReservationsForUser({ userId })
            .then(result => {
                this.userReservations = result;
                this.showUserReservations = true;
                this.clearError();
            })
            .catch(this.handleError);
    }

    setError(message) {
        this.error = message;
        this.userReservations = [];
        this.showUserReservations = false;
    }

    clearError() {
        this.error = null;
    }

    handleError(error) {
        this.setError(error.body?.message || 'Error fetching reservations');
    }
}
