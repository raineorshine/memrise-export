/** Downloads text via the browser's "downloads" API. */
const download = (filename, text, type = 'text/plain') => {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  chrome.downloads.download({
    filename,
    url,
    saveAs: true,
  })
}

chrome.runtime.onMessage.addListener(
  function({ type, filename, text }, sender, sendResponse) {
    if (type == 'download') {
      download(filename, text, 'text/tsv')
    }
  }
)
