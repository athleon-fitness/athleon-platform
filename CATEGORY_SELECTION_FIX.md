# Category Selection Fix for Athlete Registration

## Problem
When a super admin tries to register an athlete into an event/competition in the backoffice, the category dropdown shows "Select Category" but no options appear (null/empty).

## Root Cause
The issue was in the `AthleteManagement.js` component where:

1. **Deduplication was removing event-specific categories**: The `fetchCategories` function was deduplicating categories by `categoryId`, which removed event-specific category associations. Since categories can exist for multiple events with the same `categoryId` but different `eventId`, this deduplication was incorrect.

2. **No fallback to global categories**: When an event had no specific categories assigned, there was no fallback to show global categories that could be used.

## Changes Made

### 1. Updated `fetchCategories` function
- **Removed deduplication logic** that was filtering out event-specific categories
- **Added better logging** to show which categories are loaded for each event
- **Kept all category-event associations** so the same category can exist for multiple events

### 2. Enhanced category dropdown in registration section
- **Added console logging** to debug which categories are available for each event
- **Added fallback to global categories** when no event-specific categories exist
- **Added warning message** when no categories are available at all

## How to Test

1. **Login as super admin** (admin@athleon.fitness)
2. **Navigate to Backoffice → Athletes**
3. **Click "Details" on any athlete** to expand their registration section
4. **Look for "Register for Event" section**
5. **For each unregistered event, check the category dropdown**
6. **Expected behavior:**
   - If the event has specific categories assigned, those should appear
   - If the event has no specific categories, global categories should appear as fallback
   - The dropdown should never be empty (unless there are truly no categories in the system)

## Debugging

Open the browser console and look for these log messages:
- `"Fetching categories for events:"` - Shows which events are being queried
- `"Categories found for [eventId]:"` - Shows categories returned for each event
- `"Categories by event:"` - Shows a summary of categories grouped by event
- `"Categories for event [eventId]:"` - Shows which categories are available in the dropdown
- `"No categories available for event [eventId]"` - Warning when dropdown is empty

## Additional Checks

If categories are still not showing:

1. **Verify categories exist in DynamoDB**:
   - Check the Categories table
   - Ensure categories have the correct `eventId` field
   - Verify at least some global categories exist (with `eventId: 'global'`)

2. **Check API permissions**:
   - Ensure the super admin can access `/categories?eventId={eventId}`
   - Check CloudWatch logs for any 403/404 errors

3. **Verify event setup**:
   - Ensure the event has categories assigned in Category Management
   - Check that categories were properly copied/created for the event

## Next Steps

If the issue persists after this fix:
1. Check the browser console for the debug logs mentioned above
2. Verify the API response from `/categories?eventId={eventId}` in the Network tab
3. Check if categories need to be assigned to the event in Category Management first
