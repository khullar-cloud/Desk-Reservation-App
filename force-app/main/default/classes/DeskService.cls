public with sharing class DeskService {
    public static List<Desk__c> getDesksWithReservations(Id floorId, Date selectedDate) {
        return [
            SELECT Id, Name, Desk_Number__c, Status__c, Notes__c,
                (SELECT Id, Status__c, Reservation_Date__c, CreatedDate, User__r.Name 
                 FROM Desk_Reservations__r 
                 WHERE Reservation_Date__c = :selectedDate AND Status__c = 'Booked'
                 ORDER BY CreatedDate DESC)
            FROM Desk__c
            WHERE Desks__c = :floorId AND isActive__c = true
            ORDER BY Name
        ];
    }
}
