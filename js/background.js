// background.js

const url_base = "https://pares.mcu.es/ParesBusquedas20/ViewImage.do?accion=42&txt_zoom=10&txt_contraste=0&txt_polarizado=&txt_brillo=10.0&txt_contrast=1.0&txt_transformacion=-1&txt_descarga=1&dbCode=";

const url_iterator = "&txt_id_imagen=";



chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === 'scrapedData') {
    for (var i = 1; i <= request.total; i++) {
      pagina = url_base + request.dbCode + url_iterator + i;
      chrome.downloads.download({ url: pagina });
    }
  }
});
