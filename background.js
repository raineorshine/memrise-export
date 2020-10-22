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
  function(args, sender, sendResponse) {
    const { type } = args
    if (type === 'download') {
      const { filename, text } = args
      download(filename, text, 'text/tsv')
    }
    else if (type === 'log') {
      const { message } = args
      console.log(message)
    }
  }
)
