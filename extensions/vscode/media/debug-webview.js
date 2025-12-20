// Debug version of webview.js with extensive logging
console.log('🚀 DEBUG SCRIPT START - Time:', new Date().toISOString());
console.log('Document readyState:', document.readyState);
console.log('Document URL:', document.location.href);

// Check what's in the global scope
console.log('=== GLOBAL SCOPE CHECK ===');
console.log('typeof acquireVsCodeApi:', typeof acquireVsCodeApi);
console.log('typeof vscode:', typeof vscode);
console.log('window properties:', Object.keys(window).length);

// Track all clicks on the document
document.addEventListener('click', function(e) {
    console.log('🔴 DOCUMENT CLICK DETECTED!');
    console.log('  Target:', e.target);
    console.log('  Target ID:', e.target.id);
    console.log('  Target class:', e.target.className);
    console.log('  Target tagName:', e.target.tagName);
    console.log('  Event phase:', e.eventPhase);
    console.log('  Bubbles:', e.bubbles);
    console.log('  Current target:', e.currentTarget);
    console.log('  Coordinates:', e.clientX, e.clientY);
    
    // Check if it's near our buttons
    const toggleBtn = document.getElementById('toggle-button');
    const playBtn = document.getElementById('play-button');
    
    if (toggleBtn) {
        const rect = toggleBtn.getBoundingClientRect();
        console.log('  Toggle button rect:', rect);
        console.log('  Click inside toggle?', 
            e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom);
    }
    
    if (playBtn) {
        const rect = playBtn.getBoundingClientRect();
        console.log('  Play button rect:', rect);
        console.log('  Click inside play?', 
            e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom);
    }
}, true); // Use capture phase

// Check DOM structure
function debugDOM() {
    console.log('=== DOM STRUCTURE DEBUG ===');
    
    // Find all buttons
    const allButtons = document.querySelectorAll('button');
    console.log('Total buttons found:', allButtons.length);
    allButtons.forEach((btn, i) => {
        console.log(`Button ${i}:`, {
            id: btn.id,
            className: btn.className,
            innerHTML: btn.innerHTML.substring(0, 50),
            offsetParent: btn.offsetParent ? btn.offsetParent.tagName : null,
            display: window.getComputedStyle(btn).display,
            visibility: window.getComputedStyle(btn).visibility,
            pointerEvents: window.getComputedStyle(btn).pointerEvents,
            zIndex: window.getComputedStyle(btn).zIndex,
            position: window.getComputedStyle(btn).position,
            cursor: window.getComputedStyle(btn).cursor,
            disabled: btn.disabled,
            onclick: btn.onclick,
            rect: btn.getBoundingClientRect()
        });
    });
    
    // Check specific elements
    const toggleButton = document.getElementById('toggle-button');
    const playButton = document.getElementById('play-button');
    
    console.log('Toggle button exists:', !!toggleButton);
    console.log('Play button exists:', !!playButton);
    
    if (toggleButton) {
        console.log('Toggle button details:', {
            parentElement: toggleButton.parentElement,
            nextSibling: toggleButton.nextSibling,
            previousSibling: toggleButton.previousSibling,
            childNodes: toggleButton.childNodes.length,
            eventListeners: toggleButton.onclick || 'none set via onclick'
        });
        
        // Check if button is actually visible
        const rect = toggleButton.getBoundingClientRect();
        console.log('Toggle button visibility:', {
            inViewport: rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth,
            hasSize: rect.width > 0 && rect.height > 0,
            rect: rect
        });
    }
    
    // Check for overlapping elements
    if (toggleButton) {
        const rect = toggleButton.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const elementAtPoint = document.elementFromPoint(centerX, centerY);
        console.log('Element at toggle button center:', elementAtPoint);
        console.log('Is it the button?', elementAtPoint === toggleButton);
        
        if (elementAtPoint !== toggleButton) {
            console.log('⚠️ Something is overlapping the toggle button!');
            console.log('Overlapping element:', {
                tagName: elementAtPoint?.tagName,
                id: elementAtPoint?.id,
                className: elementAtPoint?.className
            });
        }
    }
}

// Check CSS computed styles
function debugCSS() {
    console.log('=== CSS DEBUG ===');
    
    const toggleButton = document.getElementById('toggle-button');
    if (toggleButton) {
        const styles = window.getComputedStyle(toggleButton);
        console.log('Toggle button computed styles:', {
            display: styles.display,
            visibility: styles.visibility,
            opacity: styles.opacity,
            pointerEvents: styles.pointerEvents,
            cursor: styles.cursor,
            zIndex: styles.zIndex,
            position: styles.position,
            userSelect: styles.userSelect,
            touchAction: styles.touchAction,
            transform: styles.transform,
            filter: styles.filter,
            mixBlendMode: styles.mixBlendMode
        });
        
        // Check parent elements for issues
        let parent = toggleButton.parentElement;
        let level = 0;
        while (parent && level < 5) {
            const parentStyles = window.getComputedStyle(parent);
            console.log(`Parent level ${level} (${parent.tagName}):`, {
                pointerEvents: parentStyles.pointerEvents,
                overflow: parentStyles.overflow,
                zIndex: parentStyles.zIndex,
                position: parentStyles.position
            });
            parent = parent.parentElement;
            level++;
        }
    }
}

// Test event attachment methods
function testEventMethods() {
    console.log('=== EVENT ATTACHMENT TEST ===');
    
    const toggleButton = document.getElementById('toggle-button');
    if (toggleButton) {
        // Test onclick
        console.log('Setting onclick...');
        toggleButton.onclick = function(e) {
            console.log('✅ onclick fired!', e);
        };
        
        // Test addEventListener
        console.log('Adding event listener...');
        toggleButton.addEventListener('click', function(e) {
            console.log('✅ addEventListener click fired!', e);
        }, false);
        
        // Test with options
        toggleButton.addEventListener('click', function(e) {
            console.log('✅ addEventListener with capture fired!', e);
        }, { capture: true, passive: false });
        
        // Test other events
        toggleButton.addEventListener('mousedown', function(e) {
            console.log('✅ mousedown fired!', e);
        });
        
        toggleButton.addEventListener('mouseup', function(e) {
            console.log('✅ mouseup fired!', e);
        });
        
        toggleButton.addEventListener('pointerdown', function(e) {
            console.log('✅ pointerdown fired!', e);
        });
    }
}

// Run all debug checks
function runFullDebug() {
    console.log('=== RUNNING FULL DEBUG ===');
    debugDOM();
    debugCSS();
    testEventMethods();
    
    // Check if functions are defined
    console.log('=== FUNCTION AVAILABILITY ===');
    console.log('toggleView defined:', typeof toggleView);
    console.log('handlePlayButtonClick defined:', typeof handlePlayButtonClick);
    console.log('showOutputPanel defined:', typeof showOutputPanel);
    console.log('initializeEditor defined:', typeof initializeEditor);
    
    // Try to manually trigger a click
    const toggleButton = document.getElementById('toggle-button');
    if (toggleButton) {
        console.log('Attempting programmatic click...');
        toggleButton.click();
        
        // Try dispatching event manually
        console.log('Dispatching synthetic click event...');
        const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true
        });
        toggleButton.dispatchEvent(clickEvent);
    }
}

// Run debug immediately and after delays
console.log('Running debug immediately...');
runFullDebug();

setTimeout(() => {
    console.log('Running debug after 1 second...');
    runFullDebug();
}, 1000);

// Make debug functions globally available
window.debugDOM = debugDOM;
window.debugCSS = debugCSS;
window.testEventMethods = testEventMethods;
window.runFullDebug = runFullDebug;

console.log('🏁 DEBUG SCRIPT END');