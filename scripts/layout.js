/**
 * Helper: Manually execute a SINGLE script element.
 */
function executeSingleScript(script) {
    return new Promise((resolve, reject) => {
        const newScript = document.createElement('script');
        
        // Copy attributes (src, type, async, defer)
        Array.from(script.attributes).forEach(attr => {
            newScript.setAttribute(attr.name, attr.value);
        });

        // Handle content
        if (script.src) {
            newScript.onload = resolve;
            newScript.onerror = reject;
        } else {
            newScript.textContent = script.textContent;
            // Inline scripts run immediately
            setTimeout(resolve, 0); 
        }

        // Insert new script exactly where the old one was
        // This preserves the order relative to comments/CSS
        if(script.parentNode) {
            script.parentNode.insertBefore(newScript, script);           
        }
        else {
            document.head.appendChild(newScript);
        }
        
        // Cleanup the inert script
        script.remove();
    });
}

/**
 * Helper: Execute all scripts in a container (used for Body components)
 */
async function executeAllScriptsInContainer(container) {
    const scripts = container.querySelectorAll('script');
    for (const script of scripts) {
        await executeSingleScript(script);
    }
}

/**
 * Special loader for the HEAD section. 
 * Finds a comment and replaces it with the component content.
 */
async function injectHead(path) {
    try {
        const response = await fetch(path);
        if(response.ok === false) {
            throw new Error(`Failed to load head component from ${path}: ${response.status} ${response.statusText}`);
        }

        const html = await response.text();

        // Find the comment node const 
        iterator = document.createNodeIterator(document.head, NodeFilter.SHOW_COMMENT);
        let placeholderNode = null;
        let currentNode;

        while(currentNode = iterator.nextNode()) {
            if(currentNode.nodeValue.trim() === 'HEAD') {
                placeholderNode = currentNode;
                break;
            }
        }

        if(placeholderNode === null) {
            console.warn('comment not found. Appending to end of head.');
            // Fallback: Append to the end if comment is missing
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            const nodes = Array.from(tempDiv.childNodes);
            for(const node of nodes) {
                document.head.appendChild(node);
                if(node.tagName === 'SCRIPT') {
                    await executeSingleScript(node);
                }
            }
            return;
        }

        // Convert HTML string to nodes
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const nodes = Array.from(tempDiv.childNodes);

        // Insert nodes BEFORE the placeholder comment
        // We reverse the array so we can insert them in the correct order using insertBefore
        for(const node of nodes) {
            placeholderNode.parentNode.insertBefore(node, placeholderNode);

            // If it's a script, we need to manually run it
            if(node.tagName === 'SCRIPT') {
                await executeSingleScript(node); // Pass container to find/run the specific script
            }
        }

        // Remove the placeholder comment
        placeholderNode.remove();
    }
    catch(error) {
        console.error(error);
    }
}

/**
 * Standard loader for Body components (Header, Footer, etc)
 */
async function loadComponent(selector, path) {
    try {
        const response = await fetch(path);
        if(response.ok === false) {
            throw new Error(`Failed to load component from ${path}: ${response.status} ${response.statusText}`);
        }

        const html = await response.text();
        const container = document.querySelector(selector);

        if(container === null) {
            throw new Error(`Container element not found for selector: ${selector}`);
        }

        container.innerHTML = html;
        await executeAllScriptsInContainer(container);
    }
    catch(error){
        console.error(error);
    }
}

document.addEventListener('DOMContentLoaded', async ()=> {
    // 1. Inject Head (Finds and replaces it)
    await injectHead('/components/head.html');

    // Load Header Component
    await loadComponent('header.section__header', '/components/header.html');

    // Load Footer Component
    if(document.querySelector('footer')) {
        await loadComponent('footer', '/components/footer.html');
    }

    // Load Skills Cloud Component if the container exists
    if(document.querySelector('#skills-wrapper')) {
        await loadComponent('#skills-wrapper', '/components/skills-cloud.html');
    }

    // Handle Deferred Scroll (Hash Navigation)
    // This runs ONLY after all the above components are fully loaded and injected
    if(window.location.hash) {       
        const hash = window.location.hash;        

        // Disable the browser's default scroll restoration so we can control it
        if ('scrollRestoration' in history) {
            history.scrollRestoration = 'manual';
        }

        // Force jump to the top instantly to avoid flicker
        window.scrollTo(0,0);

        // Wait for the layout to stabilize, then smooth scroll
        setTimeout(() => {
            try {
                const target = document.querySelector(hash);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            } catch (e) {
                console.warn("Invalid hash selector:", hash);
            }
        }, 100);
    }
});