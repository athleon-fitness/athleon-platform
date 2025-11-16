# Quick Reference Guide - Frontend Improvements

## 🚀 Common Patterns

### 1. Using Custom Hooks

```javascript
// Fetch events with caching
import { useEvents } from '../hooks/useEvents';

function MyComponent() {
  const { events, loading, error, refresh } = useEvents(organizationId);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return <div>{events.map(event => ...)}</div>;
}
```

### 2. Using Notifications

```javascript
import { useNotification } from '../components/common/NotificationProvider';

function MyComponent() {
  const { showNotification } = useNotification();
  
  const handleSave = async () => {
    showNotification('Saved successfully!', 'success');
    // or
    showNotification('Error occurred', 'error');
    // or
    showNotification('Warning message', 'warning');
  };
}
```

### 3. Safe API Calls

```javascript
import { safeAsync } from '../utils/errorHandler';
import { useNotification } from '../components/common/NotificationProvider';

function MyComponent() {
  const { showNotification } = useNotification();
  
  const handleSubmit = async () => {
    const { success, data, error } = await safeAsync(
      () => API.post('CalisthenicsAPI', '/athletes', { body: formData }),
      {
        showNotification,
        successMessage: 'Athlete created!',
        errorMessage: 'Failed to create athlete',
        onSuccess: (data) => {
          console.log('Created:', data);
          refresh();
        }
      }
    );
    
    if (success) {
      // Handle success
    }
  };
}
```

### 4. Form Validation

```javascript
import { validateForm, validateName, validateEmail } from '../utils/validation';

function MyForm() {
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [errors, setErrors] = useState({});
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    const { valid, errors: validationErrors } = validateForm(formData, {
      name: (value) => validateName(value, 'Name'),
      email: validateEmail
    });
    
    if (!valid) {
      setErrors(validationErrors);
      return;
    }
    
    // Submit form
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input 
        value={formData.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
        className={errors.name ? 'error' : ''}
      />
      {errors.name && <span className="error-message">{errors.name}</span>}
    </form>
  );
}
```

### 5. Accessible Modal

```javascript
import Modal from '../components/common/Modal';

function MyComponent() {
  const [showModal, setShowModal] = useState(false);
  
  return (
    <>
      <button onClick={() => setShowModal(true)}>Open Modal</button>
      
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="My Modal"
        size="medium"
        footer={
          <>
            <button onClick={() => setShowModal(false)}>Cancel</button>
            <button onClick={handleSave}>Save</button>
          </>
        }
      >
        <p>Modal content here</p>
      </Modal>
    </>
  );
}
```

### 6. Keyboard Navigation

```javascript
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';

function MyComponent() {
  useKeyboardNavigation({
    onEscape: () => setShowModal(false),
    onEnter: handleSubmit,
    onSave: handleSave, // Ctrl/Cmd + S
    onArrowUp: () => selectPrevious(),
    onArrowDown: () => selectNext()
  });
  
  return <div>...</div>;
}
```

### 7. Memoization for Performance

```javascript
import { useMemo } from 'react';

function MyComponent({ athletes, searchTerm }) {
  // Expensive filtering - only recalculates when dependencies change
  const filteredAthletes = useMemo(() => {
    return athletes.filter(athlete => 
      athlete.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [athletes, searchTerm]);
  
  return <div>{filteredAthletes.map(...)}</div>;
}
```

### 8. Debug Logging (Development Only)

```javascript
import { debugLog, appConfig } from '../config/app.config';

function MyComponent() {
  const handleClick = () => {
    debugLog('Button clicked', { data: someData });
    // Only logs in development
  };
  
  return (
    <div>
      {appConfig.debug.enabled && (
        <div className="debug-panel">
          Debug info here
        </div>
      )}
    </div>
  );
}
```

### 9. Accessible Buttons

```javascript
// Bad ❌
<div onClick={handleClick}>Click me</div>

// Good ✅
<button 
  onClick={handleClick}
  aria-label="Descriptive label"
  type="button"
>
  Click me
</button>

// For non-button elements that must be clickable
<div 
  onClick={handleClick}
  onKeyPress={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
  role="button"
  tabIndex={0}
  aria-label="Descriptive label"
>
  Click me
</div>
```

### 10. Category Helpers

```javascript
import { 
  normalizeCategoryIds, 
  isCategorySelected,
  formatCategoriesForDisplay 
} from '../utils/categoryHelpers';

// Normalize categories to IDs (handles both formats)
const categoryIds = normalizeCategoryIds(event.categories);

// Check if category is selected
const isSelected = isCategorySelected('cat-1', event.categories);

// Format for display
const display = formatCategoriesForDisplay(event.categories, allCategories);
// Output: "Men's Advanced: 5 (unlimited), Women's RX: 3/10"
```

### 11. Loading States

```javascript
function MyComponent() {
  const [loading, setLoading] = useState(false);
  
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }
  
  return <div>Content</div>;
}

// CSS for spinner
.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

---

## 🎨 Component Structure Template

```javascript
import React, { useState, useEffect, useMemo } from 'react';
import { useNotification } from '../components/common/NotificationProvider';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { safeAsync } from '../utils/errorHandler';
import { validateForm } from '../utils/validation';

/**
 * ComponentName
 * Brief description of what this component does
 */
const ComponentName = ({ prop1, prop2, onSuccess }) => {
  // 1. Hooks
  const { showNotification } = useNotification();
  
  // 2. State
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  // 3. Keyboard navigation
  useKeyboardNavigation({
    onEscape: handleCancel,
    onSave: handleSubmit
  });
  
  // 4. Effects
  useEffect(() => {
    fetchData();
  }, []);
  
  // 5. Memoized values
  const filteredData = useMemo(() => {
    return data.filter(item => /* filter logic */);
  }, [data]);
  
  // 6. Event handlers
  const fetchData = async () => {
    setLoading(true);
    const { success, data } = await safeAsync(
      () => API.get('CalisthenicsAPI', '/endpoint'),
      { showNotification }
    );
    if (success) setData(data);
    setLoading(false);
  };
  
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    // Handle submission
  };
  
  const handleCancel = () => {
    // Handle cancel
  };
  
  // 7. Render conditions
  if (loading) return <div>Loading...</div>;
  
  // 8. Main render
  return (
    <div className="component-name">
      {/* Component content */}
      
      <style jsx>{`
        /* Component styles */
      `}</style>
    </div>
  );
};

export default ComponentName;
```

---

## 🔍 Common Mistakes to Avoid

### ❌ Don't Do This

```javascript
// 1. Inline styles everywhere
<div style={{display: 'flex', gap: '10px'}}>

// 2. No error handling
const data = await API.get('CalisthenicsAPI', '/endpoint');

// 3. No validation
const handleSubmit = () => {
  API.post('CalisthenicsAPI', '/athletes', { body: formData });
};

// 4. Expensive operations without memoization
const filtered = athletes.filter(a => a.name.includes(search));

// 5. No accessibility
<div onClick={handleClick}>Click me</div>

// 6. Debug code in production
console.log('Debug:', data);
<div>Debug: {JSON.stringify(data)}</div>
```

### ✅ Do This Instead

```javascript
// 1. Use CSS classes
<div className="action-buttons">

// 2. Use error handling
const { success, data } = await safeAsync(
  () => API.get('CalisthenicsAPI', '/endpoint'),
  { showNotification }
);

// 3. Validate before submitting
const { valid, errors } = validateForm(formData, validations);
if (!valid) return;

// 4. Memoize expensive operations
const filtered = useMemo(() => 
  athletes.filter(a => a.name.includes(search)),
  [athletes, search]
);

// 5. Make it accessible
<button onClick={handleClick} aria-label="Action">Click me</button>

// 6. Use debug utilities
import { debugLog } from '../config/app.config';
debugLog('Debug:', data);
```

---

## 📋 Checklist for New Components

- [ ] Uses custom hooks for data fetching
- [ ] Has proper error handling with safeAsync
- [ ] Validates all form inputs
- [ ] Has loading states
- [ ] Has empty states
- [ ] Uses notifications for user feedback
- [ ] Has keyboard navigation (if interactive)
- [ ] All buttons have aria-labels
- [ ] All interactive elements are accessible
- [ ] No debug code or uses appConfig
- [ ] Expensive operations are memoized
- [ ] Component is under 300 lines
- [ ] Has JSDoc comments
- [ ] Follows naming conventions

---

## 🎯 Performance Tips

1. **Use useMemo for expensive calculations**
2. **Use useCallback for functions passed as props**
3. **Implement pagination for large lists**
4. **Use React.memo for components that rarely change**
5. **Lazy load routes and heavy components**
6. **Debounce search inputs**
7. **Cache API responses with custom hooks**
8. **Avoid inline function definitions in render**

---

## 🆘 Troubleshooting

### "Cannot read property 'showNotification' of undefined"
- Make sure NotificationProvider wraps your component tree

### "useEvents is not defined"
- Import it: `import { useEvents } from '../hooks/useEvents'`

### Modal doesn't trap focus
- Use the Modal component from `components/common/Modal`

### Validation not working
- Check you're calling validateForm correctly
- Ensure validation functions are imported

### Debug info showing in production
- Use `appConfig.debug.enabled` to conditionally show debug info
- Or use `debugLog()` instead of `console.log()`

---

## 📚 File Structure

```
frontend/src/
├── components/
│   ├── common/
│   │   ├── ErrorBoundary.js
│   │   ├── Modal.js
│   │   └── NotificationProvider.js
│   └── backoffice/
│       └── EventManagement/
│           ├── index.js
│           ├── EventList.js
│           ├── EventForm.js
│           ├── WodSelector.js
│           └── CategorySelector.js
├── hooks/
│   ├── useEvents.js
│   ├── useAthletes.js
│   └── useKeyboardNavigation.js
├── utils/
│   ├── validation.js
│   └── errorHandler.js
└── config/
    └── app.config.js
```

---

## 🎓 Learning Resources

- [React Hooks](https://react.dev/reference/react)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Web Accessibility](https://www.w3.org/WAI/fundamentals/)
- [React Performance](https://react.dev/learn/render-and-commit)

---

**Need help?** Check the IMPLEMENTATION_GUIDE.md for detailed instructions!
