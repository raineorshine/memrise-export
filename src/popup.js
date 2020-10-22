const cheerio = require('cheerio')

// a global courseSlug variable to avoid a more complex return type in getWords
// dirty...
let courseSlug

function log(message) {
  chrome.runtime.sendMessage({
    type: 'log',
    message,
  })
}

/** A promise that resolve to the page source html. */
const source = new Promise((resolve, reject) => {

  chrome.runtime.onMessage.addListener((message, sender) => {
    if (message.action === "getSource") {
      resolve(message.source)
    }
  })

  window.onload = () => {
    chrome.tabs.executeScript(null, { file: "getPageSource.js"}, () => {
      // If you try and inject into an extensions page or the webstore/NTP you'll get an error
      if (chrome.runtime.lastError) {
        reject('There was an error injecting script : \n' + chrome.runtime.lastError.message)
      }
    })
  }

})

/** Returns a Promise of a list of all words in a course. */
async function getWords(courseId, level=0, skip = {}) {

  if (skip[level]) {
    log(`Skipping p${level}... (Multimedia)`)
    return getWords(courseId, level + 1, skip)
  }

  if (level > 0) {
    log(`Loading p${level}...`)
  }

  const url = `https://app.memrise.com/ajax/session/?course_id=${courseId}&level_index=${level + 1}&session_slug=preview`

  const res = await fetch(url, { credentials: 'same-origin' })

  if (!res.ok) {
    if (res.status > 400) {
      document.getElementById('message').innerHTML = 'Error'
      alert(`Error (${res.status}): ${text}`)
    }
    return []
  }

  const data = await res.json()
  const { name, num_things, num_levels, slug } = data.session.course

  // set a global courseSlug variable to avoid a more complex return type
  // dirty...
  courseSlug = slug

  if (level === 0) {
    log(`Exporting ${num_things} words (${num_levels} pages) from "${name}"`)
  }

  // update popup message
  const percentComplete = (level + 1) / num_levels * 100
  document.getElementById('message').innerHTML = `Loading (${percentComplete}%)`

  const words = data.learnables.map(row => ({
    original: row.item.value,
    translation: row.definition.value
  }))

  const wordsNext = await getWords(courseId, level + 1, skip)

  return [...words, ...wordsNext]
}

const run = () => {

  chrome.tabs.query({ active: true, currentWindow: true }, async tabs => {

    const tab = tabs[0]

    if (!tab.url.includes('https://app.memrise.com/course/')) {
      alert('Only works on https://app.memrise.com/course/*')
      window.close()
      return
    }

    // parse the course id
    courseIdMatch = tab.url.slice('https://app.memrise.com/course'.length).match(/\d+/)
    const id = courseIdMatch && courseIdMatch[0]

    if (!id) {
      alert('Invalid id')
      window.close()
      return
    }
    // extract the slug from the url just in case courseSlug was not set
    const slug = tab.url.slice(('https://app.memrise.com/course/' + id).length + 1, tab.url.length - 1)

    log('Loading page source...')
    const html = await source
    const $ = cheerio.load(html)

    // build an index of non-multimedia levels
    const multimediaLevels = $('.levels .level').toArray()
      .map(level => ({
        index: $(level).find('.level-index').text(),
        multimedia: $(level).find('.level-ico-multimedia-inactive').length > 0,
      }))
      .reduce((accum, level) => ({
        ...accum,
        ...level.multimedia ? { [level.index - 1]: true } : null
      }), {})

    // get the words
    const words = await getWords(id, 0, multimediaLevels)
    const tsv = words.map(word => `${word.translation}\t${word.original}\n`).join('')
    chrome.runtime.sendMessage({
      type: 'download',
      filename: `${courseSlug || slug}.tsv`,
      text: tsv,
    })

    log('Done')

    window.close()

  })

}

run()
