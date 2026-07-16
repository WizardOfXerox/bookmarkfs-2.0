(function() {
    'use strict';
    
    if (window._bfsAutofillLoaded) return;
    window._bfsAutofillLoaded = true;
    
    const ICON_EMOJI = '🔑';
    let activeDropdown = null;
    let iconElements = [];
    
    function findPasswordFields() {
        return document.querySelectorAll('input[type="password"]:not([data-bfs-processed])');
    }
    
    function findUsernameField(passwordField) {
        const form = passwordField.closest('form');
        const container = form || passwordField.parentElement?.parentElement || document.body;
        const candidates = container.querySelectorAll(
            'input[type="email"], input[type="text"][name*="user"], input[type="text"][name*="login"], ' +
            'input[type="text"][name*="email"], input[type="text"][autocomplete*="user"], ' +
            'input[type="text"][id*="user"], input[type="text"][id*="email"], input[type="text"][id*="login"], ' +
            'input[autocomplete="username"]'
        );
        if (candidates.length > 0) return candidates[0];
        
        const allInputs = container.querySelectorAll('input[type="text"], input[type="email"], input:not([type])');
        let prev = null;
        for (const input of allInputs) {
            if (input === passwordField) return prev;
            if (input.offsetParent !== null) prev = input;
        }
        return prev;
    }
    
    function createAutofillIcon(passwordField) {
        const icon = document.createElement('div');
        icon.className = 'bfs-autofill-icon';
        icon.textContent = ICON_EMOJI;
        icon.title = 'BookmarkFS Autofill';
        icon.setAttribute('data-bfs-icon', 'true');
        
        function positionIcon() {
            const rect = passwordField.getBoundingClientRect();
            icon.style.position = 'fixed';
            icon.style.top = (rect.top + (rect.height - 20) / 2) + 'px';
            icon.style.left = (rect.right - 26) + 'px';
        }
        positionIcon();
        
        icon.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleDropdown(icon, passwordField);
        });
        
        document.body.appendChild(icon);
        iconElements.push({ icon, field: passwordField, reposition: positionIcon });
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                icon.style.display = entry.isIntersecting ? 'flex' : 'none';
                if (entry.isIntersecting) positionIcon();
            });
        });
        observer.observe(passwordField);
        
        return icon;
    }
    
    function toggleDropdown(iconEl, passwordField) {
        if (activeDropdown) {
            activeDropdown.remove();
            activeDropdown = null;
            return;
        }
        
        const dropdown = document.createElement('div');
        dropdown.className = 'bfs-autofill-dropdown';
        
        const header = document.createElement('div');
        header.className = 'bfs-autofill-dropdown-header';
        header.textContent = '🔑 BookmarkFS Passwords';
        dropdown.appendChild(header);
        
        const loading = document.createElement('div');
        loading.className = 'bfs-autofill-empty';
        loading.textContent = 'Loading...';
        dropdown.appendChild(loading);
        
        const iconRect = iconEl.getBoundingClientRect();
        dropdown.style.position = 'fixed';
        dropdown.style.top = (iconRect.bottom + 4) + 'px';
        dropdown.style.left = Math.max(8, iconRect.right - 280) + 'px';
        
        document.body.appendChild(dropdown);
        activeDropdown = dropdown;
        
        const domain = window.location.hostname;
        try {
            chrome.runtime.sendMessage({ type: 'bookmarkfs_password_lookup', domain }, (response) => {
                loading.remove();
                const entries = response?.entries || [];
                
                if (entries.length === 0) {
                    const empty = document.createElement('div');
                    empty.className = 'bfs-autofill-empty';
                    empty.textContent = 'No saved passwords for this site';
                    dropdown.appendChild(empty);
                } else {
                    entries.forEach(entry => {
                        const el = document.createElement('div');
                        el.className = 'bfs-autofill-entry';
                        
                        const title = document.createElement('div');
                        title.className = 'bfs-autofill-entry-title';
                        title.textContent = entry.title || entry.url || domain;
                        el.appendChild(title);
                        
                        const user = document.createElement('div');
                        user.className = 'bfs-autofill-entry-user';
                        user.textContent = entry.username || '(no username)';
                        el.appendChild(user);
                        
                        el.addEventListener('click', () => {
                            const usernameField = findUsernameField(passwordField);
                            if (usernameField && entry.username) {
                                usernameField.value = entry.username;
                                usernameField.dispatchEvent(new Event('input', { bubbles: true }));
                                usernameField.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                            if (entry.password) {
                                passwordField.value = entry.password;
                                passwordField.dispatchEvent(new Event('input', { bubbles: true }));
                                passwordField.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                            dropdown.remove();
                            activeDropdown = null;
                        });
                        
                        dropdown.appendChild(el);
                    });
                }
                
                const footer = document.createElement('div');
                footer.className = 'bfs-autofill-footer';
                const link = document.createElement('a');
                link.textContent = 'Open Password Manager';
                link.addEventListener('click', () => {
                    chrome.runtime.sendMessage({ type: 'bookmarkfs_open_passwords' });
                });
                footer.appendChild(link);
                dropdown.appendChild(footer);
            });
        } catch (e) {
            loading.textContent = 'Extension context lost';
        }
    }
    
    document.addEventListener('click', (e) => {
        if (activeDropdown && !activeDropdown.contains(e.target) && !e.target.matches('[data-bfs-icon]')) {
            activeDropdown.remove();
            activeDropdown = null;
        }
    });
    
    document.addEventListener('submit', (e) => {
        const form = e.target;
        if (!(form instanceof HTMLFormElement)) return;
        const pwField = form.querySelector('input[type="password"]');
        if (!pwField || !pwField.value) return;
        
        const usernameField = findUsernameField(pwField);
        const username = usernameField?.value || '';
        
        try {
            chrome.runtime.sendMessage({
                type: 'bookmarkfs_password_save',
                url: window.location.href,
                username,
                password: pwField.value
            });
        } catch (e) {}
    });
    
    window.addEventListener('scroll', () => {
        iconElements.forEach(({ reposition }) => reposition());
    }, { passive: true });
    
    window.addEventListener('resize', () => {
        iconElements.forEach(({ reposition }) => reposition());
    });
    
    function processFields() {
        const fields = findPasswordFields();
        fields.forEach(field => {
            field.setAttribute('data-bfs-processed', 'true');
            createAutofillIcon(field);
        });
    }
    
    processFields();
    
    const observer = new MutationObserver(() => processFields());
    observer.observe(document.body, { childList: true, subtree: true });
    
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'L') {
            e.preventDefault();
            const pwField = document.querySelector('input[type="password"]');
            if (pwField) {
                const icon = document.querySelector('.bfs-autofill-icon');
                if (icon) icon.click();
            }
        }
    });
})();
