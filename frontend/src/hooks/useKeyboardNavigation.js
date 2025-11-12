import { useEffect, useCallback } from 'react';

/**
 * Hook for handling keyboard navigation
 */
export const useKeyboardNavigation = (handlers) => {
  const handleKeyDown = useCallback((event) => {
    const { key, ctrlKey, metaKey, shiftKey } = event;
    
    // Check for specific key combinations
    if (handlers.onEscape && key === 'Escape') {
      event.preventDefault();
      handlers.onEscape();
    }
    
    if (handlers.onEnter && key === 'Enter' && !shiftKey) {
      event.preventDefault();
      handlers.onEnter();
    }
    
    if (handlers.onArrowUp && key === 'ArrowUp') {
      event.preventDefault();
      handlers.onArrowUp();
    }
    
    if (handlers.onArrowDown && key === 'ArrowDown') {
      event.preventDefault();
      handlers.onArrowDown();
    }
    
    if (handlers.onArrowLeft && key === 'ArrowLeft') {
      event.preventDefault();
      handlers.onArrowLeft();
    }
    
    if (handlers.onArrowRight && key === 'ArrowRight') {
      event.preventDefault();
      handlers.onArrowRight();
    }
    
    if (handlers.onTab && key === 'Tab') {
      if (handlers.preventTab) {
        event.preventDefault();
      }
      handlers.onTab(shiftKey);
    }
    
    // Ctrl/Cmd + S for save
    if (handlers.onSave && key === 's' && (ctrlKey || metaKey)) {
      event.preventDefault();
      handlers.onSave();
    }
  }, [handlers]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};

/**
 * Hook for trapping focus within a modal/dialog
 */
export const useFocusTrap = (isActive, containerRef) => {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element when modal opens
    firstElement?.focus();

    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    return () => container.removeEventListener('keydown', handleTabKey);
  }, [isActive, containerRef]);
};

/**
 * Hook for managing focus restoration
 */
export const useFocusRestore = (isActive) => {
  useEffect(() => {
    if (!isActive) return;

    const previouslyFocused = document.activeElement;

    return () => {
      // Restore focus when component unmounts
      if (previouslyFocused && previouslyFocused.focus) {
        previouslyFocused.focus();
      }
    };
  }, [isActive]);
};

/**
 * Example usage:
 * 
 * // In a modal component
 * const modalRef = useRef();
 * 
 * useKeyboardNavigation({
 *   onEscape: closeModal,
 *   onEnter: handleSubmit
 * });
 * 
 * useFocusTrap(isOpen, modalRef);
 * useFocusRestore(isOpen);
 */
