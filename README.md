A [Chrome Extension](https://chrome.google.com/webstore/detail/memrise-export/hcllgkpmoiolndnhmbdceffaidjmkoam?hl=en) to export all words from a [Memrise](https://memrise.com) course to a CSV file.

Technically it exports TSV, or "tab separated file", which is generally compatible wherever CSV is.

Based on the Gist: https://gist.github.com/raineorshine/68fab3b4b96f54b808a858217b83fe94

## Install Manually

1. Clone/Download repo
2. [chrome://extensions](chrome://extensions)
3. Enable "Developer Mode"
4. Choose "Load unpacked", choosing the unzipped repo directory

## Usage

1. Log into Memrise.
2. Navigate to the course page you would like to export (e.g. https://app.memrise.com/course/2156672/german-random-01/).
3. Click the "Memrise Export" extension toolbar button.
4. Save TSV file with all words from the course.

# Development

Run build to bundle npm packages into popup.js:

```js
npm run build
```