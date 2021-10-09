// This code is just an example on how you could use this project.

import readline from "readline";
import Jimp from "jimp";

import Captcha from "./captcha.js";
import PublicKeys from "./enums/public-keys.js";

async function numberInput(question: string): Promise<number> {
	return new Promise((resolve) => {
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout
		});
		rl.question(`${question}\n`, (answer) => {
			rl.close();
			return resolve(Number(answer));
		});
	});
}

const generateCaptchaImage = async (captchaResponse: CaptchaResponse) => {
    const image = await Jimp.read(captchaResponse.imageUrl);
    const width = image.getWidth();
    const height = image.getHeight();
    const offset = 5;
    const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
    let count = 0;
    for (let i = 0; i < height; i += 100) {
        for (let j = 0; j < width; j += 100) {
            image.print(font, j + offset, i + offset, String(count + 1));
            count++;
        }
    }
    image.write('captcha.png');
}

(async() => {
    const newCaptcha = new Captcha(PublicKeys.WEB_LOGIN);

    let captchaResponse = await newCaptcha.load();
    while (!captchaResponse.completed) {
        await generateCaptchaImage(captchaResponse);
        const answer = await numberInput(`${captchaResponse.question} by entering the corresponding number. (Progress ${newCaptcha.progress.current} / ${newCaptcha.progress.final})`);
        captchaResponse = await newCaptcha.next(answer);
    }

    console.log(`Solved the captcha!\nValid funcaptcha token:\n${newCaptcha.token}`);
})();