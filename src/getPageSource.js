chrome.runtime.sendMessage({
  action: 'getSource',
  source: document.body.outerHTML,
})
