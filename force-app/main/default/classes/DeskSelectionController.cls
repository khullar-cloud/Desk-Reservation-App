public with sharing class DeskSelectionController {

    @AuraEnabled(cacheable=true)
    public static List<Office_Location__c> getLocations() {
        return LocationService.getActiveLocations();
    }

    @AuraEnabled(cacheable=true)
    public static List<Office__c> getOffices(Id locationId) {
        return OfficeService.getOfficesForLocation(locationId);
    }

    @AuraEnabled(cacheable=true)
    public static List<Floor__c> getFloors(Id officeId) {
        return FloorService.getFloorsForOffice(officeId);
    }

    @AuraEnabled(cacheable=true)
    public static List<Desk__c> getDesks(Id floorId, Date selectedDate) {
        return DeskService.getDesksWithReservations(floorId, selectedDate);
    }

    @AuraEnabled
    public static void createDeskReservation(String deskId, Date reservationDate, String reservationName) {
        DeskReservationService.createReservation(deskId, reservationDate, reservationName);
    }

    @AuraEnabled(cacheable=true)
public static Desk_Reservation__c getReservationForDesk(Id deskId, Date reservationDate) {
    return DeskReservationService.getReservationForDeskOnDate(deskId, reservationDate);
}


    @AuraEnabled
    public static void cancelReservation(Id reservationId) {
        DeskReservationService.cancelReservation(reservationId);
    }

    @AuraEnabled(cacheable=true)
    public static List<Desk_Reservation__c> getUpcomingReservationsForUser(Id userId) {
        return DeskReservationService.getUpcomingReservations(userId);
    }

     @AuraEnabled(cacheable=true)
    public static List<Desk_Reservation__c>getAllReservations(Id userId) {
        return DeskReservationService.getAllReservations(userId);
    }
}
