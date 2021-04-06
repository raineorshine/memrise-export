const cheerio = require('cheerio')

// a global courseSlug variable to avoid a more complex return type in getWords
// dirty...
let courseSlug

/** Logs a message to thec onsole. */
function log(message) {
  chrome.runtime.sendMessage({
    type: 'log',
    message,
  })
}

/** Rounds a number to the given number of digits after the decimel. */
function round(n, digits = 0) {
  const multiplier = Math.pow(10, digits)
  return Math.round(n * multiplier) / multiplier
}

/** A promise that resolve to the page source html. */
const source = new Promise((resolve, reject) => {

  chrome.runtime.onMessage.addListener((message, sender) => {
    if (message.action === 'getSource') {
      resolve(message.source)
    }
  })

  window.onload = () => {
    chrome.tabs.executeScript(null, { file: 'getPageSource.js' }, () => {
      // If you try and inject into an extensions page or the webstore/NTP you'll get an error
      if (chrome.runtime.lastError) {
        reject(new Error('There was an error injecting script : \n' + chrome.runtime.lastError.message))
      }
    })
  }

})

/** Returns a Promise of a list of all words in a course. */
async function getWords(courseId, level = 0, skip = {}) {

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
      print('Error')
      alert(`Error (${res.status}): ${res.text}`)
    }
    return []
  }

  const data = await res.json()
  const { name, num_things: numThings, num_levels: numLevels, slug } = data.session.course

  // set a global courseSlug variable to avoid a more complex return type
  // dirty...
  courseSlug = slug

  if (level === 0) {
    log(`Exporting ${numThings} words (${numLevels} pages) from "${name}"`)
  }

  // update popup message
  const percentComplete = round((level + 1) / numLevels * 100)
  print(`Loading (${percentComplete}%)`)

  // get learnable_id of difficult words
  // for each item in thingusers that is mark as "is_difficult", get the learnable_id, and then find the original and translation of this learnable_id
  const difficultWordsLearnableId = data.thingusers
    .filter(item => item.is_difficult)
    .map(item => item.learnable_id)

  // save the data
  const words = data.learnables.map(row => ({
    original: row.item.value,
    translation: row.definition.value,
    is_difficult: !!difficultWordsLearnableId.includes(row.learnable_id)
  }))

  const wordsNext = await getWords(courseId, level + 1, skip)

  return [...words, ...wordsNext]
}

const run = () => {

  const difficultWords = document.getElementById('words-difficult').checked
  print('Loading (0%)')

  chrome.tabs.query({ active: true, currentWindow: true }, async tabs => {

    const tab = tabs[0]

    if (!tab.url.includes('https://app.memrise.com/course/')) {
      alert('Memrise Export only works on Memrise course pages: https://app.memrise.com/course/*')
      window.close()
      return
    }

    // parse the course id
    const courseIdMatch = tab.url.slice('https://app.memrise.com/course'.length).match(/\d+/)
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
    const tsvWords = (difficultWords ? words.filter(word => word.is_difficult) : words)
      .map(word => `${word.translation}\t${word.original}\n`).join('')

    if (words.length > 0) {
      chrome.runtime.sendMessage({
        type: 'download',
        filename: `${courseSlug || slug}${difficultWords ? '-difficult-words.tsv' : ''}.tsv`,
        text: tsvWords,
      })
    }
    else {
      alert(`No ${difficultWords ? 'difficult ' : ''}words`)
    }

    // reset message
    const doneMessage = words.length > 0 ? 'Done!' : 'No words'
    print(doneMessage)
    log(doneMessage)

  })

}

/** Prints a message in the message box. */
function print(message) {
  const messageEl = document.getElementById('message')
  messageEl.innerHTML = message
  messageEl.style.display = 'block'
}

document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('export').addEventListener('click', run)
}, false)
