// a global courseSlug variable to avoid a more complex return type in getWords
// dirty...
let courseSlug

/** Returns a Promise of a list of all words in a course. */
function getWords(courseId, level=0) {
  if (level > 0) {
    console.log(`Loading Page ${level}...`)
  }
  const url = `https://app.memrise.com/ajax/session/?course_id=${courseId}&level_index=${level + 1}&session_slug=preview`
  return fetch(url, { credentials: 'same-origin' })
    // parse response
    .then(res => res.ok
      ? res.json()
        // map results
        .then(data => {
          const { name, num_things, num_levels, slug } = data.session.course

          // set a global courseSlug variable to avoid a more complex return type
          // dirty...
          courseSlug = slug

          if (level === 0) {
            console.log(`Exporting ${num_things} words (${num_levels} pages) from "${name}"`)
          }

          // update popup message
          const percentComplete = (level + 1) / num_levels * 100
          document.getElementById('message').innerHTML = `Loading (${percentComplete}%)`

          return data.learnables.map(row => ({
            original: row.item.value,
            translation: row.definition.value
          }))
        })
        .then(words =>
          // RECURSION
          getWords(courseId, level + 1)
            .then(words.concat.bind(words))
        )
      // print an error if they are not logged in
      : res.status > 400 ? res.text().then(text => {
        document.getElementById('message').innerHTML = 'Error'
        alert(`Error (${res.status}): ${text}`)
        return []
      })
      : []
  )
  .catch(err => {
    console.error(err)
    return []
  })
}

const run = () => {

  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {

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

    // get the words
    getWords(id).then(words => {
      const text = words.map(word => `${word.translation}\t${word.original}\n`).join('')
      chrome.runtime.sendMessage({
        type: 'download',
        filename: `${courseSlug || slug}.tsv`,
        text,
      })
      console.log('Done')
      window.close()
    })

  })

}

run()
