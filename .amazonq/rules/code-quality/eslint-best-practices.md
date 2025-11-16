# ESLint Best Practices

## Purpose
Ensures code follows ESLint latest best practices for JavaScript/React development in the Athleon platform, maintaining code quality and consistency.

## Priority
**High** - Should be followed unless conflicting with a critical rule

## Instructions

### ESLint Configuration
- Use ESLint 9.x with flat config format (`eslint.config.js`)
- Enable `@eslint/js/recommended` and `@typescript-eslint/recommended` rulesets
- Use `eslint-plugin-react-hooks` for React Hook rules
- Configure `eslint-plugin-jsx-a11y` for accessibility compliance

### Code Quality Rules
- **No unused variables**: Remove or prefix with underscore `_unusedVar`
- **Consistent quotes**: Use single quotes for strings, double quotes for JSX attributes
- **Semicolons**: Always use semicolons to terminate statements
- **Arrow functions**: Prefer arrow functions for callbacks and short functions
- **Const/let**: Use `const` by default, `let` only when reassignment needed
- **Template literals**: Use template literals for string interpolation

### React-Specific Rules
- **Hook dependencies**: Include all dependencies in useEffect/useCallback arrays
- **Key props**: Always provide unique `key` prop for list items
- **Component naming**: Use PascalCase for component names
- **Props destructuring**: Destructure props at function parameter level
- **Event handlers**: Use `handle` prefix for event handler functions

### Accessibility Rules
- **Form labels**: Associate labels with form controls using `htmlFor` and `id`
- **Interactive elements**: Use semantic HTML elements (`button`, `a`, `input`)
- **Keyboard navigation**: Add `onKeyDown` handlers for clickable non-button elements
- **ARIA attributes**: Use proper ARIA roles and attributes when needed

### Error Handling
- If ESLint blocks build, fix critical issues first (unused vars, missing dependencies)
- For accessibility warnings, add proper labels and semantic elements
- Use `// eslint-disable-next-line rule-name` sparingly with justification
- Never disable entire rule categories without team approval

### Build Integration
- Run ESLint on pre-commit hooks
- Configure CI/CD to fail on ESLint errors (not warnings)
- Use `DISABLE_ESLINT_PLUGIN=true` only for emergency builds
- Fix ESLint issues before code review

## Enforcement
- All new code must pass ESLint without errors
- Accessibility warnings should be addressed when possible
- Use consistent formatting with Prettier integration
- Document any rule exceptions with clear justification
