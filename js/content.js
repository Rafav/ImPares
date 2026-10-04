function getDocumentId() {
  const urlMatch = window.location.href.match(/\/(?:show|description)\/(\d+)/);
  return urlMatch ? urlMatch[1] : null;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractTitle() {
  // CORREGIDO: El título está en h2.tituloFicha > a
  let titleElement = document.querySelector('h2.tituloFicha a');
  
  // Fallback: buscar en div#tituloUD por si algunos documentos lo usan
  if (!titleElement) {
    titleElement = document.getElementById('tituloUD');
  }
  
  if (!titleElement) {
    console.warn('No se encontró el título del documento');
    return null;
  }
  
  // Extraer el texto y limpiar espacios extra
  let text = titleElement.textContent || titleElement.innerText || '';
  
  // Limpiar: quitar múltiples espacios, saltos de línea extra, etc.
  text = text
    .replace(/\s+/g, ' ')  // Reemplazar múltiples espacios por uno
    .replace(/^\s+|\s+$/g, '')  // Quitar espacios al inicio y final
    .trim();
  
  console.log('Título extraído:', text);
  return text;
}

function extractViewerInfo() {
  const viewerImg = document.querySelector('#viewer img');
  
  if (!viewerImg || !viewerImg.src) {
    console.error('No se encontró imagen');
    return null;
  }
  
  console.log('Imagen encontrada:', viewerImg.src);
  
  const imgUrl = new URL(viewerImg.src, window.location.origin);
  const params = new URLSearchParams(imgUrl.search);
  
  return {
    currentImage: parseInt(params.get('txt_id_imagen')) || 1,
    totalImages: parseInt(params.get('txt_totalImagenes')) || 0,
    dbCode: params.get('dbCode') || '',
    baseUrl: imgUrl.pathname,
    params: {
      accion: params.get('accion') || '42',
      txt_rotar: params.get('txt_rotar') || '0',
      txt_contraste: params.get('txt_contraste') || '0',
      txt_brillo: params.get('txt_brillo') || '10.0',
      txt_contrast: params.get('txt_contrast') || '1.0',
      txt_polarizado: params.get('txt_polarizado') || '',
      txt_zoom: params.get('txt_zoom') || '10'
    }
  };
}

function buildImageUrl(info, num) {
  const params = new URLSearchParams({
    accion: info.params.accion,
    txt_id_imagen: num.toString(),
    txt_rotar: info.params.txt_rotar,
    txt_contraste: info.params.txt_contraste,
    txt_brillo: info.params.txt_brillo,
    txt_contrast: info.params.txt_contrast,
    txt_totalImagenes: info.totalImages.toString(),
    dbCode: info.dbCode,
    txt_polarizado: info.params.txt_polarizado,
    txt_zoom: info.params.txt_zoom,
    nombreImagen: num.toString()
  });
  
  return `${window.location.origin}${info.baseUrl}?${params}`;
}

async function downloadImage(url, filename, documentId) {
  return new Promise((resolve, reject) => {
    fetch(url)
      .then(response => response.blob())
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        
        chrome.runtime.sendMessage({
          action: 'downloadImage',
          url: blobUrl,
          filename: filename,
          documentId: documentId
        }, (response) => {
          URL.revokeObjectURL(blobUrl);
          if (response && response.success) {
            resolve(response);
          } else {
            reject(new Error('Error en descarga'));
          }
        });
      })
      .catch(reject);
  });
}

async function downloadTextFile(text, filename, documentId) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    
    chrome.runtime.sendMessage({
      action: 'downloadImage',
      url: blobUrl,
      filename: filename,
      documentId: documentId
    }, (response) => {
      URL.revokeObjectURL(blobUrl);
      if (response && response.success) {
        resolve(response);
      } else {
        reject(new Error('Error guardando archivo de texto'));
      }
    });
  });
}

// Variable global para evitar ejecuciones duplicadas
let isDownloading = false;

// Bandera para cancelar una descarga en curso
let cancelRequested = false;

async function cancelDownloadProcess() {
  if (!isDownloading) {
    console.warn('No hay ninguna descarga en curso que cancelar');
    return;
  }

  cancelRequested = true;

  try {
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'cancelAllDownloads' }, resolve);
    });
    console.log('Descargas en Chrome canceladas:', response);
  } catch (error) {
    console.error('Error cancelando descargas en curso:', error);
  }
}

async function startDownloadProcess() {
  // CORREGIDO: Prevenir duplicados
  if (isDownloading) {
    console.warn('Ya hay una descarga en curso, ignorando...');
    return;
  }

  isDownloading = true;
  cancelRequested = false;

  const documentId = getDocumentId();
  
  if (!documentId) {
    alert('No se pudo extraer el ID del documento');
    isDownloading = false;
    return;
  }
  
  const info = extractViewerInfo();
  
  if (!info || info.totalImages === 0) {
    alert('❌ No se detectaron imágenes. Abre consola (F12)');
    console.error('ViewerInfo:', info);
    isDownloading = false;
    return;
  }
  
  console.log(`Descargando ${info.totalImages} imágenes del documento ${documentId}...`);
  
  chrome.runtime.sendMessage({
    action: 'setDocumentId',
    documentId: documentId
  });
  
  const progress = document.createElement('div');
  progress.id = 'tombo-progress';
  progress.style.cssText = `
    position: fixed; top: 10px; right: 10px;
    background: #4CAF50; color: white; padding: 15px;
    border-radius: 5px; z-index: 10000;
    font-family: Arial; box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    min-width: 250px;
  `;
  document.body.appendChild(progress);
  
  let success = 0, errors = 0;
  
  // PASO 1: Extraer y guardar el título
  progress.innerHTML = '📝 Extrayendo título del documento...';
  
  try {
    const title = extractTitle();
    if (title) {
      const titleFilename = `${documentId}.txt`;
      await downloadTextFile(title, titleFilename, documentId);
      console.log('✓ Título guardado:', titleFilename);
      progress.innerHTML = '✓ Título guardado<br>Iniciando descarga de imágenes...';
      await sleep(1000);
    } else {
      console.warn('No se pudo extraer el título, continuando con imágenes...');
      progress.innerHTML = '⚠ Sin título<br>Descargando imágenes...';
      await sleep(500);
    }
  } catch (error) {
    console.error('Error guardando título:', error);
    progress.innerHTML = '⚠ Error en título<br>Descargando imágenes...';
    await sleep(500);
  }
  
  // PASO 2: Descargar imágenes
  for (let i = 1; i <= info.totalImages; i++) {
    if (cancelRequested) {
      console.warn('Descarga cancelada por el usuario');
      break;
    }

    progress.innerHTML = `
      <strong>Descargando:</strong> ${i}/${info.totalImages}<br>
      ✓ ${success} | ✗ ${errors}
    `;

    try {
      const url = buildImageUrl(info, i);
      const filename = `imagen_${String(i).padStart(4, '0')}.jpg`;

      console.log(`[${i}/${info.totalImages}]`, url);

      await downloadImage(url, filename, documentId);
      success++;
      await sleep(500);
    } catch (error) {
      console.error(`Error imagen ${i}:`, error);
      errors++;
      await sleep(1000);
    }
  }

  // Finalizado
  if (cancelRequested) {
    progress.style.background = '#f44336';
    progress.innerHTML = `
      <strong>✗ Descarga cancelada</strong><br>
      ✓ ${success} descargadas antes de cancelar | ✗ ${errors}
    `;
  } else if (errors === 0) {
    progress.style.background = '#2196F3';
    progress.innerHTML = `
      <strong>✓ Descarga completada</strong><br>
      🖼️ ${success} imágenes descargadas
    `;
  } else {
    progress.style.background = '#FF9800';
    progress.innerHTML = `
      <strong>⚠ Completado con errores</strong><br>
      ✓ ${success} | ✗ ${errors}
    `;
  }

  setTimeout(() => {
    progress.remove();
    isDownloading = false;
    cancelRequested = false;
  }, 5000);
}

// CORREGIDO: Remover listeners anteriores antes de agregar nuevo
chrome.runtime.onMessage.removeListener(handleMessage);

function handleMessage(message, sender, sendResponse) {
  if (message.action === 'startDownload') {
    startDownloadProcess();
    sendResponse({ success: true });
  }
  if (message.action === 'cancelDownload') {
    cancelDownloadProcess();
    sendResponse({ success: true });
  }
  if (message.action === 'getStatus') {
    sendResponse({ success: true, isDownloading: isDownloading });
  }
  return true; // Mantener el canal abierto
}

chrome.runtime.onMessage.addListener(handleMessage);

console.log('Tombo ViewImage.do loaded (v1.2 - fixed duplicates & title)');
