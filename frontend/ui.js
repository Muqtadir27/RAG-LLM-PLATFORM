export function showToast(text, timeout = 2500){
  const t = document.createElement('div')
  t.className = 'toast'
  t.textContent = text
  document.body.appendChild(t)
  setTimeout(()=> t.remove(), timeout)
}

export function showLoading(el){
  if(!el) return
  el.dataset.loading = '1'
  const spinner = document.createElement('div')
  spinner.className = 'spinner'
  spinner.innerHTML = '<svg width="18" height="18" viewBox="0 0 50 50"><circle cx="25" cy="25" r="20" stroke="#6cf2ff" stroke-width="4" fill="none" stroke-linecap="round"></circle></svg>'
  el.appendChild(spinner)
  return ()=>{ spinner.remove(); delete el.dataset.loading }
}
