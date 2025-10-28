'use strict';

const path = require('path');
const { downloadAndValidateFile, uploadToGCS, detectInfo } = require('../helpers/helpers');

module.exports = async (payload) => {
  const { url } = payload;

  if (!url) {
    throw new Error('The bill URL is required');
  }

  let filePath;

  try {
    const destination = path.resolve(__dirname, '../temp', `${Date.now()}`);

    filePath = await downloadAndValidateFile(url, destination);

    const fileType = validateFileType(filePath);
    if (!fileType) {
      fs.unlinkSync(filePath);
      throw new Error('Unsupported file format');
    }

    const extension = fileType[0];
    const mimeType = `application/${extension}`;
    const gcsUri = await uploadToGCS(filePath);

    fs.unlinkSync(filePath);
    console.log('[OK] Extraction completed successfully');

    return await detectInfo(gcsUri, mimeType);
  } catch (error) {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    console.error('[Error] Processing:', error.message);
    throw new Error('Error processing the bill');
  }
};
