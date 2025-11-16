# Category Fix - Testing Guide

## 🧪 How to Test the Fix

### Test 1: Edit Event with Object Format Categories

**Steps:**
1. Go to Event Management
2. Click "Edit" on an existing event that has categories
3. Scroll to Categories section
4. **Expected:** All previously selected categories should show as checked ✅
5. Uncheck one category
6. Check a different category
7. Click "Update Event"
8. Go back and edit again
9. **Expected:** Changes should be saved correctly

**What to check:**
- [ ] Checkboxes match the event's categories
- [ ] Toggling works smoothly
- [ ] Changes persist after save
- [ ] No console errors

---

### Test 2: Create New Event

**Steps:**
1. Go to Event Management
2. Click "Create Event"
3. Fill in basic information
4. Scroll to Categories section
5. Select 2-3 categories
6. Click "Create Event"
7. Edit the newly created event
8. **Expected:** Selected categories should still be checked ✅

**What to check:**
- [ ] Can select categories
- [ ] Selected categories save correctly
- [ ] Can edit and modify categories
- [ ] No console errors

---

### Test 3: Toggle Categories Multiple Times

**Steps:**
1. Edit any event
2. Check a category → Save
3. Edit again → Uncheck that category → Save
4. Edit again → Check it again → Save
5. Edit again
6. **Expected:** Category should be checked ✅

**What to check:**
- [ ] Toggling works consistently
- [ ] State persists correctly
- [ ] No flickering or jumping
- [ ] No console errors

---

### Test 4: View Event Summary

**Steps:**
1. Create/edit an event with categories
2. Save the event
3. View the event details/summary page
4. **Expected:** Categories should display properly (not jumbled together)

**What to check:**
- [ ] Categories display with proper spacing
- [ ] Participant counts show correctly
- [ ] Format is readable
- [ ] No "undefined" or "null" values

---

### Test 5: Console Verification

**Steps:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Edit an event
4. Type in console:
```javascript
// Check the format of categories
console.log('Categories:', formData.categories);
```

**Expected Output (one of these):**

**Format 1 (Array of IDs):**
```javascript
['cat-1', 'cat-2', 'cat-3']
```

**Format 2 (Array of Objects):**
```javascript
[
  { categoryId: 'cat-1', name: "Men's Advanced", maxParticipants: null },
  { categoryId: 'cat-2', name: "Women's RX", maxParticipants: 10 }
]
```

**What to check:**
- [ ] Format is consistent (all IDs or all objects)
- [ ] No mixed formats
- [ ] No undefined values
- [ ] CategoryIds are present

---

## 🐛 Common Issues & Solutions

### Issue 1: Checkboxes Still Unchecking

**Possible Causes:**
- Old cached data
- Browser cache not cleared

**Solution:**
```bash
# Clear browser cache
Ctrl + Shift + Delete (Chrome/Firefox)

# Or hard refresh
Ctrl + Shift + R (Windows)
Cmd + Shift + R (Mac)
```

### Issue 2: Categories Not Saving

**Possible Causes:**
- API error
- Network issue
- Validation error

**Solution:**
1. Check browser console for errors
2. Check Network tab for failed requests
3. Verify API is responding correctly

### Issue 3: Categories Display Jumbled

**Possible Causes:**
- Missing spacing in display logic
- Wrong data format

**Solution:**
1. Check if using `formatCategoriesForDisplay` helper
2. Verify categories have proper structure
3. Check CSS for display issues

---

## ✅ Success Criteria

The fix is working correctly if:

- [x] ✅ Checkboxes show correct state when editing
- [x] ✅ Toggling categories works smoothly
- [x] ✅ Changes persist after save
- [x] ✅ Works with both data formats (IDs and objects)
- [x] ✅ No console errors
- [x] ✅ Categories display properly in summary
- [x] ✅ Can create new events with categories
- [x] ✅ Can edit existing events with categories

---

## 📊 Test Results Template

```
Date: ___________
Tester: ___________

Test 1 (Edit Event): ☐ Pass ☐ Fail
Notes: _________________________________

Test 2 (Create Event): ☐ Pass ☐ Fail
Notes: _________________________________

Test 3 (Toggle Multiple): ☐ Pass ☐ Fail
Notes: _________________________________

Test 4 (View Summary): ☐ Pass ☐ Fail
Notes: _________________________________

Test 5 (Console Check): ☐ Pass ☐ Fail
Notes: _________________________________

Overall: ☐ All Pass ☐ Some Fail

Issues Found:
_________________________________
_________________________________
_________________________________
```

---

## 🔍 Debug Commands

If you encounter issues, run these in browser console:

```javascript
// 1. Check current categories format
console.log('Categories:', formData.categories);

// 2. Check if helper is working
import { normalizeCategoryIds } from './utils/categoryHelpers';
console.log('Normalized:', normalizeCategoryIds(formData.categories));

// 3. Check if category is selected
import { isCategorySelected } from './utils/categoryHelpers';
console.log('Is selected:', isCategorySelected('cat-1', formData.categories));

// 4. Check all available categories
console.log('Available:', availableCategories);
```

---

## 📝 Reporting Issues

If you find a bug, please report:

1. **What you did** (steps to reproduce)
2. **What you expected** (expected behavior)
3. **What happened** (actual behavior)
4. **Console errors** (if any)
5. **Screenshots** (if helpful)
6. **Browser & version** (Chrome 120, Firefox 121, etc.)

Example:
```
Steps:
1. Edited event "Summer Competition"
2. Unchecked "Men's Advanced" category
3. Clicked Save

Expected:
Category should be unchecked when I edit again

Actual:
Category is still checked

Console Error:
TypeError: Cannot read property 'categoryId' of undefined

Browser: Chrome 120
```

---

## 🎯 Next Steps After Testing

1. ✅ All tests pass → Deploy to production
2. ⚠️ Some tests fail → Review CATEGORY_FIX_SUMMARY.md
3. ❌ Major issues → Contact development team

---

**Happy Testing!** 🚀
