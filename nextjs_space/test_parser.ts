import { parseRssContent } from './lib/content-parser';

const testContent = `<iframe id="player" width="640" height="360" src="https://www.youtube.com/embed/ARRbBmXK7AA" allowFullScreen="allowfullscreen"></iframe><br/><br/><span style="font-size:12px; color: gray;">(Feed generated with <a href="https://fetchrss.com/feedLink?w=6949c626820a8f268c084f02" target="_blank">FetchRSS</a>)</span>`;

const parsed = parseRssContent(testContent);

console.log('Parsed Result:');
console.log('==============');
console.log('isVideo:', parsed.isVideo);
console.log('videoId:', parsed.videoId);
console.log('cleanText:', parsed.cleanText);
console.log('cleanText length:', parsed.cleanText.length);
