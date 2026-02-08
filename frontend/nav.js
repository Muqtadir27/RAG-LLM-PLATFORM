export function mountNav(active) {
  // Create links data
  const links = [
    { id: 'home', icon: 'search', label: 'Ask', href: 'index.html' },
    { id: 'explore', icon: 'folder_open', label: 'Docs', href: 'explore.html' },
    { id: 'upload', icon: 'cloud_upload', label: 'Upload', href: 'upload.html' },
    { id: 'how', icon: 'school', label: 'How-to', href: 'how.html' }
  ]

  // Create nav element
  const nav = document.createElement('nav')
  nav.className = 'bottom-nav'

  // Generate HTML
  nav.innerHTML = links.map(link => `
    <a href="${link.href}" class="nav-item ${active === link.id ? 'active' : ''}">
      <span class="material-symbols-rounded">${link.icon}</span>
      <span class="label">${link.label}</span>
    </a>
  `).join('')

  document.body.appendChild(nav)
}
