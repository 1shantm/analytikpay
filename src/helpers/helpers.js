'use strict';

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const vision = require('@google-cloud/vision').v1;
const { Storage } = require('@google-cloud/storage');
const { fileTypeFromFile } = require('file-type');

const visionClient = new vision.ImageAnnotatorClient({
  keyFilename: path.resolve(__dirname, '../seguranca/chavedaGCP.json'),
});

const storage = new Storage({
  keyFilename: path.resolve(__dirname, '../seguranca/chave-segura.json'),
});

const bucketName = process.env.GCS_BUCKET || 'Nome do bucket';

async function validateFileType(filePath) {
  const fileSignature = await fileTypeFromFile(filePath);
  if (!fileSignature) return null;

  const { ext, mime } = fileSignature;

  const supportedFormats = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];
  return supportedFormats.includes(ext) ? [ext, mime] : null;
}

async function downloadAndValidateFile(url, destination) {
  try {
    const tempDownloadPath = path.resolve(__dirname, destination);

    const destDir = path.dirname(tempDownloadPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
      timeout: 60_000, // 60s
      maxContentLength: 100 * 1024 * 1024, // 100MB
      maxBodyLength: 100 * 1024 * 1024,
    });

    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(tempDownloadPath);
      response.data.pipe(writer);

      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    const fileType = await validateFileType(tempDownloadPath);
    if (!fileType) {
      fs.unlinkSync(tempDownloadPath);
      throw new Error('Formato de arquivo não suportado');
    }

    const newPath = `${tempDownloadPath}.${fileType[0]}`;
    fs.renameSync(tempDownloadPath, newPath);

    return newPath;
  } catch (error) {
    console.error('[Erro] download/validação:', error.message);
    throw new Error('Erro ao baixar e validar o arquivo');
  }
}

async function uploadToGCS(localFilePath) {
  try {
    const gcsDestination = `temp/${path.basename(localFilePath)}`;

    await storage.bucket(bucketName).upload(localFilePath, {
      destination: gcsDestination,
    });

    console.log(`[UPLOAD] Enviado para GCS: gs://${bucketName}/${gcsDestination}`);

    return `gs://${bucketName}/${gcsDestination}`;
  } catch (error) {
    console.error('[Erro] upload GCS:', error.message);
    throw new Error('Falha ao enviar arquivo para o Google Cloud Storage');
  }
}

function extractInfoFromText(text = '') {
  const patterns = {
    digitableLine: /\d{5}\.\d{5}\s\d{5}\.\d{6}\s\d{5}\.\d{6}\s\d\s\d+/g,
    amount: /\b(?:R\$\s*)?\d{1,3}(?:\.\d{3})*(?:,\d{2})\b/g,
    dueDate: /\b(?:\d{2}[-/]\d{2}[-/]\d{4}|\d{4}[-/]\d{2}[-/]\d{2})\b/g,
    cnpj: /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g,
  };

  const results = {};
  for (const [key, regex] of Object.entries(patterns)) results[key] = text.match(regex) || [];
  return results;
}

async function detectInfo(gcsUri, mimeType) {
  try {
    let fullText = '';

    if (mimeType === 'application/pdf') {
      const runId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const resultsPrefix = `resultados/${runId}/`;

      const [operation] = await visionClient.asyncBatchAnnotateFiles({
        requests: [
          {
            inputConfig: {
              gcsSource: { uri: gcsUri },
              mimeType,
            },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
            outputConfig: {
              gcsDestination: { uri: `gs://${bucketName}/${resultsPrefix}` },
              batchSize: 1,
            },
          },
        ],
      });

      await operation.promise();

      const [files] = await storage.bucket(bucketName).getFiles({ prefix: `resultados/${runId}/` });

      if (files.length === 0) {
        throw new Error(`Nenhum arquivo encontrado em gs://${bucketName}/${resultsPrefix}`);
      }

      for (const file of files) {
        const [contents] = await file.download();
        const responseJson = JSON.parse(contents);

        fullText += responseJson.responses[0].fullTextAnnotation?.text || '';
        await file.delete();
      }
    } else {
      const [result] = await visionClient.documentTextDetection({
        image: { source: { imageUri: gcsUri } },
      });
      fullText = result.fullTextAnnotation.text || '';
    }

    const { digitableLine, amount, dueDate, cnpj } = extractInfoFromText(fullText);
    return { digitableLine, amount, dueDate, cnpj };
  } catch (error) {
    console.error('[Erro] OCR:', error.message);
    throw new Error('Erro ao processar o arquivo com OCR');
  }
}

module.exports = { downloadAndValidateFile, uploadToGCS, detectInfo };
