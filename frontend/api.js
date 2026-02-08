export async function queryRAG(question) {
  const res = await fetch('/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question })
  })
  return await res.json()
}

export async function getDocuments() {
  const res = await fetch('/documents')
  return await res.json()
}

export function uploadFile(file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/upload')
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText))
      else reject(new Error(xhr.statusText))
    }
    xhr.onerror = () => reject(new Error('Network error'))
    if (xhr.upload && onProgress) xhr.upload.onprogress = (e) => onProgress(e.loaded / e.total)
    const form = new FormData()
    form.append('file', file)
    xhr.send(form)
  })
}
