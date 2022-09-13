/** Logs a message to thec onsole. */
function log(message) {
  chrome.runtime.sendMessage({
    type: 'log',
    message,
  })
}

/** Prints a message in the message box. */
function print(message) {
  const messageEl = document.getElementById('message')
  messageEl.innerHTML = message
  messageEl.style.display = 'block'
}

/** Rounds a number to the given number of digits after the decimel. */
function round(n, digits = 0) {
  const multiplier = Math.pow(10, digits)
  return Math.round(n * multiplier) / multiplier
}

/** A promise that resolves to the page source html. */
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

/** Gets the learnables from an injected script. */
const getCourse = () => {
  return new Promise((resolve, reject) => {
    chrome.runtime.onMessage.addListener((message, sender) => {
      if (message.type === 'course') {
        resolve(message.value)
      }
    })

    chrome.tabs.executeScript(null, { file: 'getCourse.js' }, () => {
      // If you try and inject into an extensions page or the webstore/NTP you'll get an error
      if (chrome.runtime.lastError) {
        reject(new Error('There was an error injecting script : \n' + chrome.runtime.lastError.message))
      }
    })
  })
}

/** Fetches the words from the preview API. Returns a Promise of a list of all words in a course. */
// async function getWords(courseId, level = 0, { numLevels }) {

//   // get learnable_id of difficult words
//   // for each item in thingusers that is mark as "is_difficult", get the learnable_id, and then find the original and translation of this learnable_id
//   const difficultWordsLearnableId = data.thingusers
//     .filter(item => item.is_difficult)
//     .map(item => item.learnable_id)

//   // save the data
//   const words = data.learnables.map(row => ({
//     original: row.item.value,
//     translation: row.definition.value,
//     is_difficult: !!difficultWordsLearnableId.includes(row.learnable_id)
//   }))

//   const wordsNext = await getWords(courseId, level + 1, { numLevels })

//   return [...words, ...wordsNext]
// }

const run = () => {

  const difficultOnly = document.getElementById('words-difficult').checked
  print('Loading (0%)')

  chrome.tabs.query({ active: true, currentWindow: true }, async tabs => {

    const tab = tabs[0]

    // parse the course id
    const courseIdMatch = tab.url.slice('https://app.memrise.com/course'.length).match(/\d+/)
    const id = courseIdMatch && courseIdMatch[0]

    if (!id) {
      alert('Invalid course id')
      window.close()
      return
    }
    // extract the slug from the url
    const slug = tab.url.slice(('https://app.memrise.com/course/' + id).length + 1, tab.url.length - 1)

    log('Loading page source...')
    const html = await source
    const dom = document.createElement('body')
    dom.innerHTML = html
    const levels = dom.querySelectorAll('.levels .level')

    // get the words
    log(`Loading words...`)
    print('Loading...')
    const course = await getCourse().catch(err => {
      print('Error')
      alert(`Error: ${err}`)
      window.close()
    })

    const words = course.learnables.map(learnable => ({
      original: learnable.learning_element,
      translation: learnable.definition_element,
      is_difficult: learnable.difficulty !== 'unknown'
    }))

    log(`Exporting ${course.learnables.length} words (${course.pages} page${course.pages === 1 ? '' : 's'}) from "${course.name}"`)
    const tsvWords = (difficultOnly ? words.filter(word => word.is_difficult) : words)
      .map(word => `${word.translation}\t${word.original}\n`).join('')

    if (tsvWords.length > 0) {
      chrome.runtime.sendMessage({
        type: 'download',
        filename: `${slug}${difficultOnly ? '-difficult-words' : ''}.tsv`,
        text: tsvWords,
      })

      print('Done!')
      log('Done!')
    }
    else {
      const message = `No ${difficultOnly ? 'difficult ' : ''}words`
      print(message)
      log(message)
    }

  })

}

// run when the export button is clicked
document.addEventListener('DOMContentLoaded', () => {

  // if the tab's url is not a Memrise course, disable all the extension features
  chrome.tabs.query({
    active: true,
    currentWindow: true
  }, async tabs => {

    const tab = tabs[0]
    const isCoursePage = tab.url.match(/^https:\/\/app.memrise.com\/course\/\d+\/[^/]+\/$/)
    if (!isCoursePage) {
      print('Works only on Memrise course pages:\n app.memrise.com/course/*')
      const form = document.getElementById('form')
      form.style.cursor = 'not-allowed'
      const childElementsOfMain = form.getElementsByTagName('*')
      Array.from(childElementsOfMain).forEach(el => {
        el.disabled = true
        el.style.cursor = 'not-allowed'
        if (el.type === 'button') {
          el.style.backgroundColor = 'grey'
        }
      })
    }
    else {
      document.getElementById('export').addEventListener('click', run)
    }

  })
}, false)
