window.ContextMenu = (() => {
    let activeMenu = null;

    function hide() {
        if (activeMenu) {
            activeMenu.classList.remove('show');
            const menuToRemove = activeMenu;
            setTimeout(() => {
                if (menuToRemove && menuToRemove.parentNode) {
                    menuToRemove.parentNode.removeChild(menuToRemove);
                }
            }, 120);
            activeMenu = null;
        }
    }

    function show(event, items) {
        event.preventDefault();
        event.stopPropagation();
        
        // Hide existing menu if any
        hide();

        // Create menu container
        const menu = document.createElement('ul');
        menu.className = 'custom-context-menu';

        items.forEach(item => {
            if (item.divider) {
                const divider = document.createElement('li');
                divider.className = 'custom-context-menu-divider';
                menu.appendChild(divider);
            } else {
                const li = document.createElement('li');
                li.className = 'custom-context-menu-item';
                if (item.disabled) {
                    li.classList.add('disabled');
                }

                const iconElt = document.createElement('i');
                if (item.icon) {
                    if (item.icon.startsWith('fa-')) {
                        iconElt.className = 'fas ' + item.icon;
                    } else {
                        iconElt.className = 'emoji';
                        iconElt.textContent = item.icon;
                    }
                } else {
                    iconElt.className = 'empty';
                }

                const labelElt = document.createElement('span');
                labelElt.textContent = item.label;

                li.appendChild(iconElt);
                li.appendChild(labelElt);
                
                if (!item.disabled && item.onClick) {
                    li.addEventListener('click', (e) => {
                        e.stopPropagation();
                        hide();
                        item.onClick();
                    });
                }
                menu.appendChild(li);
            }
        });

        document.body.appendChild(menu);
        activeMenu = menu;

        // Positioning logic
        const mouseX = event.clientX;
        const mouseY = event.clientY;

        // Force display to measure size
        menu.style.left = '0px';
        menu.style.top = '0px';
        menu.classList.add('show');

        const menuWidth = menu.offsetWidth;
        const menuHeight = menu.offsetHeight;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let posX = mouseX;
        let posY = mouseY;

        // Shift left if overflows right edge
        if (mouseX + menuWidth > viewportWidth) {
            posX = viewportWidth - menuWidth - 8;
            if (posX < 0) posX = 0;
        }

        // Shift up if overflows bottom edge
        if (mouseY + menuHeight > viewportHeight) {
            posY = viewportHeight - menuHeight - 8;
            if (posY < 0) posY = 0;
        }

        menu.style.left = posX + 'px';
        menu.style.top = posY + 'px';

        // Clear and show again to trigger transition properly
        menu.classList.remove('show');
        void menu.offsetWidth; // force reflow
        menu.classList.add('show');
    }

    // Set up global close listeners
    document.addEventListener('click', hide);
    document.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') hide();
    });

    return {
        show,
        hide
    };
})();
