/** Gets the learnable words from the current course and passes it back to the popup script with a message of type "learnables". Executing this code from the background script or popup results in an invalid origin error. */

;(async () => {

  const token = document.cookie.split(' ').find(cookie=>cookie.includes('csrftoken')).split(/[=;]/g)[1]

  /** Gets a single page of learnables at the given index. */
  const fetchLearnables = async (n = 1) => {
    const response = await fetch("https://app.memrise.com/v1.18/learning_sessions/preview/", {
      headers: {
        Accept: '*/*',
        'Content-Type': 'Application/json',
        'X-CSRFToken': token
      },
      body: JSON.stringify({
        session_source_id: 2156672,
        session_source_type: 'course_id_and_level_index',
        session_source_sub_index: n
      }),
      method: 'POST'
    })

    // base case
    if(response.status !== 200) return {
      learnables: [],
      pages: n - 1
    }

    // recursively fetch next page
    const json = await response.json()
    const next = await fetchLearnables(n + 1)

    return {
      learnables: [...json.learnables, ...next.learnables],
      name: json.session_source_info?.name || next.name,
      pages: next.pages
    }
  }

  const course = await fetchLearnables()

  chrome.runtime.sendMessage({
    type: 'course',
    value: course,
  })

})()
