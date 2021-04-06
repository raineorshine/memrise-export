// const cheerio = require('cheerio')

// a global courseSlug variable to avoid a more complex return type in getWords
// dirty...
let courseSlug

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
async function getWords(courseId, level = 0, skip = {},number_levels_in_course) {

    const current_level = level + 1
    if (current_level <= number_levels_in_course) {

    if (skip[level]) {
        log(`Skipping p${level}... (Multimedia)`)
        return getWords(courseId, current_level, skip,number_levels_in_course)
    }

    if (level > 0) {
        log(`Loading p${level}...`)
    }

    const url = `https://app.memrise.com/ajax/session/?course_id=${courseId}&level_index=${current_level}&session_slug=preview`

    const res = await fetch(url, { credentials: 'same-origin' })

    if (!res.ok) {
    if (res.status > 400) {
      document.getElementById('message').innerHTML = 'Error'
      alert(`Error (${res.status}): ${text}`)
    }
    const wordsNext = await getWords(courseId, level + 1, skip, number_levels_in_course)
    return [...[], ...wordsNext] 
    // return []
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
    const percentComplete = round((current_level) / num_levels * 100)
    document.getElementById('message').innerHTML = `Loading (${percentComplete}%)`


    // get learnable_id of difficult words 
    difficult_words_learnable_id = []
    // for each item in thingusers that is mark as "is_difficult", get the learnable_id, and then find the original and translation of this learnable_id
    for (index_t in data["thingusers"]) {
        children = data["thingusers"][index_t]
        if (children["is_difficult"] == true) {
            difficult_words_learnable_id.push(children["learnable_id"])
        }
    }

    //save the data
    const words = data.learnables.map(row => ({
        original: row.item.value,
        translation: row.definition.value,
        is_difficult: (difficult_words_learnable_id.includes(row.learnable_id)) ? true : false
    }))

    const wordsNext = await getWords(courseId, current_level, skip, number_levels_in_course)

    return [...words, ...wordsNext]

    }  else {
    return []
  }
  }

const run = (all_wordsTF, difficult_wordsTF) => {

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

    //get number_levels_in_course
    var dom = document.createElement('body');
    dom.innerHTML = html;
    const levels_level = dom.querySelectorAll(".levels, .level");
    const number_levels_in_course = levels_level.length

    // cheerio not needed anymore but code keept just in case 
    const multimediaLevels = []
    // const $ = cheerio.load(html)
    // // build an index of non-multimedia levels
    // const multimediaLevels = $('.levels .level').toArray()
    //   .map(level => ({
    //     index: $(level).find('.level-index').text(),
    //     multimedia: $(level).find('.level-ico-multimedia-inactive').length > 0,
    //   }))
    //   .reduce((accum, level) => ({
    //     ...accum,
    //     ...level.multimedia ? { [level.index - 1]: true } : null
    //   }), {})
    
        // get the words
        const words = await getWords(id, 0, multimediaLevels, number_levels_in_course)
        if (all_wordsTF) {
            const tsv_all_words = words.map(word => `${word.translation}\t${word.original}\n`).join('')
            chrome.runtime.sendMessage({
                type: 'download',
                filename: `${courseSlug || slug}.tsv`,
                text: tsv_all_words,
            })
        }

        if (difficult_wordsTF) {
            const tsv_difficult_words = words.filter(word => word.is_difficult).map(word => `${word.translation}\t${word.original}\n`).join('')
            if (tsv_difficult_words != "") {
                chrome.runtime.sendMessage({
                    type: 'download',
                    filename: `${courseSlug || slug}_difficult_words.tsv`,
                    text: tsv_difficult_words,
                })
            } else {
                // update the difficult words checkbox
                const difflabel = document.getElementById('difflabel')
                difflabel.innerHTML = `<span style="color:red;">Not difficult words in this course</span>`
                const diff = document.getElementById('diff')
                diff.disabled = "disabled"
                diff.checked = false
            }
        }

        //reset message
        const message = document.getElementById('message')
        message.innerHTML = `Done`
        log('Done')

    })

}



function scrapping() {
    // get the user's export choices 
    const all_wordsTF = document.getElementById('all').checked
    const difficult_wordsTF = document.getElementById('diff').checked

    if (all_wordsTF || difficult_wordsTF) {
        // display the loading message
        const message = document.getElementById('message')
        message.innerHTML = `Loading (0%)`
        message.style.display = "block";

        run(all_wordsTF, difficult_wordsTF)
    } else {
        const message = document.getElementById('message')
        message.innerHTML = `Nothing to export`
        message.style.display = "block";
    }
}


function resetmessage() {
    const message = document.getElementById('message')
    message.innerHTML = ``
    message.style.display = "none";
}

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById("export").addEventListener("click", scrapping);
    document.getElementById("all").addEventListener("click", resetmessage);
    document.getElementById("diff").addEventListener("click", resetmessage);
}, false);
