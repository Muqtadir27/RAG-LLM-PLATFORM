import * as THREE from 'three'
import { queryRAG } from './api.js'
import { showToast } from './ui.js'

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

/* =====================
   DESIGN SYSTEM
===================== */
const COLORS = {
  bg: 0x0b0d10,
  primary: 0x6cf2ff,
  secondary: 0x7c7cff,
  success: 0x7cffc1
}

/* =====================
   SCENE
===================== */
const scene = new THREE.Scene()
scene.background = new THREE.Color(COLORS.bg)
scene.fog = new THREE.FogExp2(COLORS.bg, 0.08)

/* =====================
   CAMERA
===================== */
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
)
camera.position.z = 6

/* =====================
   RENDERER
===================== */
const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector('#webgl'),
  antialias: true
})
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/* =====================
   POST PROCESSING
===================== */
const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))

const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.9,
  0.6,
  0.15
)
composer.addPass(bloom)

/* =====================
   LIGHTS
===================== */
scene.add(new THREE.AmbientLight(0xffffff, 0.6))

const keyLight = new THREE.PointLight(COLORS.primary, 2)
keyLight.position.set(4, 6, 4)
scene.add(keyLight)

/* =====================
   AI CORE
===================== */
const core = new THREE.Mesh(
  new THREE.IcosahedronGeometry(1.2, 4),
  new THREE.MeshStandardMaterial({
    color: COLORS.primary,
    metalness: 0.6,
    roughness: 0.25,
    emissive: new THREE.Color(COLORS.primary),
    emissiveIntensity: 0.5
  })
)
scene.add(core)

/* =====================
   ENERGY RINGS (SCI-FI)
===================== */
const ringGeometry = new THREE.TorusGeometry(1.8, 0.02, 16, 120)
const ringMaterial = new THREE.MeshBasicMaterial({
  color: COLORS.primary,
  transparent: true,
  opacity: 0.6
})

const ring1 = new THREE.Mesh(ringGeometry, ringMaterial)
const ring2 = ring1.clone()
ring2.scale.set(1.15, 1.15, 1.15)
ring2.material = ringMaterial.clone()
ring2.material.opacity = 0.35

scene.add(ring1, ring2)

/* =====================
   DOCUMENT NODES
===================== */
let docMeshes = []

function clearDocs() {
  docMeshes.forEach(m => scene.remove(m))
  docMeshes = []
}

function showDocs(docs) {
  clearDocs()
  docs.forEach((_, i) => {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 24, 24),
      new THREE.MeshStandardMaterial({
        color: COLORS.secondary,
        emissive: COLORS.secondary,
        emissiveIntensity: 0.35
      })
    )

    mesh.userData = {
      angle: i * (Math.PI * 2 / docs.length),
      radius: 2.8 + Math.random() * 0.3,
      speed: 0.001 + Math.random() * 0.001
    }

    scene.add(mesh)
    docMeshes.push(mesh)
  })
}

/* =====================
   TYPING EFFECT
===================== */
function typeText(text, onUpdate) {
  let i = 0
  const interval = setInterval(() => {
    onUpdate(text.slice(0, i))
    i++
    if (i > text.length) clearInterval(interval)
  }, 22)
}

/* =====================
   ANIMATION LOOP
===================== */
function animate() {
  core.rotation.y += 0.003
  core.rotation.x += 0.001

  ring1.rotation.z += 0.002
  ring2.rotation.z -= 0.0015

  docMeshes.forEach(m => {
    m.userData.angle += m.userData.speed
    m.position.x = Math.cos(m.userData.angle) * m.userData.radius
    m.position.y = Math.sin(m.userData.angle) * m.userData.radius
  })

  composer.render()
  requestAnimationFrame(animate)
}
animate()

/* =====================
   INPUT HANDLER
===================== */
const questionEl = document.querySelector('#questionInput')
const askBtn = document.querySelector('#askBtn')
const resultPanel = document.getElementById('result')
const answerEl = document.getElementById('answer')
const sourcesEl = document.getElementById('sourcesList')
const loadingEl = document.getElementById('loading')
const quoteEl = document.getElementById('quote')

async function handleQuery(q) {
  if (!q || !q.trim()) return

  // Reset UI
  clearDocs()

  // Show loading
  loadingEl.classList.remove('hidden')
  resultPanel.classList.add('hidden')
  questionEl.disabled = true
  askBtn.disabled = true

  // Reset content
  answerEl.innerHTML = ''
  sourcesEl.innerHTML = ''
  loadingEl.querySelector('p').innerText = 'AI is thinking...'

  // Visuals
  core.material.emissiveIntensity = 1

  try {
    const result = await queryRAG(q)

    // Hide loading
    loadingEl.classList.add('hidden')
    resultPanel.classList.remove('hidden')

    // Sources
    const docs = result.sources || []
    showDocs(docs)

    // Render Answer
    const answerText = result.answer || result.response || 'No answer generated.'

    // Simple typewriter effect for DOM text
    let i = 0
    // Faster typing for long text
    const speed = answerText.length > 200 ? 10 : 20

    function typeWriter() {
      if (i < answerText.length) {
        answerEl.innerHTML += answerText.charAt(i)
        i++
        setTimeout(typeWriter, speed)
      } else {
        // Animation done
        core.material.emissive.set(COLORS.success)
        core.material.emissiveIntensity = 0.6
        core.scale.setScalar(1.2)
      }
    }
    typeWriter()

    // Populate Sources List
    docs.forEach(d => {
      // Determine icon based on source name
      let iconType = 'description'
      let typeClass = 'doc'
      const lowerName = d.source.toLowerCase()

      if (lowerName.endsWith('.pdf')) {
        iconType = 'picture_as_pdf'
        typeClass = 'pdf'
      } else if (lowerName.endsWith('.txt')) {
        iconType = 'article'
        typeClass = 'txt'
      }

      const s = document.createElement('div')
      s.className = 'source-card'
      s.innerHTML = `
        <div class="file-icon ${typeClass}">
          <span class="material-symbols-rounded">${iconType}</span>
        </div>
        <div class="source-content">
          <div class="source-header">
            <span class="filename" title="${d.source}">${d.source}</span>
            <span class="relevance-badge">Chunk ${d.chunk ?? '?'}</span>
          </div>
          <div class="snippet">${d.text || 'No preview available...'}</div>
        </div>
      `
      sourcesEl.appendChild(s)
    })

  } catch (err) {
    console.error(err)
    loadingEl.classList.add('hidden')
    showToast('Query failed — see console')

    // Re-enable input on error so user can retry
    questionEl.disabled = false
    askBtn.disabled = false
  } finally {
    questionEl.disabled = false
    askBtn.disabled = false
    // Keep focus
    questionEl.focus()
  }
}

questionEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleQuery(e.target.value)
  }
})

askBtn.addEventListener('click', () => handleQuery(questionEl.value))

// Attach Button (Quick Upload)
const attachBtn = document.getElementById('attachBtn')
const quickUploadInput = document.getElementById('quickUploadInput')

attachBtn?.addEventListener('click', () => {
  quickUploadInput.click()
})

quickUploadInput?.addEventListener('change', async (e) => {
  const file = e.target.files[0]
  if (!file) return;

  showToast(`Uploading ${file.name}...`)
  try {
    const { uploadFile } = await import('./api.js') // Lazy load or use global
    await uploadFile(file, (pct) => {
      if (pct % 20 === 0) showToast(`Uploading ${pct}%`)
    })
    showToast('File added to context!', 3000)
  } catch (err) {
    console.error(err)
    showToast('Upload failed', 3000)
  }
})

// Mic Button (Web Speech API)
const micBtn = document.getElementById('micBtn')
let recognition;
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    questionEl.value += (questionEl.value ? ' ' : '') + text;
    showToast('Listening stopped')
  };

  recognition.onerror = () => {
    showToast('Voice error. Try again.')
  };
}

micBtn?.addEventListener('click', () => {
  if (!recognition) {
    showToast('Voice not supported in this browser')
    return;
  }
  showToast('Listening...')
  recognition.start()
})

// Settings Button
const settingsBtn = document.querySelector('.settings-btn')
const settingsModal = document.getElementById('settingsModal')
const closeSettings = document.getElementById('closeSettings')

settingsBtn?.addEventListener('click', () => {
  settingsModal.classList.remove('hidden')
})
closeSettings?.addEventListener('click', () => {
  settingsModal.classList.add('hidden')
})
document.getElementById('clearDataBtn')?.addEventListener('click', () => {
  showToast('Clear not implemented on backend yet')
})

// Copy button
const copyBtn = document.getElementById('copyBtn')
copyBtn?.addEventListener('click', () => {
  const txt = answerEl.innerText || ''
  if (!txt) return
  navigator.clipboard?.writeText(txt)
    .then(() => showToast('Copied to clipboard'))
    .catch(() => showToast('Failed to copy'))
})

/* =====================
   RESIZE
===================== */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  composer.setSize(window.innerWidth, window.innerHeight)
})
// Update doc count
async function updateUIStats() {
  try {
    const { getDocuments } = await import('./api.js')
    const docs = await getDocuments()
    const subText = document.querySelector('.sub-text')
    if (subText) subText.innerText = `Querying ${docs.length} documents in your local library`
  } catch (e) { }
}
updateUIStats()
setInterval(updateUIStats, 5000)
