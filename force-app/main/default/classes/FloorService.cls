public with sharing class FloorService {
    public static List<Floor__c> getFloorsForOffice(Id officeId) {
        return [SELECT Id, Name FROM Floor__c WHERE Floors__c = :officeId AND isActive__c = true ORDER BY Name];
    }
}
