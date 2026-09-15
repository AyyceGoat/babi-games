import https from 'https';
import sharp from 'sharp';

const url = 'https://upload.wikimedia.org/wikipedia/commons/d/da/Ibrahim_Sangare_Cote_D%27Ivoire_v_Ecuador_14_June_2026-21.jpg';
console.log('Fetching image from:', url);

https.get(url, (res) => {
  const chunks = [];
  res.on('data', (c) => chunks.push(c));
  res.on('end', async () => {
    console.log('Downloaded image size:', Buffer.concat(chunks).length, 'bytes');
    const buffer = Buffer.concat(chunks);
    try {
      console.log('Processing with sharp...');
      await sharp(buffer)
        .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80, progressive: true })
        .toBuffer();
      console.log('Sharp processing finished successfully!');
    } catch (e) {
      console.error('Sharp threw an error:', e.message);
    }
  });
}).on('error', (e) => {
  console.error('Download error:', e.message);
});
