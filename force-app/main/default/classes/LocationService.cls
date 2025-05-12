public with sharing class LocationService {
    public static List<Office_Location__c> getActiveLocations() {
        return [SELECT Id, Name FROM Office_Location__c WHERE isActive__c = true ORDER BY Name];
    }
}
