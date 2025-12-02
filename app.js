document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const viewContainer = document.getElementById('view-container');
    const libraryList = document.getElementById('library-list');
    const navHome = document.getElementById('nav-home');

    // State
    let feedsData = [];
    let currentFeed = null;

    // Initialize
    fetchFeeds();

    // Event Listeners
    navHome.addEventListener('click', () => renderHome());

    // Fetch Feeds
    function fetchFeeds() {
        fetch('feeds.json')
            .then(res => res.json())
            .then(data => {
                feedsData = data;
                renderLibrary(data);
                renderHome();
            })
            .catch(err => {
                viewContainer.innerHTML = `<div style="padding: 20px; color: red;">Error loading feeds: ${err.message}</div>`;
            });
    }

    // Render Library (Sidebar)
    function renderLibrary(feeds) {
        libraryList.innerHTML = '';
        feeds.forEach(feed => {
            const li = document.createElement('li');
            li.className = 'library-item';
            li.textContent = feed.title;
            li.addEventListener('click', () => loadFeed(feed));
            libraryList.appendChild(li);
        });

        // Add Contact Button
        const contactContainer = document.getElementById('contact-container');
        contactContainer.innerHTML = ''; // Clear previous content

        const email = feeds.length > 0 ? feeds[0].email : '';
        if (email) {
            contactContainer.style.marginTop = 'auto';
            contactContainer.style.paddingTop = '20px';
            contactContainer.style.borderTop = '1px solid rgba(255,255,255,0.1)';

            contactContainer.innerHTML = `
                <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 10px;">Want another podcast type? Let us know!</p>
                <a href="mailto:${email}" class="contact-btn" style="
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background-color: rgba(255,255,255,0.1);
                    color: var(--text-primary);
                    padding: 10px 16px;
                    border-radius: 4px;
                    text-decoration: none;
                    font-size: 0.9rem;
                    font-weight: 500;
                    transition: background-color 0.2s;
                ">
                    <span class="material-symbols-outlined" style="font-size: 18px;">mail</span>
                    Contact
                </a>
            `;
        }
    }

    // Render Home View (Grid)
    function renderHome() {
        currentFeed = null;
        navHome.classList.add('active');
        // Remove active class from library items if any
        document.querySelectorAll('.library-item').forEach(el => el.classList.remove('active'));

        viewContainer.innerHTML = `
            <h2 style="margin-bottom: 20px; font-size: 1.5rem; font-weight: 700;">Stay UpToDay with our podcasts</h2>
            <div class="feed-grid" id="feed-grid"></div>
        `;

        const grid = document.getElementById('feed-grid');
        feedsData.forEach(feed => {
            const card = document.createElement('div');
            card.className = 'feed-card';

            const imageHtml = feed.image
                ? `<img src="${feed.image}" alt="${feed.title}" class="feed-image">`
                : `<div class="feed-image" style="background-color: #282828; display: flex; align-items: center; justify-content: center;"><span class="material-symbols-outlined" style="font-size: 48px; color: var(--text-secondary);">podcasts</span></div>`;

            card.innerHTML = `
                ${imageHtml}
                <div class="feed-title">${feed.title}</div>
                <div class="feed-description">${feed.description || ''}</div>
            `;
            card.addEventListener('click', () => loadFeed(feed));
            grid.appendChild(card);
        });
    }

    // Load and Render Feed Details
    function loadFeed(feed) {
        currentFeed = feed;
        navHome.classList.remove('active');

        viewContainer.innerHTML = '<div style="padding: 20px;">Loading episodes...</div>';

        fetch(feed.path)
            .then(response => response.text())
            .then(str => new window.DOMParser().parseFromString(str, "text/xml"))
            .then(xmlDoc => {
                renderFeedView(feed, xmlDoc);
            })
            .catch(err => {
                viewContainer.innerHTML = `<div style="padding: 20px; color: red;">Error loading episodes: ${err.message}</div>`;
            });
    }

    function renderFeedView(feed, xmlDoc) {
        const items = Array.from(xmlDoc.querySelectorAll('item'));

        const imageHtml = feed.image
            ? `<img src="${feed.image}" alt="${feed.title}" class="show-cover">`
            : `<div class="show-cover" style="background-color: #282828; display: flex; align-items: center; justify-content: center;"><span class="material-symbols-outlined" style="font-size: 64px; color: var(--text-secondary);">podcasts</span></div>`;

        if (items.length === 0) {
            viewContainer.innerHTML = `
                <div class="show-header">
                    ${imageHtml}
                    <div class="show-info">
                        <div class="meta">Podcast</div>
                        <h1>${feed.title}</h1>
                        <div class="meta">${feed.description}</div>
                    </div>
                </div>
                <div class="empty-state" style="text-align: center; padding: 60px 20px; color: var(--text-secondary);">
                    <span class="material-symbols-outlined" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;">podcasts</span>
                    <h3 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 8px; color: var(--text-primary);">Coming soon...</h3>
                    <p>We are working on the first episodes for this show.</p>
                </div>
            `;
            return;
        }

        viewContainer.innerHTML = `
            <div class="show-header">
                ${imageHtml}
                <div class="show-info">
                    <div class="meta">Podcast</div>
                    <h1>${feed.title}</h1>
                    <div class="meta">${feed.description}</div>
                    <div class="meta" style="margin-top: 10px;">${items.length} episodes</div>
                </div>
            </div>
            <table class="episode-table">
                <thead>
                    <tr>
                        <th class="col-play">#</th>
                        <th class="col-title">Title</th>
                        <th class="col-date">Date</th>
                        <th class="col-duration"><span class="material-symbols-outlined" style="font-size: 1.2rem; vertical-align: middle;">schedule</span></th>
                    </tr>
                </thead>
                <tbody id="episode-tbody">
                </tbody>
            </table>
        `;

        const tbody = document.getElementById('episode-tbody');

        items.forEach((item, index) => {
            const title = item.querySelector('title')?.textContent || 'Untitled';
            const pubDate = item.querySelector('pubDate')?.textContent || '';
            const enclosure = item.querySelector('enclosure');
            const audioUrl = enclosure ? enclosure.getAttribute('url') : null;
            const desc = item.querySelector('description')?.textContent || '';

            const dateStr = pubDate ? new Date(pubDate).toLocaleDateString() : '-';

            const tr = document.createElement('tr');
            tr.className = 'episode-row';
            tr.innerHTML = `
                <td class="col-play">
                    <button class="play-icon-btn"><span class="material-symbols-outlined">play_arrow</span></button>
                </td>
                <td class="col-title">
                    <span class="episode-title-text">${title}</span>
                    <span class="episode-desc-text">${stripHtml(desc)}</span>
                </td>
                <td class="col-date">${dateStr}</td>
                <td class="col-duration">-</td>
            `;

            tr.addEventListener('click', () => {
                if (audioUrl) {
                    window.open(audioUrl, '_blank');
                }
            });

            tbody.appendChild(tr);
        });
    }

    function stripHtml(html) {
        let tmp = document.createElement("DIV");
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || "";
    }
});
