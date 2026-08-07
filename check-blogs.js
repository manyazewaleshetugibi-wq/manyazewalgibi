const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  try {
    const b = await p.blog.findMany({ take: 5 });
    console.log('TOTAL-ish (first 5):');
    console.log(JSON.stringify(b.map(x => ({
      id: x.id,
      mediaType: x.mediaType,
      fileUrl: x.fileUrl,
      Image: x.Image,
      thumbnailUrl: x.thumbnailUrl,
      uploadStatus: x.uploadStatus,
    })), null, 2));
  } catch (e) {
    console.error('ERR', e.message);
  } finally {
    await p.$disconnect();
  }
})();
