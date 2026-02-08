const steps = [
	{
		title: '1. Upload',
		text: 'Add your documents locally to the app’s secure storage.',
		icon: 'upload_file'
	},
	{
		title: '2. Embed',
		text: 'Your files are converted into a format the AI can understand.',
		icon: 'layers'
	},
	{
		title: '3. Retrieve',
		text: 'The app finds the most relevant parts of your files to answer your questions.',
		icon: 'travel_explore'
	},
	{
		title: '4. Generate',
		text: 'A private local model writes a response based solely on your data.',
		icon: 'hotel_class'
	}
]

const container = document.getElementById('steps-container')

// Add Connecting Line
const line = document.createElement('div')
line.style.cssText = `
  position: absolute;
  top: 20px;
  bottom: 40px;
  left: 28px;
  width: 2px;
  background: rgba(255,255,255,0.1);
  z-index: 0;
`
container.appendChild(line)

steps.forEach(s => {
	const step = document.createElement('div')
	step.className = 'how-step'
	step.style.cssText = `
    display: flex;
    gap: 16px;
    margin-bottom: 24px;
    position: relative;
    z-index: 1;
    background: transparent;
    padding: 0;
  `

	const iconBox = `
    <div style="
      width: 40px; height: 40px; 
      background: rgba(30, 35, 45, 1); 
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    ">
       <span class="material-symbols-rounded" style="color:#2E8EFF; font-size:20px;">${s.icon}</span>
    </div>
  `

	step.innerHTML = `
    ${iconBox}
    <div>
      <h3 style="font-size:16px; font-weight:700; margin-bottom:6px;">${s.title}</h3>
      <p style="color:var(--text-muted); font-size:13px; line-height:1.5;">${s.text}</p>
    </div>
  `
	container.appendChild(step)
})
