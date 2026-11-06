// Background message router. Runs as a service worker in Chrome (no DOM) and as an
// event page in Firefox — written to the SW constraints so it works in both.
// GIF→animated-GIF conversion needs video/canvas, so the SW fetches the
// source bytes and hands them to the content script, which encodes the GIF
// and sends the result back for download.

let activeGifConversions = 0

const X_TAB_URLS = [
    '*://*.twitter.com/*',
    '*://twitter.com/*',
    '*://*.x.com/*',
    '*://x.com/*',
]

browser.runtime.onMessage.addListener(processRequest)

function processRequest(request, sender) {
    switch (request.type) {
        case 'video':
            downloadMp4Video(request)
            break

        case 'image':
            downloadImage(request)
            break

        case 'gif':
            processGifVideo(request, sender)
            break

        case 'GIF_CONVERTED':
            saveConvertedGif(request)
            finishGifConversion()
            break

        case 'GIF_CONVERT_FAILED':
            console.warn('[MediaGrab] GIF conversion failed:', request.error)
            saveSourceMp4AfterFailure(request)
            finishGifConversion()
            break
    }
}

function processGifVideo({ url, readableFilename }, sender) {
    browser.storage.sync.get({
        isConvertGIF: true,
        isSaveMP4: true,
    }).then(async (items) => {
        if (items.isSaveMP4) {
            downloadMp4Video({ url, readableFilename })
        }

        if (!items.isConvertGIF) {
            return
        }

        const tabId = sender.tab?.id
        if (tabId == null) {
            console.warn('[MediaGrab] No tab for GIF conversion')
            return
        }

        beginGifConversion()

        try {
            const response = await fetch(url)
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`)
            }
            const buffer = await response.arrayBuffer()
            const filename = url.substring(url.lastIndexOf('/') + 1).split('.')[0]

            await browser.tabs.sendMessage(tabId, {
                type: 'CONVERT_GIF',
                buffer,
                filename,
                readableFilename,
                url,
            })
        } catch (error) {
            console.warn('[MediaGrab] GIF convert setup failed:', error)
            saveSourceMp4AfterFailure({ url, readableFilename })
            finishGifConversion()
        }
    })
}

// With the MP4 option off the GIF is the only output, so a failed conversion would
// end with no file and no visible error. Hand over the source clip instead.
function saveSourceMp4AfterFailure({ url, readableFilename }) {
    browser.storage.sync.get({ isSaveMP4: true }).then((items) => {
        if (!items.isSaveMP4) {
            downloadMp4Video({ url, readableFilename })
        }
    })
}

function saveConvertedGif({ data, filename, readableFilename }) {
    browser.storage.sync.get({
        spcificPathName: false,
        readableName: false,
    }).then((items) => {
        const u8Array = new Uint8Array(atob(data).split('').map((c) => c.charCodeAt(0)))
        const blob = new Blob([u8Array], { type: 'image/gif' })
        const objectUrl = URL.createObjectURL(blob)

        let downloadFilename = filename
        if (items.readableName) {
            downloadFilename = readableFilename
        }

        browser.downloads.download({
            url: objectUrl,
            saveAs: items.spcificPathName,
            filename: downloadFilename + '.gif',
        }).finally(() => {
            // Revoke after the browser has had a chance to start the download.
            setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
        })
    })
}

function beginGifConversion() {
    activeGifConversions += 1
    sendSpinnerStateMessage(false)
}

function finishGifConversion() {
    activeGifConversions = Math.max(0, activeGifConversions - 1)
    if (activeGifConversions === 0) {
        sendSpinnerStateMessage(true)
    }
}

function sendSpinnerStateMessage(hide) {
    browser.tabs.query({
        currentWindow: true,
        url: X_TAB_URLS,
    }).then((tabs) => {
        for (const tab of tabs) {
            browser.tabs.sendMessage(tab.id, {
                hideSpinner: hide,
            }).catch(() => {
                // Tab may not have the content script (e.g. chrome:// pages filtered out already).
            })
        }
    })
}
