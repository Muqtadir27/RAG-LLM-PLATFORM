import { uploadFile, getDocuments } from './api.js'

const zone = document.getElementById('dropzone')
const recentList = document.getElementById('recent-files')
const fileCountEl = document.getElementById('fileCount')
const selectBtn = document.getElementById('selectBtn')
const fileInput = document.getElementById('fileInput')

async function showRecent() {
  try {
    const docs = await getDocuments() || []

    // De-duplicate by source name for display
    const files = {}
    docs.forEach(d => {
      // rough mock of file metadata
      if (!files[d.source]) {
        files[d.source] = {
          name: d.source
          // removed mock metadata to avoid confusion
        }
      }
    })

    const fileKeys = Object.keys(files)
    if (fileCountEl) fileCountEl.textContent = `${fileKeys.length} Files`

    recentList.innerHTML = fileKeys.map(k => {
      const f = files[k]
      return `
      <div class="source-card" style="align-items:center;">
        <div class="file-icon pdf">
          <span class="material-symbols-rounded">picture_as_pdf</span>
        </div>
        <div class="source-content">
          <div class="filename">${f.name}</div>
          <div class="meta" style="font-size:11px; color:var(--text-muted);">Uploaded</div>
        </div>
        <div class="status-icon" style="color:#00E676;">
           <span class="material-symbols-rounded">check_circle</span>
        </div>
      </div>
      `
    }).join('')

  } catch (e) {
    console.error(e)
  }
}

// Initial load
showRecent()

// Drag & Drop
if (zone) {
  zone.ondragover = e => { e.preventDefault(); zone.classList.add('hover') }
  zone.ondragleave = () => zone.classList.remove('hover')

  zone.ondrop = async e => {
    e.preventDefault(); zone.classList.remove('hover')
    const file = e.dataTransfer.files[0]
    if (!file) return
    handleUpload(file)
  }
}

// Button Click
if (selectBtn) selectBtn.onclick = () => fileInput.click()
if (fileInput) fileInput.onchange = () => {
  const file = fileInput.files[0]
  if (file) handleUpload(file)
}

function handleUpload(file) {
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    alert('Only PDF files are supported')
    return
  }

  // Create UI item for upload progress
  const tempId = 'temp-' + Date.now()
  const tempItem = document.createElement('div')
  tempItem.className = 'source-card'
  tempItem.id = tempId
  tempItem.style.alignItems = 'center'
  tempItem.innerHTML = `
    <div class="file-icon pdf">
      <span class="material-symbols-rounded">picture_as_pdf</span>
    </div>
    <div class="source-content">
      <div class="filename">${file.name}</div>
      <div class="meta" style="font-size:11px; color:#2E8EFF;">Embedding...</div>
      <div class="progress-bar-bg" style="height:4px; background:rgba(255,255,255,0.1); border-radius:2px; margin-top:6px; width:100%;">
         <div class="progress-bar-fill" style="height:100%; width:0%; background:#2E8EFF; border-radius:2px; transition:width 0.2s;"></div>
      </div>
    </div>
    <div class="status-text" style="font-size:12px; margin-left:8px;">0%</div>
  `

  // Prepend to list
  recentList.prepend(tempItem)

  uploadFile(file, (p) => {
    // Progress callback
    const pct = Math.round(p * 100)
    const el = document.getElementById(tempId)
    if (el) {
      el.querySelector('.progress-bar-fill').style.width = pct + '%'
      el.querySelector('.status-text').textContent = pct + '%'
      if (pct === 100) {
        el.querySelector('.meta').textContent = 'Processing...'
        el.querySelector('.meta').style.color = '#FFD700' // Gold color for processing
      }
    }
  }).then(() => {
    // Success
    showRecent() // Refresh full list
  }).catch(err => {
    console.error(err)
    // Show error state on item
    const el = document.getElementById(tempId)
    if (el) {
      el.querySelector('.meta').textContent = 'Failed'
      el.querySelector('.meta').style.color = '#ff5252'
      el.querySelector('.progress-bar-fill').style.background = '#ff5252'
    }
  })
}
