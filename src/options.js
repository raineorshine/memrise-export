// // # ============================================================== ¤ when DOMContentLoaded
document.addEventListener('DOMContentLoaded', function () {
  // add the function script "popup.js" and call the function " settings()"  so that there are no duplicates
  const script = document.createElement('script')
  script.onload = function () {
    settings()
  }
  script.src = 'popup.js'
  document.head.appendChild(script)

}, false)
