public with sharing class OfficeService {
    public static List<Office__c> getOfficesForLocation(Id locationId) {
        return [SELECT Id, Name FROM Office__c WHERE Office_Location__c = :locationId AND isActive__c = true ORDER BY Name];
    }
}
