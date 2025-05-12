public with sharing class DeskReservationService {
    
    public static void createReservation(String deskId, Date reservationDate, String reservationName) {
    if (String.isBlank(deskId) || reservationDate == null || String.isBlank(reservationName)) {
        throw new AuraHandledException('Invalid input data.');
    }

    List<Desk_Reservation__c> existingDeskBookings = [
        SELECT Id FROM Desk_Reservation__c 
        WHERE Desk__c = :deskId 
        AND Reservation_Date__c = :reservationDate 
        AND Status__c = 'Booked'
    ];

    if (!existingDeskBookings.isEmpty()) {
        throw new AuraHandledException('Desk is already booked for this date.');
    }

    List<Desk_Reservation__c> userExistingBookings = [
        SELECT Id FROM Desk_Reservation__c 
        WHERE User__c = :UserInfo.getUserId() 
        AND Reservation_Date__c = :reservationDate 
        AND Status__c = 'Booked'
    ];

    if (!userExistingBookings.isEmpty()) {
        throw new AuraHandledException('You have already booked a desk for this date.');
    }

    insert new Desk_Reservation__c(
        Name = reservationName,
        Desk__c = deskId,
        Reservation_Date__c = reservationDate,
        User__c = UserInfo.getUserId(),
        Status__c = 'Booked'
    );
}


   @AuraEnabled(cacheable=true)
public static Desk_Reservation__c getReservationForDeskOnDate(Id deskId, Date reservationDate) {
    if (deskId == null || reservationDate == null) {
        throw new AuraHandledException('Desk ID and reservation date are required.');
    }

    List<Desk_Reservation__c> reservations = [
        SELECT 
            Id,
            Name,
            Reservation_Date__c,
            Status__c,
            Desk__r.Name,
            Desk__r.Desks__r.Name,                       
            Desk__r.Desks__r.Floors__r.Name,           
            Desk__r.Desks__r.Floors__r.Office_Location__r.Name, 
            User__r.Id,
            User__r.Name,
            CreatedById
        FROM Desk_Reservation__c
        WHERE Desk__c = :deskId
          AND Reservation_Date__c = :reservationDate
        ORDER BY CreatedDate DESC
        LIMIT 1
    ];

    if (reservations.isEmpty()) {
        throw new AuraHandledException('No reservation found for this desk on the selected date.');
    }

    return reservations[0];
}


    public static void cancelReservation(Id reservationId) {
        if (reservationId == null) {
            throw new AuraHandledException('Reservation ID is required.');
        }

        Desk_Reservation__c res = [
            SELECT Id, Status__c, Desk__c 
            FROM Desk_Reservation__c 
            WHERE Id = :reservationId
            LIMIT 1
        ];

        res.Status__c = 'Cancelled';
        update res;

        Desk__c desk = [
            SELECT Id, Status__c 
            FROM Desk__c 
            WHERE Id = :res.Desk__c
            LIMIT 1
        ];

        desk.Status__c = 'Available';
        update desk;
    }

    public static List<Desk_Reservation__c> getUpcomingReservations(Id userId) {
        if (userId == null) {
            throw new AuraHandledException('User ID is required.');
        }

        return [
            SELECT Id, Name, Reservation_Date__c, Status__c,
                   Desk__r.Name,
                   Desk__r.Desks__r.Name,
                   Desk__r.Desks__r.Floors__r.Name,
                   Desk__r.Desks__r.Floors__r.Office_Location__r.Name
            FROM Desk_Reservation__c
            WHERE User__c = :userId
            AND Reservation_Date__c >= :Date.today()
            ORDER BY Reservation_Date__c ASC
        ];
    }

     public static List<Desk_Reservation__c> getAllReservations(Id userId) {
        if (userId == null) {
            throw new AuraHandledException('User ID is required.');
        }

        return [
            SELECT Id, Name, Reservation_Date__c, Status__c,
                   Desk__r.Name,
                   Desk__r.Desks__r.Name,
                   Desk__r.Desks__r.Floors__r.Name,
                   Desk__r.Desks__r.Floors__r.Office_Location__r.Name
            FROM Desk_Reservation__c
            WHERE User__c = :userId
            ORDER BY Reservation_Date__c ASC
        ];
    }
}