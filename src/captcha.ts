import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

import PublicKeys from "./enums/public-keys.js";
import NumberGenerator from "./util/number-generator.js";
import CaptchaPageFinder from "./util/captcha-page-finder.js";

const USER_AGENT = "Baguette PC";

export default class Captcha {
    private static FUNCAPTCHA_BASE_URL: string = 'https://nojs-game3-prod-eu-west-1.arkoselabs.com'; // You might have to change this url based on your region.
    private static IMAGE_SIZE: number = 100;
    private _initialized: boolean;
    private _publicKeyName: string;
    private _publicKey: string;
    private _fcToken: string;
    private _tokenParameters: TokenParameters;
    private _captchaPage: string;

    public constructor(publicKeyName: PublicKeys) {
        this._initialized = false;
        this._publicKeyName = publicKeyName;
        this._publicKey = "";
        this._fcToken = "";
        this._tokenParameters = {
            session: "",
            region: "",
            language: ""
        };
        this._captchaPage = "";
    }

    public async load(): Promise<CaptchaResponse> {
        await this.initialize();
        this._captchaPage = await this.verify();
        const question = CaptchaPageFinder.question(this._captchaPage);
        const imageUrl = CaptchaPageFinder.challengeImage(this._captchaPage);
        const completed = false;
        if (question && imageUrl) {
            return {
                question,
                imageUrl,
                completed
            }
        }
        throw new Error("Failed to load captcha.");
    }

    public async next(answer: number): Promise<CaptchaResponse> {
        const captchaUrl = `${Captcha.FUNCAPTCHA_BASE_URL}/fc/api/nojs/?pkey=${this._publicKey}&litejs=1&lang=${this._tokenParameters.language}&fb_type=1&session=${this._tokenParameters.session}&noAudio=1`;
        const validatedRes = await fetch(captchaUrl, {
            method: 'POST',
            headers: {
                'User-Agent': USER_AGENT,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Origin': Captcha.FUNCAPTCHA_BASE_URL,
                'Referer': captchaUrl
            },
            body: this.getAnswerForm(answer)
        });
        this._captchaPage = await validatedRes.text();

        const failed = CaptchaPageFinder.failed(this._captchaPage);
        if (failed) {
            console.error("At least one of your answers was invalid. Restarting captcha!");
            return await this.load();
        }

        const expired = await this.isExpired();
        if (expired) {
            console.error("Captcha expired, loading new captcha.");
            return await this.load();
        }

        const completed = CaptchaPageFinder.completed(this._captchaPage);
        if (completed) {
            return {
                question: "",
                imageUrl: "",
                completed: true
            }
        }

        const question = CaptchaPageFinder.question(this._captchaPage);
        const imageUrl = CaptchaPageFinder.challengeImage(this._captchaPage);
        if (question && imageUrl) {
            return {
                question,
                imageUrl,
                completed
            }
        }
        throw new Error("Unable to load next captcha.");
    }

    public get token(): string {
        return this._fcToken;
    }

    public get progress(): CaptchaProgress {
        return CaptchaPageFinder.progress(this._captchaPage);
    }

    private async initialize() {
        if (this._initialized) {
            return;
        }

        await this.setPublicKey(this._publicKeyName);
        await this.setFuncaptchaToken();

        this._initialized = true;
    }

    private getAnswerForm(answer: number): URLSearchParams {
        const sessionToken = CaptchaPageFinder.sessionToken(this._captchaPage);
        const gameToken = CaptchaPageFinder.gameToken(this._captchaPage);
        const state = CaptchaPageFinder.state(this._captchaPage);

        const data: {[index: string]: string} = {};
        const dataKeys = this.getOverlayKeys(answer);
        const minOffset = 0.1 * Captcha.IMAGE_SIZE;
        const maxOffset = 0.9 * Captcha.IMAGE_SIZE;
        data[dataKeys["x"]] = String(NumberGenerator.randomInt(minOffset, maxOffset));
        data[dataKeys["y"]] = String(NumberGenerator.randomInt(minOffset, maxOffset));

        if (sessionToken && gameToken && state) {
            data["session-token"] = sessionToken;
            data["game-token"] = gameToken
            data["state"] = state
            return new URLSearchParams(data);
        }
        throw new Error("Missing data to generate answer form.");
    }

    private getOverlayKeys(answer: number): {x: string, y: string} {
        const imageIndex = Math.max(0, Math.min(5, answer - 1));
        const startPositions = {
            x: (imageIndex % 3) * 100,
            y: Math.floor(imageIndex / 3) * 100
        }
        const prefix = `challenge-image-overlay-${startPositions.x}-${startPositions.y}.`;
        return {
            x: `${prefix}x`,
            y: `${prefix}y`
        }
    }

    private async verify(): Promise<string> {
        const verifyForm = await this.getVerifyForm();

        const captchaUrl = `${Captcha.FUNCAPTCHA_BASE_URL}/fc/api/nojs/?pkey=${this._publicKey}&litejs=1&lang=${this._tokenParameters.language}&fb_type=1&session=${this._tokenParameters.session}&noAudio=1`;
        const validatedRes = await fetch(captchaUrl, {
            method: "POST",
            headers: {
                "User-Agent": USER_AGENT,
                "Content-Type": "application/x-www-form-urlencoded",
                "Origin": Captcha.FUNCAPTCHA_BASE_URL,
                "Referer": captchaUrl
            },
            body: verifyForm.toString()
        });

        return await validatedRes.text();
    }

    private async getVerifyForm(): Promise<URLSearchParams> {
        const res = await fetch(`${Captcha.FUNCAPTCHA_BASE_URL}/fc/api/nojs/?pkey=${this._publicKey}&litejs=1&lang=${this._tokenParameters.language}&fb_type=1&session=${this._tokenParameters.session}&noAudio=1`, {
            headers: {
                "User-Agent": USER_AGENT
            }
        });
        const captchaPage = await res.text();
        return this.getVerifyParameters(captchaPage);
    }

    private getVerifyParameters(captchaPage: string): URLSearchParams {
        const sessionToken = CaptchaPageFinder.sessionToken(captchaPage);
        const gameToken = CaptchaPageFinder.gameToken(captchaPage);
        const state = CaptchaPageFinder.state(captchaPage);
        if (sessionToken && gameToken && state) {
            return new URLSearchParams({
                "verify": "1",
                "verify-click-x": String(NumberGenerator.randomInt(20, 40)),
                "verify-click-y": String(NumberGenerator.randomInt(5, 20)),
                "session-token": sessionToken,
                "game-token": gameToken,
                "state": state
            });
        }
        throw new Error("Unable to find one of the verify parameters.");
    }

    private async isExpired(): Promise<boolean> {
        const challengeImage = CaptchaPageFinder.challengeImage(this._captchaPage);
        if (!challengeImage) {
            return false;
        }

        const res = await fetch(challengeImage);
        return res.status !== 200;
    }

    private async setFuncaptchaToken(): Promise<void> {
        const res = await fetch(`https://roblox-api.arkoselabs.com/fc/gt2/public_key/${this._publicKey}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "User-Agent": USER_AGENT,
            },
            body: this.createTokenForm()
        });
        const data = await res.json() as FuncaptchaTokenResponse;
        this._fcToken = data.token;
        this.setTokenParameters();
    }

    private setTokenParameters(): void {
        const parts = this._fcToken.split("|");
        this._tokenParameters = {
            session: parts[0],
            region: parts[1],
            language: parts[7]
        }
    }

    private createTokenForm(): string {
        return new URLSearchParams({
            "public_key": this._publicKey,
        }).toString();
    }

    private async setPublicKey(name: string): Promise<void> {
        const res = await fetch(`https://apis.rbxcdn.com/captcha/v1/metadata`);
        const data = await res.json() as PublicKeysResponse;
        const publicKeys = data.funCaptchaPublicKeys;
        if (!publicKeys || typeof publicKeys[name] !== 'string') {
            throw new Error(`Could not find a public key with this name: ${name}`);
        }
        this._publicKey = publicKeys[name];
    }
}