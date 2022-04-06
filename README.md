**UPDATE 2022-04-06**: Sadly, Memrise has removed the unofficial XHR API that Memrise Export used, so the extension no longer works. It may be possible to fetch and scrape the HTML, but this will take a dedicated effort. Feel free to contribute to a solution. Thanks to everyone who used my extension. I hope it was a delightful and productive aide to your learning.

---

A [Chrome Extension](https://chrome.google.com/webstore/detail/memrise-export/hcllgkpmoiolndnhmbdceffaidjmkoam?hl=en) to export all words from a [Memrise](https://memrise.com) course to a CSV file.

(Technically it exports TSV, or "tab separated file", which is generally compatible wherever CSV is.)

Based on the Gist: https://gist.github.com/raineorshine/68fab3b4b96f54b808a858217b83fe94

## Install

Download and install the extension from the Chrome Web Store:
https://chrome.google.com/webstore/detail/memrise-export/hcllgkpmoiolndnhmbdceffaidjmkoam?hl=en

## Build from Source

1. Clone/Download this repo
1. Open `chrome://extensions`
1. Enable "Developer Mode"
1. Click "Load unpacked" and choose the `src` subfolder from the repo

## Example

1. Log into Memrise.
2. Navigate to the course page you would like to export (e.g. https://app.memrise.com/course/2156672/german-random-01/).
3. Click the "Memrise Export" extension toolbar button.
4. Save TSV file with all words from the course.

## Deployment

Zip the `src` folder and upload to the Google Web Store.
