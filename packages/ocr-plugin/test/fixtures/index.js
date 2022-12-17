import path from 'path';
import fs from 'fs';


export const TEST_IMG_1_PATH = path.resolve(__dirname, 'eng_bw.png');
export const TEST_IMG_1_B64 = fs.readFileSync(TEST_IMG_1_PATH).toString('base64');
