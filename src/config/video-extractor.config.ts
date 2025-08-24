import { registerAs } from '@nestjs/config';

export default registerAs('videoExtractor', () => ({
  apiUrl: process.env.VIDEO_EXTRACTOR_API_URL,
}));
