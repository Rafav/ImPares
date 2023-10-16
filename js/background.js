const url_base = "https://pares.mcu.es/ParesBusquedas20/ViewImage.do?accion=42&txt_zoom=10&txt_contraste=0&txt_polarizado=&txt_brillo=10.0&txt_contrast=1.0&txt_transformacion=-1&txt_descarga=1&dbCode=";
const url_iterator = "&txt_id_imagen=";

async function downloadSequentially(dbCode, total) {
  for (let i = 1; i <= total; i++) {
    const url = url_base + dbCode + url_iterator + i;
    try {
      const currentId = await download(url);
      const success = await onDownloadComplete(currentId);
      if (!success) {
        console.error(`Error downloading image ${i}`);
      }
    } catch (error) {
      console.error(`Error downloading image ${i}: ${error}`);
    }
  }
}

function download(url) {
  return new Promise((resolve, reject) => {
    chrome.downloads.download({ url }, (downloadId) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(downloadId);
      }
    });
  });
}

function onDownloadComplete(itemId) {
  return new Promise((resolve, reject) => {
    const listener = function onChanged({ id, state }) {
      if (id === itemId && state && state.current !== 'in_progress') {
        chrome.downloads.onChanged.removeListener(listener);
        resolve(state.current === 'complete');
      }
    };
    chrome.downloads.onChanged.addListener(listener);
  });
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === 'scrapedData') {
    downloadSequentially(request.dbCode, request.total);
  }
});
