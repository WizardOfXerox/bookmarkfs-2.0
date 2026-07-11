document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');
    const searchEngineLogo = document.getElementById('searchEngineLogo');
    const bookmarkGrid = document.getElementById('bookmarkGrid');
    const mostVisitedGrid = document.getElementById('mostVisitedGrid');
    const recentlyAddedGrid = document.getElementById('recentlyAddedGrid');
    const bookmarkSearchBar = document.getElementById('bookmarkSearchBar');
    const primaryFolderTabs = document.getElementById('primaryFolderTabs');
    const subFolderTabs = document.getElementById('subFolderTabs');
    const breadcrumbs = document.getElementById('breadcrumbs');
    const contentArea = document.getElementById('contentArea');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const toastContainer = document.getElementById('toastContainer');
    
    // Quick access tabs
    const quickTabs = document.querySelectorAll('.quick-tab');
    
    // Control elements
    const sortBy = document.getElementById('sortBy');
    const filterBy = document.getElementById('filterBy');
    const gridViewBtn = document.getElementById('gridViewBtn');
    const listViewBtn = document.getElementById('listViewBtn');
    
    // Modal elements
    const settingsModal = document.getElementById('settingsModal');
    const addBookmarkModal = document.getElementById('addBookmarkModal');
    const editBookmarkModal = document.getElementById('editBookmarkModal');
    const settingsBtn = document.getElementById('settingsBtn');
    const addBookmarkBtn = document.getElementById('addBookmarkBtn');
    
    // Settings elements
    const gridSize = document.getElementById('gridSize');
    const defaultSearchEngine = document.getElementById('defaultSearchEngine');
    const showMostVisited = document.getElementById('showMostVisited');
    const showRecentlyAdded = document.getElementById('showRecentlyAdded');
    const animationsEnabled = document.getElementById('animationsEnabled');
    
    // State variables
    let allBookmarks = [];
    let bookmarkTree = [];
    let currentFolder = null;
    let currentView = 'bookmarks';
    let settings = {
        gridSize: 'medium',
        defaultSearchEngine: 'google',
        showMostVisited: true,
        showRecentlyAdded: true,
        animationsEnabled: true,
        darkMode: false
    };
    let draggedBookmark = null;
    
    // Search engines configuration
    const searchEngines = {
        google: {
            name: 'Google',
            logo: '/icons/google-logo.svg',
            searchUrl: 'https://www.google.com/search?q='
        },
        bing: {
            name: 'Bing',
            logo: '/icons/bing.svg',
            searchUrl: 'https://www.bing.com/search?q='
        },
        duckduckgo: {
            name: 'DuckDuckGo',
            logo: '/icons/duckduckgo.svg',
            searchUrl: 'https://duckduckgo.com/?q='
        },
        yahoo: {
            name: 'Yahoo',
            logo: '/icons/yahoo.svg',
            searchUrl: 'https://search.yahoo.com/search?p='
        }
    }

    // --- Main Initialization ---
    function initialize() {
        loadSettings();
        setupEventListeners();
        setupDarkMode();
        loadInitialBookmarks();
        updateSearchEngine();
        applySettings();
    }

    // --- Settings Management ---
    function loadSettings() {
        const savedSettings = localStorage.getItem('bookmarkViewerSettings');
        if (savedSettings) {
            settings = { ...settings, ...JSON.parse(savedSettings) };
        }
    }

    function saveSettings() {
        localStorage.setItem('bookmarkViewerSettings', JSON.stringify(settings));
        applySettings();
        showToast('Settings saved successfully!', 'success');
    }

    function applySettings() {
        // Apply grid size
        bookmarkGrid.className = `bookmark-grid ${settings.gridSize}`;
        mostVisitedGrid.className = `bookmark-grid ${settings.gridSize} hidden`;
        recentlyAddedGrid.className = `bookmark-grid ${settings.gridSize} hidden`;
        
        // Apply animations
        if (!settings.animationsEnabled) {
            document.body.classList.add('no-animations');
        } else {
            document.body.classList.remove('no-animations');
        }
        
        // Update UI elements
        gridSize.value = settings.gridSize;
        defaultSearchEngine.value = settings.defaultSearchEngine;
        showMostVisited.checked = settings.showMostVisited;
        showRecentlyAdded.checked = settings.showRecentlyAdded;
        animationsEnabled.checked = settings.animationsEnabled;
        
        updateSearchEngine();
        updateQuickAccessTabs();
    }

    function updateSearchEngine() {
        const engine = searchEngines[settings.defaultSearchEngine];
        if (engine) {
            searchEngineLogo.src = engine.logo;
            searchEngineLogo.alt = engine.name + ' Logo';
            searchEngineLogo.classList.remove('google-logo', 'yahoo-logo');
            if (engine.name === 'Google') {
                searchEngineLogo.classList.add('google-logo');
            } else if (engine.name === 'Yahoo') {
                searchEngineLogo.classList.add('yahoo-logo');
            }
        }
    }

    function updateQuickAccessTabs() {
        const mostVisitedTab = document.querySelector('[data-tab="most-visited"]');
        const recentlyAddedTab = document.querySelector('[data-tab="recently-added"]');
        
        if (mostVisitedTab) {
            mostVisitedTab.style.display = settings.showMostVisited ? 'flex' : 'none';
        }
        if (recentlyAddedTab) {
            recentlyAddedTab.style.display = settings.showRecentlyAdded ? 'flex' : 'none';
        }
    }

    // --- Event Listeners Setup ---
    function setupEventListeners() {
        // Search functionality
        searchInput.addEventListener('input', handleSearchInput);
        searchForm.addEventListener('submit', handleSearch);
        bookmarkSearchBar.addEventListener('input', handleBookmarkSearch);
        

        // Folder navigation
        primaryFolderTabs.addEventListener('click', handlePrimaryTabClick);
        subFolderTabs.addEventListener('click', handleSubTabClick);
        breadcrumbs.addEventListener('click', handleBreadcrumbClick);
        
        // Quick access tabs
        quickTabs.forEach(tab => {
            tab.addEventListener('click', handleQuickTabClick);
        });
        
        // View controls
        sortBy.addEventListener('change', handleSortChange);
        filterBy.addEventListener('change', handleFilterChange);
        gridViewBtn.addEventListener('click', () => setViewMode('grid'));
        listViewBtn.addEventListener('click', () => setViewMode('list'));
        
        // Modal controls
        settingsBtn.addEventListener('click', () => openModal(settingsModal));
        addBookmarkBtn.addEventListener('click', () => openModal(addBookmarkModal));
        
        // Modal close buttons
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', closeModals);
        });
        
        // Modal background click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModals();
            });
        });
        
        // Settings form
        document.getElementById('saveSettings').addEventListener('click', handleSaveSettings);
        document.getElementById('resetSettings').addEventListener('click', handleResetSettings);
        
        // Bookmark form
        document.getElementById('saveBookmark').addEventListener('click', handleSaveBookmark);
        document.getElementById('cancelBookmark').addEventListener('click', closeModals);
        
        // Edit bookmark form
        document.getElementById('updateBookmark').addEventListener('click', handleUpdateBookmark);
        document.getElementById('deleteBookmark').addEventListener('click', handleDeleteBookmark);
        document.getElementById('cancelEditBookmark').addEventListener('click', closeModals);
        
        // Keyboard shortcuts
        document.addEventListener('keydown', handleKeyboardShortcuts);
        
        // Window click to close modals
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                closeModals();
            }
        });
    }

    // --- Bookmark Loading and Management ---
    async function loadInitialBookmarks() {
        showLoading(true);
        try {
            bookmarkTree = await chrome.bookmarks.getTree();
            allBookmarks = flattenBookmarks(bookmarkTree);
            
            const rootFolders = bookmarkTree[0].children.filter(node => node.children && node.title);
            renderFolderTabs(rootFolders, primaryFolderTabs, true);
            
            // Load most visited and recently added
            if (settings.showMostVisited) {
                loadMostVisited();
            }
            if (settings.showRecentlyAdded) {
                loadRecentlyAdded();
            }
            
            // Activate first tab
            const firstTab = primaryFolderTabs.querySelector('.folder-tab');
            if (firstTab) {
                firstTab.click();
            }
            
            // Populate folder dropdowns in modals
            populateFolderDropdowns();
            
        } catch (error) {
            console.error('Error loading bookmarks:', error);
            showToast('Error loading bookmarks', 'error');
        } finally {
            showLoading(false);
        }
    }

    async function loadMostVisited() {
        try {
            const mostVisited = await new Promise((resolve) => {
                chrome.topSites.get(resolve);
            });
            renderBookmarks(mostVisited.slice(0, 12), mostVisitedGrid);
        } catch (error) {
            console.error('Error loading most visited:', error);
        }
    }

    function loadRecentlyAdded() {
        const recentBookmarks = allBookmarks
            .filter(bookmark => bookmark.dateAdded)
            .sort((a, b) => b.dateAdded - a.dateAdded)
            .slice(0, 12);
        renderBookmarks(recentBookmarks, recentlyAddedGrid);
    }

    function populateFolderDropdowns() {
        const folders = getFolderList(bookmarkTree);
        const dropdowns = [
            document.getElementById('bookmarkFolder'),
            document.getElementById('editBookmarkFolder')
        ];
        
        dropdowns.forEach(dropdown => {
            dropdown.innerHTML = '<option value="">Select folder...</option>';
            folders.forEach(folder => {
                const option = document.createElement('option');
                option.value = folder.id;
                option.textContent = folder.title;
                dropdown.appendChild(option);
            });
        });
    }

    function getFolderList(nodes, prefix = '') {
        let folders = [];
        for (const node of nodes) {
            if (node.children && node.title) {
                folders.push({
                    id: node.id,
                    title: prefix + node.title
                });
                folders = folders.concat(getFolderList(node.children, prefix + node.title + ' / '));
            }
        }
        return folders;
    }

    // --- Event Handlers ---
    function handleSearch(event) {
        event.preventDefault();
        const query = searchInput.value.trim();
        if (query) {
            try {
                new URL(query);
                const url = query.includes('://') ? query : `https://${query}`;
                chrome.tabs.update({ url });
            } catch (_) {
                const engine = searchEngines[settings.defaultSearchEngine];
                const searchUrl = engine.searchUrl + encodeURIComponent(query);
                chrome.tabs.update({ url: searchUrl });
            }
        }
    }

    // Consolidated handleSearchInput for web search suggestions
    function handleSearchInput(event) {
        const query = event.target.value.trim();
        if (query.length > 0) {
            fetch(`https://suggestqueries.google.com/complete/search?client=firefox&q=${query}`)
                .then(response => response.json())
                .then(data => {
                    const suggestions = data[1];
                    renderSuggestions(suggestions);
                });
        } else {
            document.getElementById('suggestions-container').style.display = 'none';
        }
    }

    // Consolidated renderSuggestions for web search suggestions
    function renderSuggestions(suggestions) {
        const suggestionsContainer = document.getElementById('suggestions-container');
        suggestionsContainer.innerHTML = '';
        if (suggestions.length > 0) {
            suggestions.forEach(suggestion => {
                const suggestionItem = document.createElement('div');
                suggestionItem.classList.add('suggestion-item');
                suggestionItem.textContent = suggestion;
                suggestionItem.addEventListener('click', () => {
                    searchInput.value = suggestion;
                    handleSearch(new Event('submit'));
                });
                suggestionsContainer.appendChild(suggestionItem);
            });
            suggestionsContainer.style.display = 'block';
        } else {
            suggestionsContainer.style.display = 'none';
        }
    }

    function handleBookmarkSearch(event) {
        const searchTerm = event.target.value.toLowerCase();
        
        if (searchTerm.length === 0) {
            // Restore previous view
            restorePreviousView();
            return;
        }

        // Filter bookmarks
        const filteredBookmarks = allBookmarks.filter(bookmark =>
            bookmark.title.toLowerCase().includes(searchTerm) ||
            bookmark.url.toLowerCase().includes(searchTerm)
        );
        
        renderBookmarks(filteredBookmarks, bookmarkGrid);
        
        // Clear active tabs to indicate search mode
        document.querySelectorAll('.folder-tab').forEach(tab => tab.classList.remove('active'));
        updateBreadcrumbs([{ title: `Search: "${searchTerm}"`, id: 'search' }]);
    }

    function handlePrimaryTabClick(event) {
        const clickedTab = event.target.closest('.folder-tab');
        if (!clickedTab) return;

        primaryFolderTabs.querySelectorAll('.folder-tab').forEach(tab => tab.classList.remove('active'));
        clickedTab.classList.add('active');
        
        clearSearch();
        const folderId = clickedTab.dataset.id;
        
        if (folderId === 'all') {
            subFolderTabs.innerHTML = '';
            renderBookmarks(allBookmarks, bookmarkGrid);
            updateBreadcrumbs([{ title: 'All Bookmarks', id: 'all' }]);
        } else {
            chrome.bookmarks.getSubTree(folderId, (result) => {
                const folderNode = result[0];
                currentFolder = folderNode;
                const subFolders = folderNode.children.filter(node => node.children);
                
                if (subFolders.length > 0) {
                    renderFolderTabs(subFolders, subFolderTabs, false);
                    const firstSubTab = subFolderTabs.querySelector('.folder-tab');
                    if (firstSubTab) firstSubTab.click();
                } else {
                    subFolderTabs.innerHTML = '';
                    renderBookmarks(flattenBookmarks([folderNode]), bookmarkGrid);
                    updateBreadcrumbs([{ title: folderNode.title, id: folderNode.id }]);
                }
            });
        }
    }

    function handleSubTabClick(event) {
        const clickedTab = event.target.closest('.folder-tab');
        if (!clickedTab) return;

        subFolderTabs.querySelectorAll('.folder-tab').forEach(tab => tab.classList.remove('active'));
        clickedTab.classList.add('active');
        
        clearSearch();
        const folderId = clickedTab.dataset.id;
        
        chrome.bookmarks.getSubTree(folderId, (result) => {
            const folderNode = result[0];
            renderBookmarks(flattenBookmarks(result), bookmarkGrid);
            
            // Update breadcrumbs
            const parentFolder = currentFolder || { title: 'Home', id: 'root' };
            updateBreadcrumbs([
                { title: parentFolder.title, id: parentFolder.id },
                { title: folderNode.title, id: folderNode.id }
            ]);
        });
    }

    function handleBreadcrumbClick(event) {
        const breadcrumbItem = event.target.closest('.breadcrumb-item');
        if (!breadcrumbItem) return;
        
        const folderId = breadcrumbItem.dataset.folderId;
        if (folderId === 'root') {
            // Go back to main view
            const firstTab = primaryFolderTabs.querySelector('.folder-tab');
            if (firstTab) firstTab.click();
        } else {
            // Navigate to specific folder
            chrome.bookmarks.getSubTree(folderId, (result) => {
                renderBookmarks(flattenBookmarks(result), bookmarkGrid);
            });
        }
    }

    function handleQuickTabClick(event) {
        const tab = event.target.closest('.quick-tab');
        if (!tab) return;
        
        // Update active tab
        quickTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const tabType = tab.dataset.tab;
        currentView = tabType;
        
        // Hide all grids
        bookmarkGrid.classList.add('hidden');
        mostVisitedGrid.classList.add('hidden');
        recentlyAddedGrid.classList.add('hidden');
        
        // Show selected grid
        switch (tabType) {
            case 'bookmarks':
                bookmarkGrid.classList.remove('hidden');
                break;
            case 'most-visited':
                mostVisitedGrid.classList.remove('hidden');
                break;
            case 'recently-added':
                recentlyAddedGrid.classList.remove('hidden');
                break;
        }
        
        // Clear search when switching tabs
        clearSearch();
    }

    function handleSortChange() {
        const sortValue = sortBy.value;
        const currentBookmarks = getCurrentBookmarks();
        
        const sortedBookmarks = [...currentBookmarks].sort((a, b) => {
            switch (sortValue) {
                case 'name':
                    return a.title.localeCompare(b.title);
                case 'date':
                    return (b.dateAdded || 0) - (a.dateAdded || 0);
                case 'url':
                    return (a.url || '').localeCompare(b.url || '');
                default:
                    return 0;
            }
        });
        
        renderBookmarks(sortedBookmarks, getCurrentGrid());
    }

    function handleFilterChange() {
        const filterValue = filterBy.value;
        const now = Date.now();
        const currentBookmarks = getCurrentBookmarks();
        
        let filteredBookmarks = currentBookmarks;
        
        switch (filterValue) {
            case 'today':
                filteredBookmarks = currentBookmarks.filter(bookmark => 
                    bookmark.dateAdded && (now - bookmark.dateAdded) < 24 * 60 * 60 * 1000
                );
                break;
            case 'week':
                filteredBookmarks = currentBookmarks.filter(bookmark => 
                    bookmark.dateAdded && (now - bookmark.dateAdded) < 7 * 24 * 60 * 60 * 1000
                );
                break;
            case 'month':
                filteredBookmarks = currentBookmarks.filter(bookmark => 
                    bookmark.dateAdded && (now - bookmark.dateAdded) < 30 * 24 * 60 * 60 * 1000
                );
                break;
        }
        
        renderBookmarks(filteredBookmarks, getCurrentGrid());
    }

    function handleSaveSettings() {
        settings.gridSize = gridSize.value;
        settings.defaultSearchEngine = defaultSearchEngine.value;
        settings.showMostVisited = showMostVisited.checked;
        settings.showRecentlyAdded = showRecentlyAdded.checked;
        settings.animationsEnabled = animationsEnabled.checked;
        
        saveSettings();
        closeModals();
    }

    function handleResetSettings() {
        settings = {
            gridSize: 'medium',
            defaultSearchEngine: 'google',
            showMostVisited: true,
            showRecentlyAdded: true,
            animationsEnabled: true,
            darkMode: settings.darkMode
        };
        saveSettings();
        closeModals();
    }

    function handleSaveBookmark() {
        const title = document.getElementById('bookmarkTitle').value.trim();
        const url = document.getElementById('bookmarkUrl').value.trim();
        const folderId = document.getElementById('bookmarkFolder').value;
        const tags = document.getElementById('bookmarkTags').value.trim();
        
        if (!title || !url) {
            showToast('Please fill in title and URL', 'error');
            return;
        }
        
        const bookmarkData = {
            title: title,
            url: url,
            parentId: folderId || '1' // Default to bookmarks bar
        };
        
        chrome.bookmarks.create(bookmarkData, (result) => {
            if (chrome.runtime.lastError) {
                showToast('Error creating bookmark: ' + chrome.runtime.lastError.message, 'error');
            } else {
                showToast('Bookmark created successfully!', 'success');
                closeModals();
                loadInitialBookmarks(); // Refresh bookmarks
            }
        });
    }

    function handleUpdateBookmark() {
        const bookmarkId = editBookmarkModal.dataset.bookmarkId;
        const title = document.getElementById('editBookmarkTitle').value.trim();
        const url = document.getElementById('editBookmarkUrl').value.trim();
        
        if (!title || !url) {
            showToast('Please fill in title and URL', 'error');
            return;
        }
        
        chrome.bookmarks.update(bookmarkId, { title, url }, (result) => {
            if (chrome.runtime.lastError) {
                showToast('Error updating bookmark: ' + chrome.runtime.lastError.message, 'error');
            } else {
                showToast('Bookmark updated successfully!', 'success');
                closeModals();
                loadInitialBookmarks(); // Refresh bookmarks
            }
        });
    }

    function handleDeleteBookmark() {
        const bookmarkId = editBookmarkModal.dataset.bookmarkId;
        
        if (confirm('Are you sure you want to delete this bookmark?')) {
            chrome.bookmarks.remove(bookmarkId, () => {
                if (chrome.runtime.lastError) {
                    showToast('Error deleting bookmark: ' + chrome.runtime.lastError.message, 'error');
                } else {
                    showToast('Bookmark deleted successfully!', 'success');
                    closeModals();
                    loadInitialBookmarks(); // Refresh bookmarks
                }
            });
        }
    }

    function handleKeyboardShortcuts(event) {
        // Ctrl/Cmd + K for search
        if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
            event.preventDefault();
            searchInput.focus();
        }
        
        // Ctrl/Cmd + B for bookmark search
        if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
            event.preventDefault();
            bookmarkSearchBar.focus();
        }
        
        // Escape to close modals
        if (event.key === 'Escape') {
            closeModals();
        }
        
        // Ctrl/Cmd + D to add bookmark
        if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
            event.preventDefault();
            openModal(addBookmarkModal);
        }
    }

    // --- Rendering Functions ---
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function renderFolderTabs(folders, container, isPrimary) {
        let tabsHtml = isPrimary ? `<button class="folder-tab" data-id="all">
            <svg class="icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3.6 9H20.4M3.6 15H20.4M3 12C3 13.1819 3.23279 14.3522 3.68508 15.4442C4.13738 16.5361 4.80031 17.5282 5.63604 18.364C6.47177 19.1997 7.46392 19.8626 8.55585 20.3149C9.64778 20.7672 10.8181 21 12 21C13.1819 21 14.3522 20.7672 15.4442 20.3149C16.5361 19.8626 17.5282 19.1997 18.364 18.364C19.1997 17.5282 19.8626 16.5361 20.3149 15.4442C20.7672 14.3522 21 13.1819 21 12C21 9.61305 20.0518 7.32387 18.364 5.63604C16.6761 3.94821 14.3869 3 12 3C9.61305 3 7.32387 3.94821 5.63604 5.63604C3.94821 7.32387 3 9.61305 3 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M11.5 3C9.81538 5.69961 8.92224 8.81787 8.92224 12C8.92224 15.1821 9.81538 18.3004 11.5 21M12.5 3C14.1847 5.69961 15.0778 8.81787 15.0778 12C15.0778 15.1821 14.1847 18.3004 12.5 21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            All</button>` : '';
        tabsHtml += folders.map(folder => 
            `<button class="folder-tab" data-id="${folder.id}">
                <svg class="icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 20C3.45 20 2.97933 19.8043 2.588 19.413C2.19667 19.0217 2.00067 18.5507 2 18V6C2 5.45 2.196 4.97933 2.588 4.588C2.98 4.19667 3.45067 4.00067 4 4H10L12 6H20C20.55 6 21.021 6.196 21.413 6.588C21.805 6.98 22.0007 7.45067 22 8V18C22 18.55 21.8043 19.021 21.413 19.413C21.0217 19.805 20.5507 20.0007 20 20H4ZM4 18H20V8H11.175L9.175 6H4V18Z" fill="currentColor"/>
                </svg>
                ${folder.title}
            </button>`
        ).join('');
        container.innerHTML = tabsHtml;
    }

    function renderBookmarks(bookmarks, container) {
        if (!bookmarks || bookmarks.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; opacity: 0.7;">
                    <i class="fas fa-bookmark" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                    <p style="font-size: 16px; margin: 0;">No bookmarks found.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = bookmarks.map(bookmark => {
            if (!bookmark.url) return '';
            
            const faviconUrl = `https://www.google.com/s2/favicons?domain=${new URL(bookmark.url).hostname}&sz=32`;
            const displayUrl = new URL(bookmark.url).hostname;
            
            return `
                <div class="bookmark" data-bookmark-id="${bookmark.id}" draggable="true">
                                        <img src="${faviconUrl}" alt="">
                    <div class="bookmark-content">
                        <h3>${escapeHtml(bookmark.title) || 'Untitled'}</h3>
                        <div class="url">${displayUrl}</div>
                    </div>
                    <div class="bookmark-actions">
                        <button class="bookmark-action edit" title="Edit bookmark">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="bookmark-action delete" title="Delete bookmark">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Add fallback image listener for broken favicons (resolves CSP inline script violation)
        container.addEventListener('error', (e) => {
            if (e.target.tagName === 'IMG') {
                e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23999"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';
            }
        }, true);

        // Add event listeners to bookmarks
        container.querySelectorAll('.bookmark').forEach(bookmarkElement => {
            const bookmarkId = bookmarkElement.dataset.bookmarkId;
            const bookmark = bookmarks.find(b => b.id === bookmarkId);
            
            // Click to open bookmark
            bookmarkElement.addEventListener('click', (e) => {
                if (!e.target.closest('.bookmark-action')) {
                    e.preventDefault();
                    chrome.tabs.update({ url: bookmark.url });
                }
            });
            
            // Edit bookmark
            const editBtn = bookmarkElement.querySelector('.edit');
            if (editBtn) {
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openEditBookmarkModal(bookmark);
                });
            }
            
            // Delete bookmark
            const deleteBtn = bookmarkElement.querySelector('.delete');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm('Are you sure you want to delete this bookmark?')) {
                        chrome.bookmarks.remove(bookmarkId, () => {
                            if (chrome.runtime.lastError) {
                                showToast('Error deleting bookmark', 'error');
                            } else {
                                showToast('Bookmark deleted successfully!', 'success');
                                loadInitialBookmarks();
                            }
                        });
                    }
                });
            }
            
            // Drag and drop
            bookmarkElement.addEventListener('dragstart', handleDragStart);
            bookmarkElement.addEventListener('dragover', handleDragOver);
            bookmarkElement.addEventListener('drop', handleDrop);
            bookmarkElement.addEventListener('dragend', handleDragEnd);
        });
    }

    // --- Drag and Drop Functions ---
    function handleDragStart(e) {
        draggedBookmark = e.target.closest('.bookmark');
        draggedBookmark.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    function handleDrop(e) {
        e.preventDefault();
        const targetBookmark = e.target.closest('.bookmark');
        
        if (targetBookmark && targetBookmark !== draggedBookmark) {
            // Swap positions (simplified implementation)
            const container = targetBookmark.parentNode;
            const draggedIndex = Array.from(container.children).indexOf(draggedBookmark);
            const targetIndex = Array.from(container.children).indexOf(targetBookmark);
            
            if (draggedIndex < targetIndex) {
                container.insertBefore(draggedBookmark, targetBookmark.nextSibling);
            } else {
                container.insertBefore(draggedBookmark, targetBookmark);
            }
            
            showToast('Bookmark position updated!', 'success');
        }
    }

    function handleDragEnd(e) {
        if (draggedBookmark) {
            draggedBookmark.classList.remove('dragging');
            draggedBookmark = null;
        }
    }

    // --- Modal Functions ---
    function openModal(modal) {
        modal.classList.add('show');
        modal.style.display = 'flex';
        
        // Focus first input
        const firstInput = modal.querySelector('input, select, textarea');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }

    function closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('show');
            modal.style.display = 'none';
        });
        
        // Clear form data
        document.querySelectorAll('.modal input, .modal select, .modal textarea').forEach(input => {
            if (input.type !== 'checkbox') {
                input.value = '';
            }
        });
    }

    function openEditBookmarkModal(bookmark) {
        document.getElementById('editBookmarkTitle').value = bookmark.title;
        document.getElementById('editBookmarkUrl').value = bookmark.url;
        editBookmarkModal.dataset.bookmarkId = bookmark.id;
        openModal(editBookmarkModal);
    }

    // --- Utility Functions ---
    function flattenBookmarks(nodes) {
        let bookmarks = [];
        for (const node of nodes) {
            if (node.children) {
                bookmarks = bookmarks.concat(flattenBookmarks(node.children));
            } else if (node.url) {
                bookmarks.push(node);
            }
        }
        return bookmarks;
    }

    function getCurrentBookmarks() {
        switch (currentView) {
            case 'most-visited':
                return Array.from(mostVisitedGrid.querySelectorAll('.bookmark')).map(el => ({
                    id: el.dataset.bookmarkId,
                    title: el.querySelector('h3').textContent,
                    url: el.querySelector('.url').textContent
                }));
            case 'recently-added':
                return Array.from(recentlyAddedGrid.querySelectorAll('.bookmark')).map(el => ({
                    id: el.dataset.bookmarkId,
                    title: el.querySelector('h3').textContent,
                    url: el.querySelector('.url').textContent
                }));
            default:
                return allBookmarks;
        }
    }

    function getCurrentGrid() {
        switch (currentView) {
            case 'most-visited':
                return mostVisitedGrid;
            case 'recently-added':
                return recentlyAddedGrid;
            default:
                return bookmarkGrid;
        }
    }

    function setViewMode(mode) {
        const grids = [bookmarkGrid, mostVisitedGrid, recentlyAddedGrid];
        
        grids.forEach(grid => {
            if (mode === 'list') {
                grid.classList.add('list-view');
            } else {
                grid.classList.remove('list-view');
            }
        });
        
        // Update button states
        gridViewBtn.classList.toggle('active', mode === 'grid');
        listViewBtn.classList.toggle('active', mode === 'list');
    }

    function updateBreadcrumbs(path) {
        breadcrumbs.innerHTML = path.map((item, index) => 
            `<span class="breadcrumb-item ${index === path.length - 1 ? 'active' : ''}" data-folder-id="${item.id}">
                ${index === 0 ? '<i class="fas fa-home"></i>' : ''} ${item.title}
            </span>`
        ).join('');
    }

    function clearSearch() {
        if (bookmarkSearchBar.value) {
            bookmarkSearchBar.value = '';
        }
    }

    function restorePreviousView() {
        const activeSubTab = subFolderTabs.querySelector('.folder-tab.active');
        if (activeSubTab) {
            activeSubTab.click();
        } else {
            const activePrimaryTab = primaryFolderTabs.querySelector('.folder-tab.active');
            if (activePrimaryTab) {
                activePrimaryTab.click();
            }
        }
    }

    function showLoading(show) {
        if (show) {
            loadingSpinner.classList.remove('hidden');
        } else {
            loadingSpinner.classList.add('hidden');
        }
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'slideInRight 0.3s ease reverse';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    function toggleDarkMode() {
        const theme = localStorage.getItem("bookmarkfs_theme") || "dark";
        const nextTheme = theme === "dark" ? "light" : "dark";
        localStorage.setItem("bookmarkfs_theme", nextTheme);
        syncTheme();
    }

    function setupDarkMode() {
        syncTheme();
        const toggleBtn = document.getElementById("global-theme-toggle");
        if (toggleBtn) {
            toggleBtn.addEventListener('click', toggleDarkMode);
        }
    }

    function syncTheme() {
        const theme = localStorage.getItem("bookmarkfs_theme") || "dark";
        const isLight = theme === "light";
        document.body.classList.toggle("light-mode", isLight);
        
        const toggleBtn = document.getElementById("global-theme-toggle");
        if (toggleBtn) {
            toggleBtn.textContent = isLight ? "🌙 Dark" : "☀️ Light";
        }
    }

    // Handle link drag-and-drops: switch to web panel and load target URL
    document.body.addEventListener("dragover", (e) => e.preventDefault());
    document.body.addEventListener("drop", (e) => {
        e.preventDefault();
        const href = e.dataTransfer.getData("text/uri-list");
        const text = e.dataTransfer.getData("text/plain") || href;
        const target = href || text;
        if (target) {
            window.location.href = "web.html?load=" + encodeURIComponent(target.trim());
        }
    });

    // --- Initialize Application ---
    initialize();
});
