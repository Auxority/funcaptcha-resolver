interface FuncaptchaTokenResponse {
    token: string;
    challenge_url: string;
    challenge_url_cdn: string;
    noscript: string;
}

interface PublicKeysResponse {
    funCaptchaPublicKeys: {[index: string]: string};
}

interface TokenParameters {
    session: string;
    region: string;
    language: string;
}

interface CaptchaResponse {
    question: string,
    imageUrl: string,
    completed: boolean
}

interface CaptchaProgress {
    current: number;
    final: number;
}