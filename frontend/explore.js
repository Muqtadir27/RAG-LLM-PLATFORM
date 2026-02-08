import { getDocuments } from './api.js'

let allDocs = []
try {
  allDocs = await getDocuments()
} catch (e) {
  console.error("Failed to fetch docs", e)
}

let docs = allDocs.slice()
const container = document.getElementById('docs')
const searchInput = document.getElementById('search')
const pdfBtn = document.getElementById('pdfBtn')
const allBtn = document.getElementById('allBtn')

// Helper for filter styles
function setFilterActive(btn) {
  [allBtn, pdfBtn].forEach(b => {
    b.style.background = 'var(--card-bg)'
    b.style.color = 'var(--text-muted)'
  })
  btn.style.background = 'var(--accent-blue)'
  btn.style.color = 'white'
}

function formatDate(isoString) {
  if (!isoString) return 'Feb 6' // Fallback
  try {
    const date = new Date(isoString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch (e) {
    return 'Feb 6'
  }
}

function renderDocs(list) {
  container.innerHTML = ''

  if (!list.length) {
    container.innerHTML = `
      <div style="text-align:center; margin-top:40px; color:var(--text-muted);">
        <span class="material-symbols-rounded" style="font-size:48px; opacity:0.3;">folder_off</span>
        <p>No documents found</p>
      </div>
    `
    return
  }

  list.forEach(d => {
    // Determine type
    let iconType = 'description'
    let typeClass = 'doc'
    const lowerName = (d.source || '').toLowerCase()

    if (lowerName.endsWith('.pdf')) {
      iconType = 'picture_as_pdf'
      typeClass = 'pdf'
    } else if (lowerName.endsWith('.txt')) {
      iconType = 'article'
      typeClass = 'txt'
    }

    const card = document.createElement('div')
    card.className = 'source-card'
    card.style.flexDirection = 'column' // Slight variation for explore view if needed, but keeping row is better for consistency? 
    // Actually the design screenshot shows list items. Let's stick to row layout but maybe add a "View Chunk" button.
    card.style.alignItems = 'stretch'
    card.style.display = 'flex'
    // Let's reset style to default source-card which is row, but we want column content for explore?
    // Screenshot shows card with title, snippet, text.
    // Let's use a custom inner HTML to match the explore specific card in screenshot.

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
         <div style="display:flex; align-items:center; gap:8px;">
            <div class="file-icon ${typeClass} small">
               <span class="material-symbols-rounded" style="font-size:18px;">${iconType}</span>
            </div>
            <strong class="filename" style="max-width:200px;">${d.source}</strong>
         </div>
         <span class="relevance-badge">ID: ${d.id || d.chunk || '?'}</span>
      </div>
      
      <div class="snippet" style="-webkit-line-clamp:3; line-clamp:3; margin-bottom:12px;">
         ${d.content || 'No content preview available.'}
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:11px; color:var(--text-muted);">
           <span class="material-symbols-rounded" style="font-size:12px; vertical-align:text-bottom;">calendar_today</span> ${formatDate(d.timestamp)}
        </span>
        <button class="view-btn icon-btn-small" style="background:#007AFF; color:white; padding:4px 12px; width:auto; border-radius:6px; font-size:11px; font-weight:600;">
           VIEW CHUNK
        </button>
      </div>
    `

    // Bind click
    const btn = card.querySelector('.view-btn')
    btn.onclick = () => openModal(d)

    container.appendChild(card)
  })
}

function openModal(d) {
  const modal = document.createElement('div')
  // Reuse existing modal styles or create inline
  modal.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,0.8); backdrop-filter:blur(5px);
    display:flex; align-items:center; justify-content:center; z-index:200;
  `
  modal.innerHTML = `
    <div class="modal-inner" style="background:#101418; border:1px solid var(--glass-border); padding:24px; border-radius:16px; width:90%; max-width:600px; max-height:80vh; display:flex; flex-direction:column;">
       <div style="display:flex; justify-content:space-between; margin-bottom:16px;">
          <h3 style="color:white; font-size:16px;">${d.source}</h3>
          <button class="close-btn icon-btn"><span class="material-symbols-rounded">close</span></button>
       </div>
       <div style="flex:1; overflow-y:auto; color:rgba(255,255,255,0.8); font-size:14px; line-height:1.6; white-space:pre-wrap;">${d.content}</div>
    </div>
  `
  document.body.appendChild(modal)
  modal.querySelector('.close-btn').onclick = () => modal.remove()
  modal.onclick = (e) => { if (e.target === modal) modal.remove() }
}


function applyFilters() {
  const q = (searchInput.value || '').toLowerCase().trim()
  let filtered = allDocs.filter(d => {
    if (!d) return false
    const txt = ((d.content || '') + ' ' + (d.source || '')).toLowerCase()
    return txt.includes(q)
  })
  docs = filtered
  renderDocs(docs)
}

searchInput.addEventListener('input', applyFilters)

pdfBtn.addEventListener('click', () => {
  setFilterActive(pdfBtn)
  const filtered = allDocs.filter(d => (d.source || '').toLowerCase().endsWith('.pdf'))
  renderDocs(filtered)
})

allBtn.addEventListener('click', () => {
  setFilterActive(allBtn)
  renderDocs(allDocs)
})

// Initial render
renderDocs(allDocs)
